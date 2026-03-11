<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';
import { SettingsIcon, LogoutIcon } from 'vue-tabler-icons';

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);
const { logout } = authStore;

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
});

const displayName = computed(() => user.value?.display_name || user.value?.email || 'User');
const roleName = computed(() => user.value?.role || 'viewer');
</script>

<template>
  <div class="pa-4">
    <!-- User Info -->
    <div class="mb-3">
      <h5 class="text-h5 mb-1">{{ greeting }}, {{ displayName }}</h5>
      <span class="text-medium-emphasis text-capitalize">{{ roleName }}</span>
    </div>

    <v-divider class="mb-2" />

    <!-- Menu Items -->
    <v-list density="compact" nav>
      <v-list-item to="/profile" class="text-body-1">
        <template #prepend>
          <SettingsIcon size="20" stroke-width="1.5" class="mr-3 text-secondary" />
        </template>
        <v-list-item-title>Account Settings</v-list-item-title>
      </v-list-item>
    </v-list>

    <v-divider class="my-2" />

    <!-- Logout -->
    <v-btn
      color="primary"
      variant="outlined"
      block
      @click="logout"
    >
      <LogoutIcon size="18" stroke-width="1.5" class="mr-2" />
      Logout
    </v-btn>
  </div>
</template>
