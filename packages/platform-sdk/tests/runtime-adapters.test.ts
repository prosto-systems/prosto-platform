import {
  PersistenceDescriptorRegistry,
  PLATFORM_ADMIN_COMPONENT_ID,
  PLATFORM_RUNTIME_ADAPTER_ROLES,
} from '@/platform/index.js';
import { describe, expect, it } from 'vitest';

describe('required runtime-adapter contracts', () => {
  it('defines the three required roles and fixed administration identity', () => {
    expect(PLATFORM_RUNTIME_ADAPTER_ROLES).toEqual([
      'admin',
      'persistence',
      'http',
    ]);
    expect(PLATFORM_ADMIN_COMPONENT_ID).toBe('platform-admin');
  });

  it('isolates persistence descriptors by component identity', () => {
    const registry = new PersistenceDescriptorRegistry();
    const admin = registry.createRegistrar({
      type: 'adapter',
      id: PLATFORM_ADMIN_COMPONENT_ID,
    });
    const module = registry.createRegistrar({
      type: 'module',
      id: 'module-test',
    });

    registry.registerPlatform({
      owner: 'platform',
      ownerId: 'platform',
      payload: { entities: [] },
    });
    admin.register({
      owner: 'adapter',
      ownerId: PLATFORM_ADMIN_COMPONENT_ID,
      payload: { entities: ['AdminUser'] },
    });
    module.register({
      owner: 'module',
      ownerId: 'module-test',
      payload: { entities: ['Example'] },
    });

    expect(registry.seal()).toHaveLength(3);
  });

  it('rejects a descriptor that does not match its scoped registrar', () => {
    const registry = new PersistenceDescriptorRegistry();
    const admin = registry.createRegistrar({
      type: 'adapter',
      id: PLATFORM_ADMIN_COMPONENT_ID,
    });

    expect(() =>
      admin.register({
        owner: 'module',
        ownerId: 'module-test',
        payload: {},
      }),
    ).toThrow(/does not match/);
  });

  it('removes an adapter descriptor before the registry is sealed', () => {
    // Arrange
    const registry = new PersistenceDescriptorRegistry();
    const admin = { type: 'adapter' as const, id: PLATFORM_ADMIN_COMPONENT_ID };
    const registrar = registry.createRegistrar(admin);
    registry.registerPlatform({
      owner: 'platform',
      ownerId: 'platform',
      payload: {},
    });
    registrar.register({
      owner: 'adapter',
      ownerId: PLATFORM_ADMIN_COMPONENT_ID,
      payload: { entities: ['AdminUser'] },
    });

    // Act
    registry.rollback(admin);

    // Assert
    expect(registry.seal()).toEqual([
      expect.objectContaining({ owner: 'platform', ownerId: 'platform' }),
    ]);
    expect(() =>
      registrar.register({
        owner: 'adapter',
        ownerId: PLATFORM_ADMIN_COMPONENT_ID,
        payload: {},
      }),
    ).toThrow(/only be registered while collection is open/);
  });
});
