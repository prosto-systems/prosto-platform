/**
 * @stable
 * Base error code taxonomy for SDK validation and compatibility failures.
 */
export type PlatformSdkErrorCodeType =
  | 'MANIFEST_VALIDATION_FAILED'
  | 'COMPATIBILITY_VALIDATION_FAILED';

/**
 * @stable
 * Shared base class for SDK-level contract failures.
 */
export class PlatformSdkError extends Error {
  constructor(
    readonly code: PlatformSdkErrorCodeType,
    override readonly message: string,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);

    this.name = 'PlatformSdkError';
    this.code = code;
    this.details = details;
  }
}
