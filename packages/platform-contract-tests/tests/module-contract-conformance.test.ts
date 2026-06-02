import { describe, expect, it } from 'vitest';
import type {
  IModuleContext,
  IPlatformModule,
  IPlatformModuleManifest,
} from '@prosto/platform-sdk';
import {
  CAPABILITY_CHECK_RESULT_ID,
  ContractFailureCodes,
  LIFECYCLE_CHECK_RESULT_ID,
  OBSERVABILITY_CHECK_RESULT_ID,
  runModuleContractConformance,
  toConformanceReportJson,
} from '@/index.js';

const validManifest: IPlatformModuleManifest = {
  id: 'module-health',
  version: '1.0.0',
  sdkVersion: '^0.1.0',
  criticality: 'standard',
  securityClass: 'internal',
  capabilities: [
    'lifecycle.register',
    'lifecycle.start',
    'obs.metrics',
    'feature.health',
  ],
  dependencies: [],
  checksum:
    'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
};

class ValidModule implements IPlatformModule {
  readonly manifest = validManifest;
  register(_ctx: IModuleContext): void {
    /* empty */
  }
  init(_ctx: IModuleContext): void {
    /* empty */
  }
  start(_ctx: IModuleContext): void {
    /* empty */
  }
  stop(_ctx: IModuleContext): void {
    /* empty */
  }
}

class BrokenModuleMissingCapability extends ValidModule {
  override readonly manifest: IPlatformModuleManifest = {
    ...validManifest,
    id: 'module-broken-capability',
    capabilities: ['lifecycle.register', 'obs.metrics'],
  };
}

class BrokenModuleLifecycleFailure extends ValidModule {
  override readonly manifest: IPlatformModuleManifest = {
    ...validManifest,
    id: 'module-broken-lifecycle',
  };

  override start(_ctx: IModuleContext): void {
    throw new Error('start failed');
  }
}

class BrokenModuleNoObservability extends ValidModule {
  override readonly manifest: IPlatformModuleManifest = {
    ...validManifest,
    id: 'module-broken-observability',
    capabilities: ['lifecycle.register', 'lifecycle.start', 'feature.auth'],
  };
}

describe('module contract conformance', () => {
  it('returns pass summary for a valid module', async () => {
    const report = await runModuleContractConformance({
      module: new ValidModule(),
      now: () => '2026-03-31T00:00:00.000Z',
    });

    expect(report.summary.result).toBe('pass');
    expect(report.summary.failedMandatoryChecks).toBe(0);
    expect(report.moduleId).toBe('module-health');
  });

  it('returns fail summary when mandatory capability check fails', async () => {
    const report = await runModuleContractConformance({
      module: new BrokenModuleMissingCapability(),
    });

    expect(report.summary.result).toBe('fail');
    expect(report.summary.failedMandatoryChecks).toBe(1);

    const capabilityCheck = report.checks.find(
      (check) => check.id === CAPABILITY_CHECK_RESULT_ID,
    );

    expect(capabilityCheck?.passed).toBe(false);
    expect(capabilityCheck?.code).toBe(ContractFailureCodes.CapabilityMissing);
  });

  it('returns lifecycle failure code on lifecycle method exception', async () => {
    const report = await runModuleContractConformance({
      module: new BrokenModuleLifecycleFailure(),
    });

    const lifecycleCheck = report.checks.find(
      (check) => check.id === LIFECYCLE_CHECK_RESULT_ID,
    );

    expect(lifecycleCheck?.passed).toBe(false);
    expect(lifecycleCheck?.code).toBe(
      ContractFailureCodes.LifecycleMethodFailed,
    );
    expect(report.summary.result).toBe('fail');
  });

  it('marks observability absence as advisory warning without failing mandatory gate', async () => {
    const report = await runModuleContractConformance({
      module: new BrokenModuleNoObservability(),
    });

    const observabilityCheck = report.checks.find(
      (check) => check.id === OBSERVABILITY_CHECK_RESULT_ID,
    );

    expect(observabilityCheck?.passed).toBe(false);
    expect(observabilityCheck?.severity).toBe('advisory');
    expect(observabilityCheck?.code).toBe(
      ContractFailureCodes.ObservabilityCapabilityMissing,
    );
    expect(report.summary.failedMandatoryChecks).toBe(0);
    expect(report.summary.failedAdvisoryChecks).toBe(1);
    expect(report.summary.result).toBe('pass');
  });

  it('serializes machine-readable report as deterministic JSON', async () => {
    const report = await runModuleContractConformance({
      module: new ValidModule(),
      now: () => '2026-03-31T00:00:00.000Z',
    });

    const serialized = toConformanceReportJson(report);

    expect(serialized).toContain('"moduleId": "module-health"');
    expect(serialized).toContain('"result": "pass"');
    expect(serialized.endsWith('\n')).toBe(true);
  });
});
