import { useQuery } from '@tanstack/react-query';
import {
  fetchNotificationSetting,
  fetchRecentItems,
  fetchWishlists,
} from '../api/mypageApi';

// 마이페이지 탭은 재진입할 때마다 다시 불러오지 않는다.
// 캐시를 길게 유지해 발표·시연 중 즉시 표시하고, 갱신은 각 탭의
// 수동 새로고침 버튼(refetch)으로만 일어난다.
const MYPAGE_STALE_TIME = 30 * 60 * 1000;

export const mypageQueryKeys = {
  wishlists: ['mypage', 'wishlists'] as const,
  recentItems: ['mypage', 'recentItems'] as const,
  notificationSetting: ['mypage', 'notificationSetting'] as const,
};

export function useWishlistsQuery() {
  return useQuery({
    queryKey: mypageQueryKeys.wishlists,
    queryFn: fetchWishlists,
    staleTime: MYPAGE_STALE_TIME,
    gcTime: MYPAGE_STALE_TIME,
    refetchOnWindowFocus: false,
  });
}

export function useRecentItemsQuery() {
  return useQuery({
    queryKey: mypageQueryKeys.recentItems,
    queryFn: fetchRecentItems,
    staleTime: MYPAGE_STALE_TIME,
    gcTime: MYPAGE_STALE_TIME,
    refetchOnWindowFocus: false,
  });
}

export function useNotificationSettingQuery() {
  return useQuery({
    queryKey: mypageQueryKeys.notificationSetting,
    queryFn: fetchNotificationSetting,
    staleTime: MYPAGE_STALE_TIME,
    gcTime: MYPAGE_STALE_TIME,
    refetchOnWindowFocus: false,
  });
}
