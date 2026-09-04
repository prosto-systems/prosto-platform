import { PlatformSdkError } from '@/platform/errors/index.js';

/** @alpha Error codes emitted while HTTP endpoints are declared. */
export type HttpEndpointRegistrationErrorCodeType =
  | 'HTTP_ENDPOINT_INVALID'
  | 'HTTP_ENDPOINT_RESERVED_PATH'
  | 'HTTP_ENDPOINT_CONFLICT'
  | 'REGISTRATION_SCOPE_CLOSED'
  | 'HTTP_ENDPOINT_REGISTRY_SEALED';

/** @alpha Non-secret details describing an endpoint registration failure. */
export interface IHttpEndpointRegistrationErrorDetails extends Record<
  string,
  unknown
> {
  readonly method?: string;
  readonly path?: string;
  readonly canonicalPath?: string;
  readonly conflictingOwnerId?: string;
  readonly ownerId?: string;
}

/** @alpha Error raised when an endpoint declaration cannot be accepted. */
export class HttpEndpointRegistrationError extends PlatformSdkError {
  declare readonly code: HttpEndpointRegistrationErrorCodeType;

  constructor(
    code: HttpEndpointRegistrationErrorCodeType,
    message: string,
    details?: IHttpEndpointRegistrationErrorDetails,
  ) {
    super(code, message, details);
    this.name = 'HttpEndpointRegistrationError';
  }
}
