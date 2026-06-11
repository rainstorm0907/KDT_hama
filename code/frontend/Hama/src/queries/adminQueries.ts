import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fetchAdminUsers,
  fetchAnomalies,
  fetchAnomalySummary,
  type AnomalyMode,
  type AnomalySort,
} from '../api/adminApi';

export const ANOMALY_PAGE_SIZE = 20;

export function useAnomaliesQuery(mode: AnomalyMode, sort: AnomalySort, page: number) {
  return useQuery({
    queryKey: ['admin', 'anomalies', mode, sort, page],
    queryFn: () =>
      fetchAnomalies(mode, sort, page * ANOMALY_PAGE_SIZE, ANOMALY_PAGE_SIZE),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useAnomalySummaryQuery() {
  return useQuery({
    queryKey: ['admin', 'anomalies', 'summary'],
    queryFn: fetchAnomalySummary,
    staleTime: 300_000,
  });
}

export function useAdminUsersQuery() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: fetchAdminUsers,
    staleTime: 60_000,
  });
}
