import type {
  IPlatformHttpResponse,
  PlatformHttpResponseBodyType,
} from '../interfaces/index.js';
import { freezeRecord } from '@/utils/index.js';
import { PlatformHttpError } from '../errors/index.js';

export interface IPlatformHttpResponseInput {
  readonly status: number;
  readonly headers?: Record<string, string>;
  readonly body?: PlatformHttpResponseBodyType;
}

/**
 * @alpha
 * Immutable framework-neutral HTTP response value object.
 * Validates integer status, string-only custom headers, and body/status consistency.
 */
export class PlatformHttpResponse implements IPlatformHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: PlatformHttpResponseBodyType;

  private readonly STATUS_NO_BODY = new Set([204, 304]);
  private readonly RESERVED_HEADER_NAMES = new Set([
    'content-type',
    'content-length',
    'content-disposition',
    'x-correlation-id',
    'set-cookie',
  ]);

  constructor(input: IPlatformHttpResponseInput) {
    this.status = this._validateStatus(input.status);

    const customHeaders = input.headers ?? {};

    this._validateCustomHeaders(customHeaders);

    this.headers = freezeRecord(customHeaders);

    const bodyInput: PlatformHttpResponseBodyType = input.body ?? {
      variant: 'empty' as const,
    };
    this.body = this._normalizeBody(bodyInput);

    if (this.STATUS_NO_BODY.has(this.status) && this.body.variant !== 'empty') {
      throw new PlatformHttpError(
        'INVALID_BODY_METADATA',
        `Response body must be empty for status ${this.status}.`,
        { status: this.status, bodyVariant: this.body.variant },
      );
    }

    Object.freeze(this);
  }

  private _validateStatus(status: number): number {
    if (!Number.isInteger(status) || status < 100 || status > 599) {
      throw new PlatformHttpError(
        'INVALID_STATUS_CODE',
        `Status code must be an integer between 100 and 599, got ${status}.`,
        { status },
      );
    }

    return status;
  }

  private _validateCustomHeaders(headers: Record<string, string>): void {
    for (const name of Object.keys(headers)) {
      const lower = name.toLowerCase();

      if (this.RESERVED_HEADER_NAMES.has(lower)) {
        throw new PlatformHttpError(
          'INVALID_HEADER_NAME',
          `Header "${name}" is reserved and cannot be set as a custom header.`,
          { header: name },
        );
      }
    }
  }

  private _normalizeBody(
    body: PlatformHttpResponseBodyType,
  ): PlatformHttpResponseBodyType {
    switch (body.variant) {
      case 'empty':
        return body;

      case 'json':
        return Object.freeze({
          variant: 'json' as const,
          data: body.data,
        });

      case 'binary': {
        if (!body.contentType) {
          throw new PlatformHttpError(
            'INVALID_BODY_METADATA',
            'Binary response body must have a contentType.',
          );
        }

        return Object.freeze({
          variant: 'binary' as const,
          data: body.data,
          contentType: body.contentType,
          ...(body.contentDisposition !== undefined && {
            contentDisposition: body.contentDisposition,
          }),
        });
      }

      case 'stream': {
        if (!body.contentType) {
          throw new PlatformHttpError(
            'INVALID_BODY_METADATA',
            'Stream response body must have a contentType.',
          );
        }

        return Object.freeze({
          variant: 'stream' as const,
          stream: body.stream,
          contentType: body.contentType,
          ...(body.contentLength !== undefined && {
            contentLength: body.contentLength,
          }),
          ...(body.contentDisposition !== undefined && {
            contentDisposition: body.contentDisposition,
          }),
        });
      }

      default:
        throw new PlatformHttpError(
          'INVALID_BODY_METADATA',
          `Unknown response body variant: ${(body as { variant: string }).variant}`,
        );
    }
  }
}
