<script setup lang="ts">
import { ref } from 'vue';

const apiUrl = import.meta.env.VITE_API_URL;

const email = ref('');
const password = ref('');
const displayName = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');
const success = ref(false);

const emailRules = [
  (v: string) => !!v.trim() || 'Email is required',
  (v: string) => /.+@.+\..+/.test(v.trim()) || 'Must be a valid email'
];

const passwordRules = [
  (v: string) => !!v || 'Password is required',
  (v: string) => v.length >= 8 || 'Password must be at least 8 characters'
];

async function register() {
  error.value = '';
  if (!email.value || !password.value || password.value.length < 8) return;

  loading.value = true;
  try {
    const resp = await fetch(`${apiUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value.trim(),
        password: password.value,
        display_name: displayName.value.trim() || undefined
      })
    });

    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    success.value = true;
  } catch (e: any) {
    error.value = e.message || 'Registration failed. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <!-- Success State -->
  <div v-if="success" class="text-center py-6">
    <v-icon size="64" color="success" class="mb-4">mdi-check-circle-outline</v-icon>
    <h3 class="text-h4 mb-2">Registration Submitted</h3>
    <p class="text-medium-emphasis mb-6">
      Your account is awaiting admin approval. You will be able to log in once approved.
    </p>
    <v-btn color="primary" variant="flat" to="/login">Back to Login</v-btn>
  </div>

  <!-- Registration Form -->
  <v-form v-else class="mt-5" @submit.prevent="register">
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <v-text-field
      v-model="displayName"
      label="Display Name (optional)"
      variant="outlined"
      color="primary"
      density="comfortable"
      hide-details="auto"
      class="mb-4"
    />

    <v-text-field
      v-model="email"
      :rules="emailRules"
      label="Email Address"
      variant="outlined"
      color="primary"
      density="comfortable"
      hide-details="auto"
      class="mb-4"
    />

    <v-text-field
      v-model="password"
      :rules="passwordRules"
      label="Password"
      variant="outlined"
      color="primary"
      density="comfortable"
      hide-details="auto"
      :type="showPassword ? 'text' : 'password'"
      :append-inner-icon="showPassword ? '$eye' : '$eyeOff'"
      @click:append-inner="showPassword = !showPassword"
      class="mb-6"
    />

    <v-btn
      color="secondary"
      variant="flat"
      block
      size="large"
      type="submit"
      :loading="loading"
    >
      Sign Up
    </v-btn>
  </v-form>

  <div class="mt-5 text-end">
    <v-divider />
    <v-btn variant="plain" to="/login" class="mt-2 text-capitalize mr-n2">Already have an account?</v-btn>
  </div>
</template>
