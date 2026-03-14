<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useCustomizerStore } from '../../../stores/customizer';
import { useAuthStore } from '@/stores/auth';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
// Icon Imports
import { BellIcon, SettingsIcon, Menu2Icon, SunIcon, MoonIcon } from 'vue-tabler-icons';

// dropdown imports
import NotificationDD from './NotificationDD.vue';
import ProfileDD from './ProfileDD.vue';

const customizer = useCustomizerStore();
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const userInitials = computed(() => {
  const name = user.value?.display_name || user.value?.email || '';
  if (!name) return '?';
  const parts = name.split(/[\s@]+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
});

const priority = ref(customizer.setHorizontalLayout ? 0 : 0);
watch(priority, (newPriority) => {
  priority.value = newPriority;
});

// Theme toggle logic
const isDarkTheme = computed(() => customizer.actTheme === 'DarkPurpleTheme');
const toggleTheme = () => {
  customizer.SET_THEME(isDarkTheme.value ? 'PurpleTheme' : 'DarkPurpleTheme');
};

// Pending badge count for admin users
const pendingCount = ref(0);
const isAdmin = computed(() => user.value?.role === 'admin');
const apiUrl = import.meta.env.VITE_API_URL;
let badgeInterval: ReturnType<typeof setInterval> | null = null;
const route = useRoute();

const showBadge = computed(() => 
  isAdmin.value && pendingCount.value > 0 && route.path !== '/admin/users'
);

async function fetchBadgeCount() {
  if (!isAdmin.value) return;
  try {
    const res = await fetchWrapper.get(`${apiUrl}/users/pending/count`);
    pendingCount.value = res.count;
  } catch {
    // Silent fail
  }
}

onMounted(() => {
  if (isAdmin.value) {
    fetchBadgeCount();
    badgeInterval = setInterval(fetchBadgeCount, 60_000);
  }
});

onUnmounted(() => {
  if (badgeInterval) clearInterval(badgeInterval);
});
</script>

<template>
  <v-app-bar elevation="0" :priority="priority" height="80">
    <v-btn
      class="hidden-md-and-down text-secondary"
      color="lightsecondary"
      icon
      rounded="sm"
      variant="flat"
      size="small"
      @click.stop="customizer.SET_MINI_SIDEBAR(!customizer.mini_sidebar)"
    >
      <Menu2Icon size="20" stroke-width="1.5" />
    </v-btn>
    <v-btn
      class="hidden-lg-and-up text-secondary ms-3"
      color="lightsecondary"
      icon
      rounded="sm"
      variant="flat"
      size="small"
      @click.stop="customizer.SET_SIDEBAR_DRAWER"
    >
      <Menu2Icon size="20" stroke-width="1.5" />
    </v-btn>

    <v-spacer />

    <!-- Theme Toggle -->
    <v-btn
      icon
      class="text-secondary"
      color="lightsecondary"
      rounded="sm"
      size="small"
      variant="flat"
      @click="toggleTheme"
    >
      <SunIcon v-if="isDarkTheme" stroke-width="1.5" size="22" />
      <MoonIcon v-else stroke-width="1.5" size="22" />
    </v-btn>

    <!-- Notification -->
    <v-menu :close-on-content-click="false">
      <template #activator="{ props }">
        <v-btn icon class="text-secondary mx-3" color="lightsecondary" rounded="sm" size="small" variant="flat" v-bind="props">
          <v-badge
            v-if="showBadge"
            :content="pendingCount"
            color="error"
            floating
          >
            <BellIcon stroke-width="1.5" size="22" />
          </v-badge>
          <BellIcon v-else stroke-width="1.5" size="22" />
        </v-btn>
      </template>
      <v-sheet rounded="md" width="330" elevation="12">
        <NotificationDD />
      </v-sheet>
    </v-menu>

    <!-- User Profile -->
    <v-menu :close-on-content-click="false">
      <template #activator="{ props }">
        <v-btn class="profileBtn text-primary" color="lightprimary" variant="flat" rounded="pill" v-bind="props">
          <v-avatar size="30" color="primary" variant="tonal" class="me-2 py-2">
            <span class="text-subtitle-2 font-weight-medium">{{ userInitials }}</span>
          </v-avatar>
          <SettingsIcon stroke-width="1.5" />
        </v-btn>
      </template>
      <v-sheet rounded="md" width="330" elevation="12">
        <ProfileDD />
      </v-sheet>
    </v-menu>
  </v-app-bar>
</template>
