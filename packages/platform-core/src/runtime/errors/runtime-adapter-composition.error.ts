/** @alpha Error codes raised while validating required runtime adapters. */
export type RuntimeAdapterCompositionErrorCodeType =
  | 'MISSING_ADAPTERS'
  | 'INVALID_ADAPTER'
  | 'DUPLICATE_ADAPTER_ID'
  | 'REUSED_ADAPTER_INSTANCE'
  | 'MISMATCHED_ADAPTER_ROLE'
  | 'MISMATCHED_ADMIN_ID'
  | 'MISPLACED_ADAPTER_CONFIGURATION';

/** @alpha Raised before module discovery when adapter composition is invalid. */
export class RuntimeAdapterCompositionError extends Error {
  constructor(
    public readonly code: RuntimeAdapterCompositionErrorCodeType,
    message: string,
  ) {
    super(message);
    this.name = 'RuntimeAdapterCompositionError';
  }
}
