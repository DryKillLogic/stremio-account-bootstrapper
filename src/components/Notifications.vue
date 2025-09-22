<script setup>
import {
  notifications,
  removeNotification
} from '../composables/useNotifications';
</script>

<template>
  <div class="fixed right-4 top-4 z-50 space-y-2">
    <div
      v-for="note in notifications"
      :key="note.id"
      :class="[
        'alert shadow-lg max-w-sm',
        note.type === 'error' ? 'alert-error' : '',
        note.type === 'success' ? 'alert-success' : '',
        note.type === 'info' ? 'alert-info' : ''
      ]"
    >
      <div class="flex-1">
        <span v-html="note.text"></span>
      </div>
      <div class="flex-none">
        <button
          class="btn btn-ghost btn-sm"
          @click="removeNotification(note.id)"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>
