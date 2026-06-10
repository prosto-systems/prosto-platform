import { ADMIN_COMPATIBILITY_CONTRACT_VERSION } from '@prosto/platform-admin-contracts';
import { type App as AppInstance, createApp } from 'vue';
import { createPinia } from 'pinia';
import { AdminDiscoveryClient } from '@/shared/api/admin-discovery';
import {
  AdminShellTelemetryService,
  ConsoleAdminShellLogger,
} from '@/shared/observability';
import { PluginRuntimeService } from '@/features/plugin-runtime';
import { useDiagnosticsStore } from '@/entities/diagnostics';
import { usePluginStore } from '@/entities/plugin';
import { shellBootstrap } from '@/processes/admin-shell-bootstrap';
import { APP_VERSION } from '@/shared/version';
import { createVuetify } from './create-vuetify.js';
import { createI18n } from './create-i18n.js';
import App from '../app.vue';
import router from '../routes/index.js';

export async function bootstrapAdminShellApp(): Promise<AppInstance<Element>> {
  const app = createApp(App);

  app.use(createPinia());
  app.use(createVuetify());
  app.use(createI18n());
  app.use(router);

  app.mount('#app');

  const pluginStore = usePluginStore();
  const diagnosticsStore = useDiagnosticsStore();

  const logger = new ConsoleAdminShellLogger();
  const telemetry = new AdminShellTelemetryService(logger);
  const discoveryClient = new AdminDiscoveryClient({
    baseUrl:
      import.meta.env.PROSTO_PLATFORM_ADMIN_BFF_URL ?? 'http://localhost:3001',
  });

  const pluginRuntime = new PluginRuntimeService(
    { pluginStore, diagnosticsStore, telemetry, logger },
    {
      shellVersion: APP_VERSION,
      supportedContractVersion: ADMIN_COMPATIBILITY_CONTRACT_VERSION,
    },
  );

  await shellBootstrap({
    discoveryClient,
    pluginRuntime,
    pluginStore,
    diagnosticsStore,
    telemetry,
    logger,
  });

  return app;
}
