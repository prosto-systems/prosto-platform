import { resolve as resolvePath } from 'node:path';
import { ConsoleAdminBffLogger } from '@prosto/platform-adapter-admin-bff';
import { PlatformAnonymousIdentity } from '@prosto/platform-sdk';
import type {
  IAdminPermissionPolicy,
  IAdminUIPluginManifest,
} from '@prosto/platform-admin-contracts';
import { ADMIN_PERMISSION_POLICY_SCHEMA_VERSION } from '@prosto/platform-admin-contracts';
import {
  installShutdownHandlers,
  PlatformAdminBffRuntimeHost,
} from './admin-bff-http-host.js';

const DEFAULT_PERMISSION_POLICY: IAdminPermissionPolicy = {
  schemaVersion: ADMIN_PERMISSION_POLICY_SCHEMA_VERSION,
  roleMappings: [],
  actionGates: [],
};

function readPort(): number {
  const value = Number(process.env.PROSTO_HTTP_PORT ?? '3001');

  if (!Number.isInteger(value) || value < 0 || value > 65_535) {
    throw new Error('PROSTO_HTTP_PORT must be an integer from 0 to 65535.');
  }

  return value;
}

function readManifests(): readonly IAdminUIPluginManifest[] {
  const value = process.env.PROSTO_ADMIN_BFF_MANIFESTS_JSON;

  if (!value) {
    return [];
  }

  const parsed: unknown = JSON.parse(value);

  if (!Array.isArray(parsed)) {
    throw new Error('PROSTO_ADMIN_BFF_MANIFESTS_JSON must be a JSON array.');
  }

  return parsed as IAdminUIPluginManifest[];
}

async function main(): Promise<void> {
  const logger = new ConsoleAdminBffLogger();
  const host = PlatformAdminBffRuntimeHost.create({
    http: {
      host: process.env.PROSTO_HTTP_HOST ?? '127.0.0.1',
      port: readPort(),
      // Authentication is intentionally delegated to a future auth adapter.
      identityResolver: {
        // TODO: Add a real identity resolver.
        resolve: async () => new PlatformAnonymousIdentity(),
      },
    },
    runtime: {
      configDir: process.env.PROSTO_CONFIG_DIR
        ? resolvePath(process.env.PROSTO_CONFIG_DIR)
        : undefined,
      environment: process.env.NODE_ENV ?? 'production',
    },
    adminBff: {
      catalogSource: {
        // TODO: Add a real catalog source.
        fetchUIPluginManifests: async () => readManifests(),
      },
      permissionPolicy: DEFAULT_PERMISSION_POLICY,
      shellVersion: process.env.PROSTO_ADMIN_SHELL_VERSION ?? '1.0.0',
      environment: process.env.NODE_ENV ?? 'production',
      discoveryPipelineVersion: 'admin-bff-http-host.v1',
      logger,
    },
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
