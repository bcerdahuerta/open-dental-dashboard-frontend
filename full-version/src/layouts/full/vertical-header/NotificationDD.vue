<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import { UsersIcon, BellIcon } from 'vue-tabler-icons';

const apiUrl = import.meta.env.VITE_API_URL;
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const pendingCount = ref(0);
let pollInterval: ReturnType<typeof setInterval> | null = null;

const isAdmin = computed(() => user.value?.role === 'admin');

async function fetchPendingCount() {
  if (!isAdmin.value) return;
  try {
    const res = await fetchWrapper.get(`${apiUrl}/users/pending/count`);
    pendingCount.value = res.count;
  } catch {
    // Silently fail — non-critical
  }
}

onMounted(() => {
  if (isAdmin.value) {
    fetchPendingCount();
    pollInterval = setInterval(fetchPendingCount, 60_000);
  }
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>

<template>
  <div class="pa-4">
    <h5 class="text-h5 mb-3">Notifications</h5>

    <template v-if="isAdmin && pendingCount > 0">
      <v-list density="compact" nav>
        <v-list-item to="/admin/users" class="bg-lightwarning rounded-md">
          <template #prepend>
            <v-avatar color="warning" size="36" class="mr-3">
              <UsersIcon size="18" stroke-width="1.5" />
            </v-avatar>
          </template>
          <v-list-item-title class="text-body-1 font-weight-medium">
            {{ pendingCount }} pending user{{ pendingCount !== 1 ? 's' : '' }}
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            Awaiting approval
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </template>

    <template v-else>
      <div class="text-center py-6">
        <BellIcon size="32" stroke-width="1.5" class="text-medium-emphasis mb-2" />
        <p class="text-medium-emphasis text-body-2">No notifications</p>
      </div>
    </template>
  </div>
</template>
