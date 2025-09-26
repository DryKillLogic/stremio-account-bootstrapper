<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { loginUser, createUser } from '../api/stremioApi';
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline';
import HowGetAuthKey from './HowGetAuthKey.vue';
import { addNotification } from '../composables/useNotifications';

const { t } = useI18n();

const authKey = ref('');
const email = ref('');
const password = ref('');
const loggedIn = ref(false);
const emits = defineEmits(['auth-key']);

function loginUserPassword() {
  loginUser(email.value, password.value)
    .then((data) => {
      if (data?.result?.authKey) {
        authKey.value = data.result.authKey;
        loggedIn.value = true;
        emitAuthKey();
      } else {
        addNotification(data?.error?.message || t('login_failed'), 'error');
      }
    })
    .catch((err) => {
      console.error(err);
      addNotification(err?.message || t('login_failed'), 'error');
    });
}

function createAccount() {
  createUser(email.value, password.value)
    .then((data) => {
      if (data?.result?.authKey) {
        authKey.value = data.result.authKey;
        loggedIn.value = true;
        emitAuthKey();
        addNotification(t('register_successful'), 'success');
      } else {
        addNotification(data?.error?.message || t('register_failed'), 'error');
      }
    })
    .catch((err) => {
      console.error(err);
      addNotification(err?.message || t('register_failed'), 'error');
    });
}

function emitAuthKey() {
  emits('auth-key', authKey.value.replaceAll('"', '').trim());
}
</script>

<template>
  <section id="authentication" class="max-w-4xl mx-auto p-4">
    <h3 class="text-2xl font-bold mb-6">{{ $t('authentication') }}</h3>

    <div class="bg-base-100 p-6 rounded-lg border border-base-300">
      <div class="space-y-4">
        <div class="form-control">
          <input
            type="text"
            v-model="email"
            :placeholder="$t('stremio_email')"
            class="input input-bordered w-full"
          />
        </div>

        <div class="form-control">
          <input
            type="password"
            v-model="password"
            :placeholder="$t('stremio_password')"
            class="input input-bordered w-full"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            class="btn btn-primary"
            @click="loginUserPassword"
            :disabled="!email || !password"
          >
            {{ loggedIn ? $t('logged_in') : $t('login') }}
          </button>

          <button
            class="btn btn-secondary"
            @click="createAccount"
            :disabled="!email || !password"
          >
            {{ $t('signup') }}
          </button>
        </div>

        <div class="divider">
          <strong>{{ $t('or') }}</strong>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">{{ $t('paste_authkey') }}</span>
            <button
              type="button"
              onclick="get_auth_key.showModal()"
              class="p-0 bg-transparent border-0 shadow-none hover:bg-transparent cursor-pointer"
            >
              <QuestionMarkCircleIcon class="h-5 w-5 text-primary" />
            </button>
          </label>
          <input
            type="password"
            v-model="authKey"
            v-on:input="emitAuthKey"
            :placeholder="$t('paste_authkey')"
            class="input input-bordered w-full"
          />
        </div>
      </div>
    </div>
    <HowGetAuthKey />
  </section>
</template>
