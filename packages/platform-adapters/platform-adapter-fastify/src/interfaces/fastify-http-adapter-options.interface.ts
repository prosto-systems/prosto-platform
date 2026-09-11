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

/** @alpha Framework-neutral options for hosting the built admin shell. */
export interface IFastifyHttpStaticSiteOptions {
  /** Absolute path to the directory containing the built shell. */
  readonly rootPath: string;
  /** Shell document used for the root route and history fallback. */
  readonly indexFileName?: string;
  /** Whether HTML navigation requests may fall back to the shell document. */
  readonly spaFallback?: boolean;
  /** CSP sent with shell responses. Set to `false` only for local development. */
  readonly contentSecurityPolicy?: string | false;
}

/** @alpha TLS certificate material used when the platform host terminates HTTPS. */
export interface IFastifyHttpTlsOptions {
  /** Absolute path to the PEM-encoded TLS certificate chain. */
  readonly certificatePath: string;
  /** Absolute path to the PEM-encoded private key for the certificate chain. */
  readonly privateKeyPath: string;
}

/** @alpha Framework-neutral options for the Fastify HTTP transport adapter. */
export interface IFastifyHttpAdapterOptions {
  readonly host?: string;
  readonly port?: number;
  readonly parsedBodyLimitBytes?: number;
  readonly rawBodyLimitBytes?: number;
  readonly multipartLimits?: IFastifyHttpMultipartLimits;
  readonly requestTimeoutMs?: number;
  readonly handlerTimeoutMs?: number;
  readonly keepAliveTimeoutMs?: number;
  readonly shutdownTimeoutMs?: number;
  /** Proxy addresses or CIDR ranges allowed to supply forwarded request metadata. */
  readonly trustedProxies?: readonly string[];
  /** Optional local TLS termination for deployments without a separate ingress. */
  readonly tls?: IFastifyHttpTlsOptions;
  /** Optional built admin-shell static site hosted from the platform origin. */
  readonly staticSite?: IFastifyHttpStaticSiteOptions;
}
