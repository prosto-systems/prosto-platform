import type { HttpMethodType } from '../constants/index.js';
import type { IHttpRequestContext } from './http-request-context.interface.js';

/** @alpha A function that handles one platform HTTP endpoint request. */
export type HttpEndpointHandlerType = (
  context: IHttpRequestContext,
) => Response | Promise<Response>;

/**
 * @alpha
 * A framework-neutral endpoint declaration.
 *
 * Paths are absolute, case-sensitive, and preserve trailing slashes. Supported
 * grammar is literal segments, `:parameter` segments, and at most one terminal
 * `*` segment. Inline regular expressions, optional parameters, and other
 * adapter-specific syntax are not supported.
 */
export interface IHttpEndpoint {
  readonly method: HttpMethodType;
  readonly path: string;
  readonly handler: HttpEndpointHandlerType;
}
