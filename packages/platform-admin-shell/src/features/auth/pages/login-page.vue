<template>
  <v-container class="fill-height d-flex align-center" max-width="480">
    <v-card class="pa-6" elevation="2" width="100%">
      <h1 class="text-h4 mt-0 mb-2">{{ t('auth.signIn') }}</h1>

      <p class="text-body-2 text-medium-emphasis mb-6">
        {{ t('auth.signInDescription') }}
      </p>

      <v-alert
        v-if="serverError"
        class="mb-4"
        density="compact"
        aria-live="assertive"
        type="error"
        role="alert"
      >
        {{ serverError }}
      </v-alert>

      <v-form @submit.prevent="submit">
        <v-text-field
          v-model="form.email"
          autocomplete="email"
          :disabled="isSubmitting"
          :error-messages="fieldErrors.email"
          :label="t('auth.email')"
          type="email"
          variant="outlined"
        />

        <v-text-field
          v-model="form.password"
          :append-inner-icon="isPasswordVisible ? 'mdi-eye-off' : 'mdi-eye'"
          autocomplete="current-password"
          :disabled="isSubmitting"
          :error-messages="fieldErrors.password"
          :label="t('auth.password')"
          :type="isPasswordVisible ? 'text' : 'password'"
          variant="outlined"
          class="mt-2"
          @click:append-inner="isPasswordVisible = !isPasswordVisible"
        />

        <v-btn
          block
          color="primary"
          :loading="isSubmitting"
          type="submit"
          class="mt-2"
        >
          {{ t('auth.signIn') }}
        </v-btn>
      </v-form>

      <v-btn
        class="mt-4"
        :disabled="isSubmitting"
        :to="{ name: 'ForgotPassword' }"
        variant="text"
      >
        {{ t('auth.forgotPassword') }}
      </v-btn>

      <component
        :is="mockLoginPanel"
        v-if="mockLoginPanel"
        @select-credentials="fillMockCredentials"
      />
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
import type { Component } from 'vue';
import { loginRequestSchema } from '@prosto/platform-sdk/admin';
import { defineAsyncComponent, reactive, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ApiError } from '@/shared/api';
import { getSafeReturnUrl } from '@/app/router/safe-return-url';
import { getFieldErrors } from '../models';
import { useAuthStore } from '../stores';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const form = reactive({ email: '', password: '' });
const fieldErrors = shallowRef<Record<string, readonly string[]>>({});
const serverError = shallowRef<string>();
const isSubmitting = shallowRef(false);
const isPasswordVisible = shallowRef(false);
const mockLoginPanel = shallowRef<Component>();

if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW === 'true') {
  mockLoginPanel.value = defineAsyncComponent(
    () => import('@/mocks/mock-login-panel.vue'),
  );
}

function clearErrors(): void {
  fieldErrors.value = {};
  serverError.value = undefined;
}

function fillMockCredentials(credentials: {
  readonly email: string;
  readonly password: string;
}): void {
  form.email = credentials.email;
  form.password = credentials.password;

  clearErrors();
}

async function submit(): Promise<void> {
  clearErrors();

  const request = loginRequestSchema.safeParse(form);

  if (!request.success) {
    fieldErrors.value = getFieldErrors(request.error);
    return;
  }

  isSubmitting.value = true;

  try {
    await authStore.login(request.data);

    const returnUrl =
      typeof route.query.returnUrl === 'string'
        ? route.query.returnUrl
        : undefined;

    await router.replace(getSafeReturnUrl(returnUrl));
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      fieldErrors.value = error.fieldErrors;
    }

    serverError.value = t('auth.loginFailed');
  } finally {
    isSubmitting.value = false;
  }
}
</script>
