import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

import InviteClientDialog from '@/components/onboarding/InviteClientDialog.vue';
import { WorkflowBuilderHttpError } from '@/utils/helpers/fetch-wrapper';

const api = vi.hoisted(() => ({
  mintDraft: vi.fn(),
  mintInvite: vi.fn(),
  redeem: vi.fn(),
  submit: vi.fn(),
  getSopVersion: vi.fn()
}));

vi.mock('@/api/onboarding', () => ({ onboardingApi: api }));

const clientStore = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock('@/stores/clients', () => ({ useClientStore: () => clientStore }));

const TOKEN = 'invite-token-1';
const SHELL_PAYLOAD = { client_name: 'Clinic One', product_type: 'Custom' };

function stubs() {
  return {
    VDialog: defineComponent({
      props: { modelValue: { type: Boolean, default: false } },
      emits: ['update:modelValue'],
      setup(dialogProps, { slots }) {
        return () => (dialogProps.modelValue ? h('div', { 'data-test': 'invite-dialog-root' }, slots.default?.()) : null);
      }
    }),
    VTextField: defineComponent({
      props: { modelValue: { type: String, default: '' } },
      emits: ['update:modelValue'],
      setup(fieldProps, { attrs, emit }) {
        return () =>
          h('input', {
            ...attrs,
            value: fieldProps.modelValue,
            onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value)
          });
      }
    })
  };
}

type Dialog = Awaited<ReturnType<typeof mountDialog>>;

function mountDialog() {
  return mount(InviteClientDialog, { props: { modelValue: true }, global: { stubs: stubs() } });
}

function inviteResponse(token: string, expiresDays = 7) {
  return {
    data: { link: `https://api.example.test/onboarding-invite#${token}`, expires_at: '2026-09-24T00:00:00Z', expires_days: expiresDays },
    status: 201,
    etag: null,
    headers: new Headers()
  };
}

async function fillInvite(wrapper: Dialog, values: { name?: string; email?: string } = {}): Promise<void> {
  await wrapper.get('[data-test="invite-name"]').setValue(values.name ?? 'Clinic One');
  await wrapper.get('[data-test="invite-email"]').setValue(values.email ?? 'contact@practice.test');
}

async function submitInvite(wrapper: Dialog): Promise<void> {
  await wrapper.get('[data-test="invite-submit"]').trigger('click');
  await flushPromises();
}

async function inviteOnce(wrapper: Dialog, token = TOKEN): Promise<void> {
  clientStore.createClient.mockResolvedValue({ id: 'client-new', client_name: 'Clinic One' });
  api.mintInvite.mockResolvedValue(inviteResponse(token));
  await fillInvite(wrapper);
  await submitInvite(wrapper);
}

function textValue(wrapper: Dialog, selector: string): string {
  return (wrapper.get(selector).element as HTMLInputElement).value;
}

describe('Invite client dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('T01 asks only for the client name and the contact email', () => {
    const wrapper = mountDialog();
    const inputs = wrapper.findAll('input');

    expect(inputs.map((input) => input.attributes('data-test'))).toEqual(['invite-name', 'invite-email']);
    expect(wrapper.get('[data-test="invite-submit"]').text()).toContain('Create the link');
    expect(wrapper.find('[data-test="invite-cancel"]').exists()).toBe(true);
    expect(wrapper.find('select').exists()).toBe(false);

    const copy = wrapper.text().toLowerCase();
    for (const absent of ['product type', 'slack', 'days in advance', 'days_in_advance']) {
      expect(copy).not.toContain(absent);
    }
  });

  it('T08 titles the dialog for creating a client and never calls it an invitation', () => {
    const wrapper = mountDialog();

    expect(wrapper.get('.v-card-title').text()).toBe('New client');
    expect(wrapper.text()).not.toContain('Invite a new client');
    expect(wrapper.text()).not.toContain('Invite client');
  });

  it('T02 blocks an invalid email with a visible message and enables the link once the email is valid', async () => {
    const wrapper = mountDialog();
    await wrapper.get('[data-test="invite-name"]').setValue('Clinic One');
    await wrapper.get('[data-test="invite-email"]').setValue('clinic@');

    expect(wrapper.get('[data-test="invite-email-message"]').text()).toContain('valid email');
    expect(wrapper.get('[data-test="invite-submit"]').attributes('disabled')).toBeDefined();
    await submitInvite(wrapper);
    expect(clientStore.createClient).not.toHaveBeenCalled();
    expect(api.mintInvite).not.toHaveBeenCalled();

    await wrapper.get('[data-test="invite-email"]').setValue('contact@practice.test');
    expect(wrapper.find('[data-test="invite-email-message"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="invite-submit"]').attributes('disabled')).toBeUndefined();
  });

  it('T03 creates the client shell first and then mints the invite for that created client', async () => {
    const wrapper = mountDialog();
    await inviteOnce(wrapper);

    expect(clientStore.createClient).toHaveBeenCalledTimes(1);
    expect(clientStore.createClient).toHaveBeenCalledWith(SHELL_PAYLOAD);
    expect(api.mintInvite).toHaveBeenCalledTimes(1);
    expect(api.mintInvite.mock.calls[0][0]).toBe('client-new');
    expect(clientStore.createClient.mock.invocationCallOrder[0]).toBeLessThan(api.mintInvite.mock.invocationCallOrder[0]);
    expect(JSON.stringify(api.mintInvite.mock.calls)).not.toContain('Clinic One');
    expect(wrapper.get('[data-test="invite-link"]').text()).toContain('/o/client-new#');
  });

  it('T04 shows the fragment link, the copy action and the expiry without leaking the token', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const consoleSpies = (['log', 'info', 'warn', 'error'] as const).map((level) => vi.spyOn(console, level).mockImplementation(() => {}));
    const wrapper = mountDialog();
    await inviteOnce(wrapper, TOKEN);

    const link = wrapper.get('[data-test="invite-link"]').text();
    expect(link).toBe(`${window.location.origin}/o/client-new#${TOKEN}`);
    expect(link.split('#')[1]).toBe(TOKEN);
    expect(wrapper.get('[data-test="invite-expiry"]').text()).toContain('7 days');
    expect(wrapper.findAll('[data-test="invite-preview"] li')).toHaveLength(3);
    expect(wrapper.get('[data-test="invite-ready"]').text()).toContain('contact@practice.test');

    await wrapper.get('[data-test="invite-copy"]').trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(link);
    expect(wrapper.find('[data-test="invite-copied"]').exists()).toBe(true);

    expect(window.location.search).toBe('');
    expect(window.location.pathname).not.toContain(TOKEN);
    expect(JSON.stringify([...Object.entries(localStorage), ...Object.entries(sessionStorage)])).not.toContain(TOKEN);
    expect(JSON.stringify(clientStore.createClient.mock.calls)).not.toContain(TOKEN);
    expect(JSON.stringify(api.mintInvite.mock.calls)).not.toContain(TOKEN);
    expect(JSON.stringify(consoleSpies.map((spy) => spy.mock.calls))).not.toContain(TOKEN);
  });

  it('T05 renders the closed diagnostic, keeps the entries and reuses the shell when minting fails', async () => {
    clientStore.createClient.mockResolvedValue({ id: 'client-new', client_name: 'Clinic One' });
    api.mintInvite.mockRejectedValue(
      new WorkflowBuilderHttpError(404, { status: 'error', message: 'Resource not found' }, null, new Headers(), 'Resource not found')
    );
    const wrapper = mountDialog();
    await fillInvite(wrapper);
    await submitInvite(wrapper);

    expect(wrapper.get('[data-test="invite-error"]').text()).toContain('not open for onboarding');
    expect(wrapper.text()).not.toContain('Resource not found');
    expect(wrapper.find('[data-test="invite-link"]').exists()).toBe(false);
    expect(textValue(wrapper, '[data-test="invite-name"]')).toBe('Clinic One');
    expect(textValue(wrapper, '[data-test="invite-email"]')).toBe('contact@practice.test');
    expect(clientStore.createClient).toHaveBeenCalledTimes(1);

    api.mintInvite.mockResolvedValue(inviteResponse(TOKEN));
    await submitInvite(wrapper);
    expect(clientStore.createClient).toHaveBeenCalledTimes(1);
    expect(api.mintInvite).toHaveBeenCalledTimes(2);
    expect(wrapper.get('[data-test="invite-link"]').text()).toContain(`#${TOKEN}`);
  });

  it('T06 closes the client-creation failure and never mints', async () => {
    clientStore.createClient.mockRejectedValue('product_type: Must be one of: Lunna, Diva, Custom.');
    const wrapper = mountDialog();
    await fillInvite(wrapper);
    await submitInvite(wrapper);

    expect(wrapper.get('[data-test="invite-error"]').text()).toContain('could not be created');
    expect(wrapper.text()).not.toContain('Must be one of');
    expect(wrapper.text()).not.toContain('Lunna');
    expect(api.mintInvite).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test="invite-link"]').exists()).toBe(false);
  });

  it('T09 reports the created client and the next step when the invite link is blocked', async () => {
    clientStore.createClient.mockResolvedValue({ id: 'client-new', client_name: 'Clinic One' });
    api.mintInvite.mockRejectedValue(
      new WorkflowBuilderHttpError(
        409,
        { status: 'error', message: 'provider key missing', diagnostics: { code: 'od_customer_key_missing' } },
        null,
        new Headers(),
        'provider key missing'
      )
    );
    const wrapper = mountDialog();
    await fillInvite(wrapper);
    await submitInvite(wrapper);

    expect(clientStore.createClient).toHaveBeenCalledTimes(1);
    const message = wrapper.get('[data-test="invite-error"]').text();
    expect(message).toBe(
      "Client created. Next: add this client's clinic and its Open Dental customer key, then generate the invite from Onboarding."
    );
    expect(message).not.toContain('provider key missing');
    expect(message).not.toContain('od_customer_key_missing');
    expect(message).not.toContain('409');
    expect(wrapper.find('[data-test="invite-link"]').exists()).toBe(false);
    expect(textValue(wrapper, '[data-test="invite-name"]')).toBe('Clinic One');
    expect(textValue(wrapper, '[data-test="invite-email"]')).toBe('contact@practice.test');

    api.mintInvite.mockResolvedValue(inviteResponse(TOKEN));
    await submitInvite(wrapper);
    expect(clientStore.createClient).toHaveBeenCalledTimes(1);
    expect(api.mintInvite).toHaveBeenCalledTimes(2);
    expect(api.mintInvite.mock.calls[1][0]).toBe('client-new');
    expect(wrapper.get('[data-test="invite-link"]').text()).toContain(`#${TOKEN}`);
  });

  it('T11 shows the server-carried reason when a 409 blocks the invite', async () => {
    clientStore.createClient.mockResolvedValue({ id: 'client-new', client_name: 'Clinic One' });
    api.mintInvite.mockRejectedValue(
      new WorkflowBuilderHttpError(
        409,
        {
          status: 'error',
          message: null,
          data: {
            draft: null,
            canonical_bytes: null,
            digest: null,
            diagnostics: [
              {
                code: 'CUSTOMER_KEY_VERIFIED',
                subject_kind: 'client',
                message: 'The customer key is not answering yet. Confirm it before inviting the client.',
                client_choices: null
              }
            ]
          }
        },
        null,
        new Headers(),
        'Conflict'
      )
    );
    const wrapper = mountDialog();
    await fillInvite(wrapper);
    await submitInvite(wrapper);

    expect(clientStore.createClient).toHaveBeenCalledTimes(1);
    const message = wrapper.get('[data-test="invite-error"]').text();
    expect(message).toContain('Client created.');
    expect(message).toContain('The customer key is not answering yet. Confirm it before inviting the client.');
    expect(message).toContain('Next: generate the invite from Onboarding.');
    expect(message).not.toContain('add this client');
    expect(message).not.toContain('CUSTOMER_KEY_VERIFIED');
    expect(message).not.toContain('409');
    expect(wrapper.find('[data-test="invite-link"]').exists()).toBe(false);
  });

  it('T10 keeps every state of the dialog copy free of internal authoring names', async () => {
    const banned = ['bookmark', 'digest', 'etag', 'atom_key', 'carrier', 'enrichment', 'product type', 'tier', 'webhook'];
    const wrapper = mountDialog();
    for (const name of banned) expect(wrapper.text().toLowerCase()).not.toContain(name);

    await inviteOnce(wrapper, `${TOKEN}-success`);
    const copy = wrapper.text().toLowerCase();
    expect(copy).toContain('what the contact will do');
    for (const name of banned) expect(copy).not.toContain(name);
  });
});
