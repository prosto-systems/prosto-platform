import type { IAdminPermissionPolicy } from '@prosto/platform-admin-contracts';
import type { IAdminOperatorContext } from '@/admin-bff.interfaces.js';
import { describe, expect, it } from 'vitest';
import { AdminPermissionMappingService } from '@/permissions/admin-permission-mapping.service.js';

function createTestPolicy(): IAdminPermissionPolicy {
  return {
    schemaVersion: 'admin-permission-policy.v1',
    roleMappings: [
      {
        roleId: 'admin',
        permissions: ['admin:read', 'admin:write', 'admin:delete'],
      },
      {
        roleId: 'operator',
        permissions: ['admin:read', 'operator:execute'],
      },
      {
        roleId: 'viewer',
        permissions: ['admin:read'],
      },
    ],
    actionGates: [
      {
        actionId: 'admin.users.read',
        requiredPermissions: ['admin:read'],
        match: 'all',
        effect: 'allow',
      },
      {
        actionId: 'admin.users.write',
        requiredPermissions: ['admin:write'],
        match: 'all',
        effect: 'allow',
      },
      {
        actionId: 'admin.users.delete',
        requiredPermissions: ['admin:delete'],
        match: 'all',
        effect: 'allow',
      },
      {
        actionId: 'admin.users.manage',
        requiredPermissions: ['admin:write', 'admin:delete'],
        match: 'all',
        effect: 'allow',
      },
      {
        actionId: 'admin.restricted',
        requiredPermissions: ['special:permission'],
        match: 'all',
        effect: 'allow',
        remediationHint: 'Request special permission from admin.',
      },
      {
        actionId: 'admin.deny-all',
        requiredPermissions: [],
        match: 'all',
        effect: 'deny',
        remediationHint: 'This action is permanently denied.',
      },
    ],
  };
}

function createOperatorContext(
  roleIds: string[],
  permissions?: string[],
): IAdminOperatorContext {
  return {
    operatorId: 'test-operator',
    roleIds,
    permissions,
  };
}

describe('AdminPermissionMappingService', () => {
  describe('evaluateAction', () => {
    it('should allow action when operator has required permissions via role', () => {
      const service = new AdminPermissionMappingService({
        policy: createTestPolicy(),
      });

      const result = service.evaluateAction(
        'admin.users.read',
        createOperatorContext(['viewer']),
      );

      expect(result.allowed).toBe(true);
      expect(result.actionId).toBe('admin.users.read');
      expect(result.reasonCode).toBeUndefined();
      expect(result.remediationHint).toBeUndefined();
    });

    it('should deny action when operator lacks required permissions', () => {
      const service = new AdminPermissionMappingService({
        policy: createTestPolicy(),
      });

      const result = service.evaluateAction(
        'admin.users.write',
        createOperatorContext(['viewer']),
      );

      expect(result.allowed).toBe(false);
      expect(result.actionId).toBe('admin.users.write');
      expect(result.reasonCode).toBe('PERMISSION_REQUIREMENT_NOT_MET');
      expect(result.remediationHint).toBeUndefined();
    });

    it('should deny action when action gate is not found', () => {
      const service = new AdminPermissionMappingService({
        policy: createTestPolicy(),
      });

      const result = service.evaluateAction(
        'nonexistent.action',
        createOperatorContext(['admin']),
      );

      expect(result.allowed).toBe(false);
      expect(result.actionId).toBe('nonexistent.action');
      expect(result.reasonCode).toBe('ACTION_GATE_NOT_FOUND');
      expect(result.remediationHint).toBe(
        'Declare an action gate policy for this admin action.',
      );
    });

    it('should deny action when effect is deny', () => {
      const service = new AdminPermissionMappingService({
        policy: createTestPolicy(),
      });

      const result = service.evaluateAction(
        'admin.deny-all',
        createOperatorContext(['admin']),
      );

      expect(result.allowed).toBe(false);
      expect(result.actionId).toBe('admin.deny-all');
      expect(result.remediationHint).toBe('This action is permanently denied.');
    });

    it('should allow action with match strategy "any" when at least one permission is met', () => {
      const policy: IAdminPermissionPolicy = {
        schemaVersion: 'admin-permission-policy.v1',
        roleMappings: [
          {
            roleId: 'operator',
            permissions: ['partial:permission'],
          },
        ],
        actionGates: [
          {
            actionId: 'partial.action',
            requiredPermissions: ['partial:permission', 'missing:permission'],
            match: 'any',
            effect: 'allow',
          },
        ],
      };

      const service = new AdminPermissionMappingService({ policy });

      const result = service.evaluateAction(
        'partial.action',
        createOperatorContext(['operator']),
      );

      expect(result.allowed).toBe(true);
    });

    it('should include additional permissions from operator context', () => {
      const service = new AdminPermissionMappingService({
        policy: createTestPolicy(),
      });

      const result = service.evaluateAction(
        'admin.users.read',
        createOperatorContext([], ['admin:read']),
      );

      expect(result.allowed).toBe(true);
    });

    it('should combine role permissions and additional permissions', () => {
      const service = new AdminPermissionMappingService({
        policy: createTestPolicy(),
      });

      const result = service.evaluateAction(
        'admin.users.manage',
        createOperatorContext(['operator'], ['admin:write', 'admin:delete']),
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('hasPermission', () => {
    it('should return true when operator has permission via role', () => {
      const service = new AdminPermissionMappingService({
        policy: createTestPolicy(),
      });

      const result = service.hasPermission(
        'admin:read',
        createOperatorContext(['viewer']),
      );

      expect(result).toBe(true);
    });

    it('should return false when operator lacks permission', () => {
      const service = new AdminPermissionMappingService({
        policy: createTestPolicy(),
      });

      const result = service.hasPermission(
        'admin:delete',
        createOperatorContext(['viewer']),
      );

      expect(result).toBe(false);
    });

    it('should return true when operator has permission via additional permissions', () => {
      const service = new AdminPermissionMappingService({
        policy: createTestPolicy(),
      });

      const result = service.hasPermission(
        'custom:permission',
        createOperatorContext([], ['custom:permission']),
      );

      expect(result).toBe(true);
    });
  });

  describe('filterPermissions', () => {
    it('should return allowed when all required permissions are met', () => {
      const service = new AdminPermissionMappingService({
        policy: createTestPolicy(),
      });

      const result = service.filterPermissions(
        ['admin:read', 'admin:write'],
        createOperatorContext(['admin']),
      );

      expect(result.allowed).toBe(true);
      expect(result.missingPermissions).toHaveLength(0);
    });

    it('should return missing permissions when some are not met', () => {
      const service = new AdminPermissionMappingService({
        policy: createTestPolicy(),
      });

      const result = service.filterPermissions(
        ['admin:read', 'admin:write', 'admin:delete'],
        createOperatorContext(['viewer']),
      );

      expect(result.allowed).toBe(false);
      expect(result.missingPermissions).toEqual([
        'admin:write',
        'admin:delete',
      ]);
    });

    it('should return empty missing when no permissions required', () => {
      const service = new AdminPermissionMappingService({
        policy: createTestPolicy(),
      });

      const result = service.filterPermissions(
        [],
        createOperatorContext(['viewer']),
      );

      expect(result.allowed).toBe(true);
      expect(result.missingPermissions).toHaveLength(0);
    });
  });

  describe('collectGrantedPermissions', () => {
    it('should collect permissions from role mappings', () => {
      const service = new AdminPermissionMappingService({
        policy: createTestPolicy(),
      });

      const permissions = service.collectGrantedPermissions(
        createOperatorContext(['admin']),
      );

      expect(permissions.has('admin:read')).toBe(true);
      expect(permissions.has('admin:write')).toBe(true);
      expect(permissions.has('admin:delete')).toBe(true);
    });

    it('should combine role permissions and additional permissions', () => {
      const service = new AdminPermissionMappingService({
        policy: createTestPolicy(),
      });

      const permissions = service.collectGrantedPermissions(
        createOperatorContext(['viewer'], ['custom:permission']),
      );

      expect(permissions.has('admin:read')).toBe(true);
      expect(permissions.has('custom:permission')).toBe(true);
    });

    it('should return only additional permissions when no roles match', () => {
      const service = new AdminPermissionMappingService({
        policy: createTestPolicy(),
      });

      const permissions = service.collectGrantedPermissions(
        createOperatorContext(['unknown-role'], ['extra:permission']),
      );

      expect(permissions.has('extra:permission')).toBe(true);
      expect(permissions.size).toBe(1);
    });
  });

  describe('getPolicy', () => {
    it('should return the policy used by the service', () => {
      const policy = createTestPolicy();
      const service = new AdminPermissionMappingService({ policy });

      expect(service.getPolicy()).toBe(policy);
    });
  });
});
