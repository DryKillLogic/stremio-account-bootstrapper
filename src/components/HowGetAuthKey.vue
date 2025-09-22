<script setup>
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<template>
  <dialog id="get_auth_key" class="modal">
    <div class="modal-box">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
          ✕
        </button>
      </form>
      <h3 class="text-lg font-semibold">
        {{ $t('how_to_get_authkey') }}
      </h3>
      <div class="py-4 space-y-4">
        <ol class="list-decimal list-inside space-y-3 text-md">
          <li>
            <span>{{ t('how_step1') }}</span>
            <a
              href="https://web.stremio.com"
              target="_blank"
              class="link link-primary ml-1"
            >
              https://web.stremio.com
            </a>
            <span>{{ t('how_step1_end') }}</span>
          </li>
          <li>
            <a
              href=" https://balsamiq.com/support/faqs/browser-console/"
              target="_blank"
              class="link link-primary ml-1"
            >
              {{ t('how_step2') }}
            </a>
            <span>{{ t('how_step2_middle') }}</span>
            <div
              class="bg-base-200 rounded px-3 py-2 my-2 font-mono text-sm overflow-x-auto"
            >
              <code>JSON.parse(localStorage.getItem("profile")).auth.key</code>
            </div>
          </li>
          <li>
            <span>{{ t('how_step3') }}</span>
          </li>
        </ol>
      </div>
      <div class="modal-action">
        <form method="dialog">
          <button class="btn">{{ $t('close') }}</button>
        </form>
      </div>
    </div>
  </dialog>
</template>
