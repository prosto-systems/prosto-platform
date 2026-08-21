import type {
  AdminShellPermissionType,
  IAdminShellAuthorization,
  IAdminShellContext,
} from '../src/index.js';

declare const permission: AdminShellPermissionType;

const authorization: IAdminShellAuthorization = {
  can: (requestedPermission: AdminShellPermissionType): boolean =>
    requestedPermission === permission,
};

const context: IAdminShellContext = {
  moduleId: 'example-module',
  auth: authorization,
};

context.auth.can('modules:view');
