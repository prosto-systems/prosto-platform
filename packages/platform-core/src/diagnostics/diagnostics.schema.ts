import type {
  IRuntimeOperationalReports,
  IRuntimeStartupReport,
} from './diagnostics.types.js';
import { assert } from '../utils/common.utils.js';

function assertStartupReport(report: IRuntimeStartupReport): void {
  assert(report.type === 'startup', 'startup.type must equal "startup"');
  assert(typeof report.policyMode === 'string', 'startup.policyMode must be present');
  assert(typeof report.correlationId === 'string' && report.correlationId.length > 0, 'startup.correlationId is required');
  assert(typeof report.startedAt === 'string' && report.startedAt.length > 0, 'startup.startedAt is required');
  assert(typeof report.completedAt === 'string' && report.completedAt.length > 0, 'startup.completedAt is required');
  assert(Array.isArray(report.loadedModules), 'startup.loadedModules must be an array');
  assert(Array.isArray(report.skippedModules), 'startup.skippedModules must be an array');
  assert(Array.isArray(report.failedModules), 'startup.failedModules must be an array');

  for (const failed of report.failedModules) {
    assert(typeof failed.moduleId === 'string' && failed.moduleId.length > 0, 'failedModules[].moduleId is required');
    assert(typeof failed.phase === 'string' && failed.phase.length > 0, 'failedModules[].phase is required');
    assert(typeof failed.errorCode === 'string' && failed.errorCode.length > 0, 'failedModules[].errorCode is required');
    assert(typeof failed.remediationHint === 'string' && failed.remediationHint.length > 0, 'failedModules[].remediationHint is required');
  }
}

export function validateOperationalReportsSchema(reports: IRuntimeOperationalReports): void {
  assertStartupReport(reports.startup);

  if (reports.shutdown) {
    assert(reports.shutdown.type === 'shutdown', 'shutdown.type must equal "shutdown"');
    assert(typeof reports.shutdown.correlationId === 'string' && reports.shutdown.correlationId.length > 0, 'shutdown.correlationId is required');
    assert(Array.isArray(reports.shutdown.stopOrder), 'shutdown.stopOrder must be an array');
    assert(Array.isArray(reports.shutdown.issues), 'shutdown.issues must be an array');
  }
}
