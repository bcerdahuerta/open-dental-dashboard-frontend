<script setup>
import { ref, computed, reactive } from 'vue';
import moment from 'moment';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { vMaska } from 'maska/vue';
import UiChildCard from '@/components/shared/UiChildCard.vue';
import { CalendarIcon } from 'vue-tabler-icons';

const page = ref({ title: 'Mask Page' });
const breadcrumbs = ref([
  {
    title: 'Plugins',
    disabled: false,
    href: '#'
  },
  {
    title: 'Mask',
    disabled: true,
    href: '#'
  }
]);

const phoneValue = ref('');
const unmaskedPhoneValue = ref('');

const contactValue = ref('');
const unmaskedContactValue = ref('');

const hexoptions = reactive({
  mask: '!#HHHHHH',
  tokens: {
    H: {
      pattern: /[0-9a-fA-F]/,
      uppercase: true
    }
  }
});
const hexValue = ref('');

const ipValue = ref('');
const unmaskedIpValue = ref('');

const ipv4Value = ref('');
const unmaskedIp4Value = ref('');

const ipv6Value = ref('');
const unmaskedIp6Value = ref('');

const maskedValue = ref('');
const inputValue = ref('');
const maskPattern = computed(() => ({ mask: maskedValue.value }));

defineExpose({
  unmaskedPhoneValue,
  unmaskedContactValue,
  unmaskedIpValue,
  unmaskedIp4Value,
  unmaskedIp6Value,
  hexoptions,
  maskPattern
});

// datepicker
const selectedDate = ref(null);
const computedDateFormattedMomentjs = computed(() => {
  return selectedDate.value ? moment(selectedDate.value).format('D/MM/YYYY') : '';
});
</script>
<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />
  <v-row>
    <v-col cols="12" md="12">
      <UiParentCard title="Mask Input">
        <v-row>
          <!-- Base Buttons -->
          <v-col cols="12" lg="6">
            <UiChildCard title="Phone">
              <v-text-field
                v-maska:unmaskedPhoneValue.unmasked="'+1 (###) ###-##-##'"
                v-model="phoneValue"
                color="primary"
                label="Phone with Code"
                variant="outlined"
              />
              <v-text-field
                v-maska:unmaskedContactValue.unmasked="'+91 #### ###-###'"
                v-model="contactValue"
                color="primary"
                label="Contact Number"
                variant="outlined"
              />
              <v-text-field v-maska="hexoptions" v-model="hexValue" color="primary" label="Hex color: #121113" variant="outlined" />
              <v-menu>
                <template v-slot:activator="{ props }">
                  <v-text-field
                    single-line
                    hide-details
                    variant="outlined"
                    v-bind="props"
                    v-model="computedDateFormattedMomentjs"
                    placeholder="MM/DD/YYYY"
                    density="comfortable"
                    readonly
                    color="primary"
                  >
                    <template v-slot:append-inner>
                      <CalendarIcon class="text-lightText" />
                    </template>
                  </v-text-field>
                </template>
                <v-date-picker v-model="selectedDate" hide-header color="primary"></v-date-picker>
              </v-menu>
            </UiChildCard>
          </v-col>
          <v-col cols="12" lg="6">
            <UiChildCard title="Network">
              <v-text-field
                v-maska:unmaskedIpValue.unmasked="'###.###.###.###'"
                v-model="ipValue"
                color="primary"
                label="Ip Address"
                variant="outlined"
              />
              <v-text-field
                v-maska:unmaskedIp4Value.unmasked="'####.####.####.####'"
                v-model="ipv4Value"
                color="primary"
                label="Ipv4 Address"
                variant="outlined"
              />
              <v-text-field
                v-maska:unmaskedIp6Value.unmasked="'####.####.####.####.####.####'"
                v-model="ipv6Value"
                color="primary"
                label="Ipv6 Address"
                variant="outlined"
              />
            </UiChildCard>
          </v-col>
          <v-col cols="12" lg="12">
            <UiChildCard title="Custom">
              <v-text-field v-model="maskedValue" color="primary" variant="outlined" label="Make Mask to apply bottom input" />
              <v-text-field v-maska="maskPattern" v-model="inputValue" color="primary" label="Masked Input" variant="outlined" />
            </UiChildCard>
          </v-col>
        </v-row>
      </UiParentCard>
    </v-col>
  </v-row>
</template>
