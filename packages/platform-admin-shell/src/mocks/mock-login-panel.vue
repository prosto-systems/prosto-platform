<template>
  <v-divider class="my-5" />

  <section aria-labelledby="mock-login-title">
    <h2 id="mock-login-title" class="text-subtitle-1 mb-2">
      {{ t('mock.accounts') }}
    </h2>

    <div class="d-flex flex-wrap ga-2">
      <v-btn
        v-for="credentials in MOCK_LOGIN_OPTIONS"
        :key="credentials.email"
        size="small"
        variant="tonal"
        @click="selectCredentials(credentials)"
      >
        {{ t('mock.useAccount', { role: credentials.label }) }}
      </v-btn>
    </div>

    <v-btn class="mt-3" :to="DETERMINISTIC_RESET_LINK" variant="text">
      {{ t('mock.resetLink') }}
    </v-btn>
  </section>
</template>

<script lang="ts" setup>
import {
  DETERMINISTIC_RESET_LINK,
  MOCK_LOGIN_OPTIONS,
  type IMockLoginOption,
} from './mock-fixtures';
import { useI18n } from 'vue-i18n';

interface IEmits {
  selectCredentials: [
    credentials: Pick<IMockLoginOption, 'email' | 'password'>,
  ];
}

const emit = defineEmits<IEmits>();
const { t } = useI18n();

function selectCredentials(credentials: IMockLoginOption): void {
  emit('selectCredentials', credentials);
}
</script>
