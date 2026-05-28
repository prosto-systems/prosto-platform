/**
 * @alpha
 * Standardized failure code taxonomy for CI consumers.
 * CT – Contract Test.
 */
export enum ContractFailureCodes {
  ManifestSchemaInvalid = 'CT_MANIFEST_SCHEMA_INVALID',
  ManifestSemanticInvalid = 'CT_MANIFEST_SEMANTIC_INVALID',
  LifecycleMethodMissing = 'CT_LIFECYCLE_METHOD_MISSING',
  LifecycleMethodFailed = 'CT_LIFECYCLE_METHOD_FAILED',
  CapabilityMissing = 'CT_CAPABILITY_MISSING',
  CapabilityDuplicate = 'CT_CAPABILITY_DUPLICATE',
  SecurityClassMissing = 'CT_SECURITY_CLASS_MISSING',
  SecuritySignatureOrChecksumMissing = 'CT_SECURITY_SIGNATURE_OR_CHECKSUM_MISSING',
  ObservabilityCapabilityMissing = 'CT_OBSERVABILITY_CAPABILITY_MISSING',
}
