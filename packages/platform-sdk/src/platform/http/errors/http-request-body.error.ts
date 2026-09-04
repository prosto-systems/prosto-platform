import { PlatformSdkError } from '@/platform/errors/index.js';

/** @alpha Error codes emitted while a request body is read. */
export type HttpRequestBodyErrorCodeType =
  | 'BODY_ALREADY_CONSUMED'
  | 'PAYLOAD_TOO_LARGE'
  | 'MULTIPART_FIELDS_LIMIT'
  | 'MULTIPART_FILES_LIMIT'
  | 'MULTIPART_PARTS_LIMIT';

/** @alpha Non-secret details describing a request body failure. */
export interface IHttpRequestBodyErrorDetails extends Record<string, unknown> {
  readonly limit?: number;
  readonly received?: number;
}

/** @alpha Error raised by an HTTP adapter while consuming a request body. */
export class HttpRequestBodyError extends PlatformSdkError {
  declare readonly code: HttpRequestBodyErrorCodeType;

  constructor(
    code: HttpRequestBodyErrorCodeType,
    message: string,
    details?: IHttpRequestBodyErrorDetails,
  ) {
    super(code, message, details);
    this.name = 'HttpRequestBodyError';
  }
}
