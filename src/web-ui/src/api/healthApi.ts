import axios from 'axios';

export type ServiceName =
  | 'analyze'
  | 'auth'
  | 'collector'
  | 'scheduler'
  | 'storage';

export interface HealthResult {
  ok: boolean;
  status: number | null;
  data?: any;
  message?: string;
  checkedAt: string;
}

const SERVICES: ServiceName[] = [
  'analyze',
  'auth',
  'collector',
  'scheduler',
  'storage',
];

const getServiceEnv = (service: ServiceName) =>
  (import.meta.env as any)[`VITE_${service.toUpperCase()}_BASE_URL`];

const getApiBase = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Derive a service base URL. Priority: explicit VITE_<SERVICE>_BASE_URL, else strip /api from API base.
 * Note: some deployments provide a base without trailing `/api` — strip `/api` when present.
 */
const resolveServiceBase = (service: ServiceName) => {
  const env = getServiceEnv(service);
  if (env) return String(env).replace(/\/$/, '');

  const apiBase = String(getApiBase());
  return apiBase.replace(/\/api\/?$/i, '');
};

export const checkService = async (service: ServiceName): Promise<HealthResult> => {
  const base = resolveServiceBase(service);
  const url = `${base}/health/${service}`;

  try {
    const res = await axios.get(url, { timeout: 5000, responseType: 'text' });
    const body = typeof res.data === 'string' ? res.data.trim() : JSON.stringify(res.data);
    const healthy = body === 'Healthy';
    return {
      ok: healthy,
      status: res.status,
      data: res.data,
      message: body,
      checkedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      ok: false,
      status: err?.response?.status ?? null,
      message: err?.message ?? 'Network error',
      checkedAt: new Date().toISOString(),
    };
  }
};

export const getAllHealth = async (): Promise<Record<ServiceName, HealthResult>> => {
  const results = await Promise.all(
    SERVICES.map(async (s) => [s, await checkService(s)] as const),
  );

  return Object.fromEntries(results) as Record<ServiceName, HealthResult>;
};

export const availableServices = SERVICES;
