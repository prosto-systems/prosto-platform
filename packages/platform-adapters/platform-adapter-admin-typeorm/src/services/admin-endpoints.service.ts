import { randomUUID } from 'node:crypto';
import {
  ADMIN_ASSET_CATALOG_SERVICE_TOKEN,
  PLATFORM_RUNTIME_CATALOG_SERVICE_TOKEN,
  type IAdminAssetCatalog,
  type IHttpEndpoint,
  type IHttpRequestContext,
  type IPlatformRuntimeCatalog,
  type IPlatformRuntimeServiceResolver,
} from '@prosto/platform-sdk/platform';
import {
  acceptedResponseSchema,
  activityItemSchema,
  authSessionSchema,
  dashboardSummarySchema,
  loginRequestSchema,
  maintenanceRequestSchema,
  maintenanceResponseSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  platformHealthSchema,
  platformManifestSchema,
  platformModuleSchema,
  type AdminPermissionType,
} from '@prosto/platform-sdk/admin/http';
import { ZodError, type z } from 'zod';
import { IsNull, type DataSource } from 'typeorm';
import {
  AdminActivityEntity,
  AdminMailOutboxEntity,
  AdminPasswordResetEntity,
  AdminSessionEntity,
  AdminStateEntity,
  AdminUserEntity,
} from '@/entities/index.js';
import type { AdminConfigurationType } from '@/config/index.js';
import { ADMIN_STATE_ID } from '@/constants/index.js';
import { ActivityWriter } from './activity-writer.service.js';
import { AdminPersistenceRepository } from './admin-persistence.repository.js';
import { AdminSecurityGuard } from './admin-security-guard.service.js';
import { OpaqueTokenService } from './opaque-token.service.js';
import { PasswordHasher } from './password-hasher.service.js';
import { RateLimiter } from './rate-limiter.service.js';
import { SecretCipher } from './secret-cipher.service.js';
import { SessionCookieCodec } from './session-cookie-codec.service.js';

const ROLE_PERMISSIONS: Readonly<
  Record<'admin' | 'operator' | 'viewer', readonly AdminPermissionType[]>
> = {
  admin: [
    'dashboard:view',
    'health:view',
    'modules:view',
    'activity:view',
    'maintenance:manage',
    'platform:restart',
  ],
  operator: [
    'dashboard:view',
    'health:view',
    'modules:view',
    'activity:view',
    'platform:restart',
  ],
  viewer: ['dashboard:view', 'health:view', 'modules:view', 'activity:view'],
};

type AdminRoleType = keyof typeof ROLE_PERMISSIONS;

interface IAuthenticatedSession {
  readonly csrfDigest: string;
  readonly sessionId: string;
  readonly user: AdminUserEntity;
}

class AdminEndpointError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly fieldErrors?: Readonly<Record<string, readonly string[]>>,
    readonly clearSession = false,
  ) {
    super(code);
  }
}

/** @internal Framework-neutral production administration endpoint handlers. */
export class AdminEndpoints {
  private readonly _cookieCodec: SessionCookieCodec;
  private readonly _securityGuard: AdminSecurityGuard;
  private readonly _tokens = new OpaqueTokenService();
  private readonly _passwordHasher = new PasswordHasher();
  private _dataSource: DataSource | undefined;

  constructor(
    private readonly _configuration: AdminConfigurationType,
    private readonly _services: IPlatformRuntimeServiceResolver,
  ) {
    this._cookieCodec = new SessionCookieCodec(
      _configuration.cookie.name,
      _configuration.cookie.lifetimeSeconds,
      _configuration.cookie.secure,
    );
    this._securityGuard = new AdminSecurityGuard(
      _configuration.allowedPublicOrigin,
    );
  }

  get endpoints(): readonly IHttpEndpoint[] {
    return [
      this._endpoint('POST', '/api/admin/auth/login', this._login),
      this._endpoint('GET', '/api/admin/auth/session', this._session),
      this._endpoint('POST', '/api/admin/auth/logout', this._logout),
      this._endpoint(
        'POST',
        '/api/admin/auth/password-reset-requests',
        this._requestPasswordReset,
      ),
      this._endpoint(
        'POST',
        '/api/admin/auth/password-resets',
        this._resetPassword,
      ),
      this._endpoint('GET', '/api/admin/dashboard', this._dashboard),
      this._endpoint('GET', '/api/admin/platform/health', this._health),
      this._endpoint('GET', '/api/admin/modules', this._modules),
      this._endpoint('GET', '/api/admin/activity', this._activity),
      this._endpoint('GET', '/api/admin/platform/manifest', this._manifest),
      this._endpoint(
        'PATCH',
        '/api/admin/platform/maintenance',
        this._maintenance,
      ),
      this._endpoint('POST', '/api/admin/platform/restart', this._restart),
      this._endpoint('GET', '/modules/:moduleId/*', this._asset),
      this._endpoint('HEAD', '/modules/:moduleId/*', this._asset),
    ];
  }

  bind(dataSource: DataSource): void {
    this._dataSource = dataSource;
  }

  unbind(): void {
    this._dataSource = undefined;
  }

  private _endpoint(
    method: IHttpEndpoint['method'],
    path: string,
    handler: (context: IHttpRequestContext) => Promise<Response>,
  ): IHttpEndpoint {
    return { method, path, handler };
  }

  private readonly _login = async (
    context: IHttpRequestContext,
  ): Promise<Response> => {
    try {
      this._assertOrigin(context);

      const input = this._parseBody(context, loginRequestSchema);

      if (input.email.length > 254 || input.password.length > 128) {
        throw new AdminEndpointError(400, 'validation_failed', {
          email: input.email.length > 254 ? ['Invalid email address.'] : [],
          password: input.password.length > 128 ? ['Invalid password.'] : [],
        });
      }

      const email = this._normalizeEmail(input.email);
      const dataSource = this._requireDataSource();
      const limiter = new RateLimiter(dataSource);
      const allowed = await limiter.isAllowed({
        ...this._configuration.rateLimit.login,
        scope: 'login',
        subjectDigest: limiter.digestSubject(context.remoteAddress, email),
      });

      if (!allowed) {
        await this._writeActivity('auth.login_denied', undefined, {
          reason: 'rate_limited',
        });

        throw new AdminEndpointError(429, 'rate_limited');
      }

      const user = await dataSource
        .getRepository(AdminUserEntity)
        .findOneBy({ normalizedEmail: email });

      const passwordMatches = await this._passwordHasher.verify(
        input.password,
        user?.passwordHash ?? (await this._dummyPasswordHash()),
      );

      if (!user || !passwordMatches) {
        await this._writeActivity('auth.login_failed');

        throw new AdminEndpointError(401, 'invalid_credentials');
      }

      const sessionToken = this._tokens.create();
      const csrfToken = this._tokens.create();
      const now = new Date();

      await dataSource.getRepository(AdminSessionEntity).insert({
        id: randomUUID(),
        userId: user.id,
        tokenDigest: this._tokens.digest(sessionToken),
        csrfDigest: this._tokens.digest(csrfToken),
        createdAt: now.toISOString(),
        expiresAt: new Date(
          now.getTime() + this._configuration.cookie.lifetimeSeconds * 1_000,
        ).toISOString(),
        revokedAt: null,
      });

      await this._writeActivity('auth.login_succeeded', user.id);

      return this._json(
        authSessionSchema.parse(this._sessionProjection(user, csrfToken)),
        200,
        { 'set-cookie': this._cookieCodec.create(sessionToken) },
      );
    } catch (error) {
      return this._failure(error, context);
    }
  };

  private readonly _session = async (
    context: IHttpRequestContext,
  ): Promise<Response> => {
    try {
      const session = await this._authenticate(context);
      const csrfToken = this._tokens.create();

      await this._requireDataSource()
        .getRepository(AdminSessionEntity)
        .update(session.sessionId, {
          csrfDigest: this._tokens.digest(csrfToken),
        });

      return this._json(
        authSessionSchema.parse(
          this._sessionProjection(session.user, csrfToken),
        ),
      );
    } catch (error) {
      return this._failure(error, context);
    }
  };

  private readonly _logout = async (
    context: IHttpRequestContext,
  ): Promise<Response> => {
    try {
      const session = await this._authorize(context, undefined, true);

      await this._requireDataSource()
        .getRepository(AdminSessionEntity)
        .update(session.sessionId, { revokedAt: new Date().toISOString() });

      await this._writeActivity('auth.logout_succeeded', session.user.id);

      return new Response(null, {
        status: 204,
        headers: { 'set-cookie': this._cookieCodec.clear() },
      });
    } catch (error) {
      return this._failure(error, context);
    }
  };

  private readonly _requestPasswordReset = async (
    context: IHttpRequestContext,
  ): Promise<Response> => {
    try {
      this._assertOrigin(context);

      const input = this._parseBody(context, passwordResetRequestSchema);

      if (input.email.length > 254) {
        throw new AdminEndpointError(400, 'validation_failed', {
          email: ['Invalid email address.'],
        });
      }

      const email = this._normalizeEmail(input.email);
      const dataSource = this._requireDataSource();
      const limiter = new RateLimiter(dataSource);
      const allowed = await limiter.isAllowed({
        ...this._configuration.rateLimit.passwordReset,
        scope: 'password_reset',
        subjectDigest: limiter.digestSubject(context.remoteAddress, email),
      });

      if (!allowed) {
        await this._writeActivity('auth.password_reset_denied', undefined, {
          reason: 'rate_limited',
        });

        throw new AdminEndpointError(429, 'rate_limited');
      }

      const user = await dataSource
        .getRepository(AdminUserEntity)
        .findOneBy({ normalizedEmail: email });

      if (user) {
        const token = this._tokens.create();
        const now = new Date();

        await dataSource.transaction(async (manager) => {
          await manager.getRepository(AdminPasswordResetEntity).insert({
            id: randomUUID(),
            userId: user.id,
            tokenDigest: this._tokens.digest(token),
            createdAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 3_600_000).toISOString(),
            consumedAt: null,
          });
          await manager.getRepository(AdminMailOutboxEntity).insert({
            id: randomUUID(),
            userId: user.id,
            recipientEmail: user.email,
            encryptedToken: new SecretCipher(
              this._configuration.resetTokenEncryptionKey,
            ).encrypt(token),
            attemptCount: 0,
            nextAttemptAt: now.toISOString(),
            leaseOwner: null,
            leaseExpiresAt: null,
            sentAt: null,
            failureCode: null,
            createdAt: now.toISOString(),
          });
        });

        await this._writeActivity('auth.password_reset_requested', user.id);
      } else {
        await this._writeActivity('auth.password_reset_requested');
      }

      return this._json(acceptedResponseSchema.parse({ accepted: true }), 202);
    } catch (error) {
      return this._failure(error, context);
    }
  };

  private readonly _resetPassword = async (
    context: IHttpRequestContext,
  ): Promise<Response> => {
    try {
      this._assertOrigin(context);

      const input = this._parseBody(context, passwordResetSchema);

      if (input.token.length > 256) {
        throw new AdminEndpointError(400, 'validation_failed', {
          token: ['Invalid token.'],
        });
      }

      const dataSource = this._requireDataSource();
      const tokenDigest = this._tokens.digest(input.token);
      const passwordHash = await this._passwordHasher.hash(input.password);
      const completed = await dataSource.transaction(async (manager) => {
        const reset = await manager
          .getRepository(AdminPasswordResetEntity)
          .createQueryBuilder('reset')
          .where('reset.token_digest = :tokenDigest', { tokenDigest })
          .andWhere('reset.consumed_at IS NULL')
          .andWhere('reset.expires_at > :now', {
            now: new Date().toISOString(),
          })
          .getOne();

        if (!reset) return undefined;

        const consumed = await manager
          .getRepository(AdminPasswordResetEntity)
          .update(
            { id: reset.id, consumedAt: IsNull() },
            { consumedAt: new Date().toISOString() },
          );

        if (consumed.affected !== 1) return undefined;

        await manager.getRepository(AdminUserEntity).update(reset.userId, {
          passwordHash,
          updatedAt: new Date().toISOString(),
        });
        await manager
          .getRepository(AdminSessionEntity)
          .update(
            { userId: reset.userId, revokedAt: IsNull() },
            { revokedAt: new Date().toISOString() },
          );

        return reset.userId;
      });

      if (!completed) {
        await this._writeActivity('auth.password_reset_failed');

        throw new AdminEndpointError(400, 'invalid_reset_token');
      }

      await this._writeActivity('auth.password_reset_succeeded', completed);

      return this._json(acceptedResponseSchema.parse({ accepted: true }), 202, {
        'set-cookie': this._cookieCodec.clear(),
      });
    } catch (error) {
      return this._failure(error, context);
    }
  };

  private readonly _dashboard = async (
    context: IHttpRequestContext,
  ): Promise<Response> => {
    try {
      await this._authorize(context, 'dashboard:view');

      const dataSource = this._requireDataSource();
      const [state, activeSessions] = await Promise.all([
        new AdminPersistenceRepository(dataSource).getState(),
        dataSource
          .getRepository(AdminSessionEntity)
          .createQueryBuilder('session')
          .where('session.revoked_at IS NULL')
          .andWhere('session.expires_at > :now', {
            now: new Date().toISOString(),
          })
          .getCount(),
      ]);

      const modules = this._runtimeCatalog().getSnapshot().modules;

      return this._json(
        dashboardSummarySchema.parse({
          activeSessions,
          healthyModules: modules.filter(
            (module) => module.status === 'healthy',
          ).length,
          maintenanceEnabled: state.maintenanceEnabled,
          modules: modules.length,
        }),
      );
    } catch (error) {
      return this._failure(error, context);
    }
  };

  private readonly _health = async (
    context: IHttpRequestContext,
  ): Promise<Response> => {
    try {
      await this._authorize(context, 'health:view');

      const dataSource = this._requireDataSource();
      const [state, failedMailDeliveries] = await Promise.all([
        new AdminPersistenceRepository(dataSource).getState(),
        dataSource
          .getRepository(AdminMailOutboxEntity)
          .createQueryBuilder('outbox')
          .where('outbox.sent_at IS NULL')
          .andWhere('outbox.failure_code IS NOT NULL')
          .getCount(),
      ]);
      const modules = this._runtimeCatalog().getSnapshot().modules;
      const runtimeStatus = modules.some(
        (module) => module.status === 'degraded',
      )
        ? 'degraded'
        : 'healthy';
      const mailStatus = failedMailDeliveries > 0 ? 'degraded' : 'healthy';
      const status = state.maintenanceEnabled
        ? 'maintenance'
        : runtimeStatus === 'degraded' || mailStatus === 'degraded'
          ? 'degraded'
          : 'healthy';

      return this._json(
        platformHealthSchema.parse({
          status,
          services: [
            { name: 'persistence', status: 'healthy' },
            { name: 'runtime', status: runtimeStatus },
            { name: 'mail', status: mailStatus },
            {
              name: 'maintenance',
              status: state.maintenanceEnabled ? 'maintenance' : 'healthy',
            },
          ],
        }),
      );
    } catch (error) {
      return this._failure(error, context);
    }
  };

  private readonly _modules = async (
    context: IHttpRequestContext,
  ): Promise<Response> => {
    try {
      await this._authorize(context, 'modules:view');

      return this._json(
        this._runtimeCatalog()
          .getSnapshot()
          .modules.map((module) =>
            platformModuleSchema.parse({
              id: module.id,
              name: module.title,
              status: module.status,
              version: module.version,
            }),
          ),
      );
    } catch (error) {
      return this._failure(error, context);
    }
  };

  private readonly _activity = async (
    context: IHttpRequestContext,
  ): Promise<Response> => {
    try {
      await this._authorize(context, 'activity:view');

      const rows = await this._requireDataSource()
        .getRepository(AdminActivityEntity)
        .createQueryBuilder('activity')
        .orderBy('activity.occurred_at', 'DESC')
        .addOrderBy('activity.id', 'DESC')
        .limit(100)
        .getMany();

      return this._json(
        rows.map((activity) =>
          activityItemSchema.parse({
            id: activity.id,
            message: activity.eventType,
            severity: /failed|denied/u.test(activity.eventType)
              ? 'warning'
              : 'info',
            timestamp: activity.occurredAt,
          }),
        ),
      );
    } catch (error) {
      return this._failure(error, context);
    }
  };

  private readonly _manifest = async (
    context: IHttpRequestContext,
  ): Promise<Response> => {
    try {
      await this._authorize(context, 'modules:view');

      const snapshot = this._runtimeCatalog().getSnapshot();

      return this._json(
        platformManifestSchema.parse({
          platformName: snapshot.name,
          platformVersion: snapshot.version,
          plugins: this._runtimeCatalog()
            .getAdminPluginDescriptors()
            .map(({ plugin }) => plugin),
        }),
        200,
        { 'cache-control': 'private, no-cache' },
      );
    } catch (error) {
      return this._failure(error, context);
    }
  };

  private readonly _maintenance = async (
    context: IHttpRequestContext,
  ): Promise<Response> => {
    try {
      const session = await this._authorize(
        context,
        'maintenance:manage',
        true,
      );
      const input = this._parseBody(context, maintenanceRequestSchema);
      const now = new Date().toISOString();

      await this._requireDataSource()
        .getRepository(AdminStateEntity)
        .update(
          { id: ADMIN_STATE_ID },
          { maintenanceEnabled: input.enabled, updatedAt: now },
        );

      await this._writeActivity(
        'platform.maintenance_changed',
        session.user.id,
        {
          enabled: input.enabled,
        },
      );

      return this._json(maintenanceResponseSchema.parse(input));
    } catch (error) {
      return this._failure(error, context);
    }
  };

  private readonly _restart = async (
    context: IHttpRequestContext,
  ): Promise<Response> => {
    try {
      const session = await this._authorize(context, 'platform:restart', true);
      const stateRepository =
        this._requireDataSource().getRepository(AdminStateEntity);

      await stateRepository.increment(
        { id: ADMIN_STATE_ID },
        'restartGeneration',
        1,
      );
      await stateRepository.update(
        { id: ADMIN_STATE_ID },
        {
          updatedAt: new Date().toISOString(),
        },
      );

      await this._writeActivity('platform.restart_requested', session.user.id);

      // The poller, rather than this request, invokes the local host capability.
      return this._json(acceptedResponseSchema.parse({ accepted: true }), 202);
    } catch (error) {
      return this._failure(error, context);
    }
  };

  private readonly _asset = async (
    context: IHttpRequestContext,
  ): Promise<Response> => {
    try {
      await this._authenticate(context);

      const version = context.url.searchParams.get('v');

      if (!version || context.url.searchParams.getAll('v').length !== 1) {
        throw new AdminEndpointError(404, 'not_found');
      }

      const reader = this._assetCatalog().resolveAsset({
        pathname: context.url.pathname,
        version,
      });

      if (!reader) throw new AdminEndpointError(404, 'not_found');

      const result = await reader.open();
      const headers = {
        'cache-control': 'private, max-age=31536000, immutable',
        'content-length': result.metadata.contentLength.toString(),
        'content-type': result.metadata.contentType,
        etag: result.metadata.etag,
        'x-content-type-options': 'nosniff',
      };

      if (context.method === 'HEAD') {
        await result.stream.cancel();

        return new Response(null, { headers });
      }

      return new Response(result.stream, { headers });
    } catch (error) {
      return this._failure(error, context);
    }
  };

  private async _authorize(
    context: IHttpRequestContext,
    permission?: AdminPermissionType,
    requiresCsrf = false,
  ): Promise<IAuthenticatedSession> {
    const session = await this._authenticate(context);

    if (
      permission &&
      !ROLE_PERMISSIONS[session.user.role].includes(permission)
    ) {
      await this._writeActivity('auth.authorization_denied', session.user.id, {
        permission,
      });

      throw new AdminEndpointError(403, 'forbidden');
    }

    if (requiresCsrf) {
      this._assertOrigin(context);

      const csrfToken = this._header(context, 'x-csrf-token');

      if (
        !csrfToken ||
        !this._securityGuard.verifyCsrf(csrfToken, session.csrfDigest)
      ) {
        await this._writeActivity('auth.csrf_denied', session.user.id);

        throw new AdminEndpointError(403, 'csrf_invalid');
      }
    }

    return session;
  }

  private async _authenticate(
    context: IHttpRequestContext,
  ): Promise<IAuthenticatedSession> {
    const rawToken = this._readCookie(this._header(context, 'cookie'));

    if (!rawToken || rawToken.length > 256) {
      throw new AdminEndpointError(401, 'unauthorized', undefined, true);
    }

    const dataSource = this._requireDataSource();
    const session = await dataSource
      .getRepository(AdminSessionEntity)
      .findOneBy({ tokenDigest: this._tokens.digest(rawToken) });

    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt <= new Date().toISOString()
    ) {
      throw new AdminEndpointError(401, 'unauthorized', undefined, true);
    }

    const user = await dataSource
      .getRepository(AdminUserEntity)
      .findOneBy({ id: session.userId });

    if (!user) {
      throw new AdminEndpointError(401, 'unauthorized', undefined, true);
    }

    return { csrfDigest: session.csrfDigest, sessionId: session.id, user };
  }

  private _parseBody<TSchema extends z.ZodType>(
    context: IHttpRequestContext,
    schema: TSchema,
  ): z.output<TSchema> {
    if (context.body.kind !== 'json') {
      throw new AdminEndpointError(415, 'unsupported_media_type');
    }

    try {
      return schema.parse(context.body.value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AdminEndpointError(
          400,
          'validation_failed',
          this._fieldErrors(error),
        );
      }

      throw error;
    }
  }

  private _fieldErrors(
    error: ZodError,
  ): Readonly<Record<string, readonly string[]>> {
    const result: Record<string, string[]> = {};

    for (const issue of error.issues) {
      const key = issue.path.join('.') || 'body';

      (result[key] ??= []).push(issue.message);
    }

    return result;
  }

  private _sessionProjection(
    user: AdminUserEntity,
    csrfToken: string,
  ): {
    readonly csrfToken: string;
    readonly permissions: readonly AdminPermissionType[];
    readonly principal: {
      readonly displayName: string;
      readonly email: string;
      readonly id: string;
      readonly role: AdminRoleType;
    };
  } {
    return {
      csrfToken,
      permissions: ROLE_PERMISSIONS[user.role],
      principal: {
        displayName: user.displayName,
        email: user.email,
        id: user.id,
        role: user.role,
      },
    };
  }

  private _json(
    value: unknown,
    status = 200,
    headers?: Readonly<Record<string, string>>,
  ): Response {
    return Response.json(value, { status, headers });
  }

  private _failure(error: unknown, context: IHttpRequestContext): Response {
    const known =
      error instanceof AdminEndpointError
        ? error
        : new AdminEndpointError(500, 'internal_error');

    const headers = known.clearSession
      ? { 'set-cookie': this._cookieCodec.clear() }
      : undefined;

    return this._json(
      {
        code: known.code,
        correlationId: context.correlationId,
        ...(known.fieldErrors ? { fieldErrors: known.fieldErrors } : {}),
      },
      known.status,
      headers,
    );
  }

  private _assertOrigin(context: IHttpRequestContext): void {
    try {
      this._securityGuard.assertOrigin(this._header(context, 'origin'));
    } catch {
      throw new AdminEndpointError(403, 'origin_invalid');
    }
  }

  private _header(
    context: IHttpRequestContext,
    name: string,
  ): string | undefined {
    const value = context.headers[name];

    return typeof value === 'string' ? value : undefined;
  }

  private _readCookie(header: string | undefined): string | undefined {
    if (!header) return undefined;

    const prefix = `${this._configuration.cookie.name}=`;
    const value = header
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length);

    if (!value) return undefined;

    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }

  private _normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private _requireDataSource(): DataSource {
    if (!this._dataSource) {
      throw new AdminEndpointError(503, 'service_unavailable');
    }

    return this._dataSource;
  }

  private _runtimeCatalog(): IPlatformRuntimeCatalog {
    return this._services.resolveRequired(
      PLATFORM_RUNTIME_CATALOG_SERVICE_TOKEN,
    );
  }

  private _assetCatalog(): IAdminAssetCatalog {
    return this._services.resolveRequired(ADMIN_ASSET_CATALOG_SERVICE_TOKEN);
  }

  private async _writeActivity(
    eventType: string,
    actorUserId?: string,
    metadata?: Readonly<Record<string, string | number | boolean>>,
  ): Promise<void> {
    await new ActivityWriter(this._requireDataSource()).write({
      actorUserId,
      eventType,
      metadata,
    });
  }

  private async _dummyPasswordHash(): Promise<string> {
    return this._passwordHasher.hash('platform-admin-dummy-password');
  }
}
