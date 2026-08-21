import type { AdminShellPermissionType } from '@prosto/platform-sdk';
import type { IAdminShellPluginInfo } from '@prosto/platform-sdk';
import {
  DETERMINISTIC_RESET_TOKEN,
  MOCK_USERS,
  type MockRoleType,
} from './mock-fixtures';

export interface IMockUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: MockRoleType;
  password: string;
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
  readonly users: Map<string, IMockUser>;
  readonly sessions: Map<string, IMockSession>;
  readonly resetTokens: Map<string, IMockResetToken>;
  readonly plugins: readonly IAdminShellPluginInfo[];
  readonly modules: IMockModule[];
  readonly activity: IMockActivity[];
  maintenanceEnabled: boolean;
  sessionSequence: number;
  resetTokenSequence: number;
  activitySequence: number;
}

const SESSION_DURATION_MS = 60 * 60 * 1000;
const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000;

const ROLE_PERMISSIONS: Readonly<
  Record<MockRoleType, readonly AdminShellPermissionType[]>
> = {
  admin: [
    'dashboard:view',
    'health:view',
    'modules:view',
    'activity:view',
    'modules:restart',
    'platform:restart',
    'maintenance:manage',
  ],
  operator: [
    'dashboard:view',
    'health:view',
    'modules:view',
    'activity:view',
    'modules:restart',
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
    plugins: [
      {
        moduleId: 'platform-health',
        moduleVersion: '0.0.0-dev',
        entry: { type: 'script', path: '/plugins/platform-health/index.js' },
        contentFiles: [],
      },
    ],
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

let mockState = createMockState();

export function getMockState(): IMockState {
  return mockState;
}

export function resetMockState(): void {
  mockState = createMockState();
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
    mockState.sessions.delete(sessionId);
    return undefined;
  }

  return session;
}

export function destroySession(sessionId: string): void {
  mockState.sessions.delete(sessionId);
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
