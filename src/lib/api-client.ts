const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_DATA_BASE = `${API_BASE}/api`;

/** User shape returned by auth endpoints (camelCase, not raw DB rows). */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  school?: string;
  program?: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Data API requests default to `any` because backend responses are raw JSON
// rows whose shape is enforced at the call site via explicit type parameters
// (e.g. api.get<Subject[]>("/subjects")) or by the consumer casting.
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<ApiResponse<T>> {
  const token = tokenManager.getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_DATA_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    // On 401, attempt a single refresh + retry. Avoid retry loops and
    // avoid retrying the refresh endpoint itself.
    if (response.status === 401 && !isRetry && !endpoint.startsWith('/auth/')) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return apiRequest<T>(endpoint, options, true);
      }
      // Refresh failed — surface the original 401 to the caller; the
      // AuthListener / proxy will redirect to /login on the next tick.
    }

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `HTTP ${response.status}: ${response.statusText}` };
    }

    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

async function apiRequestAuth<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = tokenManager.getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `HTTP ${response.status}: ${response.statusText}` };
    }

    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: `HTTP ${res.status}: ${res.statusText}` };
  }
}

async function apiRequestFormData<T = any>(
  endpoint: string,
  formData: FormData
): Promise<ApiResponse<T>> {
  const token = tokenManager.getAccessToken();

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_DATA_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        // Retry with the new token.
        const newToken = tokenManager.getAccessToken();
        const retryHeaders: HeadersInit = {};
        if (newToken) retryHeaders['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(`${API_DATA_BASE}${endpoint}`, {
          method: 'POST',
          headers: retryHeaders,
          body: formData,
        });
        const retryData = await safeJson(retryRes);
        if (!retryRes.ok) {
          return { error: retryData.error || `HTTP ${retryRes.status}` };
        }
        return { data: retryData };
      }
    }

    const data = await safeJson(response);

    if (!response.ok) {
      return { error: data.error || `HTTP ${response.status}: ${response.statusText}` };
    }

    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

export const api = {
  get: <T = any>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T = any>(endpoint: string, data: unknown) => apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  put: <T = any>(endpoint: string, data: unknown) => apiRequest<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: <T = any>(endpoint: string) => apiRequest<T>(endpoint, {
    method: 'DELETE',
  }),
  upload: <T = any>(endpoint: string, formData: FormData) => apiRequestFormData<T>(endpoint, formData),
};

// Auth-specific methods
export const authApi = {
  login: async (email: string, password: string) => {
    return apiRequestAuth<{ user: AuthUser } & TokenPair>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  register: async (data: { email: string; password: string; fullName?: string; school?: string; program?: string }) => {
    return apiRequestAuth<{ user: AuthUser } & TokenPair>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getMe: async () => {
    return apiRequestAuth<{ user: AuthUser }>('/auth/me');
  },
  logout: async () => {
    const refreshToken = tokenManager.getRefreshToken();
    return apiRequestAuth('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },
  refresh: async (refreshToken: string) => {
    return apiRequestAuth<TokenPair>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },
  googleOAuth: () => {
    window.location.href = `${API_BASE}/auth/google`;
  },
  forgotPassword: async (email: string) => {
    return apiRequestAuth<{ message: string; devResetUrl?: string; devResetToken?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  resetPassword: async (token: string, password: string) => {
    return apiRequestAuth<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    return apiRequestAuth<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

// Singleton in-flight refresh promise so concurrent 401s share one refresh.
let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = tokenManager.getRefreshToken();
  if (!refreshToken) return false;

  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const result = await authApi.refresh(refreshToken);
    if (result.data?.accessToken && result.data?.refreshToken) {
      tokenManager.setTokens(result.data.accessToken, result.data.refreshToken);
      return true;
    }
    tokenManager.clearTokens();
    return false;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

// Token management — access + refresh tokens in localStorage, access token
// also mirrored to a cookie for the Next.js edge proxy.
export const tokenManager = {
  getAccessToken: () => localStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    // Mirror access token to cookie for the edge proxy (src/proxy.ts).
    document.cookie = `accessToken=${accessToken}; path=/; max-age=${15 * 60}; SameSite=Lax`;
  },
  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    document.cookie = 'accessToken=; path=/; max-age=0';
  },
  isAuthenticated: () => !!localStorage.getItem('accessToken'),
};

export default api;

// Resolve a possibly-relative avatar URL to a fully-qualified one.
// The backend stores avatar paths as "/uploads/avatars/..." (relative),
// but the frontend is on a different origin (:3000 vs :4000), so a raw
// relative URL would resolve against the frontend origin and 404.
// If the URL is already absolute (starts with http), return it as-is.
export function resolveAvatarUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
}
