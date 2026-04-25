import {
  type IRuntimeFailureDiagnostic,
  type IRuntimeShutdownReport,
  type IRuntimeStartupReport,
  type IShutdownReportInput,
  type IStartupReportInput,
  RuntimeStartupStatus,
} from './diagnostics.types.js';
import { dateNowIso, redactSecretsInMessage } from '../utils/common.utils.js';

function sanitizeFailure(failure: IRuntimeFailureDiagnostic): IRuntimeFailureDiagnostic {
  return {
    ...failure,
    message: redactSecretsInMessage(failure.message),
    remediationHint: redactSecretsInMessage(failure.remediationHint),
  };
}

export function createStartupReport(input: IStartupReportInput): IRuntimeStartupReport {
  const failedModules = input.failedModules.map(sanitizeFailure);
  const degraded = input.skippedModules.length > 0;
  const hasFatalFailure = failedModules.length > 0 && input.loadedModules.length === 0;
  const status = hasFatalFailure
    ? RuntimeStartupStatus.Failed
    : degraded
      ? RuntimeStartupStatus.Degraded
      : RuntimeStartupStatus.Success;

  return {
    type: 'startup',
    status,
    policyMode: input.policyMode,
    correlationId: input.correlationId,
    startedAt: input.startedAt,
    completedAt: dateNowIso(),
    degraded,
    loadedModules: [...input.loadedModules],
    skippedModules: input.skippedModules.map((skipped) => ({
      ...skipped,
      reason: sanitizeFailure(skipped.reason),
    })),
    failedModules,
  };
}

export function createShutdownReport(input: IShutdownReportInput): IRuntimeShutdownReport {
  return {
    type: 'shutdown',
    correlationId: input.correlationId,
    startedAt: input.startedAt,
    completedAt: dateNowIso(),
    stopOrder: [...input.stopOrder],
    issues: input.issues.map((issue) => ({
      ...issue,
      message: redactSecretsInMessage(issue.message),
      remediationHint: redactSecretsInMessage(issue.remediationHint),
    })),
  };
}
