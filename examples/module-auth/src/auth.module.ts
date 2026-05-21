import type {
  IModuleContext,
  IPlatformModule,
  IPlatformModuleManifest,
} from '@prosto/platform-sdk';

/**
 * @internal
 * Reference module used to validate contract conformance.
 */
export class AuthModule implements IPlatformModule {
  readonly manifest: IPlatformModuleManifest = {
    id: 'module-auth',
    version: '1.0.0',
    sdkVersion: '^0.1.0',
    criticality: 'critical',
    securityClass: 'trusted',
    capabilities: [
      'lifecycle.register',
      'lifecycle.start',
      'feature.auth',
      'security.rbac',
      'obs.audit',
    ],
    dependencies: [],
    signature: 'signature:auth-module-reference',
  };

  register(_ctx: IModuleContext): void {
    console.log('Auth module registered.');
  }

  init(_ctx: IModuleContext): void {
    console.log('Auth module initialized.');
  }

  start(_ctx: IModuleContext): void {
    console.log('Auth module started.');
  }

  stop(_ctx: IModuleContext): void {
    console.log('Auth module stopped.');
  }
}
