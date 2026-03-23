import { defineStore } from 'pinia';
import { ref } from 'vue';
import { router } from '@/router';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';

const baseUrl = `${import.meta.env.VITE_API_URL}/auth`;

interface User {
  id: string;
  email: string;
  display_name: string;
  role: string;
  allowed_products: string[];
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(JSON.parse(localStorage.getItem('user') || 'null'));
  const access_token = ref<string | null>(localStorage.getItem('access_token'));
  const refresh_token = ref<string | null>(localStorage.getItem('refresh_token'));
  const returnUrl = ref<string | null>(null);

  async function login(email: string, password: string) {
    const response = await fetchWrapper.post(`${baseUrl}/login`, { email, password });

    access_token.value = response.access_token;
    refresh_token.value = response.refresh_token;
    user.value = response.user;

    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    localStorage.setItem('user', JSON.stringify(response.user));

    router.push(returnUrl.value || '/dashboard/default');
  }

  async function refresh() {
    if (!refresh_token.value) {
      logout();
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${refresh_token.value}`
        }
      });

      const res = await response.json();
      if (!response.ok) throw new Error(res.message || 'Refresh failed');

      const data = res.data;
      access_token.value = data.access_token;
      refresh_token.value = data.refresh_token;
      localStorage.setItem('access_token', access_token.value!);
      localStorage.setItem('refresh_token', refresh_token.value!);

      // Sync product access (prevents stale state after admin changes)
      if (data.allowed_products && user.value) {
        user.value = { ...user.value, allowed_products: data.allowed_products };
        localStorage.setItem('user', JSON.stringify(user.value));
      }
    } catch (error) {
      logout();
      throw error;
    }
  }

  function logout() {
    user.value = null;
    access_token.value = null;
    refresh_token.value = null;
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  }

  function hasProduct(product: string): boolean {
    return user.value?.allowed_products?.includes(product) ?? false;
  }

  return {
    user,
    access_token,
    refresh_token,
    returnUrl,
    login,
    refresh,
    logout,
    hasProduct
  };
});

