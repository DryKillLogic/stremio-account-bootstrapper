import { ref } from 'vue';

export const notifications = ref([]);

export function addNotification(text, type = 'info') {
  const id = Date.now() + Math.random();
  notifications.value.push({ id, text, type });

  setTimeout(() => {
    removeNotification(id);
  }, 10000);

  return id;
}

export function removeNotification(id) {
  notifications.value = notifications.value.filter((n) => n.id !== id);
}
