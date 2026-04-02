# Compatibility Matrix

## Scope

This matrix tracks Phase 04 contract conformance between the SDK baseline and internal reference modules.

## Baseline Record

```yaml
sdk_version: 0.0.0
contract_suite_package: @prosto/platform-contract-tests@0.0.0
generated_at: 2026-03-31T00:00:00.000Z
modules:
  - id: module-health
    version: 1.0.0
    result: pass
    mandatory_failures: 0
    advisory_failures: 0
  - id: module-auth
    version: 1.0.0
    result: pass
    mandatory_failures: 0
    advisory_failures: 0
```

## Failure Taxonomy Source

Failure codes are defined by `@prosto/platform-contract-tests` and exported as `ContractFailureCodes`.

Current baseline codes:
- `CT_MANIFEST_SCHEMA_INVALID`
- `CT_MANIFEST_SEMANTIC_INVALID`
- `CT_LIFECYCLE_METHOD_MISSING`
- `CT_LIFECYCLE_METHOD_FAILED`
- `CT_CAPABILITY_MISSING`
- `CT_CAPABILITY_DUPLICATE`
- `CT_SECURITY_CLASS_MISSING`
- `CT_SECURITY_SIGNATURE_OR_CHECKSUM_MISSING`
- `CT_OBSERVABILITY_CAPABILITY_MISSING`

## Update Rule

Update this matrix whenever one of the following changes:
1. SDK version used by contract suite.
2. Contract suite behavior or failure taxonomy.
3. Reference module manifest/lifecycle behavior.
4. CI contract gate result on protected branches.
