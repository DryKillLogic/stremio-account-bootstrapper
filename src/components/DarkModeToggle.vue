<template>
  <label class="swap swap-rotate">
    <input
      type="checkbox"
      class="theme-controller"
      value="dark"
      @change="toggleTheme"
    />

    <SunIcon class="swap-off w-6 h-6" />
    <MoonIcon class="swap-on w-6 h-6" />
  </label>
</template>

<script setup>
import { onMounted } from "vue";
import { SunIcon, MoonIcon } from "@heroicons/vue/24/outline";

function toggleTheme(event) {
  const theme = event.target.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

onMounted(() => {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);

  // Set the checkbox state based on saved theme
  const checkbox = document.querySelector(".theme-controller");
  if (checkbox) {
    checkbox.checked = savedTheme === "dark";
  }
});
</script>
