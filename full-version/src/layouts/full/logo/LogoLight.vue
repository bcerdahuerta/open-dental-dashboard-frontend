<template>
  <div class="logo-container">
    <RouterLink to="/dashboard/default">
      <img src="@/assets/images/logos/dentalrobot-logo.png" alt="Dental Robot" class="logo-img logo-white" />
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
}
.logo-white {
  filter: brightness(0) invert(1);
}
</style>
