<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { UserIcon, LockIcon } from 'vue-tabler-icons';

const apiUrl = import.meta.env.VITE_API_URL;
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

// Profile form
const displayName = ref(user.value?.display_name || '');
const profileLoading = ref(false);
const profileMsg = ref('');

// Password form
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const passwordLoading = ref(false);
const passwordMsg = ref('');
const showCurrentPwd = ref(false);
const showNewPwd = ref(false);

const snackbar = ref(false);
const snackbarMsg = ref('');
const snackbarColor = ref('success');

function showSnackbar(msg: string, color: string) {
  snackbarMsg.value = msg;
  snackbarColor.value = color;
  snackbar.value = true;
}

async function updateProfile() {
  if (!user.value) return;
  profileLoading.value = true;
  try {
    await fetchWrapper.put(`${apiUrl}/users/${user.value.id}`, {
      display_name: displayName.value
    });
    // Update local store
    user.value = { ...user.value, display_name: displayName.value };
    localStorage.setItem('user', JSON.stringify(user.value));
    showSnackbar('Profile updated successfully', 'success');
  } catch (e: any) {
    showSnackbar(e.message || 'Failed to update profile', 'error');
  } finally {
    profileLoading.value = false;
  }
}

async function changePassword() {
  if (!user.value) return;
  if (newPassword.value !== confirmPassword.value) {
    showSnackbar('Passwords do not match', 'error');
    return;
  }
  if (newPassword.value.length < 8) {
    showSnackbar('Password must be at least 8 characters', 'error');
    return;
  }
  passwordLoading.value = true;
  try {
    await fetchWrapper.put(`${apiUrl}/users/${user.value.id}`, {
      password: newPassword.value
    });
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    showSnackbar('Password changed successfully', 'success');
  } catch (e: any) {
    showSnackbar(e.message || 'Failed to change password', 'error');
  } finally {
    passwordLoading.value = false;
  }
}
</script>

<template>
  <v-row>
    <!-- Profile Info Card -->
    <v-col cols="12" md="6">
      <UiParentCard title="Profile Information">
        <template #action>
          <v-chip color="primary" size="small" class="text-capitalize">
            {{ user?.role || 'viewer' }}
          </v-chip>
        </template>

        <div class="d-flex align-center mb-6">
          <v-avatar color="primary" variant="tonal" size="64" class="mr-4">
            <span class="text-h4 font-weight-medium">{{ userInitials }}</span>
          </v-avatar>
          <div>
            <h4 class="text-h5">{{ user?.display_name || 'User' }}</h4>
            <span class="text-medium-emphasis">{{ user?.email }}</span>
          </div>
        </div>

        <v-text-field
          v-model="displayName"
          label="Display Name"
          variant="outlined"
          color="primary"
          hide-details="auto"
          class="mb-4"
        />

        <v-text-field
          :model-value="user?.email"
          label="Email"
          variant="outlined"
          color="primary"
          hide-details
          disabled
          class="mb-4"
        />

        <v-text-field
          :model-value="user?.role"
          label="Role"
          variant="outlined"
          color="primary"
          hide-details
          disabled
          class="mb-6"
        />

        <v-btn
          color="primary"
          variant="flat"
          :loading="profileLoading"
          @click="updateProfile"
        >
          Save Changes
        </v-btn>
      </UiParentCard>
    </v-col>

    <!-- Change Password Card -->
    <v-col cols="12" md="6">
      <UiParentCard title="Change Password">
        <template #action>
          <LockIcon size="20" stroke-width="1.5" class="text-secondary" />
        </template>

        <v-text-field
          v-model="currentPassword"
          label="Current Password"
          variant="outlined"
          color="primary"
          hide-details="auto"
          :type="showCurrentPwd ? 'text' : 'password'"
          :append-inner-icon="showCurrentPwd ? '$eye' : '$eyeOff'"
          @click:append-inner="showCurrentPwd = !showCurrentPwd"
          class="mb-4"
        />

        <v-text-field
          v-model="newPassword"
          label="New Password"
          variant="outlined"
          color="primary"
          hide-details="auto"
          :type="showNewPwd ? 'text' : 'password'"
          :append-inner-icon="showNewPwd ? '$eye' : '$eyeOff'"
          @click:append-inner="showNewPwd = !showNewPwd"
          class="mb-4"
        />

        <v-text-field
          v-model="confirmPassword"
          label="Confirm New Password"
          variant="outlined"
          color="primary"
          hide-details="auto"
          type="password"
          class="mb-6"
        />

        <v-btn
          color="primary"
          variant="flat"
          :loading="passwordLoading"
          :disabled="!newPassword || !confirmPassword"
          @click="changePassword"
        >
          Update Password
        </v-btn>
      </UiParentCard>
    </v-col>
  </v-row>

  <!-- Snackbar -->
  <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="4000" location="bottom right">
    {{ snackbarMsg }}
  </v-snackbar>
</template>
