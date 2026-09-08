import type {
  AdminShellPermissionType,
  IAdminShellAuthService,
  IAdminShellPluginContext,
} from '@/admin/index.js';
import { describe, expectTypeOf, it } from 'vitest';

describe('admin authorization contract', () => {
  it('keeps permission checks framework-neutral', () => {
    expectTypeOf<
      IAdminShellPluginContext['authService']
    >().toEqualTypeOf<IAdminShellAuthService>();

    expectTypeOf<IAdminShellAuthService['can']>()
      .parameter(0)
      .toEqualTypeOf<AdminShellPermissionType>();

    expectTypeOf<
      IAdminShellAuthService['can']
    >().returns.toEqualTypeOf<boolean>();
  });
});
