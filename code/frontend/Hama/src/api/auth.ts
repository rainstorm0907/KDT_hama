const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

type ApiMessage = {
  message?: string;
};

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = '요청을 처리하지 못했습니다.';

    try {
      const data = (await response.json()) as ApiMessage;
      if (data.message) message = data.message;
    } catch {
      // Empty or non-JSON response.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export type CurrentUser = {
  userId?: number;
  email?: string;
  name?: string;
  nickname?: string;
};

export async function login(body: { email: string; password: string }) {
  return request<ApiMessage & { email?: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function signup(body: {
  email: string;
  password: string;
  passwordConfirm: string;
  name?: string;
  birthDate?: string;
  phone?: string;
  nickname?: string;
  agreeMarketing?: boolean;
}) {
  return request<ApiMessage>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function requestPasswordReset(email: string) {
  return request<ApiMessage>('/api/auth/password/reset-request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function logout() {
  return request<ApiMessage>('/api/auth/logout', { method: 'POST' });
}

export async function fetchCurrentUser() {
  return request<CurrentUser>('/api/me');
}
