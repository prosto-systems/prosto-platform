import type { IModuleContext, IPlatformModule } from '@prosto/platform-sdk';

/**
 * @stable
 * Severity level for contract conformance checks.
 */
export type ContractCheckSeverityType = 'mandatory' | 'advisory';

/**
 * @stable
 * Standardized failure code taxonomy for CI consumers.
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

/**
 * @stable
 * Single failure code identifier.
 */
export type ContractFailureCodeType = `${ContractFailureCodes}`;

/**
 * @stable
 * Structured check outcome used in machine-readable reports.
 */
export interface IContractCheckResult {
  id: string;
  title: string;
  passed: boolean;
  /** Severity level for contract conformance checks */
  severity: ContractCheckSeverityType;
  /** Contract failure code */
  code: ContractFailureCodeType | null;
  details: string;
}

/**
 * @stable
 * Conformance summary for quick CI gate decisions.
 */
export interface IContractConformanceSummary {
  totalChecks: number;
  passedChecks: number;
  failedMandatoryChecks: number;
  failedAdvisoryChecks: number;
  result: 'pass' | 'fail';
}

/**
 * @stable
 * Machine-readable report produced by the conformance suite.
 */
export interface IModuleContractConformanceReport {
  moduleId: string;
  moduleVersion: string;
  generatedAt: string;
  checks: IContractCheckResult[];
  summary: IContractConformanceSummary;
}

/**
 * @stable
 * Runtime context for module lifecycle checks.
 */
export interface IModuleLifecycleContextFactory {
  create(module: IPlatformModule): IModuleContext;
}

/**
 * @stable
 * Input contract for conformance execution.
 */
export interface IModuleContractTestInput {
  module: IPlatformModule;
  moduleLifecycleContextFactory?: IModuleLifecycleContextFactory;
  now?: () => string;
}

/**
 * @stable
 * Minimal test runner contract used by createModuleContractTests.
 */
export interface IContractTestRunnerApi {
  describe(name: string, body: () => void): void;
  it(name: string, body: () => Promise<void> | void): void;
}
