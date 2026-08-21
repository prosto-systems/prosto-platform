import type {
  AdminShellPermissionType,
  IAdminShellAuthorization,
  IAdminShellContext,
} from '@/index.js';
import { describe, expectTypeOf, it } from 'vitest';

describe('admin authorization contract', () => {
  it('keeps permission checks framework-neutral', () => {
    expectTypeOf<
      IAdminShellContext['auth']
    >().toEqualTypeOf<IAdminShellAuthorization>();

    expectTypeOf<IAdminShellAuthorization['can']>()
      .parameter(0)
      .toEqualTypeOf<AdminShellPermissionType>();

    expectTypeOf<
      IAdminShellAuthorization['can']
    >().returns.toEqualTypeOf<boolean>();
  });
});
