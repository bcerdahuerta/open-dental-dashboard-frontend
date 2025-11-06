<script setup lang="ts">
import { ref } from 'vue';
// common components
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import UiChildCard from '@/components/shared/UiChildCard.vue';

// icons
import { XIcon } from 'vue-tabler-icons';

// theme breadcrumb
const page = ref({ title: 'Snackbar' });
const breadcrumbs = ref([
  {
    title: 'Advance',
    disabled: false,
    href: '#'
  },
  {
    title: 'Snackbar',
    disabled: true,
    href: '#'
  }
]);

const primarysnackbar = ref(false);
const errorsnackbar = ref(false);
const successsnackbar = ref(false);
const warningsnackbar = ref(false);

const primary2snackbar = ref(false);
const error2snackbar = ref(false);
const success2snackbar = ref(false);
const warning2snackbar = ref(false);

const primary3snackbar = ref(false);
const primary4snackbar = ref(false);
const primary5snackbar = ref(false);
const primary6snackbar = ref(false);
const primary7snackbar = ref(false);
const primary8snackbar = ref(false);
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Snackbar">
        <v-row>
          <!-- Basic -->
          <v-col cols="12" lg="6">
            <UiChildCard title="Basic">
              <div class="d-flex flex-column flex-sm-row justify-center align-center ga-4">
                <v-btn variant="flat" color="primary" @click="primarysnackbar = true"> default </v-btn>
                <v-btn variant="flat" color="error" @click="errorsnackbar = true"> error </v-btn>
                <v-btn variant="flat" color="success" class="text-white" @click="successsnackbar = true"> success </v-btn>
                <v-btn variant="flat" color="warning" class="text-white" @click="warningsnackbar = true"> warning </v-btn>
              </div>

              <v-snackbar v-model="primarysnackbar" color="primary" variant="flat" elevation-1 rounded="md">
                This is default message
              </v-snackbar>
              <v-snackbar v-model="errorsnackbar" variant="flat" color="error" rounded="md"> This is Error message </v-snackbar>
              <v-snackbar v-model="successsnackbar" variant="flat" color="success" rounded="md" class="text-white">
                This is Success message
              </v-snackbar>
              <v-snackbar v-model="warningsnackbar" variant="flat" color="warning" rounded="md" class="text-white">
                This is Warning message
              </v-snackbar>
            </UiChildCard>
          </v-col>
          <!-- With Close -->
          <v-col cols="12" lg="6">
            <UiChildCard title="With Close">
              <div class="d-flex flex-column flex-sm-row justify-center align-center ga-4">
                <v-btn variant="flat" color="primary" @click="primary2snackbar = true"> default </v-btn>
                <v-btn variant="flat" color="error" @click="error2snackbar = true"> error </v-btn>
                <v-btn variant="flat" color="success" class="text-white" @click="success2snackbar = true"> success </v-btn>
                <v-btn variant="flat" color="warning" class="text-white" @click="warning2snackbar = true"> warning </v-btn>
              </div>

              <v-snackbar v-model="primary2snackbar" color="primary" variant="flat" elevation-1 rounded="md">
                This is default message
                <template #actions>
                  <v-btn color="white" variant="text" @click="primary2snackbar = false">
                    <XIcon size="20" stroke-width="1.5" />
                  </v-btn>
                </template>
              </v-snackbar>
              <v-snackbar v-model="error2snackbar" color="error" variant="flat" rounded="md">
                This is Error message
                <template #actions>
                  <v-btn color="white" variant="text" @click="error2snackbar = false">
                    <XIcon size="20" stroke-width="1.5" />
                  </v-btn>
                </template>
              </v-snackbar>
              <v-snackbar v-model="success2snackbar" color="success" variant="flat" rounded="md" class="text-white">
                This is Success message
                <template #actions>
                  <v-btn color="white" variant="text" @click="success2snackbar = false">
                    <XIcon size="20" stroke-width="1.5" />
                  </v-btn>
                </template>
              </v-snackbar>
              <v-snackbar v-model="warning2snackbar" color="warning" variant="flat" rounded="md" class="text-white">
                This is Warning message
                <template #actions>
                  <v-btn color="white" variant="text" @click="warning2snackbar = false">
                    <XIcon size="20" stroke-width="1.5" />
                  </v-btn>
                </template>
              </v-snackbar>
            </UiChildCard>
          </v-col>
          <!-- Location -->
          <v-col cols="12">
            <UiChildCard title="Location">
              <div class="d-lg-flex flex-column flex-sm-row justify-center align-center ga-4">
                <v-btn color="primary" variant="flat" class="ma-2" @click="primary3snackbar = true"> Top Left </v-btn>
                <v-btn color="primary" variant="flat" class="ma-2" @click="primary4snackbar = true"> Top Center </v-btn>
                <v-btn color="primary" variant="flat" class="ma-2" @click="primary5snackbar = true"> Top Right </v-btn>
                <v-btn color="primary" variant="flat" class="ma-2" @click="primary6snackbar = true"> Bottom Left </v-btn>
                <v-btn color="primary" variant="flat" class="ma-2" @click="primary7snackbar = true"> Bottom </v-btn>
                <v-btn color="primary" variant="flat" class="ma-2" @click="primary8snackbar = true"> Bottom Right </v-btn>
              </div>

              <v-snackbar v-model="primary3snackbar" color="primary" variant="flat" elevation-1 rounded="md" location="top left">
                I'm Top Left Message
              </v-snackbar>
              <v-snackbar v-model="primary4snackbar" color="primary" variant="flat" rounded="md" location="top">
                I'm Top Center Message
              </v-snackbar>
              <v-snackbar v-model="primary5snackbar" color="primary" variant="flat" rounded="md" location="top right">
                I'm Top Right Message
              </v-snackbar>
              <v-snackbar v-model="primary6snackbar" color="primary" variant="flat" rounded="md" location="bottom left">
                I'm Bottom Left Message
              </v-snackbar>
              <v-snackbar v-model="primary7snackbar" color="primary" variant="flat" rounded="md" location="bottom">
                I'm Bottom Center Message
              </v-snackbar>
              <v-snackbar v-model="primary8snackbar" color="primary" variant="flat" rounded="md" location="bottom right">
                I'm Bottom Right Message
              </v-snackbar>
            </UiChildCard>
          </v-col>
        </v-row>
      </UiParentCard>
    </v-col>
  </v-row>
</template>
