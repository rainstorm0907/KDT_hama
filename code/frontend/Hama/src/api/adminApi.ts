const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

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
    let message = `API 요청 실패: ${url}`;

    try {
      const data = (await response.json()) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      // Empty or non-JSON response.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export type AnomalyMode = 'low_confidence' | 'accessory';

export type AnomalySort =
  | 'confidence_asc'
  | 'confidence_desc'
  | 'price_asc'
  | 'price_desc';

export type AnomalyRow = {
  itemId: number;
  platform: string;
  pid: string;
  title: string;
  price: number | null;
  saleStatus: string;
  clusterName: string;
  clusterConfidence: number | null;
  matchedTokens: string[];
  link: string;
};

export type AnomalyPage = {
  mode: AnomalyMode;
  sort: AnomalySort;
  limit: number;
  offset: number;
  rows: AnomalyRow[];
};

export type AnomalySummary = {
  lowConfidence: number;
  accessory: number;
};

export type AdminUserRow = {
  userId: number;
  name: string;
  nickname: string;
  email: string;
  joinedAt: string;
  lastActiveAt: string;
  accountStatus: string;
  role: string;
  wishlistCount: number;
};

export async function fetchAnomalies(
  mode: AnomalyMode,
  sort: AnomalySort,
  offset: number,
  limit = 20
) {
  return request<AnomalyPage>(
    `/api/products/anomalies?mode=${mode}&sort=${sort}&limit=${limit}&offset=${offset}`
  );
}

export async function fetchAnomalySummary() {
  return request<AnomalySummary>('/api/products/anomalies/summary');
}

export async function fetchAdminUsers() {
  return request<AdminUserRow[]>('/api/admin/users');
}
