import {
  type IPlatformRuntimeAdapterDiagnostic,
  type ISecretsRedactor,
  SecretsRedactor,
} from '@prosto/platform-sdk/platform';
import type { IModuleLifecycleShutdownIssue } from '@/modularity/index.js';
import type {
  IReportBuilder,
  IRuntimeFailureDiagnostic,
  IRuntimeShutdownReport,
  IRuntimeSkippedModuleDiagnostic,
  IRuntimeStartupReport,
  IShutdownReportBuildContext,
  IStartupReportBuildContext,
} from '../interfaces/index.js';
import { RuntimeStartupStatus } from '../constants/index.js';

/**
 * @alpha
 * Abstract base class for diagnostic report builders.
 */
export abstract class ReportBaseBuilder implements IReportBuilder {
  constructor(
    protected readonly _secretsRedactor: ISecretsRedactor = new SecretsRedactor(),
  ) {}

  /**
   * Builds a startup report from the provided context.
   */
  abstract buildStartupReport(
    context: IStartupReportBuildContext,
  ): IRuntimeStartupReport;

  /**
   * Builds a shutdown report from the provided context.
   */
  abstract buildShutdownReport(
    context: IShutdownReportBuildContext,
  ): IRuntimeShutdownReport;

  /**
   * Sanitizes a failure diagnostic by redacting secrets from message fields.
   */
  protected sanitizeFailure(
    failure: IRuntimeFailureDiagnostic,
  ): IRuntimeFailureDiagnostic {
    return {
      ...failure,
      message: this._secretsRedactor.redact(failure.message),
      remediationHint: this._secretsRedactor.redact(failure.remediationHint),
    };
  }

  /**
   * Sanitizes a shutdown issue by redacting secrets from message fields.
   */
  protected sanitizeIssue(
    issue: IModuleLifecycleShutdownIssue,
  ): IModuleLifecycleShutdownIssue {
    return {
      ...issue,
      message: this._secretsRedactor.redact(issue.message),
      remediationHint: this._secretsRedactor.redact(issue.remediationHint),
    };
  }

  /**
   * Determines the startup status from adapter and bootstrap diagnostics.
   */
  protected determineStartupStatus(
    skippedModules: readonly IRuntimeSkippedModuleDiagnostic[],
    failedModules: readonly IRuntimeFailureDiagnostic[],
    hasFatalFailure: boolean,
    adapters: readonly IPlatformRuntimeAdapterDiagnostic[],
  ): RuntimeStartupStatus {
    const hasAdapterFailure = adapters.some(
      (diagnostic) => diagnostic.status === 'failed',
    );
    const hasPlatformFailure = failedModules.some(
      (diagnostic) => diagnostic.moduleId === 'platform',
    );
    if (hasAdapterFailure || hasPlatformFailure || hasFatalFailure) {
      return RuntimeStartupStatus.Failed;
    }

    const degraded = skippedModules.length > 0;

    if (degraded) {
      return RuntimeStartupStatus.Degraded;
    }

    return RuntimeStartupStatus.Success;
  }
}
