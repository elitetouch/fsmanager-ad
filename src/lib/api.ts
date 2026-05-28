import axios, { AxiosError, AxiosInstance } from 'axios';
import { clearToken, readToken } from './auth';
import * as fx from './fixtures';

/**
 * When the app is built with NEXT_PUBLIC_DEMO_MODE=1, every endpoint
 * below returns canned data from `fixtures.ts` instead of touching the
 * real Laravel API. Useful for screenshots, public demo deployments,
 * and offline review.
 */
const DEMO = fx.DEMO_MODE;
const wait = <T,>(value: T, ms = 120) => new Promise<T>((res) => setTimeout(() => res(value), ms));

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000').replace(/\/+$/, '');

/**
 * One axios instance shared by every screen.
 *
 *  - Base URL: `${NEXT_PUBLIC_API_BASE_URL}/api/v1/admin`
 *    so endpoint paths in this file read like the API docs (`/dashboard`,
 *    `/users`, `/tokens/adjust`).
 *  - Auth: attaches the admin Sanctum bearer on every outgoing request.
 *  - 401 handling: clears the token and bounces to /login. We do NOT auto-
 *    refresh; admin sessions are short and explicit re-login is fine.
 */
export const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE}/api/v1/admin`,
  headers: { Accept: 'application/json' },
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      clearToken();
      // Avoid a redirect loop if we're already on /login.
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Normalise the API's `{ success, message, data, errors? }` envelope into
 * a plain `data` payload, throwing on failure.
 */
export async function apiData<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  const res = await promise;
  return res.data?.data as T;
}

/**
 * Pull a useful error message out of an axios failure. Used in toasts.
 */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (!err) return fallback;
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Record<string, unknown> | undefined;
    if (data && typeof data['message'] === 'string') return data['message'] as string;
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

// ----------------------------------------------------------------------
// Endpoint helpers — one function per backend route. Keep these thin;
// page-level data shaping happens in React components.
// ----------------------------------------------------------------------

import type {
  AdminUser,
  AuditLogRow,
  DashboardSnapshot,
  Paginated,
  SupportMessage,
  SupportThread,
  TenantFarm,
  TenantUser,
  TokenBalanceRow,
  TokenLedgerRow,
  TokenPrice,
  TokenPurchase,
  TrendBundle,
} from '@/types/api';

export const endpoints = {
  // Auth
  login: (email: string, password: string) =>
    DEMO
      ? wait({ admin: fx.demoAdmin, token: 'demo-token' })
      : apiData<{ admin: AdminUser; token: string }>(api.post('/auth/login', { email, password })),
  me: () =>
    DEMO
      ? wait({ admin: fx.demoAdmin, capabilities: fx.demoCapabilities })
      : apiData<{ admin: AdminUser; capabilities: string[] }>(api.get('/auth/me')),
  logout: () => (DEMO ? wait({ data: { success: true } }) : api.post('/auth/logout')),
  createAdmin: (payload: {
    name: string;
    email: string;
    password: string;
    role: AdminUser['role'];
    permissions?: Record<string, unknown> | null;
  }) =>
    DEMO
      ? wait({ admin: { ...fx.demoAdmin, name: payload.name, email: payload.email, role: payload.role } })
      : apiData<{ admin: AdminUser }>(api.post('/admin-users', payload)),

  // Dashboard
  dashboard: () => (DEMO ? wait(fx.demoDashboard) : apiData<DashboardSnapshot>(api.get('/dashboard'))),
  trends: (days = 30) =>
    DEMO
      ? wait({ days, series: fx.demoTrends })
      : apiData<{ days: number; series: TrendBundle }>(api.get('/dashboard/trends', { params: { days } })),

  // Segmentation
  segByCountry: () =>
    DEMO ? wait(fx.demoSegByCountry) : apiData<{ rows: SegRow[] }>(api.get('/segmentation/by-country')),
  segByState: (country?: string) =>
    DEMO
      ? wait({ ...fx.demoSegByState, countryCode: country ?? fx.demoSegByState.countryCode })
      : apiData<{ countryCode: string | null; rows: SegRow[] }>(
          api.get('/segmentation/by-state', { params: country ? { country } : {} }),
        ),
  segByFarmType: () =>
    DEMO ? wait(fx.demoFarmTypeSeg) : apiData<{ rows: SegRow[] }>(api.get('/segmentation/by-farm-type')),
  segByPrimaryProduction: () =>
    DEMO ? wait(fx.demoProductionSeg) : apiData<{ rows: SegRow[] }>(api.get('/segmentation/by-primary-production')),
  segByTargetMarket: () =>
    DEMO ? wait(fx.demoMarketSeg) : apiData<{ rows: SegRow[] }>(api.get('/segmentation/by-target-market')),
  segFlocksByProduction: () =>
    DEMO ? wait(fx.demoFlockProductionSeg) : apiData<{ rows: SegRow[] }>(api.get('/segmentation/flocks-by-production-type')),
  segTopBreedsAndHatcheries: (limit = 10) =>
    DEMO
      ? wait(fx.demoTopSuppliers)
      : apiData<{ breeds: SegRow[]; hatcheries: SegRow[] }>(
          api.get('/segmentation/top-breeds-hatcheries', { params: { limit } }),
        ),
  segMortalityByCountry: (days = 30) =>
    DEMO
      ? wait(fx.demoMortalityByCountry)
      : apiData<{ days: number; rows: SegRow[] }>(api.get('/segmentation/mortality-by-country', { params: { days } })),

  // Tenant users
  listUsers: (params: Record<string, string | number | undefined>) =>
    DEMO
      ? wait({ users: fx.demoUsers(), meta: { currentPage: 1, perPage: 25, total: 12450, lastPage: 498 } })
      : apiData<{ users: TenantUser[]; meta: Paginated['meta'] }>(api.get('/users', { params })),
  showUser: (id: string) =>
    DEMO ? wait(fx.demoUserDetail) : apiData<{
      user: TenantUser;
      memberships: UserMembership[];
      recentActivity: Record<string, unknown>[];
      flags: { isSuspended: boolean };
    }>(api.get(`/users/${id}`)),
  suspendUser: (id: string, reason?: string) =>
    DEMO ? wait({ userId: id }) : apiData<{ userId: string | number }>(api.post(`/users/${id}/suspend`, { reason })),
  unsuspendUser: (id: string) =>
    DEMO ? wait({ userId: id }) : apiData<{ userId: string | number }>(api.post(`/users/${id}/unsuspend`)),
  verifyUserEmail: (id: string) =>
    DEMO ? wait({ userId: id }) : apiData<{ userId: string | number }>(api.post(`/users/${id}/verify-email`)),
  userNotes: (id: string) =>
    DEMO ? wait({ notes: fx.demoUserNotes }) : apiData<{ notes: AdminNote[] }>(api.get(`/users/${id}/notes`)),
  addUserNote: (id: string, body: string, pinned = false) =>
    DEMO
      ? wait({
          note: {
            id: 'demo-note-' + Date.now(),
            subjectType: 'user',
            subjectId: id,
            body,
            pinned,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            author: { id: fx.demoAdmin.id, name: fx.demoAdmin.name },
          },
        })
      : apiData<{ note: AdminNote }>(api.post(`/users/${id}/notes`, { body, pinned })),

  // Farms
  listFarms: (params: Record<string, string | number | undefined>) =>
    DEMO
      ? wait({ farms: fx.demoFarms(), meta: { currentPage: 1, perPage: 25, total: 11500, lastPage: 460 } })
      : apiData<{ farms: TenantFarm[]; meta: Paginated['meta'] }>(api.get('/farms', { params })),
  showFarm: (id: string) =>
    DEMO ? wait(fx.demoFarmDetail) : apiData<{
      farm: TenantFarm;
      members: FarmMember[];
      flocks: Record<string, unknown>[];
      recordTotals: { eventType: string; count: number; totalBirdsDelta: number }[];
    }>(api.get(`/farms/${id}`)),
  archiveFarm: (id: string, reason?: string) =>
    DEMO ? wait({ farmId: id }) : apiData<{ farmId: string }>(api.post(`/farms/${id}/archive`, { reason })),
  restoreFarm: (id: string) =>
    DEMO ? wait({ farmId: id }) : apiData<{ farmId: string }>(api.post(`/farms/${id}/restore`)),
  farmNotes: (id: string) =>
    DEMO ? wait({ notes: fx.demoFarmNotes }) : apiData<{ notes: AdminNote[] }>(api.get(`/farms/${id}/notes`)),
  addFarmNote: (id: string, body: string, pinned = false) =>
    DEMO
      ? wait({
          note: {
            id: 'demo-fnote-' + Date.now(),
            subjectType: 'farm',
            subjectId: id,
            body,
            pinned,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            author: { id: fx.demoAdmin.id, name: fx.demoAdmin.name },
          },
        })
      : apiData<{ note: AdminNote }>(api.post(`/farms/${id}/notes`, { body, pinned })),

  // Accounts
  listAccounts: (params: Record<string, string | number | undefined>) =>
    DEMO
      ? wait({ accounts: fx.demoAccounts(), meta: { currentPage: 1, perPage: 25, total: 9210, lastPage: 369 } })
      : apiData<{ accounts: AccountRow[]; meta: Paginated['meta'] }>(api.get('/accounts', { params })),
  showAccount: (id: string) =>
    DEMO ? wait(fx.demoAccountDetail) : apiData<{
      account: AccountRow;
      tokenBalances: { tokenType: string; tier: string; balance: number }[];
      recentLedger: TokenLedgerRow[];
      recentPurchases: TokenPurchase[];
    }>(api.get(`/accounts/${id}`)),

  // Tokens
  tokenBalances: (params: Record<string, string | number | undefined>) =>
    DEMO
      ? wait({ rows: fx.demoTokenBalances(), meta: { currentPage: 1, perPage: 50, total: 18, lastPage: 1 } })
      : apiData<{ rows: TokenBalanceRow[]; meta: Paginated['meta'] }>(api.get('/tokens/balances', { params })),
  tokenLedger: (params: Record<string, string | number | undefined>) =>
    DEMO
      ? wait({ rows: fx.demoTokenLedger(), meta: { currentPage: 1, perPage: 50, total: 22, lastPage: 1 } })
      : apiData<{ rows: TokenLedgerRow[]; meta: Paginated['meta'] }>(api.get('/tokens/ledger', { params })),
  tokenAdjust: (payload: {
    account_id: string;
    token_type: 'broiler' | 'layer';
    tier: 'basic' | 'premium';
    entry_type: 'credit' | 'debit';
    quantity: number;
    reason: string;
  }) =>
    DEMO
      ? wait({ ledgerEntryId: '01HXY3PEDEMOADJ' + Date.now() })
      : apiData<{ ledgerEntryId: string }>(api.post('/tokens/adjust', payload)),
  /**
   * Record an OFFLINE payment (bank transfer / cash / USSD / POS) and
   * credit tokens. Backed by POST /admin/tokens/manual-purchase. Used for
   * farmers who pay into the company's bank account directly rather than
   * via Paystack/Flutterwave.
   */
  tokenManualPurchase: (payload: {
    account_id: string;
    token_type: 'broiler' | 'layer';
    tier: 'basic' | 'premium';
    quantity: number;
    amount_minor: number;
    currency?: string;
    provider: 'bank_transfer' | 'cash' | 'ussd' | 'pos' | 'other';
    reference: string;
    paid_at: string;
    notes?: string;
  }) =>
    DEMO
      ? wait({
          purchaseId: '01HXY3PEDEMOPUR' + Date.now(),
          ledgerEntryId: '01HXY3PEDEMOLED' + Date.now(),
        })
      : apiData<{ purchaseId: string; ledgerEntryId: string }>(
          api.post('/tokens/manual-purchase', payload),
        ),
  tokenPrices: (activeOnly = false) =>
    DEMO
      ? wait({ rows: activeOnly ? fx.demoTokenPrices.filter((p) => p.is_active) : fx.demoTokenPrices })
      : apiData<{ rows: TokenPrice[] }>(api.get('/tokens/prices', { params: activeOnly ? { active_only: 1 } : {} })),
  createTokenPrice: (payload: {
    token_type: 'broiler' | 'layer';
    tier: 'basic' | 'premium';
    unit_price_minor: number;
    currency?: string;
    effective_from?: string;
    metadata?: Record<string, unknown>;
  }) =>
    DEMO
      ? wait({ priceId: '01HXY3PEDEMOPRICE' + Date.now() })
      : apiData<{ priceId: string }>(api.post('/tokens/prices', payload)),
  tokenPurchases: (params: Record<string, string | number | undefined>) =>
    DEMO
      ? wait({ rows: fx.demoTokenPurchases(), meta: { currentPage: 1, perPage: 50, total: 16, lastPage: 1 } })
      : apiData<{ rows: TokenPurchase[]; meta: Paginated['meta'] }>(api.get('/tokens/purchases', { params })),

  // Support
  listThreads: (params: Record<string, string | number | undefined>) =>
    DEMO
      ? wait({ threads: fx.demoThreads(), meta: { currentPage: 1, perPage: 25, total: 47, lastPage: 2 } })
      : apiData<{ threads: SupportThread[]; meta: Paginated['meta'] }>(api.get('/support/threads', { params })),
  showThread: (id: string) =>
    DEMO ? wait(fx.demoThreadDetail) : apiData<{ thread: SupportThread; messages: SupportMessage[] }>(api.get(`/support/threads/${id}`)),
  createThread: (payload: {
    subject: string;
    subject_type: 'user' | 'farm' | 'account' | 'general';
    subject_id?: string;
    farm_id?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    body?: string;
  }) =>
    DEMO
      ? wait({ thread: fx.demoThreads()[0] })
      : apiData<{ thread: SupportThread }>(api.post('/support/threads', payload)),
  postThreadMessage: (id: string, body: string, isInternal = false) =>
    DEMO
      ? wait({
          message: {
            id: 'demo-msg-' + Date.now(),
            threadId: id,
            author: { type: 'admin' as const, id: fx.demoAdmin.id },
            body,
            isInternal,
            attachments: null,
            readAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        })
      : apiData<{ message: SupportMessage }>(api.post(`/support/threads/${id}/messages`, {
          body,
          is_internal: isInternal,
        })),
  assignThread: (id: string, adminUserId?: string | null) =>
    DEMO
      ? wait({ thread: { ...fx.demoThreads()[0], id, assignedAdminUserId: adminUserId ?? null } })
      : apiData<{ thread: SupportThread }>(api.post(`/support/threads/${id}/assign`, {
          admin_user_id: adminUserId,
        })),
  setThreadStatus: (id: string, status: SupportThread['status']) =>
    DEMO
      ? wait({ thread: { ...fx.demoThreads()[0], id, status } })
      : apiData<{ thread: SupportThread }>(api.post(`/support/threads/${id}/status`, { status })),
  markThreadRead: (id: string) => (DEMO ? wait({ threadId: id }) : apiData<{ threadId: string }>(api.post(`/support/threads/${id}/read`))),

  // Audit
  auditLogs: (params: Record<string, string | number | undefined>) =>
    DEMO
      ? wait({ rows: fx.demoAuditLogs(), meta: { currentPage: 1, perPage: 50, total: 20, lastPage: 1 } })
      : apiData<{ rows: AuditLogRow[]; meta: Paginated['meta'] }>(api.get('/audit-logs', { params })),
};

// ----------------------------------------------------------------------
// Small one-off result shapes used by a few endpoints. Kept inline rather
// than in types/api.ts because they are not shared across pages.
// ----------------------------------------------------------------------
export type SegRow = Record<string, string | number | null>;

export type AccountRow = {
  id: string;
  name: string;
  ownerUserId: number | string;
  countryCode: string;
  state?: string | null;
  currency: string;
  businessType?: string | null;
  industry?: string | null;
  sizeBand?: string | null;
  isActive: boolean;
  archivedAt?: string | null;
  freemiumEnabled?: boolean | null;
  farmsCount?: number;
  createdAt?: string | null;
};

export type AdminNote = {
  id: string;
  subjectType: string;
  subjectId: string;
  body: string;
  pinned: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  author?: { id: string; name: string } | null;
};

export type UserMembership = {
  farmId: string;
  farmName: string;
  countryCode: string;
  state: string | null;
  role: string;
  status: string;
  joinedAt: string | null;
  lastActiveAt: string | null;
};

export type FarmMember = {
  id: number | string;
  name: string;
  email: string;
  role: string;
  status: string;
  joined_at: string | null;
  last_active_at: string | null;
};
