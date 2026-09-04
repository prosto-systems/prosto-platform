import type {
  IHttpApplicationRuntime,
  IPlatformModuleLogger,
  ServiceRegistryConfiguratorType,
} from '@prosto/platform-sdk';

/** @alpha Host-wide limits for streaming multipart requests. */
export interface IFastifyHttpMultipartLimits {
  readonly fileSizeBytes?: number;
  readonly files?: number;
  readonly fields?: number;
  readonly parts?: number;
  readonly fieldSizeBytes?: number;
  readonly fieldNameSizeBytes?: number;
  readonly headerPairs?: number;
  readonly totalSizeBytes?: number;
}

/** @alpha Framework-neutral composition options for the Fastify HTTP host. */
export interface IFastifyHttpApplicationOptions {
  /** Creates the platform runtime and receives the one-time HTTP service configurator. */
  readonly runtimeFactory: (
    configureHttpServices: ServiceRegistryConfiguratorType,
  ) => IHttpApplicationRuntime;
  readonly host?: string;
  readonly port?: number;
  readonly parsedBodyLimitBytes?: number;
  readonly rawBodyLimitBytes?: number;
  readonly multipartLimits?: IFastifyHttpMultipartLimits;
  readonly requestTimeoutMs?: number;
  readonly handlerTimeoutMs?: number;
  readonly keepAliveTimeoutMs?: number;
  readonly shutdownTimeoutMs?: number;
  readonly trustProxy?: boolean;
  readonly logger?: IPlatformModuleLogger;
}
