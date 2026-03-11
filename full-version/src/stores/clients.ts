import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';

const baseUrl = `${import.meta.env.VITE_API_URL}/clients`;

export interface ClientCreate {
    client_name: string;
    product_type: string;
    spreadsheet_id?: string;
    folder_id?: string;
    ccc_id?: string;
    days_in_advance?: number;
}

export interface ClientItem {
    id: string;
    client_name: string;
    product_type: string;
    is_active: boolean;
    ccc_id: string | null;
    spreadsheet_id: string | null;
    folder_id: string | null;
    days_in_advance: number;
    created_at: string;
    updated_at: string;
}

export const useClientStore = defineStore('clients', () => {
    const clients = ref<ClientItem[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    async function fetchClients() {
        loading.value = true;
        error.value = null;
        try {
            clients.value = await fetchWrapper.get(baseUrl);
        } catch (err: any) {
            error.value = err.message || err;
        } finally {
            loading.value = false;
        }
    }

    async function createClient(data: ClientCreate) {
        loading.value = true;
        error.value = null;
        try {
            const newClient = await fetchWrapper.post(baseUrl, data);
            clients.value.push(newClient);
            return newClient;
        } catch (err: any) {
            error.value = err.message || err;
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function updateClient(clientId: string, data: Partial<ClientCreate>) {
        loading.value = true;
        error.value = null;
        try {
            const updated = await fetchWrapper.put(`${baseUrl}/${clientId}`, data);
            const idx = clients.value.findIndex((c) => c.id === clientId);
            if (idx !== -1) clients.value[idx] = updated;
            return updated;
        } catch (err: any) {
            error.value = err.message || err;
            throw err;
        } finally {
            loading.value = false;
        }
    }

    return { clients, loading, error, fetchClients, createClient, updateClient };
});
