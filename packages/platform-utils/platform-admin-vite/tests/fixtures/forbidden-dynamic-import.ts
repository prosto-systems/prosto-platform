export async function loadVue(): Promise<unknown> {
  return import('vue');
}
