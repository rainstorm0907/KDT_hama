import type { Product } from '../types/product';

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

export type ProfileResponse = {
  userId: number;
  loginId?: string;
  email: string;
  name?: string;
  nickname?: string;
  phoneNumber?: string;
  birthDate?: string;
  accountStatus?: string;
  role?: string;
  createdAt?: string;
};

export type WishlistResponse = {
  wishId: number;
  itemId: number;
  itemName: string;
  imageUrl?: string;
  currentPrice: number;
  targetPrice?: number;
  lowestAlert: boolean;
  targetPriceReached: boolean;
  addedAt: string;
  product: Product;
};

export type NotificationResponse = {
  notificationId: number;
  itemId?: number;
  notificationType: string;
  title: string;
  message?: string;
  read: boolean;
  createdAt: string;
  product?: Product;
};

export type NotificationSettingResponse = {
  lowestPriceEnabled: boolean;
  soldStatusEnabled: boolean;
  newItemEnabled: boolean;
  updatedAt?: string;
};

export async function fetchMyProfile() {
  return request<ProfileResponse>('/api/mypage/profile');
}

export async function updateMyProfile(body: {
  name?: string;
  nickname?: string;
  email?: string;
  phoneNumber?: string;
}) {
  return request<ProfileResponse>('/api/mypage/profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function changeMyPassword(body: {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}) {
  return request<{ message: string }>('/api/mypage/password', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function withdrawMe() {
  return request<{ message: string }>('/api/mypage/me', { method: 'DELETE' });
}

export async function fetchAdminStatus() {
  return request<{ admin: boolean }>('/api/mypage/admin/check');
}

export async function fetchWishlists() {
  return request<WishlistResponse[]>('/api/mypage/wishlists');
}

export async function addWishlist(itemId: number) {
  return request<WishlistResponse>(`/api/mypage/wishlists/${itemId}`, {
    method: 'POST',
  });
}

export async function removeWishlist(itemId: number) {
  return request<{ message: string }>(`/api/mypage/wishlists/${itemId}`, {
    method: 'DELETE',
  });
}

export async function updateWishlistAlert(body: {
  itemId: number;
  targetPrice?: number | null;
  lowestAlert?: boolean;
}) {
  return request<WishlistResponse>('/api/mypage/wishlists/alert', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function fetchRecentItems() {
  return request<Product[]>('/api/mypage/recent-items');
}

export async function saveRecentItem(itemId: number) {
  return request<{ message: string }>(`/api/mypage/recent-items/${itemId}`, {
    method: 'POST',
  });
}

export async function clearRecentItems() {
  return request<{ message: string }>('/api/mypage/recent-items', {
    method: 'DELETE',
  });
}

export async function fetchNotifications() {
  return request<NotificationResponse[]>('/api/mypage/notifications');
}

export async function markNotificationRead(notificationId: number) {
  return request<{ message: string }>(
    `/api/mypage/notifications/${notificationId}/read`,
    { method: 'PATCH' }
  );
}

export async function fetchNotificationSetting() {
  return request<NotificationSettingResponse>('/api/mypage/notification-settings');
}

export async function updateNotificationSetting(
  body: Partial<NotificationSettingResponse>
) {
  return request<NotificationSettingResponse>('/api/mypage/notification-settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
