<script setup lang="ts">
const props = defineProps({
  name: String,
  destination: String,
  building: String,
  street: String,
  city: String,
  state: String,
  country: String,
  post: String,
  phone: String,
  isDefault: Boolean,
  showBtn: Boolean
});
</script>
<template>
  <v-card variant="outlined">
    <v-card-text>
      <div class="d-flex align-center flex-wrap justify-space-between ga-2">
        <h6 class="text-h5">
          {{ props.name }}
          <small class="text-medium-emphasis">({{ props.destination }})</small>
        </h6>

        <v-chip v-if="isDefault" color="primary" size="small"> Default </v-chip>
      </div>
      <div class="my-4 text-body1">
        <p>{{ props.building }}, {{ props.street }}, {{ props.city }}, {{ props.state }}, {{ props.country }} - {{ props.post }}</p>
        <p>{{ props.phone }}</p>
      </div>
      <div v-if="showBtn" class="d-flex align-center justify-space-between ga-2 flex-wrap">
        <v-btn variant="outlined" flat color="primary"> Deliver to This Address </v-btn>
        <div class="d-flex ga-1">
          <v-btn icon flat size="small">
            <PencilIcon size="18" />
          </v-btn>
          <v-btn icon flat size="small">
            <TrashIcon size="18" />
          </v-btn>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>
