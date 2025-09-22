<script setup>
defineProps({
  addonName: {
    type: String,
    required: true
  },
  addonLogo: {
    type: String,
    required: false
  },
  addonSummary: {
    type: String,
    required: false
  },
  addonTagline: {
    type: String,
    required: false
  }
});
</script>

<template>
  <div class="hero min-h-[350px] bg-gradient-to-r from-primary to-warning">
    <div class="hero-content text-center">
      <div class="max-w-lg">
        <img :src="addonLogo" :alt="addonName" class="w-32 h-32 mx-auto my-4" />
        <h1 class="text-4xl font-bold text-primary-content">{{ addonName }}</h1>
        <h2 class="py-6 text-xl text-primary-content/80">
          {{ addonSummary }}
        </h2>
      </div>
    </div>
  </div>
</template>
