<template>
  <v-app class="app" :class="{ 'app--dark': theme.current.value.dark }">
    <v-navigation-drawer
      v-if="isAuthenticated"
      v-model="drawerOpen"
      :temporary="mobile"
      :persistent="!mobile"
      :rail="!mobile && isRail"
      rail-width="60"
      class="app-drawer"
      elevation="0"
      width="248"
    >
      <div class="app-drawer__brand bg-blue-grey-darken-4">
        <v-avatar color="primary" rounded="lg" size="28">
          <span class="brand-mark">P</span>
        </v-avatar>

        <template v-if="!isRail || mobile">
          <span class="brand-name">
            {{ manifest.data.value?.platformName }}
          </span>

          <v-spacer />

          <span class="platform-version">
            {{ manifest.data.value?.platformVersion }}
          </span>
        </template>
      </div>

      <!--<v-divider />-->

      <v-list class="app-drawer__navigation" density="compact" nav>
        <v-list-item
          :title="t('navigation.dashboard')"
          :aria-label="t('navigation.dashboard')"
          :to="{ name: 'Dashboard' }"
          :active="false"
          prepend-icon="mdi-view-dashboard-outline"
          prepend-gap="8"
          color="primary"
        />

        <v-list-item
          v-for="item in favoriteMenuItems"
          :key="item.path"
          :title="item.title"
          :aria-label="item.title"
          :prepend-icon="item.icon"
          prepend-gap="8"
          color="primary"
          @click="item.action($event)"
        />

        <v-list-item
          v-if="browseMenuItems.length || configurationMenuItems.length"
          :title="
            secondDrawerOpen ? t('navigation.less') : t('navigation.more')
          "
          :aria-label="
            secondDrawerOpen ? t('navigation.less') : t('navigation.more')
          "
          prepend-icon="mdi-dots-horizontal"
          prepend-gap="8"
          color="primary"
          @click="toggleSubNavigation"
        />
      </v-list>

      <template #append>
        <div class="app-drawer__footer">
          <v-btn
            :aria-label="t('navigation.toggleNavigationRail')"
            :icon="isRail ? 'mdi-menu-close' : 'mdi-menu-open'"
            variant="plain"
            density="compact"
            @click="toggleNavigation"
          />
        </div>
      </template>
    </v-navigation-drawer>

    <v-app-bar
      v-if="isAuthenticated"
      elevation="0"
      density="comfortable"
      color="blue-grey-darken-4"
      class="app-bar"
    >
      <v-btn
        v-if="mobile"
        :aria-label="t('navigation.openNavigation')"
        icon="mdi-menu"
        variant="text"
        density="comfortable"
        class="ml-2"
        @click="toggleNavigation"
      />

      <v-app-bar-title class="app-bar__title">{{ pageTitle }}</v-app-bar-title>

      <div class="app-bar__actions me-3">
        <v-menu
          v-model="isLocaleMenuOpen"
          @update:model-value="onLocaleMenuChange"
        >
          <template #activator="{ props }">
            <v-btn
              ref="localeActivator"
              v-bind="props"
              :aria-label="t('preferences.language')"
              icon="mdi-translate"
              variant="text"
              density="comfortable"
            />
          </template>

          <v-list density="compact">
            <v-list-item
              :title="t('preferences.english')"
              @click="preferencesStore.setLocale('en')"
            />

            <v-list-item
              :title="t('preferences.russian')"
              @click="preferencesStore.setLocale('ru')"
            />
          </v-list>
        </v-menu>

        <v-menu
          v-model="isThemeMenuOpen"
          @update:model-value="onThemeMenuChange"
        >
          <template #activator="{ props }">
            <v-btn
              ref="themeActivator"
              v-bind="props"
              :aria-label="t('preferences.theme')"
              icon="mdi-theme-light-dark"
              variant="text"
              density="comfortable"
            />
          </template>

          <v-list density="compact">
            <v-list-item
              :title="t('preferences.light')"
              @click="preferencesStore.setTheme('light')"
            />

            <v-list-item
              :title="t('preferences.dark')"
              @click="preferencesStore.setTheme('dark')"
            />

            <v-list-item
              :title="t('preferences.system')"
              @click="preferencesStore.setTheme('system')"
            />
          </v-list>
        </v-menu>

        <v-menu
          v-model="isAccountMenuOpen"
          @update:model-value="onAccountMenuChange"
        >
          <template #activator="{ props }">
            <v-btn
              ref="accountActivator"
              v-bind="props"
              :icon="mobile"
              variant="text"
              :class="[!mobile && 'ps-1 pe-2']"
            >
              <v-avatar color="primary" size="30">
                {{ principalInitial }}
              </v-avatar>

              <span v-if="!mobile" class="principal-name ms-1">
                {{ authStore.principal?.displayName }}
              </span>
            </v-btn>
          </template>

          <v-list min-width="220" class="pb-0">
            <v-list-item
              :title="authStore.principal?.displayName"
              :subtitle="authStore.principal?.email"
            >
              <template #prepend>
                <v-avatar color="primary" size="34">
                  {{ principalInitial }}
                </v-avatar>
              </template>
            </v-list-item>

            <v-list-item :title="principalRole" class="role-label" />

            <v-divider />

            <v-list-item
              prepend-icon="mdi-logout"
              :title="t('account.signOut')"
              @click="logout"
            />
          </v-list>
        </v-menu>
      </div>
    </v-app-bar>

    <v-main>
      <v-navigation-drawer
        v-if="isAuthenticated"
        v-model="secondDrawerOpen"
        elevation="0"
        class="app-second-drawer"
        width="268"
        temporary
      >
        <v-list density="compact" nav>
          <v-list-subheader v-if="browseMenuItems.length">
            {{ t('navigation.browse') }}
          </v-list-subheader>

          <v-list-item
            v-for="item in browseMenuItems"
            :key="item.path"
            :title="item.title"
            :aria-label="item.title"
            prepend-gap="8"
            color="primary"
            @click="item.action($event)"
          >
            <template #prepend>
              <v-icon :icon="item.icon" class="opacity-30" />
            </template>

            <template #append>
              <v-list-item-action class="ml-0">
                <v-avatar
                  v-if="item.isAlwaysFavorite"
                  variant="plain"
                  disabled
                  @click.stop="() => void 0"
                >
                  <v-icon
                    icon="mdi-star"
                    size="small"
                    color="yellow-darken-3"
                  />
                </v-avatar>

                <v-avatar
                  v-else
                  variant="plain"
                  class="cursor-pointer"
                  @click.stop="mainMenuStore.toggleFavorite(item.path)"
                >
                  <v-icon
                    v-if="item.isFavorite"
                    icon="mdi-star"
                    size="small"
                    color="yellow-darken-3"
                  />

                  <v-icon
                    v-else
                    icon="mdi-star-outline"
                    size="small"
                    class="opacity-30"
                  />
                </v-avatar>
              </v-list-item-action>
            </template>
          </v-list-item>

          <v-list-subheader v-if="configurationMenuItems.length" class="mt-2">
            {{ t('navigation.configuration') }}
          </v-list-subheader>

          <v-list-item
            v-for="item in configurationMenuItems"
            :key="item.path"
            :title="item.title"
            :aria-label="item.title"
            :prepend-icon="item.icon"
            prepend-gap="8"
            color="primary"
            @click="item.action($event)"
          >
            <template #prepend>
              <v-icon :icon="item.icon" class="opacity-30" />
            </template>

            <template #append>
              <v-list-item-action class="ml-0">
                <v-avatar
                  v-if="item.isAlwaysFavorite"
                  variant="plain"
                  disabled
                  @click.stop="() => void 0"
                >
                  <v-icon
                    icon="mdi-star"
                    size="small"
                    color="yellow-darken-3"
                  />
                </v-avatar>

                <v-avatar
                  v-else
                  variant="plain"
                  class="cursor-pointer"
                  @click.stop="mainMenuStore.toggleFavorite(item.path)"
                >
                  <v-icon
                    v-if="item.isFavorite"
                    icon="mdi-star"
                    size="small"
                    color="yellow-darken-3"
                  />

                  <v-icon
                    v-else
                    icon="mdi-star-outline"
                    size="small"
                    class="opacity-30"
                  />
                </v-avatar>
              </v-list-item-action>
            </template>
          </v-list-item>
        </v-list>

        <template v-if="mobile" #append>
          <div class="app-second-drawer__footer">
            <v-btn
              :icon="isRail ? 'mdi-menu-close' : 'mdi-menu-open'"
              variant="plain"
              density="compact"
              @click="toggleSubNavigation"
            />
          </div>
        </template>
      </v-navigation-drawer>
      <slot />
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useDisplay, useTheme } from 'vuetify';
import { useI18n } from 'vue-i18n';
import { i18n } from '@/app/plugins';
import { useMainMenuStore } from '@/app/shell';
import { useAuthStore } from '@/features/auth';
import { usePlatform } from '@/features/platform';
import {
  usePreferencesStore,
  type ThemePreferenceType,
} from '@/features/preferences';

interface IButtonActivator {
  readonly $el: HTMLElement;
}

const { mobile } = useDisplay();
const { t, te } = useI18n();
const theme = useTheme();
const router = useRouter();
const { manifest } = usePlatform();

const authStore = useAuthStore();
const preferencesStore = usePreferencesStore();
const mainMenuStore = useMainMenuStore();
const { isAuthenticated } = storeToRefs(authStore);
const { locale, theme: themePreference } = storeToRefs(preferencesStore);
const { favoriteMenuItems, browseMenuItems, configurationMenuItems } =
  storeToRefs(mainMenuStore);

const drawerOpen = shallowRef(true);
const secondDrawerOpen = shallowRef(false);
const isRail = shallowRef(false);

const isLocaleMenuOpen = shallowRef(false);
const isThemeMenuOpen = shallowRef(false);
const isAccountMenuOpen = shallowRef(false);

const localeActivator = useTemplateRef<IButtonActivator>('localeActivator');
const themeActivator = useTemplateRef<IButtonActivator>('themeActivator');
const accountActivator = useTemplateRef<IButtonActivator>('accountActivator');

const pageTitle = computed(() => {
  const { title } = router.currentRoute.value.meta;
  return title ? (te(title) ? t(title) : title) : '';
});

const principalInitial = computed(
  () => authStore.principal?.displayName.charAt(0).toUpperCase() ?? 'P',
);

const principalRole = computed(() => {
  const role = authStore.principal?.role;

  return role ? t(`account.roles.${role}`) : '';
});

mainMenuStore.loadFavorites();

function toggleNavigation(): void {
  if (mobile.value) {
    drawerOpen.value = !drawerOpen.value;
    secondDrawerOpen.value = false;
    return;
  }

  isRail.value = !isRail.value;
}

function toggleSubNavigation(): void {
  if (mobile.value) {
    drawerOpen.value = false;
  }

  secondDrawerOpen.value = !secondDrawerOpen.value;
}

async function logout(): Promise<void> {
  try {
    await authStore.logout();
  } finally {
    // authStore.invalidate();
    await router.replace({ name: 'Login' });
  }
}

function restoreActivatorFocus(activator: IButtonActivator | null): void {
  void nextTick(() => activator?.$el.focus());
}

function onLocaleMenuChange(isOpen: boolean): void {
  if (!isOpen) {
    restoreActivatorFocus(localeActivator.value);
  }
}

function onThemeMenuChange(isOpen: boolean): void {
  if (!isOpen) {
    restoreActivatorFocus(themeActivator.value);
  }
}

function onAccountMenuChange(isOpen: boolean): void {
  if (!isOpen) {
    restoreActivatorFocus(accountActivator.value);
  }
}

watch(
  mobile,
  (isMobile) => {
    drawerOpen.value = !isMobile;
    secondDrawerOpen.value = false;
    isRail.value = false;
  },
  { immediate: true },
);

watch(
  locale,
  (selectedLocale) => {
    i18n.global.locale.value = selectedLocale;
  },
  { immediate: true },
);

watch(
  themePreference,
  (selectedTheme: ThemePreferenceType) => {
    theme.change(selectedTheme);
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
.app {
  /* * /
  background: rgb(var(--v-theme-surface-light));
  /* */
  background: linear-gradient(120deg, #f6f8fb 260px, #ffffff 160%);
  //background: linear-gradient(120deg, #f7f8fa 260px, #ffffff 200%);

  &--dark {
    background: linear-gradient(120deg, #10151d 260px, #090c10 180%);
    //background: linear-gradient(120deg, #181818 260px, #0c0c0c 200%);
  }
  /* * /
  background:
    radial-gradient(
      circle at 20% 35%,
      rgba(0, 134, 255, 0.04),
      transparent 60%
    ),
    radial-gradient(
      circle at 88% 25%,
      rgba(255, 0, 128, 0.02),
      transparent 35%
    ),
    radial-gradient(
      circle at 20% 80%,
      rgba(255, 102, 0, 0.02),
      transparent 55%
    ),
    radial-gradient(
      circle at 90% 110%,
      rgba(22, 249, 215, 0.06),
      transparent 35%
    );
  /* * /
  background:
    radial-gradient(
      circle at 20% 35%,
      rgba(0, 134, 255, 0.08),
      transparent 60%
    ),
    radial-gradient(
      circle at 88% 25%,
      rgba(255, 0, 128, 0.04),
      transparent 35%
    ),
    radial-gradient(
      circle at 20% 80%,
      rgba(255, 102, 0, 0.04),
      transparent 55%
    ),
    radial-gradient(
      circle at 90% 110%,
      rgba(22, 249, 215, 0.08),
      transparent 35%
    );
  /* */
}

.app-drawer {
  border-right: 0;
  //border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: #f6f8fb;

  .app--dark & {
    background: #10151d;
  }

  &__brand {
    align-items: center;
    display: flex;
    gap: 10px;
    height: 56px;
    padding: 0 16px;
    border-right: 1px solid rgb(var(--v-border-color), var(--v-border-opacity));
    //background: rgb(var(--v-theme-background));
    //background: rgba(var(--v-theme-background), var(--v-high-emphasis-opacity));
  }

  &__navigation {
    padding: 14px 10px;
    height: calc(100% - 56px);
    border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }

  &__footer {
    color: rgba(var(--v-theme-on-surface), 0.5);
    font-size: 0.7rem;
    padding: 12px 15px;
    border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
}

.app-second-drawer {
  background: #f6f8fb;

  .app--dark & {
    background: #10151d;
  }

  &__footer {
    color: rgba(var(--v-theme-on-surface), 0.5);
    font-size: 0.7rem;
    padding: 12px 15px;
  }
}

.brand-mark {
  color: rgb(var(--v-theme-on-primary));
  font-size: 1rem;
  font-weight: 800;
}

.brand-name {
  color: rgba(var(--v-theme-surface), 0.5);
  font-size: 0.95rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 0.95rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-height: 3em;

  .app--dark & {
    color: rgba(var(--v-theme-on-surface), 0.5);
  }
}

.platform-version {
  color: rgba(var(--v-theme-surface), 0.5);
  font-size: 0.72rem;
  letter-spacing: -0.02em;
  line-height: 1rem;

  .app--dark & {
    color: rgba(var(--v-theme-on-surface), 0.5);
  }
}

.app-bar {
  //background: rgb(var(--v-theme-background));
  //background: rgba(var(--v-theme-background), var(--v-high-emphasis-opacity));
  //border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  //backdrop-filter: blur(200px);

  color: rgba(var(--v-theme-surface), 0.5);

  .app--dark & {
    color: rgba(var(--v-theme-on-surface), 0.5);
  }

  &__title {
    font-size: 0.95rem;
    font-weight: 600;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.principal-name {
  font-size: 0.82rem;
  font-weight: 500;
}

.role-label :deep(.v-list-item-title) {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.72rem;
  text-transform: capitalize;
}
</style>
