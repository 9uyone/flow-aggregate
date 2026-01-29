import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axiosInstance';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types/auth';

/**
 * Fetches the current user profile from /auth/me using TanStack Query.
 *
 * Why: centralizes profile fetching, enables caching, and synchronizes
 * the profile into Zustand when the request succeeds.
 */
export const useMe = () => {
  const { isAuthenticated, setUser, setInitialized, hydrateAccessToken } = useAuthStore();

  useEffect(() => {
    hydrateAccessToken();
    if (!isAuthenticated) {
      setInitialized(true);
    }
  }, [hydrateAccessToken, isAuthenticated, setInitialized]);

  const query = useQuery<User>({
    queryKey: ['me'],
    queryFn: async () => {
      console.log('[Auth Debug] useMe fetching /auth/me');
      const { data } = await axiosInstance.get<User>('/auth/me');
      return data;
    },
    enabled: isAuthenticated,
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (query.isSuccess && query.data) {
      setUser(query.data);
    }
  }, [query.isSuccess, query.data, setUser]);

  useEffect(() => {
    if (query.isFetched) {
      console.log('[Auth Debug] useMe settled');
      setInitialized(true);
    }
  }, [query.isFetched, setInitialized]);

  return query;
};
