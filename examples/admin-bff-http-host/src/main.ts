import { resolve as resolvePath } from 'node:path';
import { ConsoleAdminBffLogger } from '@prosto/platform-adapter-admin-bff';
import { createPlatformAesKeyRingCipher } from '@prosto/platform-adapter-aes-key-ring';
import { PlatformOidcBearerResolver } from '@prosto/platform-adapter-auth';
import { TypeOrmPersistenceProvider } from '@prosto/platform-adapter-typeorm';
import {
  PLATFORM_AUTH_SESSION_MODULE_MANIFEST,
  PlatformAuthSessionModule,
} from '@prosto/platform-module-auth-session';
import type {
  IAdminPermissionPolicy,
  IAdminUIPluginManifest,
} from '@prosto/platform-admin-contracts';
import { ADMIN_PERMISSION_POLICY_SCHEMA_VERSION } from '@prosto/platform-admin-contracts';
import {
  CompositeAuthenticationResolver,
  installShutdownHandlers,
  PlatformAdminBffRuntimeHost,
} from './admin-bff-http-host.js';
import { parseBearerAuthConfig } from './config/auth-config.js';
import { parseKeyRingConfig } from './config/key-ring-config.js';
import { parseSessionConfig } from './config/session-config.js';

const DEFAULT_PERMISSION_POLICY: IAdminPermissionPolicy = {
  schemaVersion: ADMIN_PERMISSION_POLICY_SCHEMA_VERSION,
  roleMappings: [],
  actionGates: [],
};

function readPort(): number {
  const value = Number(process.env.ADMIN_BFF_HTTP_PORT ?? '3001');

  if (!Number.isInteger(value) || value < 0 || value > 65_535) {
    throw new Error('ADMIN_BFF_HTTP_PORT must be an integer from 0 to 65535.');
  }

  return value;
}

function readManifests(): readonly IAdminUIPluginManifest[] {
  const value = process.env.ADMIN_BFF_ADMIN_MANIFESTS_JSON;

  if (!value) {
    return [];
  }

  const parsed: unknown = JSON.parse(value);

  if (!Array.isArray(parsed)) {
    throw new Error('ADMIN_BFF_ADMIN_MANIFESTS_JSON must be a JSON array.');
  }

  return parsed as IAdminUIPluginManifest[];
}

async function main(): Promise<void> {
  const logger = new ConsoleAdminBffLogger();
  const configDir = process.env.ADMIN_BFF_CONFIG_DIR;

  if (!configDir) {
    throw new Error('ADMIN_BFF_CONFIG_DIR is required.');
  }

  const bearerResolver = new PlatformOidcBearerResolver(
    parseBearerAuthConfig(process.env),
  );
  const cipher = createPlatformAesKeyRingCipher(
    parseKeyRingConfig(process.env),
  );
  const sessionModule = new PlatformAuthSessionModule({
    ...parseSessionConfig(process.env),
    cipher,
    accessTokenResolver: bearerResolver,
  });
  const host = PlatformAdminBffRuntimeHost.create({
    http: {
      host: process.env.ADMIN_BFF_HTTP_HOST ?? '127.0.0.1',
      port: readPort(),
      identityResolver: new CompositeAuthenticationResolver(
        bearerResolver,
        sessionModule.facade.resolver,
      ),
    },
    runtime: {
      configDir: resolvePath(configDir),
      environment: process.env.NODE_ENV ?? 'production',
      persistenceProvider: new TypeOrmPersistenceProvider(),
      modules: [
        {
          type: 'memory',
          manifest: PLATFORM_AUTH_SESSION_MODULE_MANIFEST,
          module: sessionModule,
        },
      ],
    },
    adminBff: {
      catalogSource: {
        // TODO: Add a real catalog source.
        fetchUIPluginManifests: async () => readManifests(),
      },
      permissionPolicy: DEFAULT_PERMISSION_POLICY,
      shellVersion: process.env.ADMIN_BFF_ADMIN_SHELL_VERSION ?? '1.0.0',
      environment: process.env.NODE_ENV ?? 'production',
      discoveryPipelineVersion: 'admin-bff-http-host.v1',
      logger,
    },
    additionalRouteRegistrations: sessionModule.facade.routes,
  });

  await host.start();
  installShutdownHandlers(host);
}

void main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'Host startup failed.',
  );

  process.exit(1);
});
