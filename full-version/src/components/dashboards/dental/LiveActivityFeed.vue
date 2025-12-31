<script setup lang="ts">
import { ref } from 'vue';
import { EyeIcon } from 'vue-tabler-icons';

// Type definitions
interface ActivityItem {
  id: number;
  patientName: string;
  patientDob: string;
  carrier: string;
  carrierIcon: string;
  type: 'FBD' | 'ELG' | 'Short';
  status: 'Extracted' | 'QA Done' | 'Written Back' | 'Failed';
}

// Mock data based on domain context
const recentActivity = ref<ActivityItem[]>([
  {
    id: 1,
    patientName: 'John Martinez',
    patientDob: '03/15/1985',
    carrier: 'Delta Dental',
    carrierIcon: 'mdi-tooth',
    type: 'FBD',
    status: 'Written Back'
  },
  {
    id: 2,
    patientName: 'Sarah Johnson',
    patientDob: '08/22/1992',
    carrier: 'MetLife',
    carrierIcon: 'mdi-shield-check',
    type: 'ELG',
    status: 'QA Done'
  },
  {
    id: 3,
    patientName: 'Emily Chen',
    patientDob: '11/30/1978',
    carrier: 'Cigna',
    carrierIcon: 'mdi-hospital-building',
    type: 'FBD',
    status: 'Extracted'
  },
  {
    id: 4,
    patientName: 'Robert Williams',
    patientDob: '06/10/1965',
    carrier: 'Aetna',
    carrierIcon: 'mdi-heart-pulse',
    type: 'Short',
    status: 'QA Done'
  },
  {
    id: 5,
    patientName: 'Maria Garcia',
    patientDob: '01/05/2001',
    carrier: 'Guardian',
    carrierIcon: 'mdi-shield-account',
    type: 'FBD',
    status: 'Failed'
  },
  {
    id: 6,
    patientName: 'David Thompson',
    patientDob: '09/18/1988',
    carrier: 'United Healthcare',
    carrierIcon: 'mdi-hospital',
    type: 'ELG',
    status: 'Written Back'
  }
]);

// Table headers for v-data-table
const headers = [
  { title: 'Patient', key: 'patient', sortable: false },
  { title: 'Carrier', key: 'carrier', sortable: true },
  { title: 'Type', key: 'type', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const }
];

// Helper functions for chip colors
const getTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    'FBD': 'primary',
    'ELG': 'success',
    'Short': 'info'
  };
  return colors[type] || 'grey';
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'Extracted': 'info',
    'QA Done': 'warning',
    'Written Back': 'success',
    'Failed': 'error'
  };
  return colors[status] || 'grey';
};

const viewDetails = (id: number) => {
  console.log('View details for:', id);
  // TODO: Navigate to detail view
};
</script>

<template>
  <v-card variant="outlined">
    <v-card-item>
      <v-card-title class="text-subtitle-1">Live Activity Feed</v-card-title>
      <v-card-subtitle>Recent verification activity</v-card-subtitle>
    </v-card-item>
    <v-card-text class="pa-0">
      <v-data-table
        :headers="headers"
        :items="recentActivity"
        :items-per-page="6"
        density="comfortable"
        class="elevation-0"
      >
        <!-- Patient Column -->
        <template #item.patient="{ item }">
          <div>
            <span class="font-weight-medium">{{ item.patientName }}</span>
            <br />
            <span class="text-caption text-medium-emphasis">DOB: {{ item.patientDob }}</span>
          </div>
        </template>

        <!-- Carrier Column -->
        <template #item.carrier="{ item }">
          <div class="d-flex align-center">
            <v-icon :icon="item.carrierIcon" size="small" class="mr-2" />
            {{ item.carrier }}
          </div>
        </template>

        <!-- Type Column -->
        <template #item.type="{ item }">
          <v-chip :color="getTypeColor(item.type)" size="small" label>
            {{ item.type }}
          </v-chip>
        </template>

        <!-- Status Column -->
        <template #item.status="{ item }">
          <v-chip :color="getStatusColor(item.status)" size="small" variant="tonal">
            {{ item.status }}
          </v-chip>
        </template>

        <!-- Actions Column -->
        <template #item.actions="{ item }">
          <v-btn icon variant="text" size="small" @click="viewDetails(item.id)">
            <EyeIcon stroke-width="1.5" size="20" />
          </v-btn>
        </template>
      </v-data-table>
    </v-card-text>
  </v-card>
</template>
