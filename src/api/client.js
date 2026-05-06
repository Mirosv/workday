/**
 * WorkDay API client — drop-in replacement for the Base44 SDK.
 * Exposes the same .entities / .auth / .functions shape so pages
 * need minimal changes.
 */

// Empty string = relative URLs → dev uses Vite proxy; prod uses Nginx proxy_pass
const BASE_URL = '';

// ── Token storage ─────────────────────────────────────────────────────────────
export const tokenStore = {
  get: () => localStorage.getItem('wd_token'),
  set: (t) => localStorage.setItem('wd_token', t),
  remove: () => localStorage.removeItem('wd_token'),
};

// ── Base fetch ────────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = tokenStore.get();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    tokenStore.remove();
    window.dispatchEvent(new Event('wd:unauthenticated'));
  }

  const data = res.headers.get('content-type')?.includes('application/json')
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ── Entity factory ────────────────────────────────────────────────────────────
function entityClient(path) {
  return {
    list: (params) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiFetch(`${path}${qs}`);
    },
    filter: (params) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiFetch(`${path}${qs}`);
    },
    get: (id) => apiFetch(`${path}/${id}`),
    create: (data) => apiFetch(path, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`${path}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`${path}/${id}`, { method: 'DELETE' }),
  };
}

// ── Auth ──────────────────────────────────────────────────────────────────────
const auth = {
  login: async (email, password) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    tokenStore.set(data.token);
    return data.user;
  },

  register: async (email, password, full_name) => {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    });
    tokenStore.set(data.token);
    return data.user;
  },

  me: () => apiFetch('/api/auth/me'),

  updateMe: (updates) =>
    apiFetch('/api/auth/me', { method: 'PATCH', body: JSON.stringify(updates) }),

  changePassword: (current_password, new_password) =>
    apiFetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),

  logout: () => {
    tokenStore.remove();
    window.location.href = '/login';
  },

  isAuthenticated: () => !!tokenStore.get(),
};

// ── Functions (serverless replacements) ───────────────────────────────────────
const functions = {
  invoke: async (name, payload) => {
    const map = {
      getBusinessSettings:   () => apiFetch('/api/business-settings'),
      createCheckoutSession: (p) => apiFetch('/api/stripe/create-checkout-session', { method: 'POST', body: JSON.stringify(p) }),
      saveStripeSecret:      (p) => apiFetch('/api/stripe/save-config', { method: 'POST', body: JSON.stringify(p) }),
      plaidCreateLinkToken:  ()  => apiFetch('/api/plaid/create-link-token', { method: 'POST', body: '{}' }),
      plaidExchangeToken:    (p) => apiFetch('/api/plaid/exchange-token', { method: 'POST', body: JSON.stringify(p) }),
      plaidGetTransactions:  (p) => apiFetch('/api/plaid/get-transactions', { method: 'POST', body: JSON.stringify(p) }),
    };

    const fn = map[name];
    if (!fn) throw new Error(`Unknown function: ${name}`);
    const result = await fn(payload);
    // Wrap in { data: ... } to match Base44 SDK response shape
    return { data: result };
  },
};

// ── Public client (exported as `base44` for drop-in compat) ──────────────────
export const base44 = {
  auth,
  functions,
  entities: {
    Job:               entityClient('/api/jobs'),
    Employee:          entityClient('/api/employees'),
    TimeEntry:         entityClient('/api/time-entries'),
    Expense:           entityClient('/api/expenses'),
    BusinessSettings:  entityClient('/api/business-settings'),
    Booking:           entityClient('/api/bookings'),
    AvailableSlot:     entityClient('/api/available-slots'),
    TimeOffRequest:    entityClient('/api/time-off-requests'),
    MileageLog:        entityClient('/api/mileage-logs'),
    OwnerTransaction:  entityClient('/api/owner-transactions'),
    ReconcileMatch:    entityClient('/api/reconcile-matches'),
  },
};

export default base44;
