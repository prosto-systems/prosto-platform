import {
  createTypeOrmPersistenceDescriptor,
  TYPEORM_DATA_SOURCE_SERVICE_TOKEN,
} from '@prosto/platform-adapter-typeorm';
import {
  HOST_RESTART_CAPABILITY_SERVICE_TOKEN,
  HTTP_REQUEST_GATE_SERVICE_TOKEN,
  type IPlatformModule,
  type IPlatformModuleContext,
  type IServiceRegistry,
} from '@prosto/platform-sdk/platform';
import {
  type AdminConfigurationType,
  parseAdminConfiguration,
} from '@/config/index.js';
import {
  AdminActivityEntity,
  AdminMailOutboxEntity,
  AdminPasswordResetEntity,
  AdminRateLimitAttemptEntity,
  AdminSessionEntity,
  AdminStateEntity,
  AdminUserEntity,
} from '@/entities/index.js';
import { platform_admin_initial1788739200000 } from '@/migrations/index.js';
import {
  AdminPersistenceRepository,
  AdminEndpoints,
  MaintenanceCleanupWorker,
  MaintenanceRequestGate,
  OutboxWorker,
  PasswordHasher,
  RestartGenerationPoller,
  SecretCipher,
} from '@/services/index.js';

/**
 * @alpha
 * Discoverable administration module. It declares persistence metadata in
 * `init()` and starts only after the shared TypeORM data source is ready.
 */
export class PlatformAdminModule implements IPlatformModule {
  private readonly _gate = new MaintenanceRequestGate();
  private _cleanupWorker: MaintenanceCleanupWorker | undefined;
  private _configuration: AdminConfigurationType | undefined;
  private _endpoints: AdminEndpoints | undefined;
  private _outboxWorker: OutboxWorker | undefined;
  private _restartPoller: RestartGenerationPoller | undefined;
  private _services: IServiceRegistry | undefined;

  init({
    moduleId,
    environment,
    getConfigValue,
    services,
    capabilities: { http, persistence },
  }: IPlatformModuleContext): void {
    const descriptors = persistence?.descriptors;

    if (!descriptors) {
      throw new Error(
        'platform-admin requires a TypeORM persistence provider.',
      );
    }

    if (!http) {
      throw new Error('platform-admin requires a Http server provider.');
    }

    if (
      environment === 'production' &&
      !services.has(HOST_RESTART_CAPABILITY_SERVICE_TOKEN)
    ) {
      throw new Error(
        'platform-admin production startup requires the host restart capability.',
      );
    }

    descriptors.register(moduleId, {
      owner: 'module',
      ownerId: moduleId,
      payload: createTypeOrmPersistenceDescriptor({
        entities: [
          AdminUserEntity,
          AdminSessionEntity,
          AdminPasswordResetEntity,
          AdminMailOutboxEntity,
          AdminActivityEntity,
          AdminRateLimitAttemptEntity,
          AdminStateEntity,
        ],
        migrations: [platform_admin_initial1788739200000],
      }),
    });

    services.register(HTTP_REQUEST_GATE_SERVICE_TOKEN, this._gate);

    this._configuration = parseAdminConfiguration(
      getConfigValue('modules.platform-admin'),
      environment === 'production',
    );
    this._services = services;
    this._endpoints = new AdminEndpoints(this._configuration, services);

    for (const endpoint of this._endpoints.endpoints) {
      http.endpoints.register(endpoint);
    }
  }

  async start({ services, logger }: IPlatformModuleContext): Promise<void> {
    const configuration = this._configuration;

    if (!configuration) {
      throw new Error('platform-admin has not been initialized.');
    }

    try {
      const dataSource = services.resolveRequired(
        TYPEORM_DATA_SOURCE_SERVICE_TOKEN,
      );
      const repository = new AdminPersistenceRepository(dataSource);

      this._gate.bind(dataSource);
      this._endpoints?.bind(dataSource);

      await repository.ensureState();
      await this._bootstrapAdministrator(repository, configuration);

      const cipher = new SecretCipher(configuration.resetTokenEncryptionKey);

      this._outboxWorker = new OutboxWorker(
        dataSource,
        configuration,
        cipher,
        logger,
      );
      this._cleanupWorker = new MaintenanceCleanupWorker(repository, logger);

      const restartCapability = services.resolve(
        HOST_RESTART_CAPABILITY_SERVICE_TOKEN,
      );

      if (restartCapability) {
        this._restartPoller = RestartGenerationPoller.create(
          dataSource,
          restartCapability,
          configuration.restartPollingIntervalSeconds,
          logger,
        );
      }

      this._outboxWorker.start();
      this._cleanupWorker.start();
      await this._restartPoller?.start();
    } catch (error) {
      await this._stopWorkers();
      this._unregisterGate();
      this._gate.unbind();
      this._endpoints?.unbind();
      throw error;
    }
  }

  async stop(_context: IPlatformModuleContext): Promise<void> {
    await this._stopWorkers();
    this._unregisterGate();
    this._gate.unbind();
    this._endpoints?.unbind();
    this._endpoints = undefined;
    this._configuration = undefined;
    this._services = undefined;
  }

  private async _bootstrapAdministrator(
    repository: AdminPersistenceRepository,
    configuration: AdminConfigurationType,
  ): Promise<void> {
    if (await repository.hasUsers()) {
      return;
    }

    if (!configuration.bootstrap) {
      throw new Error(
        'platform-admin bootstrap credentials are required while no administration user exists.',
      );
    }

    await repository.createBootstrapAdmin({
      displayName: configuration.bootstrap.displayName,
      email: configuration.bootstrap.email,
      passwordHash: await new PasswordHasher().hash(
        configuration.bootstrap.password,
      ),
    });
  }

  private async _stopWorkers(): Promise<void> {
    this._restartPoller?.stop();
    this._restartPoller = undefined;
    this._cleanupWorker?.stop();
    this._cleanupWorker = undefined;
    await this._outboxWorker?.stop();
    this._outboxWorker = undefined;
  }

  private _unregisterGate(): void {
    if (
      this._services?.resolve(HTTP_REQUEST_GATE_SERVICE_TOKEN) === this._gate
    ) {
      this._services.unregister(HTTP_REQUEST_GATE_SERVICE_TOKEN);
    }
  }
}
