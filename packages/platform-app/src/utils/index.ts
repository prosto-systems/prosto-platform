import { type IRequiredRuntimeAdapters } from '@prosto/platform-core';
import type {
  IPlatformAppPresetOptions,
  PlatformAppOptionsType,
} from '../interfaces/index.js';
import { TypeOrmPersistenceAdapter } from '@prosto/platform-adapter-typeorm';
import { PlatformAdminTypeOrmAdapter } from '@prosto/platform-adapter-admin-typeorm';
import { HOST_SLOT } from '../constants/index.js';
import {
  FastifyHttpAdapter,
  type IFastifyHttpTlsOptions,
} from '@prosto/platform-adapter-fastify';
import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import 'reflect-metadata';

export interface IHostSlot {
  active: boolean;
}

export function reserveHost(): IHostSlot {
  let slot = Reflect.get(globalThis, HOST_SLOT) as IHostSlot | undefined;

  if (!slot) {
    slot = { active: false };
    Reflect.set(globalThis, HOST_SLOT, slot);
  }

  if (slot.active) {
    throw new Error(
      'A platform application host is already active in this process.',
    );
  }

  slot.active = true;

  return slot;
}

export function requireAbsolutePath(
  path: unknown,
  name: string,
): asserts path is string {
  if (typeof path !== 'string' || !isAbsolute(path)) {
    throw new Error(`${name} must be an absolute path.`);
  }
}

export function trustedIngressAddresses(): readonly string[] {
  const input = process.env.PROSTO_TRUSTED_INGRESS_ADDRESSES;

  if (!input?.trim()) {
    throw new Error(
      'PROSTO_TRUSTED_INGRESS_ADDRESSES must be a non-empty JSON array of ingress IP addresses or CIDR ranges.',
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error(
      'PROSTO_TRUSTED_INGRESS_ADDRESSES must be a non-empty JSON array of ingress IP addresses or CIDR ranges.',
    );
  }

  const result = z.array(z.string().trim().min(1)).nonempty().safeParse(parsed);

  if (!result.success) {
    throw new Error(
      'PROSTO_TRUSTED_INGRESS_ADDRESSES must be a non-empty JSON array of ingress IP addresses or CIDR ranges.',
    );
  }

  return result.data;
}

export function tlsOptions(
  options: IPlatformAppPresetOptions,
): IFastifyHttpTlsOptions | undefined {
  const certificatePath = process.env.PROSTO_TLS_CERTIFICATE_PATH;
  const privateKeyPath = process.env.PROSTO_TLS_PRIVATE_KEY_PATH;

  if (certificatePath !== undefined || privateKeyPath !== undefined) {
    if (certificatePath === undefined || privateKeyPath === undefined) {
      throw new Error(
        'PROSTO_TLS_CERTIFICATE_PATH and PROSTO_TLS_PRIVATE_KEY_PATH must be set together.',
      );
    }

    requireAbsolutePath(certificatePath, 'PROSTO_TLS_CERTIFICATE_PATH');
    requireAbsolutePath(privateKeyPath, 'PROSTO_TLS_PRIVATE_KEY_PATH');

    return { certificatePath, privateKeyPath };
  }

  if (process.env.PROSTO_LOCALHOST !== 'true') return undefined;

  requireAbsolutePath(
    options.localhostCertificatePath,
    'localhostCertificatePath',
  );
  requireAbsolutePath(
    options.localhostPrivateKeyPath,
    'localhostPrivateKeyPath',
  );

  return {
    certificatePath: options.localhostCertificatePath,
    privateKeyPath: options.localhostPrivateKeyPath,
  };
}

function defaultStaticSiteRootPath(): string {
  return fileURLToPath(
    new URL(
      './dist',
      import.meta.resolve('@prosto/platform-admin-shell/package.json'),
    ),
  );
}

export function resolveAdapters(options: PlatformAppOptionsType): {
  adapters: IRequiredRuntimeAdapters;
  http?: FastifyHttpAdapter;
} {
  if (options.adapters !== undefined) {
    for (const name of [
      'host',
      'port',
      'staticSiteRootPath',
      'localhostCertificatePath',
      'localhostPrivateKeyPath',
    ]) {
      if (Object.hasOwn(options, name)) {
        throw new Error(
          'Preset HTTP settings cannot be supplied with custom adapters.',
        );
      }
    }

    const adapters = options.adapters;

    if (
      typeof adapters !== 'object' ||
      adapters === null ||
      Object.keys(adapters).length !== 3 ||
      !adapters.admin ||
      !adapters.persistence ||
      !adapters.http
    ) {
      throw new Error(
        'Custom adapters must provide exactly admin, persistence, and http.',
      );
    }

    return { adapters };
  }

  if (Object.hasOwn(options, 'adapters')) {
    throw new Error(
      'Custom adapters must provide exactly admin, persistence, and http.',
    );
  }

  const preset = options as IPlatformAppPresetOptions;

  if (preset.staticSiteRootPath !== undefined) {
    requireAbsolutePath(preset.staticSiteRootPath, 'staticSiteRootPath');
  }

  if (preset.localhostCertificatePath !== undefined) {
    requireAbsolutePath(
      preset.localhostCertificatePath,
      'localhostCertificatePath',
    );
  }

  if (preset.localhostPrivateKeyPath !== undefined) {
    requireAbsolutePath(
      preset.localhostPrivateKeyPath,
      'localhostPrivateKeyPath',
    );
  }

  const http = new FastifyHttpAdapter({
    host: preset.host ?? '127.0.0.1',
    port: preset.port ?? 3001,
    trustedProxies: trustedIngressAddresses(),
    tls: tlsOptions(preset),
    staticSite: preset.staticSiteRootPath
      ? { rootPath: preset.staticSiteRootPath }
      : { rootPath: defaultStaticSiteRootPath() },
  });

  return {
    adapters: {
      http,
      persistence: new TypeOrmPersistenceAdapter(),
      admin: new PlatformAdminTypeOrmAdapter(),
    },
    http,
  };
}
