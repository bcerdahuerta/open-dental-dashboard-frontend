import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import { OnboardingPublicHttpError } from '@/types/onboarding';
import type {
  OnboardingDiagnostic,
  OnboardingDraftRequest,
  OnboardingDraftResult,
  OnboardingInviteLink,
  OnboardingRedemption,
  OnboardingResponse,
  OnboardingSopProjection,
  OnboardingSubmitResult
} from '@/types/onboarding';

const baseUrl = import.meta.env.VITE_API_URL;

/**
 * Public invite transport: plain fetch, no Authorization header, no credentials.
 * The invite token travels in the JSON body only; a fragment-fragment link never
 * puts it in a path, query, or cookie.
 */
async function publicPost<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = (await response.json().catch(() => null)) as {
    status?: string;
    data?: { diagnostics?: OnboardingDiagnostic[] };
  } | null;
  const diagnostic = payload?.data?.diagnostics?.[0];
  if (!response.ok || payload?.status === 'error') {
    throw new OnboardingPublicHttpError(
      response.status,
      diagnostic?.code ?? 'INVITE_INVALID',
      diagnostic?.message ?? 'This onboarding link cannot be used. Ask your administrator for a new link.'
    );
  }
  return payload?.data as T;
}

export const onboardingApi = {
  /** Authenticated (JWT + client write): admit one DRAFT-only onboarding artifact. */
  mintDraft(clientId: string, request: OnboardingDraftRequest, signal?: AbortSignal) {
    return fetchWrapper.post(`${baseUrl}/workflow-builder/clients/${clientId}/onboarding-draft/draft`, request, {
      signal,
      responseMode: 'metadata'
    }) as Promise<OnboardingResponse<OnboardingDraftResult>>;
  },

  /** Authenticated (JWT + client write): mint the directed invite link. */
  mintInvite(clientId: string) {
    return fetchWrapper.post(
      `${baseUrl}/workflow-builder/onboarding-invites/mint`,
      { client_id: clientId },
      { responseMode: 'metadata' }
    ) as Promise<OnboardingResponse<OnboardingInviteLink>>;
  },

  /** Authenticated (JWT + client read): operator SOP double-check projection. */
  getSopVersion(clientId: string, versionId: string, signal?: AbortSignal) {
    return fetchWrapper.get(`${baseUrl}/workflow-builder/clients/${clientId}/onboarding-sop/versions/${versionId}`, undefined, {
      signal,
      responseMode: 'metadata'
    }) as Promise<OnboardingResponse<{ sop: OnboardingSopProjection | null; diagnostics: OnboardingDiagnostic[] }>>;
  },

  /** Public: redeem the fragment token and receive the closed client echo. */
  redeem(token: string) {
    return publicPost<OnboardingRedemption>('/workflow-builder/onboarding-invites/redeem', { token });
  },

  /** Public: submit the client's closed choices for the token's own client only. */
  submit(payload: { client_id: string; token: string; draft: OnboardingDraftRequest }) {
    return publicPost<OnboardingSubmitResult>('/workflow-builder/onboarding-invites/submit', payload);
  }
};
