import { Readable, Transform } from 'node:stream';
import type { FastifyRequest } from 'fastify';
import {
  HttpRequestBodyError,
  type HttpMethodType,
  type HttpJsonValueType,
  type HttpMultipartPartType,
  type HttpRequestBodyType,
  type HttpRequestValueType,
  type IHttpRequestContext,
} from '@prosto/platform-sdk';
import type { FastifyHttpApplicationConfigurationType } from '@/schemas/index.js';

interface IParsedJsonBody {
  readonly kind: 'json';
  readonly value: unknown;
}

interface IParsedTextBody {
  readonly kind: 'text';
  readonly value: string;
}

interface IRawStreamBody {
  readonly kind: 'stream';
  readonly stream: Readable;
}

type ParsedHttpBodyType = IParsedJsonBody | IParsedTextBody | IRawStreamBody;

/** @internal Typed parser result used only between Fastify and the adapter. */
export function createParsedJsonBody(value: unknown): IParsedJsonBody {
  return { kind: 'json', value };
}

/** @internal Typed parser result used only between Fastify and the adapter. */
export function createParsedTextBody(value: string): IParsedTextBody {
  return { kind: 'text', value };
}

/** @internal Typed parser result used only between Fastify and the adapter. */
export function createRawStreamBody(stream: Readable): IRawStreamBody {
  return { kind: 'stream', stream };
}

/** @internal Sanitized transport failure for malformed HTTP input. */
export class HttpTransportError extends Error {
  constructor(
    readonly responseCode:
      | 'invalid_request'
      | 'payload_too_large'
      | 'unsupported_media_type'
      | 'request_timeout',
    readonly statusCode: 400 | 408 | 413 | 415,
  ) {
    super('HTTP request could not be processed.');
    this.name = 'HttpTransportError';
  }
}

/** @internal Owns request-stream cleanup until an endpoint handler returns. */
export interface IRequestBodyCleanup {
  cleanup(): Promise<void>;
}

/** @internal Maps framework request data to the SDK HTTP request context. */
export class FastifyRequestContextMapper {
  constructor(
    private readonly configuration: FastifyHttpApplicationConfigurationType,
    private readonly shutdownSignal: AbortSignal,
  ) {}

  create(
    request: FastifyRequest,
    method: HttpMethodType,
    correlationId: string,
  ): {
    readonly context: IHttpRequestContext;
    readonly cleanup: IRequestBodyCleanup;
    readonly handlerTimeoutSignal: AbortSignal;
  } {
    const bodyMapping = this.createBody(request, method);
    const handlerTimeoutSignal = AbortSignal.timeout(
      this.configuration.handlerTimeoutMs,
    );
    const signal = AbortSignal.any([
      request.signal,
      handlerTimeoutSignal,
      this.shutdownSignal,
    ]);

    return {
      context: Object.freeze({
        method,
        url: createRequestUrl(request),
        headers: copyRequestValues(request.headers),
        params: copyParams(request.params),
        query: copyRequestValues(asRecord(request.query)),
        body: bodyMapping.body,
        signal,
        correlationId,
      }),
      cleanup: bodyMapping.cleanup,
      handlerTimeoutSignal,
    };
  }

  private createBody(
    request: FastifyRequest,
    method: HttpMethodType,
  ): {
    readonly body: HttpRequestBodyType;
    readonly cleanup: IRequestBodyCleanup;
  } {
    if (method === 'GET' || method === 'HEAD') {
      request.raw.resume();

      return { body: { kind: 'none' }, cleanup: NOOP_CLEANUP };
    }

    if (request.isMultipart()) {
      return createMultipartBody(
        request,
        this.configuration.multipartLimits.totalSizeBytes,
      );
    }

    const parsedBody = request.body as ParsedHttpBodyType | undefined;

    if (parsedBody?.kind === 'json') {
      return { body: parsedBody, cleanup: NOOP_CLEANUP };
    }

    if (parsedBody?.kind === 'text') {
      return { body: parsedBody, cleanup: NOOP_CLEANUP };
    }

    if (parsedBody?.kind === 'stream') {
      return createStreamBody(parsedBody.stream, request.mediaType);
    }

    if (hasRequestBody(request)) {
      throw new HttpTransportError('unsupported_media_type', 415);
    }

    return { body: { kind: 'none' }, cleanup: NOOP_CLEANUP };
  }
}

/** @internal Counts bytes before Fastify or Busboy consumes a request stream. */
export function createCountingStream(
  payload: Readable,
  limit: number,
): Readable {
  let received = 0;
  const counter = new Transform({
    transform(chunk: unknown, _encoding, callback): void {
      if (!Buffer.isBuffer(chunk) && !(chunk instanceof Uint8Array)) {
        callback(new HttpTransportError('invalid_request', 400));
        return;
      }

      received += chunk.byteLength;

      if (received > limit) {
        callback(
          new HttpRequestBodyError(
            'PAYLOAD_TOO_LARGE',
            'Payload is too large.',
            {
              limit,
              received,
            },
          ),
        );
        return;
      }

      callback(null, chunk);
    },
  });

  payload.pipe(counter);

  return counter;
}

/** @internal Enforces a multipart total without consuming Busboy's raw stream. */
export function enforcePayloadLimit(payload: Readable, limit: number): void {
  let received = 0;

  payload.on('data', (chunk: unknown): void => {
    if (!Buffer.isBuffer(chunk) && !(chunk instanceof Uint8Array)) {
      payload.destroy(new HttpTransportError('invalid_request', 400));
      return;
    }

    received += chunk.byteLength;

    if (received > limit) {
      payload.destroy(
        new HttpRequestBodyError('PAYLOAD_TOO_LARGE', 'Payload is too large.', {
          limit,
          received,
        }),
      );
    }
  });
}

export function parseJsonBody(rawBody: string): IParsedJsonBody {
  try {
    return createParsedJsonBody(JSON.parse(rawBody) as unknown);
  } catch {
    throw new HttpTransportError('invalid_request', 400);
  }
}

const NOOP_CLEANUP: IRequestBodyCleanup = {
  cleanup: async (): Promise<void> => undefined,
};

function createStreamBody(
  stream: Readable,
  mediaType: string | undefined,
): {
  readonly body: HttpRequestBodyType;
  readonly cleanup: IRequestBodyCleanup;
} {
  if (mediaType === undefined) {
    throw new HttpTransportError('unsupported_media_type', 415);
  }

  return {
    body: {
      kind: 'stream',
      mediaType,
      stream: Readable.toWeb(stream) as ReadableStream<Uint8Array>,
    },
    cleanup: {
      cleanup: async (): Promise<void> => {
        await drainReadable(stream);
      },
    },
  };
}

function createMultipartBody(
  request: FastifyRequest,
  totalSizeLimit: number,
): {
  readonly body: HttpRequestBodyType;
  readonly cleanup: IRequestBodyCleanup;
} {
  const iterator = request.parts();
  let consumed = false;
  let totalLimitWatching = false;
  let activeFile: Readable | undefined;

  const nextPart = async (): Promise<
    IteratorResult<Awaited<ReturnType<typeof iterator.next>>['value']>
  > => {
    const result = iterator.next();

    if (!totalLimitWatching) {
      totalLimitWatching = true;
      // Starting the iterator pipes the raw request to Busboy first.
      enforcePayloadLimit(request.raw, totalSizeLimit);
    }

    return await result;
  };

  const parts: AsyncIterable<HttpMultipartPartType> = {
    [Symbol.asyncIterator](): AsyncIterator<HttpMultipartPartType> {
      if (consumed) {
        throw new HttpRequestBodyError(
          'BODY_ALREADY_CONSUMED',
          'Multipart request body was already consumed.',
        );
      }

      consumed = true;

      return {
        async next(): Promise<IteratorResult<HttpMultipartPartType>> {
          await drainReadable(activeFile);
          activeFile = undefined;

          const result = await nextPart();

          if (result.done) {
            return { done: true, value: undefined };
          }

          const part = result.value;

          if (part.type === 'field') {
            return {
              done: false,
              value: {
                kind: 'field',
                name: part.fieldname,
                mediaType: part.mimetype || undefined,
                encoding: part.encoding || undefined,
                value: part.value as HttpJsonValueType,
              },
            };
          }

          activeFile = part.file;

          return {
            done: false,
            value: {
              kind: 'file',
              name: part.fieldname,
              filename: part.filename || undefined,
              mediaType: part.mimetype || undefined,
              encoding: part.encoding || undefined,
              stream: Readable.toWeb(part.file) as ReadableStream<Uint8Array>,
            },
          };
        },
      };
    },
  };

  return {
    body: { kind: 'multipart', parts },
    cleanup: {
      cleanup: async (): Promise<void> => {
        await drainReadable(activeFile);
        activeFile = undefined;

        if (!consumed) {
          consumed = true;
        }

        let result = await nextPart();

        while (!result.done) {
          const part = result.value;

          if (part.type === 'file') {
            await drainReadable(part.file);
          }

          result = await nextPart();
        }
      },
    },
  };
}

function copyRequestValues(
  source: Record<string, unknown>,
): Readonly<Record<string, HttpRequestValueType>> {
  const values: Record<string, HttpRequestValueType> = {};

  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string') {
      values[key] = value;
    } else if (Array.isArray(value)) {
      values[key] = Object.freeze(value.map((item) => String(item)));
    } else if (typeof value === 'number') {
      values[key] = String(value);
    }
  }

  return Object.freeze(values);
}

function copyParams(source: unknown): Readonly<Record<string, string>> {
  const params: Record<string, string> = {};

  if (typeof source === 'object' && source !== null) {
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'string') {
        params[key] = value;
      }
    }
  }

  return Object.freeze(params);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function createRequestUrl(request: FastifyRequest): URL {
  const protocol = request.protocol === 'https' ? 'https' : 'http';

  try {
    return new URL(request.url, `${protocol}://${request.host}`);
  } catch {
    return new URL(request.url, `${protocol}://localhost`);
  }
}

function hasRequestBody(request: FastifyRequest): boolean {
  const contentLength = request.headers['content-length'];
  const transferEncoding = request.headers['transfer-encoding'];

  return (
    (typeof contentLength === 'string' && contentLength !== '0') ||
    transferEncoding !== undefined
  );
}

async function drainReadable(stream: Readable | undefined): Promise<void> {
  if (stream === undefined || stream.readableEnded || stream.destroyed) {
    return;
  }

  stream.resume();

  for await (const _chunk of stream) {
    // Draining releases Busboy/Fastify when a handler leaves a part unread.
  }
}
