export type MockRoleType = 'admin' | 'operator' | 'viewer';

export interface IMockUserFixture {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: MockRoleType;
  readonly password: string;
}

export interface IMockLoginOption {
  readonly label: string;
  readonly email: string;
  readonly password: string;
}

export const DETERMINISTIC_RESET_TOKEN = 'reset-admin-token';

export const DETERMINISTIC_RESET_LINK = `/reset-password?token=${DETERMINISTIC_RESET_TOKEN}`;

export const MOCK_USERS: readonly IMockUserFixture[] = [
  {
    id: 'user-admin',
    email: 'admin@prosto.test',
    displayName: 'Ada Admin',
    role: 'admin',
    password: 'Admin123!',
  },
  {
    id: 'user-operator',
    email: 'operator@prosto.test',
    displayName: 'Olivia Operator',
    role: 'operator',
    password: 'Operator123!',
  },
  {
    id: 'user-viewer',
    email: 'viewer@prosto.test',
    displayName: 'Victor Viewer',
    role: 'viewer',
    password: 'Viewer123!',
  },
];

export const MOCK_LOGIN_OPTIONS: readonly IMockLoginOption[] = MOCK_USERS.map(
  ({ email, password, role }) => ({
    label: role.charAt(0).toUpperCase() + role.slice(1),
    email,
    password,
  }),
);
