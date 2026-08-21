export type ApiErrorCodeType =
  'invalid_response' | 'network_error' | 'request_failed' | 'unauthorized';

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly fieldErrors: Readonly<Record<string, readonly string[]>>;
  public readonly correlationId?: string;

  public constructor(options: {
    status: number;
    code: ApiErrorCodeType | string;
    fieldErrors?: Readonly<Record<string, readonly string[]>>;
    correlationId?: string;
  }) {
    super(options.code);

    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors ?? {};
    this.correlationId = options.correlationId;
  }
}
