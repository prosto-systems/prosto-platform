import type { ApiErrorCodeType } from './errors/api-error';
import { z } from 'zod';
import { ApiError } from './errors';

const apiErrorResponseSchema = z.object({
  code: z.string().min(1).optional(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  correlationId: z.string().min(1).optional(),
});

export interface IUnauthorizedRequest {
  readonly method: NonNullable<IRequestOptions<never>['method']>;
  readonly path: string;
}

export type UnauthorizedHandlerType = (
  request: IUnauthorizedRequest,
) => void | Promise<void>;

export interface IRequestOptions<TResponse> {
  readonly method?: 'GET' | 'PATCH' | 'POST';
  readonly body?: unknown;
  readonly responseSchema?: z.ZodType<TResponse>;
  readonly headers?: HeadersInit;
}

export class HttpClient {
  #onUnauthorized?: UnauthorizedHandlerType;

  public setUnauthorizedHandler(handler: UnauthorizedHandlerType): void {
    this.#onUnauthorized = handler;
  }

  public async request<TResponse>(
    path: string,
    options: IRequestOptions<TResponse> = {},
  ): Promise<TResponse> {
    const headers = new Headers(options.headers);
    let body: string | undefined;

    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(options.body);
    }

    let response: Response;

    try {
      response = await fetch(path, {
        body,
        headers,
        method: options.method ?? 'GET',
        credentials: 'same-origin',
      });
    } catch {
      throw new ApiError({ status: 0, code: 'network_error' });
    }

    if (!response.ok) {
      const error = await this._createError(response);

      if (error.status === 401) {
        const unauthorizedRequest: IUnauthorizedRequest = {
          method: options.method ?? 'GET',
          path,
        };

        if (import.meta.env.DEV) {
          console.debug(
            '[auth diagnostics] Unauthorized API request',
            unauthorizedRequest,
          );
        }

        await this.#onUnauthorized?.(unauthorizedRequest);
      }

      throw error;
    }

    if (options.responseSchema === undefined) {
      return undefined as TResponse;
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      throw new ApiError({ status: response.status, code: 'invalid_response' });
    }

    const parsed = options.responseSchema.safeParse(payload);

    if (!parsed.success) {
      throw new ApiError({ status: response.status, code: 'invalid_response' });
    }

    return parsed.data;
  }

  private async _createError(response: Response): Promise<ApiError> {
    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }

    const parsed = apiErrorResponseSchema.safeParse(payload);

    return new ApiError({
      code: parsed.success
        ? (parsed.data.code ?? this._defaultCode(response.status))
        : this._defaultCode(response.status),
      correlationId: parsed.success ? parsed.data.correlationId : undefined,
      fieldErrors: parsed.success ? parsed.data.fieldErrors : undefined,
      status: response.status,
    });
  }

  private _defaultCode(status: number): ApiErrorCodeType {
    if (status === 401) {
      return 'unauthorized';
    }

    return 'request_failed';
  }
}

export const httpClient = new HttpClient();
