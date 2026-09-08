/** @alpha Exact, normalized public asset lookup input. */
export interface IAdminAssetRequest {
  /** Absolute normalized URL pathname without a query or fragment. */
  readonly pathname: string;
  /** Required immutable cache identity supplied by the caller. */
  readonly version: string;
}

/** @alpha Metadata for an opened administration plugin asset. */
export interface IAdminAssetMetadata {
  /** Byte length of the streamed file. */
  readonly contentLength: number;
  /** Exact media type selected by the trusted asset catalog. */
  readonly contentType: string;
  /** Strong entity tag for conditional HTTP delivery. */
  readonly etag: string;
}

/** @alpha One-shot content and metadata for an administration plugin asset. */
export interface IAdminAssetReadResult {
  readonly metadata: IAdminAssetMetadata;
  /** The caller must consume or cancel this one-shot stream. */
  readonly stream: ReadableStream<Uint8Array>;
}

/** @alpha Opens a trusted, declared administration asset on demand. */
export interface IAdminAssetReader {
  open(): Promise<IAdminAssetReadResult>;
}

/**
 * @alpha
 * Resolves only active, declared administration plugin assets. Physical paths
 * and package filesystem details remain private to the implementation.
 */
export interface IAdminAssetCatalog {
  resolveAsset(request: IAdminAssetRequest): IAdminAssetReader | undefined;
}
