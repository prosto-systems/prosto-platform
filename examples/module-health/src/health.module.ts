import type {
  IModuleContext,
  IPlatformModule,
  IPlatformModuleManifest,
} from '@prosto/platform-sdk';

/**
 * @internal
 * Reference module used to validate contract conformance.
 */
export class HealthModule implements IPlatformModule {
  readonly manifest: IPlatformModuleManifest = {
    id: 'module-health',
    version: '1.0.0',
    sdkVersion: '^0.1.0',
    criticality: 'normal',
    securityClass: 'internal',
    capabilities: [
      'lifecycle.register',
      'lifecycle.start',
      'feature.health',
      'obs.metrics',
    ],
    dependencies: [],
    checksum: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  };

  register(_ctx: IModuleContext): void {
    // noop
  }

  init(_ctx: IModuleContext): void {
    // noop
  }

  start(_ctx: IModuleContext): void {
    // noop
  }

  stop(_ctx: IModuleContext): void {
    // noop
  }
}
