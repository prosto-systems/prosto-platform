<template>
  <v-container class="fill-height d-flex align-center" max-width="480">
    <v-card class="pa-6" elevation="2" width="100%">
      <h1 class="text-h4 mt-0 mb-2">{{ t('auth.resetPassword') }}</h1>

      <v-alert v-if="isSubmitted" aria-live="polite" type="success">
        {{ t('auth.resetRequestAccepted') }}
      </v-alert>

      <template v-else>
        <p class="text-body-2 text-medium-emphasis mb-6">
          {{ t('auth.requestResetDescription') }}
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
            :disabled="isSubmitting"
            :error-messages="fieldErrors.email"
            :label="t('auth.email')"
            type="email"
            autocomplete="email"
            variant="outlined"
          />

          <v-btn
            :loading="isSubmitting"
            type="submit"
            color="primary"
            class="mt-2"
            block
          >
            {{ t('auth.requestReset') }}
          </v-btn>
        </v-form>
      </template>

      <v-btn class="mt-4" :to="{ name: 'Login' }" variant="text">
        {{ t('auth.backToSignIn') }}
      </v-btn>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
import { reactive, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { ApiError } from '@/shared/api';
import { getFieldErrors, passwordResetRequestSchema } from '../models';
import { useAuthStore } from '../stores';

const authStore = useAuthStore();
const { t } = useI18n();

const form = reactive({ email: '' });
const fieldErrors = shallowRef<Record<string, readonly string[]>>({});
const serverError = shallowRef<string>();
const isSubmitting = shallowRef(false);
const isSubmitted = shallowRef(false);

async function submit(): Promise<void> {
  fieldErrors.value = {};
  serverError.value = undefined;

  const request = passwordResetRequestSchema.safeParse(form);

  if (!request.success) {
    fieldErrors.value = getFieldErrors(request.error);
    return;
  }

  isSubmitting.value = true;

  try {
    await authStore.requestPasswordReset(request.data);

    isSubmitted.value = true;
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      fieldErrors.value = error.fieldErrors;
    }

    serverError.value = t('auth.resetRequestFailed');
  } finally {
    isSubmitting.value = false;
  }
}
</script>
