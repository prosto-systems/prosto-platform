<template>
  <div class="blade" :class="classes">
    <div class="blade__bar bg-blue-grey-darken-3">
      <v-btn
        :icon="isMaximized ? 'mdi-window-minimize' : 'mdi-window-maximize'"
        :disabled="isMaximizedDisabled"
        :rounded="false"
        density="comfortable"
        variant="plain"
        size="small"
        class="px-4"
        @click="isMaximized = !isMaximized"
      />

      <v-btn
        :disabled="isClosingDisabled"
        :rounded="false"
        icon="mdi-close"
        density="comfortable"
        variant="plain"
        size="small"
        class="px-4"
        @click="close"
      />
    </div>

    <header class="blade__header bg-blue-grey-darken-2 pa-2">
      <v-icon :icon="blade.headIcon" size="large" />
      <h1 class="blade__title text-title-small ms-2 my-0">
        {{ bladeTitle }}
      </h1>
    </header>

    <div class="blade__toolbar bg-blue-grey-darken-2 px-0">
      <v-btn
        v-for="toolbarItem in firstToolbarItems"
        :key="toolbarItem.name"
        :disabled="Boolean(toolbarItem.isDisabled)"
        :title="toolbarItem.title"
        :rounded="false"
        class="blade__toolbar-btn pa-2"
        :class="{ 'blade__toolbar-btn--separated': toolbarItem.showSeparator }"
        variant="text"
        density="compact"
        size="x-small"
        stacked
        @click="toolbarItem.action()"
      >
        <template #prepend>
          <v-icon :icon="toolbarItem.icon" size="x-large" />
        </template>

        {{ toolbarItem.name }}
      </v-btn>

      <v-btn
        v-if="toolbarItems.length > toolbarPerLineCount"
        :rounded="false"
        class="blade__toolbar-btn pa-2"
        variant="text"
        density="compact"
        size="x-small"
        stacked
        @click="moreToolbarOpen = !moreToolbarOpen"
      >
        <template #prepend>
          <v-icon icon="mdi-dots-horizontal" size="x-large" />
        </template>

        {{
          moreToolbarOpen ? t('shell.commands.less') : t('shell.commands.more')
        }}
      </v-btn>
    </div>

    <div
      v-if="moreToolbarOpen"
      class="blade__more-toolbar bg-blue-grey-darken-2 px-0"
    >
      <v-btn
        v-for="toolbarItem in secondToolbarItems"
        :key="toolbarItem.name"
        :disabled="Boolean(toolbarItem.isDisabled)"
        :title="toolbarItem.title"
        :rounded="false"
        class="blade__more-toolbar-btn pa-2"
        :class="{
          'blade__more-toolbar-btn--separated': toolbarItem.showSeparator,
        }"
        variant="text"
        density="compact"
        size="x-small"
        stacked
        @click="toolbarItem.action()"
      >
        <template #prepend>
          <v-icon :icon="toolbarItem.icon" size="x-large" />
        </template>

        {{ toolbarItem.name }}
      </v-btn>
    </div>

    <div
      class="blade__content"
      :class="{ 'bg-blue-grey-darken-1': theme.current.value.dark }"
    >
      <component :is="blade.component" @close="close" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  bladeScopeToken,
  type IAdminShellBlade,
  type IAdminShellBladeToolbarItem,
} from '@prosto/platform-sdk/admin';
import {
  computed,
  normalizeClass,
  onMounted,
  provide,
  shallowReactive,
  shallowRef,
  watch,
} from 'vue';
import {
  createAuthService,
  createBladeService,
  createBladeToolbarService,
  createMainMenuService,
  createWorkspaceService,
  useBladesStore,
  useToolbarsStore,
} from '@/app/shell';
import { pinia } from '@/app/plugins';
import { useI18n } from 'vue-i18n';
import { useTheme } from 'vuetify';
import { getParentBlades } from '../utils';

interface IProps {
  blade: IAdminShellBlade;
}

const props = defineProps<IProps>();

const theme = useTheme();
const { t, te, locale } = useI18n();

const bladesStore = useBladesStore();
const toolbarsStore = useToolbarsStore();

const proxiedBlade = shallowReactive<IAdminShellBlade>(props.blade);

const isAnimated = shallowRef(true);
const isClosing = shallowRef(false);
const isClosingDisabled = shallowRef(props.blade.isClosingDisabled ?? false);

const isMaximized = shallowRef(props.blade.isMaximized ?? false);
const isMaximizedDisabled = shallowRef(
  props.blade.isMaximizedDisabled ?? false,
);

const moreToolbarOpen = shallowRef(false);
const toolbarPerLineCount = shallowRef(Number.MAX_SAFE_INTEGER);

// Turning off the animation of showing the blade
setTimeout(() => (isAnimated.value = false), 250);

const classes = computed<string>(() =>
  normalizeClass([
    isMaximized.value
      ? 'blade--size-maximize'
      : `blade--size-${props.blade.size ?? 'base'}`,
    {
      animated: isAnimated.value,
      closing: isClosing.value,
    },
  ]),
);

const bladeTitle = computed(() =>
  proxiedBlade.title && te(proxiedBlade.title)
    ? t(proxiedBlade.title)
    : proxiedBlade.title,
);

const toolbarItems = computed<IAdminShellBladeToolbarItem[]>(() =>
  toolbarsStore.toolbarItems(proxiedBlade),
);

const firstToolbarItems = computed<IAdminShellBladeToolbarItem[]>(() =>
  toolbarItems.value.slice(0, toolbarPerLineCount.value).map((item) => ({
    ...item,
    name: te(item.name) ? t(item.name) : item.name,
    title: item.title && te(item.title) ? t(item.title) : item.title,
  })),
);

const secondToolbarItems = computed<IAdminShellBladeToolbarItem[]>(() =>
  toolbarItems.value.slice(toolbarPerLineCount.value).map((item) => ({
    ...item,
    name: te(item.name) ? t(item.name) : item.name,
    title: item.title && te(item.title) ? t(item.title) : item.title,
  })),
);

function close() {
  bladesStore.closeChildrenBlades(props.blade, () => {
    isAnimated.value = true;
    isClosing.value = true;

    setTimeout(() => {
      scrollContent(props.blade.parentBlade);
      bladesStore.closeBlade(props.blade);
    }, 110);
  });
}

let pendingToolsTimeout: ReturnType<typeof setTimeout> | null = null;

function setVisibleMoreTools(): void {
  moreToolbarOpen.value = false;
  toolbarPerLineCount.value = Number.MAX_SAFE_INTEGER;

  if (pendingToolsTimeout) {
    clearTimeout(pendingToolsTimeout);
  }

  pendingToolsTimeout = setTimeout(() => {
    pendingToolsTimeout = null;

    const $toolbar = document
      .getElementById(props.blade.id)
      ?.querySelector('.blade__toolbar');
    const buttons = $toolbar?.querySelectorAll('button');

    if ($toolbar && buttons?.length) {
      let totalToolsWidth = 0;

      for (const button of buttons) {
        totalToolsWidth += button.clientWidth;
      }

      const availableWidth = $toolbar.clientWidth;

      if (totalToolsWidth > availableWidth) {
        const maxToolbarWidth = availableWidth - 60; // the 'more' button is 60px wide
        let toolsWidth = 0;
        let i = 0;

        while (
          i < buttons.length &&
          toolsWidth + (buttons[i]?.clientWidth ?? 0) <= maxToolbarWidth
        ) {
          toolsWidth += buttons[i]?.clientWidth ?? 0;
          i++;
        }

        toolbarPerLineCount.value = Math.max(i, 1);
      }
    }
  }, 150);
}

function scrollContent(scrollToBlade?: IAdminShellBlade): void {
  if (!scrollToBlade) {
    scrollToBlade = proxiedBlade;
  }

  const previousBlades = getParentBlades(scrollToBlade);
  let previousBladesWidthSum = 0;

  previousBlades.forEach((previousBlade) => {
    previousBladesWidthSum +=
      (document.getElementById(previousBlade.id)?.clientWidth ?? 0) + 1; // 1px border-right
  });

  const $bladeContainer = document.querySelector('.blade-container');
  const scrollLeft =
    previousBladesWidthSum +
    (document.getElementById(scrollToBlade.id)?.clientWidth ?? 0) -
    ($bladeContainer?.clientWidth ?? 0);

  $bladeContainer?.scrollTo({ top: 0, left: scrollLeft, behavior: 'smooth' });
}

onMounted(() => scrollContent());

let pendingScrollContentTimeout: ReturnType<typeof setTimeout> | null = null;

watch(isMaximized, async () => {
  if (pendingScrollContentTimeout) {
    clearTimeout(pendingScrollContentTimeout);
  }
  pendingScrollContentTimeout = setTimeout(() => scrollContent(), 180);
});

watch(
  [
    () => proxiedBlade.size,
    () => proxiedBlade.toolbarCommands,
    isMaximized,
    locale,
  ],
  () => setVisibleMoreTools(),
  {
    immediate: true,
  },
);

provide(bladeScopeToken, {
  blade: proxiedBlade,
  authService: createAuthService(pinia),
  workspaceService: createWorkspaceService(pinia),
  mainMenuService: createMainMenuService(pinia),
  bladeService: createBladeService(pinia),
  bladeToolbarService: createBladeToolbarService(pinia),
});
</script>

<style scoped lang="scss">
@keyframes blade {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(0);
  }
}

.blade {
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-background));
  display: inline-block;
  height: 100%;
  overflow: hidden;
  position: relative;
  vertical-align: top;
  transition:
    width 0.15s ease-in-out,
    margin-right 0.15s ease-in-out;

  &--size {
    &-base {
      width: 420px;
    }

    &-medium {
      //width: 550px;
      width: 558px;
    }

    &-large {
      //width: 680px;
      width: 696px;
    }

    &-maximize {
      width: 100%;
    }
  }

  &:not(:first-child, &--size-maximize):last-child {
    margin-right: 60px;
  }

  &.animated {
    z-index: -1;
    animation: blade ease-in-out 0.25s;

    @for $x from 2 through 68 {
      &:nth-child(#{$x}) {
        z-index: -$x;
      }
    }

    &.closing {
      animation-direction: reverse;
      animation-duration: 0.125s;
    }
  }

  &__bar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    height: 24px;
    overflow: hidden;
  }

  &__header {
    display: flex;
    align-items: center;
    border-bottom: 1px solid
      rgba(var(--v-border-color), var(--v-border-opacity));
  }

  &__title {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__toolbar,
  &__more-toolbar {
    display: flex;
    align-items: center;
    height: 53px;

    &-btn {
      min-width: 48px;
      height: 100%;
      gap: 2px;
      position: relative;

      &--separated {
        margin-right: 1px;

        &:before {
          content: '';
          position: absolute;
          right: -1px;
          height: 70%;
          border-right: 1px solid
            rgba(var(--v-border-color), var(--v-border-opacity));
        }
      }
    }
  }

  &__more-toolbar {
    flex-wrap: wrap;
    height: auto;
  }

  &__content {
    height: 100%;
    overflow: hidden;

    &:hover {
      overflow-y: auto;
    }
  }
}
</style>
