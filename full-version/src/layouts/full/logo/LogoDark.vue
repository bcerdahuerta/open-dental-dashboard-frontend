<template>
  <div class="logo-container">
    <RouterLink to="/dashboard/default">
      <img src="@/assets/images/logos/dentalrobot-logo.png" alt="Dental Robot" class="logo-img" />
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
  height: 36px;
  width: auto;
  max-width: 100%;
  object-fit: contain;
}
</style>
