import { authHandlers } from './auth.handlers';
import { platformHandlers } from './platform.handlers';
import { dashboardHandlers } from './dashboard.handlers';

export { authHandlers, platformHandlers, dashboardHandlers };

export const handlers = [
  ...authHandlers,
  ...platformHandlers,
  ...dashboardHandlers,
];
