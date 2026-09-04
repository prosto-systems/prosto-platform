/** @alpha Minimal sanitized error response emitted by an HTTP adapter. */
export interface IHttpErrorResponse {
  readonly code:
    | 'invalid_request'
    | 'not_found'
    | 'payload_too_large'
    | 'unsupported_media_type'
    | 'request_timeout'
    | 'internal_error';
  readonly correlationId: string;
}
