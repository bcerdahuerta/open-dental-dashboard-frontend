<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import {
  UserCheckIcon,
  UserXIcon,
  UsersIcon,
  ClockIcon,
  RefreshIcon
} from 'vue-tabler-icons';

const apiUrl = import.meta.env.VITE_API_URL;

interface UserItem {
  id: string;
  email: string;
  display_name: string;
  status: string;
  role_name: string;
  role_id: string;
  is_active: boolean;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
}

interface RoleItem {
  id: string;
  role_name: string;
  description: string;
}

// State
const pendingUsers = ref<UserItem[]>([]);
const allUsers = ref<UserItem[]>([]);
const roles = ref<RoleItem[]>([]);
const loading = ref(false);
const approveLoading = ref<string | null>(null);
const rejectLoading = ref<string | null>(null);
const rejectDialog = ref(false);
const rejectTarget = ref<UserItem | null>(null);
const selectedRoles = ref<Record<string, string>>({});
const snackbar = ref(false);
const snackbarMsg = ref('');
const snackbarColor = ref('success');

// Table headers
const pendingHeaders = [
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Display Name', key: 'display_name', sortable: true },
  { title: 'Registered', key: 'created_at', sortable: true },
  { title: 'Assign Role', key: 'role_select', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const }
];

const allHeaders = [
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Display Name', key: 'display_name', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Role', key: 'role_name', sortable: true },
  { title: 'Created', key: 'created_at', sortable: true }
];

// Status chip colors
const statusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'success';
    case 'PENDING': return 'warning';
    case 'REJECTED': return 'error';
    case 'SUSPENDED': return 'secondary';
    default: return 'secondary';
  }
};

const statusBg = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'bg-lightsuccess';
    case 'PENDING': return 'bg-lightwarning';
    case 'REJECTED': return 'bg-lighterror';
    case 'SUSPENDED': return 'bg-lightsecondary';
    default: return 'bg-lightsecondary';
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

// API calls
async function fetchPending() {
  try {
    const res = await fetchWrapper.get(`${apiUrl}/users/pending`);
    pendingUsers.value = res;
  } catch (e) {
    console.error('Failed to fetch pending users', e);
  }
}

async function fetchAllUsers() {
  try {
    const res = await fetchWrapper.get(`${apiUrl}/users?include_inactive=true`);
    allUsers.value = res;
  } catch (e) {
    console.error('Failed to fetch users', e);
  }
}

async function fetchRoles() {
  try {
    const res = await fetchWrapper.get(`${apiUrl}/users/roles`);
    roles.value = res;
  } catch (e) {
    console.error('Failed to fetch roles', e);
  }
}

async function refreshAll() {
  loading.value = true;
  await Promise.all([fetchPending(), fetchAllUsers(), fetchRoles()]);
  loading.value = false;
}

async function approveUser(user: UserItem) {
  approveLoading.value = user.id;
  try {
    const body: Record<string, string> = {};
    if (selectedRoles.value[user.id]) {
      body.role_id = selectedRoles.value[user.id];
    }
    await fetchWrapper.post(`${apiUrl}/users/${user.id}/approve`, body);
    snackbarMsg.value = `${user.email} approved successfully`;
    snackbarColor.value = 'success';
    snackbar.value = true;
    await refreshAll();
  } catch (e: any) {
    snackbarMsg.value = e.message || 'Failed to approve user';
    snackbarColor.value = 'error';
    snackbar.value = true;
  } finally {
    approveLoading.value = null;
  }
}

function confirmReject(user: UserItem) {
  rejectTarget.value = user;
  rejectDialog.value = true;
}

async function executeReject() {
  if (!rejectTarget.value) return;
  rejectLoading.value = rejectTarget.value.id;
  rejectDialog.value = false;
  try {
    await fetchWrapper.post(`${apiUrl}/users/${rejectTarget.value.id}/reject`, {});
    snackbarMsg.value = `${rejectTarget.value.email} rejected`;
    snackbarColor.value = 'warning';
    snackbar.value = true;
    await refreshAll();
  } catch (e: any) {
    snackbarMsg.value = e.message || 'Failed to reject user';
    snackbarColor.value = 'error';
    snackbar.value = true;
  } finally {
    rejectLoading.value = null;
    rejectTarget.value = null;
  }
}

onMounted(() => refreshAll());
</script>

<template>
  <v-row>
    <!-- Pending Approvals -->
    <v-col cols="12">
      <UiParentCard title="Pending Approvals">
        <template #action>
          <v-btn
            variant="tonal"
            color="primary"
            size="small"
            :loading="loading"
            @click="refreshAll"
          >
            <RefreshIcon size="16" stroke-width="1.5" class="mr-1" />
            Refresh
          </v-btn>
        </template>

        <v-data-table
          :headers="pendingHeaders"
          :items="pendingUsers"
          :loading="loading"
          density="comfortable"
          class="elevation-0"
          :items-per-page="10"
          no-data-text="No pending registrations"
        >
          <template #item.created_at="{ item }">
            <span class="text-medium-emphasis">{{ formatDate(item.created_at) }}</span>
          </template>

          <template #item.role_select="{ item }">
            <v-select
              v-model="selectedRoles[item.id]"
              :items="roles"
              item-title="role_name"
              item-value="id"
              variant="outlined"
              color="primary"
              density="compact"
              hide-details
              placeholder="viewer (default)"
              style="min-width: 160px"
            />
          </template>

          <template #item.actions="{ item }">
            <div class="d-flex justify-center ga-2">
              <v-btn
                color="success"
                variant="tonal"
                size="small"
                :loading="approveLoading === item.id"
                @click="approveUser(item)"
              >
                <UserCheckIcon size="16" stroke-width="1.5" class="mr-1" />
                Approve
              </v-btn>
              <v-btn
                color="error"
                variant="tonal"
                size="small"
                :loading="rejectLoading === item.id"
                @click="confirmReject(item)"
              >
                <UserXIcon size="16" stroke-width="1.5" class="mr-1" />
                Reject
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>

    <!-- All Users -->
    <v-col cols="12">
      <UiParentCard title="All Users">
        <template #action>
          <v-chip color="primary" size="small">
            <UsersIcon size="14" stroke-width="1.5" class="mr-1" />
            {{ allUsers.length }} users
          </v-chip>
        </template>

        <v-data-table
          :headers="allHeaders"
          :items="allUsers"
          :loading="loading"
          density="comfortable"
          class="elevation-0"
          :items-per-page="15"
        >
          <template #item.status="{ item }">
            <v-chip
              :color="statusColor(item.status)"
              :class="statusBg(item.status)"
              size="small"
            >
              {{ item.status }}
            </v-chip>
          </template>

          <template #item.created_at="{ item }">
            <span class="text-medium-emphasis">{{ formatDate(item.created_at) }}</span>
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>

  <!-- Reject Confirmation Dialog -->
  <v-dialog v-model="rejectDialog" max-width="400" persistent>
    <v-card>
      <v-card-title class="text-h6 pa-4">Confirm Rejection</v-card-title>
      <v-card-text>
        Are you sure you want to reject registration for
        <strong>{{ rejectTarget?.email }}</strong>?
        They will not be able to log in.
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="tonal" color="secondary" @click="rejectDialog = false">Cancel</v-btn>
        <v-btn variant="flat" color="error" @click="executeReject">Reject</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Snackbar -->
  <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="4000" location="bottom right">
    {{ snackbarMsg }}
  </v-snackbar>
</template>
