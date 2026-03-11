import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';

const apiUrl = import.meta.env.VITE_API_URL;
const clinicsUrl = `${apiUrl}/clinics`;
const clientsUrl = `${apiUrl}/clients`;

export interface ClinicCreate {
    client_id: string;
    clinic_name: string;
    ccc_clinic_id?: string;
    clinic_num?: number;
    spreadsheet_id?: string;
    folder_id?: string;
    images_folder_id?: number;
}

export interface ClinicItem {
    id: string;
    client_id: string;
    clinic_name: string;
    ccc_clinic_id: string | null;
    clinic_num: number | null;
    spreadsheet_id: string | null;
    folder_id: string | null;
    images_folder_id: number;
    is_active: boolean;
    created_at: string;
}

export interface CredentialItem {
    id: string;
    credential_type: string;
    key_name: string;
    created_at: string;
}

export const useClinicStore = defineStore('clinics', () => {
    const clinics = ref<ClinicItem[]>([]);
    const currentClinic = ref<ClinicItem | null>(null);
    const credentials = ref<CredentialItem[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    async function fetchClinics(clientId: string) {
        loading.value = true;
        error.value = null;
        try {
            clinics.value = await fetchWrapper.get(`${clientsUrl}/${clientId}/clinics`);
        } catch (err: any) {
            error.value = err.message || err;
        } finally {
            loading.value = false;
        }
    }

    async function fetchClinic(clinicId: string) {
        loading.value = true;
        error.value = null;
        try {
            currentClinic.value = await fetchWrapper.get(`${clinicsUrl}/${clinicId}`);
            return currentClinic.value;
        } catch (err: any) {
            error.value = err.message || err;
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function createClinic(data: ClinicCreate) {
        loading.value = true;
        error.value = null;
        try {
            const newClinic = await fetchWrapper.post(clinicsUrl, data);
            clinics.value.push(newClinic);
            return newClinic;
        } catch (err: any) {
            error.value = err.message || err;
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function updateClinic(clinicId: string, data: Partial<ClinicCreate>) {
        loading.value = true;
        error.value = null;
        try {
            const updated = await fetchWrapper.put(`${clinicsUrl}/${clinicId}`, data);
            currentClinic.value = updated;
            const idx = clinics.value.findIndex((c) => c.id === clinicId);
            if (idx !== -1) clinics.value[idx] = updated;
            return updated;
        } catch (err: any) {
            error.value = err.message || err;
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function fetchCredentials(clinicId: string) {
        try {
            credentials.value = await fetchWrapper.get(`${clinicsUrl}/${clinicId}/credentials`);
        } catch (err: any) {
            error.value = err.message || err;
        }
    }

    async function upsertCredential(clinicId: string, cred: { credential_type: string; key_name: string; value: string }) {
        try {
            const result = await fetchWrapper.put(`${clinicsUrl}/${clinicId}/credentials`, [cred]);
            await fetchCredentials(clinicId);
            return result;
        } catch (err: any) {
            error.value = err.message || err;
            throw err;
        }
    }

    async function testConnection(clinicId: string, service: string) {
        try {
            return await fetchWrapper.post(`${clinicsUrl}/${clinicId}/test-connection?service=${service}`, {});
        } catch (err: any) {
            return { connected: false, message: err.message || 'Connection test failed' };
        }
    }

    // --- Config API Methods ---

    async function fetchBenefitMappings(clinicId: string) {
        return await fetchWrapper.get(`${clinicsUrl}/${clinicId}/benefits`);
    }

    async function saveBenefitMappings(clinicId: string, mappingType: string, items: any[]) {
        return await fetchWrapper.put(`${clinicsUrl}/${clinicId}/benefits`, { mapping_type: mappingType, items });
    }

    async function fetchFrequencyMappings(clinicId: string) {
        return await fetchWrapper.get(`${clinicsUrl}/${clinicId}/frequencies`);
    }

    async function saveFrequencyMappings(clinicId: string, items: any[]) {
        return await fetchWrapper.put(`${clinicsUrl}/${clinicId}/frequencies`, { items });
    }

    async function fetchAgeLimitMappings(clinicId: string) {
        return await fetchWrapper.get(`${clinicsUrl}/${clinicId}/age-limits`);
    }

    async function saveAgeLimitMappings(clinicId: string, items: any[]) {
        return await fetchWrapper.put(`${clinicsUrl}/${clinicId}/age-limits`, { items });
    }

    async function fetchProfiles(clientId: string) {
        return await fetchWrapper.get(`${clientsUrl}/${clientId}/profiles`);
    }

    async function fetchProfileSteps(profileId: string) {
        return await fetchWrapper.get(`${apiUrl}/profiles/${profileId}/steps`);
    }

    async function saveProfileSteps(profileId: string, steps: any[]) {
        return await fetchWrapper.put(`${apiUrl}/profiles/${profileId}/steps`, { steps });
    }

    async function createProfile(clientId: string, data: any) {
        return await fetchWrapper.post(`${clientsUrl}/${clientId}/profiles`, data);
    }

    return {
        clinics, currentClinic, credentials, loading, error,
        fetchClinics, fetchClinic, createClinic, updateClinic,
        fetchCredentials, upsertCredential, testConnection,
        fetchBenefitMappings, saveBenefitMappings,
        fetchFrequencyMappings, saveFrequencyMappings,
        fetchAgeLimitMappings, saveAgeLimitMappings,
        fetchProfiles, fetchProfileSteps, saveProfileSteps, createProfile,
    };
});
