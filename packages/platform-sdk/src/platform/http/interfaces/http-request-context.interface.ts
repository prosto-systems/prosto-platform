import type { HttpMethodType } from '../constants/index.js';

/** @alpha A copied untrusted header or query value. */
export type HttpRequestValueType = string | readonly string[];

/** @alpha A JSON object parsed from an untrusted request field. */
export interface IHttpJsonObject {
  readonly [key: string]: HttpJsonValueType;
}

/** @alpha A JSON-compatible value parsed from an untrusted request field. */
export type HttpJsonValueType =
  | string
  | number
  | boolean
  | null
  | readonly HttpJsonValueType[]
  | IHttpJsonObject;

/** @alpha A parsed multipart field supplied by an untrusted client. */
export interface IHttpMultipartField {
  readonly kind: 'field';
  /** Untrusted multipart field name. */
  readonly name: string;
  /** Untrusted field media type when supplied by the client. */
  readonly mediaType: string | undefined;
  /** Untrusted field transfer encoding when supplied by the client. */
  readonly encoding: string | undefined;
  /** Decoded field value, parsed as JSON only when the adapter recognizes JSON. */
  readonly value: HttpJsonValueType;
}

/** @alpha A streamed multipart file supplied by an untrusted client. */
export interface IHttpMultipartFile {
  readonly kind: 'file';
  /** Untrusted multipart field name. */
  readonly name: string;
  /** Untrusted client-provided filename. */
  readonly filename: string | undefined;
  /** Untrusted file media type when supplied by the client. */
  readonly mediaType: string | undefined;
  /** Untrusted file transfer encoding when supplied by the client. */
  readonly encoding: string | undefined;
  /**
   * One-shot file stream. It must be fully consumed or cancelled before the
   * multipart iterator advances or the endpoint handler returns.
   */
  readonly stream: ReadableStream<Uint8Array>;
}

/** @alpha A streamed multipart item supplied by an untrusted client. */
export type HttpMultipartPartType = IHttpMultipartField | IHttpMultipartFile;

/** @alpha A request body supplied to a platform endpoint handler. */
export type HttpRequestBodyType =
  | { readonly kind: 'none' }
  | { readonly kind: 'json'; readonly value: unknown }
  | { readonly kind: 'text'; readonly value: string }
  | {
      readonly kind: 'stream';
      readonly mediaType: string;
      readonly stream: ReadableStream<Uint8Array>;
    }
  | {
      readonly kind: 'multipart';
      readonly parts: AsyncIterable<HttpMultipartPartType>;
    };

/**
 * @alpha
 * Framework-neutral, immutable input for an HTTP endpoint handler.
 *
 * Every field derived from the network is untrusted. Request streams are
 * one-shot and handler-owned only until the handler returns.
 */
export interface IHttpRequestContext {
  /** Untrusted request method validated by the adapter for this endpoint. */
  readonly method: HttpMethodType;
  /** Request-local URL parsed by the adapter from untrusted request data. */
  readonly url: URL;
  /** Copied headers preserving repeated, untrusted values. */
  readonly headers: Readonly<Record<string, HttpRequestValueType>>;
  /** Copied path parameters containing untrusted values. */
  readonly params: Readonly<Record<string, string>>;
  /** Copied query values preserving repeated, untrusted values. */
  readonly query: Readonly<Record<string, HttpRequestValueType>>;
  /** Request body, potentially exposing handler-owned one-shot streams. */
  readonly body: HttpRequestBodyType;
  /** Aborts on client disconnect, handler timeout, or application shutdown. */
  readonly signal: AbortSignal;
  /** Request correlation identifier generated or accepted by the adapter. */
  readonly correlationId: string;
}
