import type {
  IPlatformRuntime,
  IRequiredRuntimeAdapters,
  IRuntimeBuilderOptions,
} from '@prosto/platform-core';

/** @alpha Options shared by both platform application composition modes. */
export interface IPlatformAppBaseOptions extends Pick<
  IRuntimeBuilderOptions,
  | 'environment'
  | 'commandLineArgs'
  | 'correlationId'
  | 'platformPersistenceDescriptor'
  | 'configureServices'
> {
  /** Absolute deployment configuration directory. */
  readonly configDir: string;
}

/** @alpha Built-in Fastify, TypeORM persistence, and TypeORM admin composition. */
export interface IPlatformAppPresetOptions extends IPlatformAppBaseOptions {
  readonly adapters?: never;
  /** Listening interface; defaults to 127.0.0.1. */
  readonly host?: string;
  /** Listening port; defaults to 3001. */
  readonly port?: number;
  /** Optional absolute path to the compiled admin shell. */
  readonly staticSiteRootPath?: string;
  /** Absolute local certificate PEM path when PROSTO_LOCALHOST=true. */
  readonly localhostCertificatePath?: string;
  /** Absolute local private key PEM path when PROSTO_LOCALHOST=true. */
  readonly localhostPrivateKeyPath?: string;
}

/** @alpha Fully supplied SDK runtime adapters; preset HTTP environment is ignored. */
export interface IPlatformAppCustomOptions extends IPlatformAppBaseOptions {
  readonly adapters: IRequiredRuntimeAdapters;
  readonly host?: never;
  readonly port?: never;
  readonly staticSiteRootPath?: never;
  readonly localhostCertificatePath?: never;
  readonly localhostPrivateKeyPath?: never;
}

/** @alpha Application composition options. */
export type PlatformAppOptionsType =
  IPlatformAppPresetOptions | IPlatformAppCustomOptions;

/** @alpha Started platform application host; stop through this handle, not runtime.stop(). */
export interface IPlatformAppHandle {
  /** Runtime reports and probing invalidation remain accessible. */
  readonly runtime: IPlatformRuntime;
  /** Listening URL for the built-in Fastify preset only. */
  readonly url?: URL;
  /** Idempotent host shutdown; rejects when cleanup reports issues. */
  stop(): Promise<void>;
}
