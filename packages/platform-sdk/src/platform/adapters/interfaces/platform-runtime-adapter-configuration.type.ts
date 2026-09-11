/**
 * @alpha
 * Recursively immutable configuration supplied only to the matching adapter.
 */
export type DeepReadonlyType<TValue> = TValue extends (
  ...args: never[]
) => unknown
  ? TValue
  : TValue extends readonly (infer TItem)[]
    ? readonly DeepReadonlyType<TItem>[]
    : TValue extends object
      ? { readonly [TKey in keyof TValue]: DeepReadonlyType<TValue[TKey]> }
      : TValue;

/** @alpha Untyped adapter configuration boundary validated by the adapter. */
export type PlatformRuntimeAdapterConfigurationType = DeepReadonlyType<
  Record<string, unknown>
>;
