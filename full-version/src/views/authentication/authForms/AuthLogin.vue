<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { Form } from 'vee-validate';

const valid = ref(false);
const show1 = ref(false);
const password = ref('');
const email = ref('');

const passwordRules = ref([
  (v: string) => !!v || 'Password is required'
]);

const emailRules = ref([
  (v: string) => !!v.trim() || 'E-mail is required',
  (v: string) => /.+@.+\..+/.test(v.trim()) || 'E-mail must be valid'
]);

/* eslint-disable @typescript-eslint/no-explicit-any */
function validate(values: any, { setErrors }: any) {
  email.value = email.value.trim();
  const authStore = useAuthStore();
  return authStore.login(email.value, password.value).catch((error) => setErrors({ apiError: error }));
}
</script>

<template>
  <div class="mt-4"></div>
  <Form @submit="validate" class="mt-7 loginForm" v-slot="{ errors, isSubmitting }">
    <v-text-field
      v-model="email"
      :rules="emailRules"
      label="Email Address"
      class="mb-6"
      required
      density="comfortable"
      hide-details="auto"
      variant="outlined"
      color="primary"
    ></v-text-field>
    
    <v-text-field
      v-model="password"
      :rules="passwordRules"
      label="Password"
      required
      density="comfortable"
      variant="outlined"
      color="primary"
      hide-details="auto"
      :append-inner-icon="show1 ? '$eye' : '$eyeOff'"
      :type="show1 ? 'text' : 'password'"
      @click:append-inner="show1 = !show1"
    ></v-text-field>

    <div class="d-sm-flex align-center mt-2 mb-7 mb-sm-0">
      <div class="ms-auto">
        <router-link to="/forgot-password" class="text-primary text-decoration-none">Forgot password?</router-link>
      </div>
    </div>
    
    <v-btn color="secondary" :loading="isSubmitting" block variant="flat" size="large" :disabled="valid" type="submit">
      Sign In
    </v-btn>
    
    <div v-if="errors.apiError" class="mt-4">
      <v-alert type="error" color="error" variant="tonal" class="text-error bg-lighterror">{{ errors.apiError }}</v-alert>
    </div>
  </Form>
</template>

<style lang="scss">
.loginForm {
  .v-text-field .v-field--active input {
    font-weight: 500;
  }
}
</style>
