import { authHandlers } from './auth.handlers';
import { dashboardHandlers } from './dashboard.handlers';

export { authHandlers, dashboardHandlers };

export const handlers = [...authHandlers, ...dashboardHandlers];
