/**
 * @alpha
 * Per-request options for ArtifactFetcher.
 */
export interface IArtifactFetchRequestOptions {
  timeoutMs?: number;
  authToken?: string;
  authType?: 'bearer' | 'basic';
  followRedirects?: boolean;
  headers?: Record<string, string>;
}

/**
 * @alpha
 * Abstraction for HTTP client to fetch artifacts.
 */
export interface IHttpClient {
  fetch(url: string, options?: IArtifactFetchRequestOptions): Promise<Buffer>
}
