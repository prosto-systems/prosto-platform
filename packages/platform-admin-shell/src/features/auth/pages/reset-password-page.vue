<template>
  <v-container class="fill-height d-flex align-center" max-width="480">
    <v-card class="pa-6" elevation="2" width="100%">
      <h1 class="text-h4 mt-0 mb-2">{{ t('auth.chooseNewPassword') }}</h1>

      <v-alert v-if="!token" class="mb-4" type="error" role="alert">
        {{ t('auth.invalidResetLink') }}
      </v-alert>

      <template v-else>
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
            v-model="form.password"
            :append-inner-icon="isPasswordVisible ? 'mdi-eye-off' : 'mdi-eye'"
            autocomplete="new-password"
            :disabled="isSubmitting"
            :error-messages="fieldErrors.password"
            :label="t('auth.newPassword')"
            :type="isPasswordVisible ? 'text' : 'password'"
            variant="outlined"
            @click:append-inner="isPasswordVisible = !isPasswordVisible"
          />

          <v-text-field
            v-model="form.passwordConfirmation"
            autocomplete="new-password"
            :disabled="isSubmitting"
            :error-messages="fieldErrors.passwordConfirmation"
            :label="t('auth.confirmNewPassword')"
            :type="isPasswordVisible ? 'text' : 'password'"
            variant="outlined"
            class="mt-2"
          />

          <v-alert
            v-if="fieldErrors.token"
            class="mb-4"
            density="compact"
            aria-live="assertive"
            type="error"
            role="alert"
          >
            {{ fieldErrors.token[0] }}
          </v-alert>

          <v-btn
            block
            color="primary"
            :loading="isSubmitting"
            type="submit"
            class="mt-2"
          >
            {{ t('auth.completeReset') }}
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
import { computed, reactive, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ApiError } from '@/shared/api';
import { getFieldErrors, passwordResetSchema } from '../models';
import { useAuthStore } from '../stores';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const form = reactive({ password: '', passwordConfirmation: '' });
const fieldErrors = shallowRef<Record<string, readonly string[]>>({});
const serverError = shallowRef<string>();
const isSubmitting = shallowRef(false);
const isPasswordVisible = shallowRef(false);

const token = computed(() =>
  typeof route.query.token === 'string' ? route.query.token : '',
);

async function submit(): Promise<void> {
  fieldErrors.value = {};
  serverError.value = undefined;

  const request = passwordResetSchema.safeParse({
    ...form,
    token: token.value,
  });

  if (!request.success) {
    fieldErrors.value = getFieldErrors(request.error);
    return;
  }

  isSubmitting.value = true;

  try {
    await authStore.completePasswordReset(request.data);
    await router.replace({ name: 'Login' });
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      fieldErrors.value = error.fieldErrors;

      if (error.code.includes('token')) {
        fieldErrors.value = {
          ...fieldErrors.value,
          token: [t('auth.invalidOrExpiredResetLink')],
        };
      }
    }

    serverError.value = t('auth.resetFailed');
  } finally {
    isSubmitting.value = false;
  }
}
</script>
