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
  <div class="hero">
    <div class="logo is-center is-vertical-align">
      <img v-if="addonLogo" :src="addonLogo" alt="Addon logo" />
      <h1 v-else>{{ addonName }}</h1>
      <h3>{{ addonSummary }}</h3>
    </div>
  </div>
</template>

<style scoped>
.logo {
  flex: 1;
  flex-direction: column;
}

.logo img {
  width: 100%;
  max-width: 450px;
}

.logo h3 {
  font-weight: 300;
  text-align: center;
}
</style>
