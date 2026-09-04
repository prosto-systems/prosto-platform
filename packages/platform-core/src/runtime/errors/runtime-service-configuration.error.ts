/** @alpha Error codes emitted while composing application-host services. */
export type RuntimeServiceConfigurationErrorCodeType =
  'ASYNC_SERVICE_CONFIGURATION_NOT_SUPPORTED';

/**
 * @alpha
 * Raised when an application host attempts an unsupported runtime service
 * composition pattern.
 */
export class RuntimeServiceConfigurationError extends Error {
  constructor(
    public readonly code: RuntimeServiceConfigurationErrorCodeType,
    message: string,
  ) {
    super(message);
    this.name = 'RuntimeServiceConfigurationError';
  }
}
