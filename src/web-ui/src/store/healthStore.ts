import { create } from 'zustand';
import type { ServiceName, HealthResult } from '../api/healthApi';
import { getAllHealth, availableServices } from '../api/healthApi';

interface ServiceStatus extends HealthResult {}

interface HealthState {
  statuses: Record<ServiceName, ServiceStatus | null>;
  isLoading: boolean;
  lastChecked?: string | null;
  fetchHealth: () => Promise<void>;
  startAutoRefresh: (intervalMs?: number) => void;
  stopAutoRefresh: () => void;
  _intervalId?: number | null;
}

const initialStatuses = Object.fromEntries(
  availableServices.map((s) => [s, null]),
) as Record<ServiceName, ServiceStatus | null>;

export const useHealthStore = create<HealthState>((set, get) => ({
  statuses: initialStatuses,
  isLoading: false,
  lastChecked: null,
  _intervalId: null,

  fetchHealth: async () => {
    set({ isLoading: true });
    try {
      const res = await getAllHealth();
      set({
        statuses: res,
        lastChecked: new Date().toISOString(),
        isLoading: false,
      });
    } catch (err) {
      console.error('Failed to fetch health:', err);
      set({ isLoading: false });
    }
  },

  startAutoRefresh: (intervalMs = 15000) => {
    const current = get();
    if (current._intervalId) return;
    const id = window.setInterval(() => void get().fetchHealth(), intervalMs);
    set({ _intervalId: id });
    // Trigger immediate fetch
    void get().fetchHealth();
  },

  stopAutoRefresh: () => {
    const { _intervalId } = get();
    if (_intervalId) {
      clearInterval(_intervalId);
      set({ _intervalId: null });
    }
  },
}));
