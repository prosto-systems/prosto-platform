import type {
  IPlatformModule,
  IPlatformModuleContext,
} from '@prosto/platform-sdk';

/**
 * @internal
 * Reference module used to validate contract conformance.
 */
export class HealthModule implements IPlatformModule {
  init(_ctx: IPlatformModuleContext): void {
    console.log('Health module initialized.');
  }

  start(_ctx: IPlatformModuleContext): void {
    console.log('Health module started.');
  }

  stop(_ctx: IPlatformModuleContext): void {
    console.log('Health module stopped.');
  }
}
