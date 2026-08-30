<template>
  <div class="blade" :class="classes">
    <div class="blade__bar bg-blue-grey-darken-3">
      <v-btn
        :icon="isMaximize ? 'mdi-window-minimize' : 'mdi-window-maximize'"
        :disabled="isMaximizeDisabled"
        :rounded="false"
        density="comfortable"
        variant="plain"
        size="small"
        class="px-4"
        @click="isMaximize = !isMaximize"
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
      <h1 class="blade__title text-title-small ms-2 my-0">{{ blade.title }}</h1>
    </header>

    <div class="blade__toolbar bg-blue-grey-darken-2 px-0">
      <v-btn
        v-for="i in 9"
        :key="i"
        :rounded="false"
        class="blade__toolbar-btn pa-2"
        prepend-icon="$vuetify"
        variant="text"
        density="compact"
        size="x-small"
        stacked
      >
        Button
      </v-btn>
    </div>

    <div
      class="blade__content"
      :class="{ 'bg-blue-grey-darken-1': theme.current.value.dark }"
    >
      <component :is="blade.component" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { bladeScopeToken, type IAdminShellBlade } from '@prosto/platform-sdk';
import {
  computed,
  shallowRef,
  normalizeClass,
  provide,
  shallowReactive,
} from 'vue';
import {
  createAuthService,
  createBladeService,
  createMainMenuService,
  createWorkspaceService,
  useBladesStore,
} from '@/app/shell';
import { pinia } from '@/app/plugins';
import { useTheme } from 'vuetify';
import { VBtn } from 'vuetify/components';

interface IProps {
  blade: IAdminShellBlade;
}

const props = defineProps<IProps>();

const theme = useTheme();
const bladesStore = useBladesStore();

const proxiedBlade = shallowReactive<IAdminShellBlade>(props.blade);
const isMaximize = shallowRef(props.blade.isMaximized ?? false);
const isMaximizeDisabled = shallowRef(props.blade.isMaximizeDisabled ?? false);
const isClosingDisabled = shallowRef(props.blade.isClosingDisabled ?? false);
const isClosing = shallowRef(false);
const isAnimated = shallowRef(true);

// Turning off the animation of showing the blade
setTimeout(() => (isAnimated.value = false), 250);

const classes = computed(() =>
  normalizeClass([
    isMaximize.value
      ? 'blade--size-maximize'
      : `blade--size-${props.blade.size ?? 'base'}`,
    {
      animated: isAnimated.value,
      closing: isClosing.value,
    },
  ]),
);

function close() {
  bladesStore.closeChildrenBlades(props.blade, () => {
    isAnimated.value = true;
    isClosing.value = true;

    setTimeout(() => bladesStore.closeBlade(props.blade), 110);
  });
}

provide(bladeScopeToken, {
  blade: proxiedBlade,
  authService: createAuthService(pinia),
  workspaceService: createWorkspaceService(pinia),
  mainMenuService: createMainMenuService(pinia),
  bladeService: createBladeService(pinia),
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
  transition: width 0.15s ease-in-out;

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

  &__toolbar {
    display: flex;
    align-items: center;
    padding: 0 2px;

    &-btn {
      min-width: auto;
      height: 100%;
    }
  }

  &__content {
    height: 100%;
    overflow: hidden;
  }
}
</style>
