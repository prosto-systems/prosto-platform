import { createApp } from 'vue';
import AppRoot from './app-root.vue';
import { installApplicationPlugins } from './plugins';
import { router } from './router';

async function startMockServiceWorker(): Promise<void> {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_MSW !== 'true') {
    return;
  }

  const { worker } = await import('../mocks/browser.js');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

export async function bootstrapApplication(): Promise<void> {
  // Mocks must be ready before router guards begin restoring the session.
  await startMockServiceWorker();

  const app = createApp(AppRoot);

  installApplicationPlugins(app);

  await router.isReady();

  app.mount('#app');
}
