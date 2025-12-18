<template>
  <div class="logo-container">
    <RouterLink to="/dashboard/default">
      <img src="@/assets/images/logos/dental-robot-logo.svg" alt="Dental Robot" class="logo-img" />
    </RouterLink>
  </div>
</template>
<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>
<style scoped>
.logo-container {
  display: flex;
  align-items: center;
}
.logo-img {
  /* Larger horizontal logo - must be readable and prominent */
  height: 60px;
  width: auto;
  object-fit: contain;
  /* Brighten slightly for dark backgrounds */
  filter: brightness(1.15);
}
</style>
