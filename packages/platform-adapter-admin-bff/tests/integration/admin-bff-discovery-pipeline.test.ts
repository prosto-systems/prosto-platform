import type {
  IAdminPermissionPolicy,
  IAdminUIPluginManifest,
} from '@prosto/platform-admin-contracts';
import {
  ADMIN_COMPATIBILITY_CONTRACT_VERSION,
  ADMIN_PERMISSION_POLICY_SCHEMA_VERSION,
  ADMIN_UI_PLUGIN_MANIFEST_SCHEMA_VERSION,
  AdminPluginCompatibilityEvaluator,
  AdminUIPluginManifestValidator,
} from '@prosto/platform-admin-contracts';
import { describe, expect, it, vi } from 'vitest';
import type {
  IAdminBffRequest,
  IAdminOperatorContext,
  IAdminPluginCatalogSource,
} from '@/admin-bff.interfaces.js';
import { AdminDiagnosticsService } from '@/diagnostics/index.js';
import { AdminDiscoveryAggregationService } from '@/discovery/index.js';
import { AdminPermissionMappingService } from '@/permissions/index.js';
import {
  AdminPluginAllowlistEvaluator,
  AdminPluginReviewStatusFilter,
  AdminPluginTrustClassFilter,
  type IAdminPluginAllowlistEvaluatorConfig,
  type IAdminPluginReviewStatusPolicyConfig,
  type IAdminPluginTrustClassPolicyConfig,
} from '@/policy/index.js';
import { PlatformAdminBffAdapter } from '@/admin-bff.adapter.js';

const SHELL_VERSION = '1.5.0';
const SUPPORTED_CONTRACT_VERSION = ADMIN_COMPATIBILITY_CONTRACT_VERSION;

function createValidManifest(
  overrides?: Partial<IAdminUIPluginManifest>,
): IAdminUIPluginManifest {
  return {
    schemaVersion: ADMIN_UI_PLUGIN_MANIFEST_SCHEMA_VERSION,
    id: 'catalog-admin-ui',
    version: '1.2.0',
    displayName: 'Catalog Admin UI',
    shellCompatibility: '>=1.0.0',
    requiredPermissions: ['catalog.read'],
    requiredCapabilities: ['catalog'],
    extensionPoints: ['nav', 'page'],
    trustClass: 'trusted',
    reviewStatus: 'approved',
    metadata: { author: 'team-platform' },
    ...overrides,
  };
}

function createCatalogSource(manifests: unknown[]): IAdminPluginCatalogSource {
  return {
    fetchUIPluginManifests: vi.fn().mockResolvedValue(manifests),
  };
}

const DEFAULT_PERMISSION_POLICY: IAdminPermissionPolicy = {
  schemaVersion: ADMIN_PERMISSION_POLICY_SCHEMA_VERSION,
  roleMappings: [
    {
      roleId: 'admin',
      permissions: ['catalog.read', 'catalog.write', 'settings.manage'],
    },
    {
      roleId: 'viewer',
      permissions: ['catalog.read'],
    },
    {
      roleId: 'operator',
      permissions: ['catalog.read', 'catalog.write'],
    },
  ],
  actionGates: [
    {
      actionId: 'catalog.export',
      requiredPermissions: ['catalog.read', 'catalog.write'],
      match: 'all',
      effect: 'allow',
    },
    {
      actionId: 'settings.reset',
      requiredPermissions: ['settings.manage'],
      match: 'all',
      effect: 'allow',
      remediationHint:
        'Request settings.manage permission from an administrator.',
    },
  ],
};

function createOperatorContext(
  overrides?: Partial<IAdminOperatorContext>,
): IAdminOperatorContext {
  return {
    operatorId: 'operator-1',
    roleIds: ['admin'],
    permissions: [],
    ...overrides,
  };
}

function createDiscoveryRequest(): IAdminBffRequest {
  return {
    method: 'GET',
    path: '/admin/api/v1/discovery',
    params: {},
    query: {},
    body: undefined,
    headers: { 'user-agent': 'test-agent' },
  };
}

function createActionRequest(actionId: string): IAdminBffRequest {
  return {
    method: 'POST',
    path: `/admin/api/v1/action/${actionId}`,
    params: { actionId },
    query: {},
    body: undefined,
    headers: { 'user-agent': 'test-agent' },
  };
}

function createDiagnosticsRequest(): IAdminBffRequest {
  return {
    method: 'GET',
    path: '/admin/api/v1/diagnostics',
    params: {},
    query: {},
    body: undefined,
    headers: { 'user-agent': 'test-agent' },
  };
}

function buildFullPipeline(
  manifests: unknown[],
  options?: {
    allowlistEntries?: IAdminPluginAllowlistEvaluatorConfig['entries'];
    requireAllowlist?: boolean;
    allowedTrustClasses?: IAdminPluginTrustClassPolicyConfig['allowedTrustClasses'];
    allowedReviewStatuses?: IAdminPluginReviewStatusPolicyConfig['allowedReviewStatuses'];
    permissionPolicy?: IAdminPermissionPolicy;
  },
) {
  const catalog = createCatalogSource(manifests);
  const validator = new AdminUIPluginManifestValidator();
  const compatibility = new AdminPluginCompatibilityEvaluator();

  const allowlistEvaluator = new AdminPluginAllowlistEvaluator({
    entries: options?.allowlistEntries ?? [
      { pluginIdPattern: 'catalog-admin-ui', versionPattern: '^1.0.0' },
      { pluginIdPattern: 'settings-panel' },
      { pluginIdPattern: '*' },
    ],
    requireAllowlist: options?.requireAllowlist ?? false,
  });

  const trustClassFilter = new AdminPluginTrustClassFilter({
    allowedTrustClasses: options?.allowedTrustClasses ?? [
      'trusted',
      'internal',
    ],
    environment: 'production',
  });

  const reviewStatusFilter = new AdminPluginReviewStatusFilter({
    allowedReviewStatuses: options?.allowedReviewStatuses ?? ['approved'],
  });

  const permissionService = new AdminPermissionMappingService({
    policy: options?.permissionPolicy ?? DEFAULT_PERMISSION_POLICY,
  });

  const discoveryService = new AdminDiscoveryAggregationService(
    catalog,
    validator,
    compatibility,
    {
      shellVersion: SHELL_VERSION,
      supportedContractVersion: SUPPORTED_CONTRACT_VERSION,
    },
    {
      allowlistEvaluator,
      trustClassFilter,
      reviewStatusFilter,
      permissionService,
    },
  );

  const diagnosticsService = new AdminDiagnosticsService({
    environment: 'production',
    shellVersion: SHELL_VERSION,
    discoveryPipelineVersion: 'test-pipeline.v1',
    enableDetailedLogging: true,
  });

  const adapter = new PlatformAdminBffAdapter(
    discoveryService,
    permissionService,
    diagnosticsService,
  );

  return { adapter, catalog, discoveryService, diagnosticsService };
}

describe('Admin BFF integration: compliant plugin discovery', () => {
  it('should discover a single compliant plugin through the full pipeline', async () => {
    const manifest = createValidManifest();
    const { adapter } = buildFullPipeline([manifest]);

    const request = createDiscoveryRequest();
    const operator = createOperatorContext();

    const response = await adapter.handleRequest(request, operator);

    expect(response.status).toBe(200);

    const body = response.body as {
      correlationId: string;
      data: {
        schemaVersion: string;
        plugins: {
          id: string;
          version: string;
          trustClass: string;
          reviewStatus: string;
          extensions: unknown;
        }[];
        rejected: unknown[];
      };
      diagnostics: {
        acceptedCount: number;
        rejectedCount: number;
      };
    };

    expect(body.data.schemaVersion).toBe('admin-discovery-payload.v1');
    expect(body.data.plugins).toHaveLength(1);
    expect(body.data.rejected).toHaveLength(0);

    const plugin = body.data.plugins[0];

    expect(plugin?.id).toBe('catalog-admin-ui');
    expect(plugin?.version).toBe('1.2.0');
    expect(plugin?.trustClass).toBe('trusted');
    expect(plugin?.reviewStatus).toBe('approved');
    expect(plugin?.extensions).toEqual({
      navigation: [],
      pages: [],
      widgets: [],
      actions: [],
    });

    expect(body.diagnostics.acceptedCount).toBe(1);
    expect(body.diagnostics.rejectedCount).toBe(0);
    expect(body.correlationId).toBeDefined();
  });

  it('should discover multiple compliant plugins from catalog', async () => {
    const manifest1 = createValidManifest({
      id: 'catalog-admin-ui',
      version: '1.2.0',
      displayName: 'Catalog Admin UI',
    });
    const manifest2 = createValidManifest({
      id: 'settings-panel',
      version: '2.0.0',
      displayName: 'Settings Panel',
      shellCompatibility: '>=1.0.0',
      requiredPermissions: ['settings.manage'],
      requiredCapabilities: ['settings'],
      extensionPoints: ['nav', 'widget'],
    });

    const { adapter } = buildFullPipeline([manifest1, manifest2]);
    const request = createDiscoveryRequest();
    const operator = createOperatorContext();

    const response = await adapter.handleRequest(request, operator);
    const body = response.body as {
      data: {
        plugins: { id: string; version: string }[];
        rejected: unknown[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.plugins).toHaveLength(2);
    expect(body.data.rejected).toHaveLength(0);

    const ids = body.data.plugins.map((p) => p.id);

    expect(ids).toContain('catalog-admin-ui');
    expect(ids).toContain('settings-panel');
  });

  it('should return valid discovery payload schema version', async () => {
    const manifest = createValidManifest();
    const { adapter } = buildFullPipeline([manifest]);

    const request = createDiscoveryRequest();
    const operator = createOperatorContext();

    const response = await adapter.handleRequest(request, operator);
    const body = response.body as {
      data: { schemaVersion: string; generatedAt: string };
    };

    expect(body.data.schemaVersion).toBe('admin-discovery-payload.v1');
    expect(body.data.generatedAt).toBeDefined();
    expect(new Date(body.data.generatedAt).getTime()).not.toBeNaN();
  });

  it('should handle empty catalog and return empty plugins list', async () => {
    const { adapter } = buildFullPipeline([]);

    const request = createDiscoveryRequest();
    const operator = createOperatorContext();

    const response = await adapter.handleRequest(request, operator);
    const body = response.body as {
      data: {
        plugins: unknown[];
        rejected: unknown[];
      };
      diagnostics: {
        acceptedCount: number;
        rejectedCount: number;
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.plugins).toHaveLength(0);
    expect(body.data.rejected).toHaveLength(0);
    expect(body.diagnostics.acceptedCount).toBe(0);
    expect(body.diagnostics.rejectedCount).toBe(0);
  });
});

describe('Admin BFF integration: rejected plugin diagnostics', () => {
  it('should reject manifest failing schema validation and include diagnostics', async () => {
    const validManifest = createValidManifest();
    const invalidManifest = { id: 'broken-plugin', version: '1.0.0' };

    const { adapter } = buildFullPipeline([validManifest, invalidManifest]);

    const request = createDiscoveryRequest();
    const operator = createOperatorContext();

    const response = await adapter.handleRequest(request, operator);
    const body = response.body as {
      data: {
        plugins: { id: string }[];
        rejected: {
          reasonCode: string;
          message: string;
          remediationHint: string;
        }[];
      };
      diagnostics: {
        acceptedCount: number;
        rejectedCount: number;
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.plugins).toHaveLength(1);
    expect(body.data.plugins[0]?.id).toBe('catalog-admin-ui');
    expect(body.data.rejected).toHaveLength(1);
    expect(body.data.rejected[0]?.reasonCode).toBe(
      'MANIFEST_VALIDATION_FAILED',
    );
    expect(body.data.rejected[0]?.message).toBeDefined();
    expect(body.data.rejected[0]?.remediationHint).toBe(
      'Fix manifest validation errors and republish.',
    );
    expect(body.diagnostics.acceptedCount).toBe(1);
    expect(body.diagnostics.rejectedCount).toBe(1);
  });

  it('should reject plugins failing shell compatibility check', async () => {
    const manifest = createValidManifest({
      shellCompatibility: '>=5.0.0',
    });

    const { adapter } = buildFullPipeline([manifest]);

    const request = createDiscoveryRequest();
    const operator = createOperatorContext();

    const response = await adapter.handleRequest(request, operator);
    const body = response.body as {
      data: {
        plugins: unknown[];
        rejected: {
          id: string;
          version: string;
          reasonCode: string;
          message: string;
          remediationHint: string;
        }[];
      };
      diagnostics: {
        acceptedCount: number;
        rejectedCount: number;
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.plugins).toHaveLength(0);
    expect(body.data.rejected).toHaveLength(1);
    expect(body.data.rejected[0]?.id).toBe('catalog-admin-ui');
    expect(body.data.rejected[0]?.reasonCode).toBe('SHELL_VERSION_MISMATCH');
    expect(body.data.rejected[0]?.remediationHint).toContain('compatible');
    expect(body.diagnostics.acceptedCount).toBe(0);
    expect(body.diagnostics.rejectedCount).toBe(1);
  });

  it('should reject plugins with disallowed trust class', async () => {
    const manifest = createValidManifest({
      trustClass: 'third-party-reviewed',
    });

    const { adapter } = buildFullPipeline([manifest], {
      allowedTrustClasses: ['trusted', 'internal'],
    });

    const request = createDiscoveryRequest();
    const operator = createOperatorContext();

    const response = await adapter.handleRequest(request, operator);
    const body = response.body as {
      data: {
        plugins: unknown[];
        rejected: {
          id: string;
          reasonCode: string;
          message: string;
          remediationHint: string;
        }[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.plugins).toHaveLength(0);
    expect(body.data.rejected).toHaveLength(1);
    expect(body.data.rejected[0]?.reasonCode).toBe('TRUST_CLASS_REJECTED');
    expect(body.data.rejected[0]?.id).toBe('catalog-admin-ui');
    expect(body.data.rejected[0]?.message).toContain('third-party-reviewed');
  });

  it('should reject plugins with non-approved review status', async () => {
    const manifest = createValidManifest({
      reviewStatus: 'pending',
    });

    const { adapter } = buildFullPipeline([manifest], {
      allowedReviewStatuses: ['approved'],
    });

    const request = createDiscoveryRequest();
    const operator = createOperatorContext();

    const response = await adapter.handleRequest(request, operator);
    const body = response.body as {
      data: {
        plugins: unknown[];
        rejected: {
          id: string;
          reasonCode: string;
          message: string;
          remediationHint: string;
        }[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.plugins).toHaveLength(0);
    expect(body.data.rejected).toHaveLength(1);
    expect(body.data.rejected[0]?.reasonCode).toBe('REVIEW_STATUS_REJECTED');
    expect(body.data.rejected[0]?.id).toBe('catalog-admin-ui');
  });

  it('should reject plugins not on allowlist when requireAllowlist is true', async () => {
    const manifest = createValidManifest({ id: 'unlisted-plugin' });

    const { adapter } = buildFullPipeline([manifest], {
      requireAllowlist: true,
      allowlistEntries: [
        { pluginIdPattern: 'catalog-admin-ui', versionPattern: '^1.0.0' },
      ],
    });

    const request = createDiscoveryRequest();
    const operator = createOperatorContext();

    const response = await adapter.handleRequest(request, operator);
    const body = response.body as {
      data: {
        plugins: unknown[];
        rejected: {
          id: string;
          reasonCode: string;
          message: string;
          remediationHint: string;
        }[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.plugins).toHaveLength(0);
    expect(body.data.rejected).toHaveLength(1);
    expect(body.data.rejected[0]?.reasonCode).toBe('ALLOWLIST_REJECTED');
    expect(body.data.rejected[0]?.id).toBe('unlisted-plugin');
    expect(body.data.rejected[0]?.remediationHint).toContain('allowlist');
  });

  it('should produce structured diagnostics payload via diagnostics route', async () => {
    const validManifest = createValidManifest();
    const invalidManifest = { id: 'broken-plugin' };

    const { adapter } = buildFullPipeline([validManifest, invalidManifest]);
    const request = createDiagnosticsRequest();
    const operator = createOperatorContext();

    const response = await adapter.handleRequest(request, operator);
    const body = response.body as {
      schemaVersion: string;
      correlationId: string;
      environment: string;
      shellVersion: string;
      plugins: {
        pluginId: string;
        status: string;
        reasonCode?: string;
        remediationHint?: string;
        correlationId: string;
        operatorId: string;
      }[];
      summary: {
        acceptedCount: number;
        rejectedCount: number;
        totalCount: number;
      };
      metadata: {
        operatorId: string;
        operatorRoles: string[];
        discoveryPipelineVersion: string;
      };
    };

    expect(response.status).toBe(200);
    expect(body.schemaVersion).toBe('admin-diagnostics.v1');
    expect(body.correlationId).toBeDefined();
    expect(body.environment).toBe('production');
    expect(body.shellVersion).toBe(SHELL_VERSION);

    expect(body.plugins).toHaveLength(2);

    const accepted = body.plugins.filter((p) => p.status === 'accepted');
    const rejected = body.plugins.filter((p) => p.status === 'rejected');

    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(accepted[0]?.pluginId).toBe('catalog-admin-ui');
    expect(rejected[0]?.reasonCode).toBe('MANIFEST_VALIDATION_FAILED');
    expect(rejected[0]?.remediationHint).toBeDefined();

    expect(body.summary.acceptedCount).toBe(1);
    expect(body.summary.rejectedCount).toBe(1);
    expect(body.summary.totalCount).toBe(2);

    expect(body.metadata.operatorId).toBe('operator-1');
    expect(body.metadata.operatorRoles).toEqual(['admin']);
    expect(body.metadata.discoveryPipelineVersion).toBe('test-pipeline.v1');
  });

  it('should return 404 for unknown route', async () => {
    const { adapter } = buildFullPipeline([]);
    const request: IAdminBffRequest = {
      method: 'GET',
      path: '/unknown/route',
      params: {},
      query: {},
      body: undefined,
      headers: {},
    };

    const response = await adapter.handleRequest(
      request,
      createOperatorContext(),
    );

    expect(response.status).toBe(404);

    const body = response.body as { error: { code: string } };

    expect(body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});

describe('Admin BFF integration: role-based filtering outcomes', () => {
  it('should allow admin operator to access all plugins', async () => {
    const manifest = createValidManifest({
      requiredPermissions: ['catalog.read', 'catalog.write'],
    });

    const { adapter } = buildFullPipeline([manifest]);

    const request = createDiscoveryRequest();
    const adminOperator = createOperatorContext({
      roleIds: ['admin'],
      permissions: [],
    });

    const response = await adapter.handleRequest(request, adminOperator);
    const body = response.body as {
      data: {
        plugins: { id: string }[];
        rejected: unknown[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.plugins).toHaveLength(1);
    expect(body.data.plugins[0]?.id).toBe('catalog-admin-ui');
    expect(body.data.rejected).toHaveLength(0);
  });

  it('should filter out plugins requiring permissions missing for viewer role', async () => {
    const manifest = createValidManifest({
      requiredPermissions: ['catalog.read', 'catalog.write'],
    });

    const { adapter } = buildFullPipeline([manifest]);

    const request = createDiscoveryRequest();
    const viewerOperator = createOperatorContext({
      roleIds: ['viewer'],
      permissions: [],
    });

    const response = await adapter.handleRequest(request, viewerOperator);
    const body = response.body as {
      data: {
        plugins: unknown[];
        rejected: {
          id: string;
          reasonCode: string;
          message: string;
        }[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.plugins).toHaveLength(0);
    expect(body.data.rejected).toHaveLength(1);
    expect(body.data.rejected[0]?.id).toBe('catalog-admin-ui');
    expect(body.data.rejected[0]?.reasonCode).toBe('PERMISSION_FILTERED');
    expect(body.data.rejected[0]?.message).toContain('catalog.write');
  });

  it('should allow operator role with sufficient permissions', async () => {
    const manifest = createValidManifest({
      requiredPermissions: ['catalog.read', 'catalog.write'],
    });

    const { adapter } = buildFullPipeline([manifest]);

    const request = createDiscoveryRequest();
    const operatorCtx = createOperatorContext({
      roleIds: ['operator'],
      permissions: [],
    });

    const response = await adapter.handleRequest(request, operatorCtx);
    const body = response.body as {
      data: {
        plugins: { id: string }[];
        rejected: unknown[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.plugins).toHaveLength(1);
    expect(body.data.rejected).toHaveLength(0);
  });

  it('should allow operator with additional inline permissions', async () => {
    const manifest = createValidManifest({
      requiredPermissions: ['catalog.read', 'settings.manage'],
    });

    const { adapter } = buildFullPipeline([manifest]);

    const request = createDiscoveryRequest();
    const operatorCtx = createOperatorContext({
      roleIds: ['operator'],
      permissions: ['settings.manage'],
    });

    const response = await adapter.handleRequest(request, operatorCtx);
    const body = response.body as {
      data: {
        plugins: { id: string }[];
        rejected: unknown[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.plugins).toHaveLength(1);
    expect(body.data.rejected).toHaveLength(0);
  });

  it('should deny action when operator lacks required permissions', async () => {
    const { adapter } = buildFullPipeline([]);

    const request = createActionRequest('settings.reset');
    const viewerOperator = createOperatorContext({
      roleIds: ['viewer'],
      permissions: [],
    });

    const response = await adapter.handleRequest(request, viewerOperator);

    expect(response.status).toBe(403);

    const body = response.body as {
      error: { code: string; message: string; remediationHint?: string };
    };

    expect(body.error.code).toBe('PERMISSION_REQUIREMENT_NOT_MET');
    expect(body.error.message).toContain('settings.reset');
    expect(body.error.remediationHint).toBeDefined();
  });

  it('should allow action when operator has required permissions', async () => {
    const { adapter } = buildFullPipeline([]);

    const request = createActionRequest('catalog.export');
    const adminOperator = createOperatorContext({
      roleIds: ['admin'],
      permissions: [],
    });

    const response = await adapter.handleRequest(request, adminOperator);

    expect(response.status).toBe(200);

    const body = response.body as {
      data: { actionId: string; allowed: boolean };
    };

    expect(body.data.actionId).toBe('catalog.export');
    expect(body.data.allowed).toBe(true);
  });

  it('should deny action for unknown actionId', async () => {
    const { adapter } = buildFullPipeline([]);

    const request = createActionRequest('nonexistent.action');
    const adminOperator = createOperatorContext({ roleIds: ['admin'] });

    const response = await adapter.handleRequest(request, adminOperator);

    expect(response.status).toBe(403);

    const body = response.body as {
      error: { code: string; message: string };
    };

    expect(body.error.code).toBe('ACTION_GATE_NOT_FOUND');
  });

  it('should mix accepted and permission-filtered plugins for viewer', async () => {
    const unrestrictedManifest = createValidManifest({
      id: 'public-widget',
      version: '1.0.0',
      requiredPermissions: [],
      requiredCapabilities: [],
      extensionPoints: ['widget'],
    });

    const restrictedManifest = createValidManifest({
      id: 'admin-tools',
      version: '1.0.0',
      requiredPermissions: ['settings.manage'],
      requiredCapabilities: [],
      extensionPoints: ['page'],
    });

    const { adapter } = buildFullPipeline([
      unrestrictedManifest,
      restrictedManifest,
    ]);

    const request = createDiscoveryRequest();
    const viewerOperator = createOperatorContext({
      roleIds: ['viewer'],
      permissions: [],
    });

    const response = await adapter.handleRequest(request, viewerOperator);
    const body = response.body as {
      data: {
        plugins: { id: string }[];
        rejected: { id: string; reasonCode: string }[];
      };
      diagnostics: {
        acceptedCount: number;
        rejectedCount: number;
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.plugins).toHaveLength(1);
    expect(body.data.plugins[0]?.id).toBe('public-widget');

    expect(body.data.rejected).toHaveLength(1);
    expect(body.data.rejected[0]?.id).toBe('admin-tools');
    expect(body.data.rejected[0]?.reasonCode).toBe('PERMISSION_FILTERED');

    expect(body.diagnostics.acceptedCount).toBe(1);
    expect(body.diagnostics.rejectedCount).toBe(1);
  });

  it('should produce diagnostics with operator-specific metadata', async () => {
    const manifest = createValidManifest({
      requiredPermissions: ['catalog.read'],
    });

    const { adapter } = buildFullPipeline([manifest]);

    const request = createDiagnosticsRequest();
    const viewerOperator = createOperatorContext({
      operatorId: 'viewer-jane',
      roleIds: ['viewer'],
      permissions: [],
    });

    const response = await adapter.handleRequest(request, viewerOperator);
    const body = response.body as {
      metadata: {
        operatorId: string;
        operatorRoles: string[];
      };
      plugins: {
        operatorId: string;
      }[];
    };

    expect(response.status).toBe(200);
    expect(body.metadata.operatorId).toBe('viewer-jane');
    expect(body.metadata.operatorRoles).toEqual(['viewer']);

    for (const plugin of body.plugins) {
      expect(plugin.operatorId).toBe('viewer-jane');
    }
  });
});
