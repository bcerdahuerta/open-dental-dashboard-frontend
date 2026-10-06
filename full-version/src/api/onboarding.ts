import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import { OnboardingPublicHttpError } from '@/types/onboarding';
import type {
  ExtractionSetupInvite,
  ExtractionSetupList,
  ExtractionSetupProgress,
  ExtractionSetupQuestions,
  ExtractionSetupSaveRequest,
  OnboardingDiagnostic,
  OnboardingDraftRequest,
  OnboardingDraftResult,
  OnboardingInviteLink,
  OnboardingQuestionsResponse,
  OnboardingRedemption,
  OnboardingResponse,
  OnboardingSealedAnswers,
  OnboardingSopProjection,
  OnboardingSubmitResult
} from '@/types/onboarding';

const baseUrl = import.meta.env.VITE_API_URL;

/**
 * Public invite transport: plain fetch, no Authorization header, no credentials.
 * The invite token travels in the JSON body only; a fragment-fragment link never
 * puts it in a path, query, or cookie.
 */
async function publicPost<T>(path: string, body: { token: string }): Promise<T> {
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
    if (response.status >= 500 && response.status < 600 && !diagnostic?.code) {
      throw new OnboardingPublicHttpError(
        response.status,
        'ONBOARDING_SERVICE_UNAVAILABLE',
        path === '/workflow-builder/onboarding-invites/setup/save'
          ? 'Your save could not be confirmed. Your entries are still on this page. Please try again later.'
          : 'We could not complete this request. Please try again later.'
      );
    }
    throw new OnboardingPublicHttpError(
      response.status,
      diagnostic?.code ?? 'INVITE_INVALID',
      diagnostic?.message ?? 'This onboarding link cannot be used. Ask your administrator for a new link.'
    );
  }
  return payload?.data as T;
}

export const onboardingApi = {
  /** Authenticated client write; server fixes the page size at 25. */
  listSetups(clientId: string, afterSetupId?: string) {
    return fetchWrapper.post(
      `${baseUrl}/workflow-builder/onboarding-invites/setup/list`,
      { client_id: clientId, ...(afterSetupId ? { after_setup_id: afterSetupId } : {}) },
      { responseMode: 'metadata' }
    ) as Promise<OnboardingResponse<ExtractionSetupList>>;
  },

  mintSetup(clientId: string, renewSetupId?: string) {
    return fetchWrapper.post(
      `${baseUrl}/workflow-builder/onboarding-invites/setup/mint`,
      { client_id: clientId, ...(renewSetupId ? { renew_setup_id: renewSetupId } : {}) },
      { responseMode: 'metadata' }
    ) as Promise<OnboardingResponse<ExtractionSetupInvite>>;
  },

  readSetup(token: string) {
    return publicPost<ExtractionSetupProgress>('/workflow-builder/onboarding-invites/setup/read', { token });
  },

  fetchSetupQuestions(token: string) {
    return publicPost<ExtractionSetupQuestions>('/workflow-builder/onboarding-invites/setup/questions', { token });
  },

  saveSetup(request: ExtractionSetupSaveRequest) {
    return publicPost<ExtractionSetupProgress>('/workflow-builder/onboarding-invites/setup/save', request);
  },

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

  /** Public: fetch detected onboarding questions; token stays in the JSON body. */
  fetchQuestions(token: string) {
    return publicPost<OnboardingQuestionsResponse>('/workflow-builder/onboarding-invites/questions', { token });
  },

  /** Public: submit the client's closed choices for the token's own client only. */
  submit(payload: { client_id?: string; token: string; draft?: OnboardingDraftRequest; answers?: OnboardingSealedAnswers }) {
    return publicPost<OnboardingSubmitResult>('/workflow-builder/onboarding-invites/submit', payload);
  }
};
