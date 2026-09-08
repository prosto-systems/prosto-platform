import {
  ADMIN_SHELL_RUNTIME_API_VERSION,
  type AdminShellPermissionType,
  type IAdminShellPluginInfo,
} from '@prosto/platform-sdk/admin';
import {
  DETERMINISTIC_RESET_TOKEN,
  MOCK_USERS,
  type MockRoleType,
} from './mock-fixtures';
import { getBrowserStorage, MockSessionStorage } from './mock-session-storage';

export interface IMockUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: MockRoleType;
  password: string;
}

export interface IMockManifest {
  readonly platformName: string;
  readonly platformVersion: string;
  readonly plugins: readonly IAdminShellPluginInfo[];
}

export interface IMockSession {
  readonly id: string;
  readonly userId: string;
  readonly csrfToken: string;
  readonly expiresAt: number;
}

export interface IMockResetToken {
  readonly userId: string;
  readonly expiresAt: number;
  used: boolean;
}

export interface IMockModule {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  status: 'healthy' | 'degraded';
}

export interface IMockActivity {
  readonly id: string;
  readonly timestamp: string;
  readonly message: string;
  readonly severity: 'info' | 'warning';
}

export interface IMockState {
  readonly manifest: IMockManifest;
  readonly users: Map<string, IMockUser>;
  readonly sessions: Map<string, IMockSession>;
  readonly resetTokens: Map<string, IMockResetToken>;
  readonly modules: IMockModule[];
  readonly activity: IMockActivity[];
  maintenanceEnabled: boolean;
  sessionSequence: number;
  resetTokenSequence: number;
  activitySequence: number;
}

const SESSION_DURATION_MS = 60 * 60 * 1000;
const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000;
const mockSessionStorage = new MockSessionStorage(getBrowserStorage());

const ROLE_PERMISSIONS: Readonly<
  Record<MockRoleType, readonly AdminShellPermissionType[]>
> = {
  admin: [
    'dashboard:view',
    'health:view',
    'modules:view',
    'activity:view',
    'platform:restart',
    'maintenance:manage',
  ],
  operator: [
    'dashboard:view',
    'health:view',
    'modules:view',
    'activity:view',
    'platform:restart',
  ],
  viewer: ['dashboard:view', 'health:view', 'modules:view', 'activity:view'],
};

export function createMockState(): IMockState {
  const users = new Map<string, IMockUser>(
    MOCK_USERS.map((user) => [user.id, { ...user }]),
  );

  return {
    users,
    sessions: new Map(),
    resetTokens: new Map([
      [
        DETERMINISTIC_RESET_TOKEN,
        {
          userId: 'user-admin',
          expiresAt: Date.now() + RESET_TOKEN_DURATION_MS,
          used: false,
        },
      ],
    ]),
    manifest: {
      platformName: 'Prosto Platform',
      platformVersion: '0.0.0',
      plugins: [
        {
          moduleId: 'module-test',
          moduleVersion: '1.0.0',
          runtimeApiVersion: ADMIN_SHELL_RUNTIME_API_VERSION,
          entry: {
            type: 'script',
            path: '/modules/module-test/dist/admin/admin.plugin.js',
            hash: '1.0.0',
          },
          contentFiles: [
            {
              type: 'style',
              path: '/modules/module-test/dist/admin/admin.plugin.css',
              hash: '1.0.0',
            },
          ],
        },
      ],
    },
    modules: [
      {
        id: 'platform-core',
        name: 'Platform Core',
        version: '0.0.0-dev',
        status: 'healthy',
      },
      {
        id: 'platform-health',
        name: 'Platform Health',
        version: '0.0.0-dev',
        status: 'healthy',
      },
    ],
    activity: [
      {
        id: 'activity-1',
        timestamp: '2026-08-21T12:00:00.000Z',
        message: 'Platform started successfully.',
        severity: 'info',
      },
    ],
    maintenanceEnabled: false,
    sessionSequence: 0,
    resetTokenSequence: 0,
    activitySequence: 1,
  };
}

let mockState = createHydratedMockState();

export function getMockState(): IMockState {
  return mockState;
}

export function resetMockState(): void {
  mockSessionStorage.clear();
  mockState = createMockState();
}

export function reloadMockStateFromStorage(): void {
  mockState = createHydratedMockState();
}

export function getPermissions(
  role: MockRoleType,
): readonly AdminShellPermissionType[] {
  return ROLE_PERMISSIONS[role];
}

export function findUserByEmail(email: string): IMockUser | undefined {
  const normalizedEmail = email.toLowerCase();

  return [...mockState.users.values()].find(
    (user) => user.email.toLowerCase() === normalizedEmail,
  );
}

export function createSession(user: IMockUser): IMockSession {
  mockState.sessionSequence += 1;

  const sequence = mockState.sessionSequence;
  const session: IMockSession = {
    id: `mock-session-${sequence}`,
    userId: user.id,
    csrfToken: `mock-csrf-${sequence}`,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };

  mockState.sessions.set(session.id, session);
  persistSessions();

  return session;
}

export function findActiveSession(
  sessionId: string | undefined,
): IMockSession | undefined {
  if (sessionId === undefined) {
    return undefined;
  }

  const session = mockState.sessions.get(sessionId);

  if (session === undefined || session.expiresAt <= Date.now()) {
    if (mockState.sessions.delete(sessionId)) {
      persistSessions();
    }

    return undefined;
  }

  return session;
}

export function destroySession(sessionId: string): void {
  if (mockState.sessions.delete(sessionId)) {
    persistSessions();
  }
}

export function createResetToken(user: IMockUser): string {
  mockState.resetTokenSequence += 1;

  const token = `mock-reset-${mockState.resetTokenSequence}`;

  mockState.resetTokens.set(token, {
    userId: user.id,
    expiresAt: Date.now() + RESET_TOKEN_DURATION_MS,
    used: false,
  });

  return token;
}

export function addActivity(
  message: string,
  severity: IMockActivity['severity'] = 'info',
): void {
  mockState.activitySequence += 1;
  mockState.activity.unshift({
    id: `activity-${mockState.activitySequence}`,
    timestamp: new Date().toISOString(),
    message,
    severity,
  });
}

function createHydratedMockState(): IMockState {
  const state = createMockState();
  const snapshot = mockSessionStorage.load(new Set(state.users.keys()));

  for (const session of snapshot.sessions) {
    state.sessions.set(session.id, session);
  }

  state.sessionSequence = snapshot.sessionSequence;

  return state;
}

function persistSessions(): void {
  mockSessionStorage.save({
    sessionSequence: mockState.sessionSequence,
    sessions: [...mockState.sessions.values()],
  });
}
