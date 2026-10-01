import axios, { AxiosError, AxiosInstance } from 'axios';
import { clearToken, readToken } from './auth';
import * as fx from './fixtures';
import type { ProductionType, TokenType } from '@/types/api';

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

/**
 * Field-level validation errors from a 422 response, keyed like the
 * request fields (e.g. `slug`, `ip_allowlist.0`). Empty for other errors.
 */
export function apiFieldErrors(err: unknown): Record<string, string[]> {
  if (axios.isAxiosError(err) && err.response?.status === 422) {
    const errors = (err.response.data as { errors?: Record<string, string[]> } | undefined)?.errors;
    if (errors && typeof errors === 'object') return errors;
  }
  return {};
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

/**
 * Campaign create/update payload.
 *
 * A NAMED type, not `Parameters<typeof endpoints.createEmailCampaign>[0]`.
 *
 * That inline form made `endpoints` reference its own type while still
 * being inferred, so TypeScript gave up and typed the whole object as
 * `any` (TS7022). Every call site across the portal then silently lost
 * its types, which surfaced as ~100 unrelated-looking implicit-any
 * errors in files that had nothing to do with email — and as a build
 * that fails long after the change that caused it.
 */
type EmailCampaignPayload = {
  name: string;
  template_id: string;
  from_email?: string | null;
  from_name?: string | null;
  reply_to?: string | null;
  audience_filter: import('@/types/api').AudienceFilter;
  scheduled_for?: string | null;
};


/* ------------------------------------------------------------------ */
/*  Veterinary review of disease checks                               */
/* ------------------------------------------------------------------ */

/**
 * One disease check awaiting (or carrying) a vet's verdict.
 *
 * `agreesWithModel` is THREE-VALUED, and null is not a shrug. It means
 * the comparison is not defined: the row is unreviewed, or the vet
 * marked it `unclear` because no answer is available from a photograph.
 * Folding either into "wrong" would manufacture a failure rate out of
 * missing data.
 */
export type DiagnosisReviewDto = {
  id: string;
  createdAt: string;

  predictedClass: string | null;
  confidence: number | null;
  inconclusiveReason: string | null;
  modelVersion: string | null;
  latencyMs: number | null;

  /**
   * Out-of-distribution scores WITH the thresholds they were judged
   * against. The thresholds move as the model is retuned, so the pair
   * has to travel together or old rows become uninterpretable.
   */
  ood: {
    energy: number | null;
    distance: number | null;
    nearestCentroid: string | null;
    energyThreshold: number | null;
    distanceThreshold: number | null;
  };

  userFeedback: 'agreed' | 'disagreed' | 'unsure' | null;
  userReportedDisease: string | null;

  vetLabel: string | null;
  vetReviewedAt: string | null;
  vetReviewedBy: string | null;
  agreesWithModel: boolean | null;

  consultationRequested: boolean;
  consultationRequestedAt: string | null;
  awaitingVetReply: boolean;
  vetRepliedAt: string | null;

  hasGradcam: boolean;
};

/** The clinical picture, assembled from the cycle's own records. */
export type ClinicalBriefDto = {
  cycleLinked: boolean;
  cycle: {
    breed: string | null;
    penName: string | null;
    startDate: string | null;
    ageDays: number | null;
    ageWeeks: number | null;
    placedBirds: number | null;
    currentBirds: number | null;
  } | null;
  mortality: {
    recorded: boolean;
    total?: number;
    totalPercent?: number | null;
    last7Days?: number;
    previous7Days?: number;
    trend?: 'none' | 'new' | 'rising' | 'falling' | 'steady';
    lastRecordedOn?: string | null;
    dailyLast14?: Record<string, number>;
  } | null;
  vaccinations: {
    recorded: boolean;
    given?: VaccinationRowDto[];
    missed?: VaccinationRowDto[];
    missedCritical?: number;
    skipped?: VaccinationRowDto[];
    upcoming?: VaccinationRowDto[];
  } | null;
  treatments: {
    recorded: boolean;
    items?: Array<{
      date: string | null;
      type: string | null;
      product: string | null;
      dosage: string | null;
      quantity: number | null;
      unit: string | null;
      note: string | null;
    }>;
  } | null;
  intake: {
    recorded: boolean;
    feedLast7?: number;
    feedPrevious7?: number;
    waterLast7?: number;
    waterPrevious7?: number;
    feedUnit?: string | null;
    waterUnit?: string | null;
  } | null;
};

export type VaccinationRowDto = {
  name: string | null;
  diseaseTarget: string | null;
  ageDays: number | null;
  scheduledDate: string | null;
  completedAt: string | null;
  critical: boolean;
  method: string | null;
  skipReason: string | null;
};

export type DiagnosisDetailDto = DiagnosisReviewDto & {
  scores: Record<string, string>;
  diseaseInfo: Record<string, unknown>;
  vetNotes: string | null;
  vetReply: string | null;
  allowedLabels: string[];
  clinical: ClinicalBriefDto;
};

/** Server health. Every check can report `available: false` off-Linux. */
export type ServerHealthDto = {
  status: 'ok' | 'warning' | 'critical';
  capturedAt: string;
  checks: {
    memory: Record<string, number | boolean | null>;
    swap: Record<string, number | boolean | null>;
    disk: Record<string, number | string | boolean | null>;
    load: Record<string, number | boolean | null>;
    queue: Record<string, number | boolean | null>;
    inference: {
      available?: boolean;
      enabled?: boolean;
      url?: string;
      reachable?: boolean;
      httpStatus?: number;
      responseMs?: number;
      error?: string;
      memory?: Record<string, number | boolean | null>;
    };
    diagnosisStorage: Record<string, number | boolean | null>;
  };
};

export const endpoints = {
  // Auth
  login: (email: string, password: string, code?: string) =>
    DEMO
      ? wait({ admin: fx.demoAdmin, token: 'demo-token' })
      : apiData<{ admin: AdminUser; token: string }>(
          api.post('/auth/login', code ? { email, password, code } : { email, password }),
        ),
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
    token_type: TokenType;
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
    token_type: TokenType;
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
    token_type: TokenType;
    tier: 'basic' | 'premium';
    unit_price_minor: number;
    currency?: string;
    effective_from?: string;
    metadata?: Record<string, unknown>;
  }) =>
    DEMO
      ? wait({ priceId: '01HXY3PEDEMOPRICE' + Date.now() })
      : apiData<{ priceId: string }>(api.post('/tokens/prices', payload)),
  updateTokenPrice: (
    id: string,
    payload: {
      unit_price_minor?: number;
      currency?: string;
      effective_from?: string;
      is_active?: boolean;
    },
  ) =>
    DEMO
      ? wait({ priceId: id })
      : apiData<{ priceId: string }>(api.patch(`/tokens/prices/${id}`, payload)),
  deleteTokenPrice: (id: string) =>
    DEMO
      ? wait({ priceId: id })
      : apiData<{ priceId: string }>(api.delete(`/tokens/prices/${id}`)),
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

  // ============================================================
  // Batch 1 — admin lifecycle, failed jobs, notifications,
  // reference CRUD, CSV exports
  // ============================================================

  // Admin user lifecycle
  listAdminUsers: (params: Record<string, string | number | undefined>) =>
    apiData<{ admins: AdminUser[]; meta: Paginated['meta'] }>(api.get('/admin-users', { params })),
  showAdminUser: (id: string) =>
    apiData<{ admin: AdminUser; capabilities: string[] }>(api.get(`/admin-users/${id}`)),
  updateAdminUser: (
    id: string,
    payload: { name?: string; role?: AdminUser['role']; permissions?: Record<string, unknown> | null },
  ) => apiData<{ admin: AdminUser }>(api.patch(`/admin-users/${id}`, payload)),
  suspendAdminUser: (id: string) =>
    apiData<{ adminId: string }>(api.post(`/admin-users/${id}/suspend`)),
  unsuspendAdminUser: (id: string) =>
    apiData<{ adminId: string }>(api.post(`/admin-users/${id}/unsuspend`)),
  resetAdminPassword: (id: string) =>
    apiData<{ adminId: string; temporaryPassword: string }>(
      api.post(`/admin-users/${id}/reset-password`),
    ),
  deleteAdminUser: (id: string) =>
    apiData<{ adminId: string }>(api.delete(`/admin-users/${id}`)),

  // Failed jobs
  listFailedJobs: (params: Record<string, string | number | undefined>) =>
    apiData<{
      rows: Array<Record<string, unknown>>;
      meta: Paginated['meta'];
      summary: { total: number; last24h: number };
    }>(api.get('/failed-jobs', { params })),
  retryFailedJob: (uuid: string) =>
    apiData<{ uuid: string }>(api.post(`/failed-jobs/${uuid}/retry`)),
  deleteFailedJob: (uuid: string) =>
    apiData<{ uuid: string }>(api.delete(`/failed-jobs/${uuid}`)),
  flushFailedJobs: () =>
    apiData<{ deleted: number }>(api.post('/failed-jobs/flush')),

  // Notifications (bell icon)
  listNotifications: (params: Record<string, string | number | undefined>) =>
    apiData<{
      notifications: AdminNotification[];
      meta: Paginated['meta'];
      unreadCount: number;
    }>(api.get('/notifications', { params })),
  notificationsUnreadCount: () =>
    apiData<{ unreadCount: number }>(api.get('/notifications/unread-count')),
  markNotificationRead: (id: string) =>
    apiData<{ id: string }>(api.post(`/notifications/${id}/read`)),
  markAllNotificationsRead: () =>
    apiData<{ updated: number }>(api.post('/notifications/read-all')),

  // Reference data — Breeds
  listBreeds: (params: Record<string, string | number | undefined>) =>
    apiData<{ breeds: BreedRow[]; meta: Paginated['meta'] }>(
      api.get('/reference/breeds', { params }),
    ),
  showBreed: (id: string) => apiData<{ breed: BreedRow }>(api.get(`/reference/breeds/${id}`)),
  createBreed: (payload: Partial<BreedRow>) =>
    apiData<{ breed: BreedRow }>(api.post('/reference/breeds', payload)),
  updateBreed: (id: string, payload: Partial<BreedRow>) =>
    apiData<{ breed: BreedRow }>(api.patch(`/reference/breeds/${id}`, payload)),
  deleteBreed: (id: string) =>
    apiData<{ breedId: string }>(api.delete(`/reference/breeds/${id}`)),

  // Reference data — Hatcheries
  listHatcheries: (params: Record<string, string | number | undefined>) =>
    apiData<{ hatcheries: HatcheryRow[]; meta: Paginated['meta'] }>(
      api.get('/reference/hatcheries', { params }),
    ),
  showHatchery: (id: string) =>
    apiData<{ hatchery: HatcheryRow }>(api.get(`/reference/hatcheries/${id}`)),
  createHatchery: (payload: Partial<HatcheryRow>) =>
    apiData<{ hatchery: HatcheryRow }>(api.post('/reference/hatcheries', payload)),
  updateHatchery: (id: string, payload: Partial<HatcheryRow>) =>
    apiData<{ hatchery: HatcheryRow }>(api.patch(`/reference/hatcheries/${id}`, payload)),
  deleteHatchery: (id: string) =>
    apiData<{ hatcheryId: string }>(api.delete(`/reference/hatcheries/${id}`)),

  // Reference data — Vaccination protocols
  listProtocols: (params: Record<string, string | number | undefined>) =>
    apiData<{ protocols: ProtocolRow[]; meta: Paginated['meta'] }>(
      api.get('/reference/protocols', { params }),
    ),
  showProtocol: (id: string) =>
    apiData<{ protocol: ProtocolRow; items: Array<Record<string, unknown>> }>(
      api.get(`/reference/protocols/${id}`),
    ),
  createProtocol: (payload: Partial<ProtocolRow>) =>
    apiData<{ protocol: ProtocolRow }>(api.post('/reference/protocols', payload)),
  updateProtocol: (id: string, payload: Partial<ProtocolRow>) =>
    apiData<{ protocol: ProtocolRow }>(api.patch(`/reference/protocols/${id}`, payload)),
  deleteProtocol: (id: string) =>
    apiData<{ protocolId: string }>(api.delete(`/reference/protocols/${id}`)),

  // Protocol items — vaccines/treatments inside a protocol
  createProtocolItem: (protocolId: string, payload: Record<string, unknown>) =>
    apiData<{ item: Record<string, unknown> }>(
      api.post(`/reference/protocols/${protocolId}/items`, payload),
    ),
  updateProtocolItem: (
    protocolId: string,
    itemId: string,
    payload: Record<string, unknown>,
  ) =>
    apiData<{ item: Record<string, unknown> }>(
      api.patch(`/reference/protocols/${protocolId}/items/${itemId}`, payload),
    ),
  deleteProtocolItem: (protocolId: string, itemId: string) =>
    apiData<{ itemId: string }>(
      api.delete(`/reference/protocols/${protocolId}/items/${itemId}`),
    ),

  // CSV exports — returns the raw URL for an <a href> download. We build
  // the URL with auth header inline so the browser downloads it without
  // needing to round-trip via React state.
  exportUrl: (
    resource:
      | 'users'
      | 'farms'
      | 'accounts'
      | 'token-ledger'
      | 'token-purchases'
      | 'audit-logs',
    params: Record<string, string | number | undefined>,
  ): string => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    }
    const qs = q.toString();
    return `${api.defaults.baseURL}/exports/${resource}${qs ? '?' + qs : ''}`;
  },

  // ============================================================
  // Batch 2 + 3 — impersonate, refund, bulk, webhooks, KB, macros,
  // promo, broadcast, cohort, 2FA, GDPR
  // ============================================================

  // Impersonate
  impersonateStart: (userId: string) =>
    apiData<{
      token: string;
      user: { id: string; name: string; email: string };
      impersonatedByAdmin: { id: string; name: string; email: string };
    }>(api.post(`/users/${userId}/impersonate`)),
  impersonateStop: (userId: string) =>
    apiData<{ tokensRevoked: number }>(api.post(`/users/${userId}/impersonate/stop`)),

  // Refund + reverify
  refundPurchase: (id: string, reason: string) =>
    apiData<{ purchaseId: string; ledgerEntryId: string; clawback: number; partial: boolean }>(
      api.post(`/tokens/purchases/${id}/refund`, { reason }),
    ),
  reverifyPurchase: (id: string) =>
    apiData<{ purchaseId: string }>(api.post(`/tokens/purchases/${id}/reverify`)),

  // Bulk ops
  bulkSuspendUsers: (ids: Array<string | number>, reason?: string) =>
    apiData<{ affected: number }>(api.post('/bulk/users/suspend', { ids, reason })),
  bulkUnsuspendUsers: (ids: Array<string | number>) =>
    apiData<{ affected: number }>(api.post('/bulk/users/unsuspend', { ids })),
  bulkArchiveFarms: (ids: string[]) =>
    apiData<{ affected: number }>(api.post('/bulk/farms/archive', { ids })),
  bulkRestoreFarms: (ids: string[]) =>
    apiData<{ affected: number }>(api.post('/bulk/farms/restore', { ids })),

  // Webhook deliveries
  listWebhooks: (params: Record<string, string | number | undefined>) =>
    apiData<{ rows: Array<Record<string, unknown>>; meta: Paginated['meta'] }>(
      api.get('/webhook-deliveries', { params }),
    ),
  showWebhook: (id: string) =>
    apiData<{ delivery: Record<string, unknown> }>(api.get(`/webhook-deliveries/${id}`)),

  // KB
  listKbArticles: (params: Record<string, string | number | undefined>) =>
    apiData<{ articles: Array<Record<string, unknown>>; meta: Paginated['meta'] }>(
      api.get('/kb/articles', { params }),
    ),
  showKbArticle: (id: string) => apiData<{ article: Record<string, unknown> }>(api.get(`/kb/articles/${id}`)),
  createKbArticle: (payload: Record<string, unknown>) =>
    apiData<{ article: Record<string, unknown> }>(api.post('/kb/articles', payload)),
  updateKbArticle: (id: string, payload: Record<string, unknown>) =>
    apiData<{ article: Record<string, unknown> }>(api.patch(`/kb/articles/${id}`, payload)),
  deleteKbArticle: (id: string) =>
    apiData<{ articleId: string }>(api.delete(`/kb/articles/${id}`)),

  // Macros
  listMacros: (params?: Record<string, string | number | undefined>) =>
    apiData<{ macros: Array<Record<string, unknown>> }>(
      api.get('/support/macros', { params: params ?? {} }),
    ),
  createMacro: (payload: Record<string, unknown>) =>
    apiData<{ macro: Record<string, unknown> }>(api.post('/support/macros', payload)),
  updateMacro: (id: string, payload: Record<string, unknown>) =>
    apiData<{ macro: Record<string, unknown> }>(api.patch(`/support/macros/${id}`, payload)),
  deleteMacro: (id: string) =>
    apiData<{ macroId: string }>(api.delete(`/support/macros/${id}`)),

  // Promo codes
  listPromoCodes: (params: Record<string, string | number | undefined>) =>
    apiData<{ codes: Array<Record<string, unknown>>; meta: Paginated['meta'] }>(
      api.get('/promo-codes', { params }),
    ),
  showPromoCode: (id: string) =>
    apiData<{ code: Record<string, unknown>; redemptions: Array<Record<string, unknown>> }>(
      api.get(`/promo-codes/${id}`),
    ),
  createPromoCode: (payload: Record<string, unknown>) =>
    apiData<{ code: Record<string, unknown> }>(api.post('/promo-codes', payload)),
  updatePromoCode: (id: string, payload: Record<string, unknown>) =>
    apiData<{ code: Record<string, unknown> }>(api.patch(`/promo-codes/${id}`, payload)),

  // Broadcasts
  /* ---------------------------------------------------------------- */
  /*  Veterinary review                                               */
  /* ---------------------------------------------------------------- */

  listDiagnosisReviews: (params: Record<string, string | number | boolean | undefined>) =>
    apiData<{
      diagnoses: DiagnosisReviewDto[];
      meta: Paginated['meta'] & { pendingTotal: number; awaitingReplyTotal: number };
    }>(api.get('/diagnoses', { params })),

  showDiagnosisReview: (id: string) =>
    apiData<{ diagnosis: DiagnosisDetailDto }>(api.get(`/diagnoses/${id}`)),

  diagnosisStats: () =>
    apiData<{
      stats: {
        total: number;
        reviewed: number;
        pending: number;
        scorable: number;
        correct: number;
        accuracy: number | null;
        refusedButReal: number;
        acceptedButNotDroppings: number;
        confirmedNegatives: number;
        labelCounts: Record<string, number>;
      };
    }>(api.get('/diagnoses/stats')),

  /**
   * Commit the ground-truth label. This is the row that trains the next
   * model — see the backend migration on why `not_droppings` and
   * `unclear` are allowed values.
   */
  reviewDiagnosis: (id: string, label: string, notes?: string) =>
    apiData<{ diagnosis: DiagnosisReviewDto }>(
      api.post(`/diagnoses/${id}/review`, { label, ...(notes ? { notes } : {}) }),
    ),

  /**
   * Answer the farmer. Separate from the label on purpose: notes are
   * candid and written for retraining, a reply is written to a customer.
   */
  replyToDiagnosis: (id: string, reply: string) =>
    apiData<{ diagnosis: DiagnosisReviewDto }>(api.post(`/diagnoses/${id}/reply`, { reply })),

  /**
   * The photograph. It lives on a private disk and this authenticated
   * route is the only way to it, so the <img> cannot simply point at a
   * URL — the caller fetches a blob and holds an object URL.
   */
  diagnosisImageBlob: async (id: string, variant: 'original' | 'gradcam' = 'original') => {
    const res = await api.get(`/diagnoses/${id}/image/${variant}`, { responseType: 'blob' });
    return URL.createObjectURL(res.data as Blob);
  },

  serverHealth: () => apiData<{ health: ServerHealthDto }>(api.get('/system/health')),

  listBroadcasts: (params: Record<string, string | number | undefined>) =>
    apiData<{ campaigns: Array<Record<string, unknown>>; meta: Paginated['meta'] }>(
      api.get('/broadcasts', { params }),
    ),
  showBroadcast: (id: string) =>
    apiData<{ campaign: Record<string, unknown>; recentRecipients: Array<Record<string, unknown>> }>(
      api.get(`/broadcasts/${id}`),
    ),
  createBroadcast: (payload: Record<string, unknown>) =>
    apiData<{ campaign: Record<string, unknown> }>(api.post('/broadcasts', payload)),
  // pushReachableCount is null for non-push channels; for push it is how
  // many of those recipients actually have a device that can receive one.
  previewBroadcast: (id: string) =>
    apiData<{ recipientsCount: number; pushReachableCount: number | null }>(
      api.post(`/broadcasts/${id}/preview`),
    ),
  dispatchBroadcast: (id: string) =>
    apiData<{ campaign: Record<string, unknown> }>(api.post(`/broadcasts/${id}/dispatch`)),

  // Cohort
  cohortRetention: (months = 12) =>
    apiData<{
      months: number;
      cohorts: Array<{
        cohortMonth: string;
        signups: number;
        series: Array<{ monthOffset: number; monthLabel: string; active: number; pct: number }>;
      }>;
    }>(api.get('/analytics/cohort-retention', { params: { months } })),

  // 2FA
  twoFactorSetup: () => apiData<{ secret: string; otpauthUri: string }>(api.post('/2fa/setup')),
  twoFactorConfirm: (code: string) =>
    apiData<{ recoveryCodes: string[] }>(api.post('/2fa/confirm', { code })),
  twoFactorDisable: (code: string) => api.post('/2fa/disable', { code }),
  twoFactorRegenerate: (code: string) =>
    apiData<{ recoveryCodes: string[] }>(api.post('/2fa/recovery-codes', { code })),

  // GDPR
  gdprExport: (userId: string) =>
    apiData<{ export: Record<string, unknown> }>(api.get(`/users/${userId}/data-export`)),
  gdprAnonymise: (userId: string, reason: string) =>
    apiData<{ userId: string }>(
      api.post(`/users/${userId}/anonymise`, { confirmation: 'ANONYMISE', reason }),
    ),

  /* ────────────────────── PENKEEP devices ────────────────────── */
  listPenDevices: (params: {
    q?: string;
    status?: string;
    farm_id?: string;
    page?: number;
    per_page?: number;
  }) =>
    apiData<{
      devices: Array<Record<string, unknown>>;
      meta: { total: number; per_page: number; current_page: number; last_page: number };
    }>(api.get('/pen-devices', { params })),

  createPenDevice: (payload: { device_id: string; label?: string; serial_number?: string; firmware_channel?: 'stable' | 'beta' | 'canary' }) =>
    apiData<{ device: Record<string, unknown>; created: boolean }>(api.post('/pen-devices', payload)),

  allocatePenDevice: (id: string, payload: { farm_id: string; cycle_weeks?: number; installation_fee?: number }) =>
    apiData<{ device: Record<string, unknown> }>(api.post(`/pen-devices/${id}/allocate`, payload)),

  deactivatePenDevice: (id: string, reason?: string) =>
    apiData<{ device: Record<string, unknown>; mqtt_published: boolean }>(
      api.post(`/pen-devices/${id}/deactivate`, { reason }),
    ),

  activatePenDevice: (id: string) =>
    apiData<{ device: Record<string, unknown>; mqtt_published: boolean }>(
      api.post(`/pen-devices/${id}/activate`),
    ),

  deletePenDevice: (id: string) =>
    apiData<{ removed: true }>(api.delete(`/pen-devices/${id}`)),

  resendFlockCmd: (id: string) =>
    apiData<{ mqtt_published: boolean }>(api.post(`/pen-devices/${id}/resend-flock-cmd`)),

  /* ────────────────────── API partners ────────────────────── */
  // Outside apps (e.g. EWDSS) using PENKEEP devices with an API key.
  // `plain_key` is returned ONLY by issue/rotate and never again.
  listApiPartners: (params: { q?: string; status?: string; page?: number; per_page?: number }) =>
    apiData<{
      partners: ApiPartnerRow[];
      meta: { total: number; per_page: number; current_page: number; last_page: number };
      scopes: PartnerScopeCatalog;
    }>(api.get('/api-partners', { params })),

  showApiPartner: (id: string) =>
    apiData<{
      partner: ApiPartner;
      keys: ApiPartnerKey[];
      devices: ApiPartnerDevice[];
      activity: ApiPartnerActivity[];
      scopes: PartnerScopeCatalog;
    }>(api.get(`/api-partners/${id}`)),

  createApiPartner: (payload: ApiPartnerInput & { slug: string }) =>
    apiData<{ partner: ApiPartner }>(api.post('/api-partners', payload)),

  updateApiPartner: (id: string, payload: Partial<ApiPartnerInput>) =>
    apiData<{ partner: ApiPartner }>(api.patch(`/api-partners/${id}`, payload)),

  suspendApiPartner: (id: string) =>
    apiData<{ partner: ApiPartner }>(api.post(`/api-partners/${id}/suspend`)),

  activateApiPartner: (id: string) =>
    apiData<{ partner: ApiPartner }>(api.post(`/api-partners/${id}/activate`)),

  issueApiPartnerKey: (id: string, payload: { name: string; expires_in_days?: 30 | 90 | 365; scopes?: string[] }) =>
    apiData<{ key: ApiPartnerKey; plain_key: string }>(api.post(`/api-partners/${id}/keys`, payload)),

  revokeApiPartnerKey: (id: string, keyId: string) =>
    apiData<{ key: ApiPartnerKey }>(api.post(`/api-partners/${id}/keys/${keyId}/revoke`)),

  rotateApiPartnerKey: (id: string, keyId: string) =>
    apiData<{ key: ApiPartnerKey; plain_key: string; old_key: ApiPartnerKey }>(
      api.post(`/api-partners/${id}/keys/${keyId}/rotate`),
    ),

  allocateDeviceToPartner: (id: string, deviceId: string) =>
    apiData<{ device: ApiPartnerDevice }>(api.post(`/api-partners/${id}/devices`, { device_id: deviceId })),

  releaseDeviceFromPartner: (id: string, deviceId: string) =>
    apiData<{ device: ApiPartnerDevice }>(api.delete(`/api-partners/${id}/devices/${deviceId}`)),

  /* ────────────────────── PENKEEP pricing ────────────────────── */
  listPenDevicePricing: () =>
    apiData<{ pricing: Array<{
      id: string;
      country_code: string;
      device_type: string;
      subscription_price: number;
      currency: string;
      cycle_weeks: number;
      is_active: boolean;
      updated_at: string;
    }> }>(api.get('/pen-device-pricing')),

  upsertPenDevicePricing: (payload: {
    country_code: string;
    device_type?: string;
    subscription_price: number;
    currency: string;
    cycle_weeks?: number;
    is_active?: boolean;
  }) => apiData<{ pricing: Record<string, unknown> }>(api.post('/pen-device-pricing', payload)),

  listPenDeviceInstallationFees: (country_code?: string) =>
    apiData<{ fees: Array<{
      id: string;
      country_code: string;
      state_name: string;
      fee: number;
      currency: string;
      is_active: boolean;
    }> }>(api.get('/pen-device-installation-fees', { params: country_code ? { country_code } : undefined })),

  upsertPenDeviceInstallationFee: (payload: {
    country_code: string;
    state_name: string;
    fee: number;
    currency: string;
    is_active?: boolean;
  }) => apiData<{ fee: Record<string, unknown> }>(api.post('/pen-device-installation-fees', payload)),

  deletePenDeviceInstallationFee: (id: string) =>
    apiData<{ removed: true }>(api.delete(`/pen-device-installation-fees/${id}`)),

  /* ────────────────────── PENKEEP firmware (OTA) ────────────────────── */
  listFirmwareReleases: (params?: { channel?: string; device_type?: string }) =>
    apiData<{ releases: FirmwareRelease[] }>(api.get('/firmware', { params })),

  uploadFirmware: (form: FormData) =>
    apiData<{ release: FirmwareRelease }>(
      api.post('/firmware', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    ),

  pushFirmware: (releaseId: string, payload: {
    target: 'device_ids' | 'farm_id' | 'all';
    device_ids?: string[];
    farm_id?: string | null;
  }) =>
    apiData<{
      release_id: string;
      version: string;
      attempted: number;
      pushed: number;
      failed: number;
      results: Array<{ device_id: string; device_serial: string; pushed: boolean }>;
    }>(api.post(`/firmware/${releaseId}/push`, payload)),

  deactivateFirmwareRelease: (releaseId: string) =>
    apiData<{ release: FirmwareRelease }>(api.post(`/firmware/${releaseId}/deactivate`)),

  // ───────────── Email Marketing ─────────────
  listProspects: (params: Record<string, string | number | undefined> = {}) =>
    apiData<{
      prospects: import('@/types/api').EmailProspect[];
      meta: { total: number; perPage: number; currentPage: number; lastPage: number };
    }>(api.get('/email/prospects', { params })),

  uploadProspects: (file: File, source?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    if (source) fd.append('source', source);
    return apiData<{
      upload_batch_id: string;
      summary: {
        inserted: number;
        skipped_duplicates_in_file: number;
        invalid_emails: number;
        total_rows_processed: number;
      };
    }>(api.post('/email/prospects/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },

  deleteProspect: (id: string) =>
    apiData<{ id: string }>(api.delete(`/email/prospects/${id}`)),

  bulkDeleteProspects: (payload: {
    ids?: string[];
    all_matching_filter?: boolean;
    status?: string;
    q?: string;
    upload_batch_id?: string;
    country?: string;
  }) =>
    apiData<{ deleted: number }>(api.post('/email/prospects/bulk-delete', payload)),

  listEmailTemplates: () =>
    apiData<{ templates: import('@/types/api').EmailTemplateSummary[] }>(api.get('/email/templates')),

  getEmailTemplate: (id: string) =>
    apiData<{ template: import('@/types/api').EmailTemplate }>(api.get(`/email/templates/${id}`)),

  createEmailTemplate: (payload: {
    name: string;
    subject: string;
    preheader?: string | null;
    blocks: import('@/types/api').EmailBlock[];
  }) =>
    apiData<{ template: import('@/types/api').EmailTemplate }>(api.post('/email/templates', payload)),

  updateEmailTemplate: (id: string, payload: {
    name?: string;
    subject?: string;
    preheader?: string | null;
    blocks?: import('@/types/api').EmailBlock[];
  }) =>
    apiData<{ template: import('@/types/api').EmailTemplate }>(api.patch(`/email/templates/${id}`, payload)),

  deleteEmailTemplate: (id: string) =>
    apiData<{ id: string }>(api.delete(`/email/templates/${id}`)),

  previewEmailTemplate: (id: string) =>
    apiData<{ html: string; subject: string; preheader: string | null }>(
      api.post(`/email/templates/${id}/preview`),
    ),

  testSendEmailTemplate: (id: string, to: string) =>
    apiData<{ to: string }>(api.post(`/email/templates/${id}/test-send`, { to })),

  listEmailCampaigns: () =>
    apiData<{ campaigns: import('@/types/api').EmailCampaign[] }>(api.get('/email/campaigns')),

  getEmailCampaign: (id: string) =>
    apiData<{ campaign: import('@/types/api').EmailCampaign }>(api.get(`/email/campaigns/${id}`)),

  createEmailCampaign: (payload: EmailCampaignPayload) =>
    apiData<{ campaign: import('@/types/api').EmailCampaign }>(api.post('/email/campaigns', payload)),

  updateEmailCampaign: (
    id: string,
    payload: Partial<EmailCampaignPayload>,
  ) =>
    apiData<{ campaign: import('@/types/api').EmailCampaign }>(api.patch(`/email/campaigns/${id}`, payload)),

  sendEmailCampaign: (id: string) =>
    apiData<{ campaign: import('@/types/api').EmailCampaign }>(api.post(`/email/campaigns/${id}/send`)),

  cancelEmailCampaign: (id: string) =>
    apiData<{ campaign: import('@/types/api').EmailCampaign }>(api.post(`/email/campaigns/${id}/cancel`)),

  deleteEmailCampaign: (id: string) =>
    apiData<{ id: string }>(api.delete(`/email/campaigns/${id}`)),

  listEmailSends: (params: Record<string, string | number | undefined> = {}) =>
    apiData<{
      sends: import('@/types/api').EmailSendRow[];
      meta: { total: number; perPage: number; currentPage: number; lastPage: number };
    }>(api.get('/email/sends', { params })),
};

export type FirmwareRelease = {
  id: string;
  device_type: string;
  version: string;
  channel: string;
  file_path: string;
  file_size: number;
  sha256: string;
  release_notes: string | null;
  is_active: boolean;
  uploaded_by_admin_id: string | null;
  created_at: string;
  updated_at: string;
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

export type AdminNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string | null;
};

export type BreedRow = {
  id: string;
  name: string;
  slug: string;
  production_type: ProductionType;
  breeder_company?: string | null;
  country_of_origin?: string | null;
  description?: string | null;
  typical_market_age_days?: number | null;
  typical_mature_weight_g?: number | null;
  typical_peak_lay_pct?: number | null;
  typical_age_at_first_egg_days?: number | null;
  is_active: boolean;
};

export type HatcheryRow = {
  id: string;
  name: string;
  slug: string;
  country: string;
  region?: string | null;
  city?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  website?: string | null;
  notes?: string | null;
  is_active: boolean;
};

export type ProtocolRow = {
  id: string;
  name: string;
  slug: string;
  country_code: string;
  production_type: ProductionType;
  production_system?: 'inorganic' | 'organic';
  description?: string | null;
  is_active: boolean;
};

/* ────────────────────── API partners ────────────────────── */

export type PartnerScope = 'penkeep.read' | 'penkeep.link' | 'penkeep.control';

export type PartnerScopeCatalog = Record<PartnerScope, { label: string; help: string }>;

export type ApiPartnerInput = {
  name: string;
  description?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  scopes: PartnerScope[];
  rate_limit_per_minute: number;
  ip_allowlist?: string[];
};

export type ApiPartner = {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  description: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  scopes: PartnerScope[];
  rate_limit_per_minute: number;
  ip_allowlist: string[];
  suspended_at: string | null;
  created_at: string | null;
};

export type ApiPartnerRow = ApiPartner & {
  active_keys_count: number;
  devices_count: number;
  last_used_at: string | null;
};

export type ApiPartnerKey = {
  id: string;
  name: string;
  /** e.g. fsk_live_Ab3x…9QzT — the full key is never returned after creation */
  masked: string;
  state: 'active' | 'expired' | 'revoked';
  /** null = inherits all of the partner's scopes */
  scopes: PartnerScope[] | null;
  expires_at: string | null;
  last_used_at: string | null;
  last_used_ip: string | null;
  revoked_at: string | null;
  created_at: string | null;
};

export type ApiPartnerDevice = {
  id: string;
  device_id: string;
  label: string | null;
  status: string;
  online: boolean;
  last_seen_at: string | null;
  partner_target_type: 'storage' | 'farm' | null;
  partner_target_ref: string | null;
  partner_label: string | null;
  partner_linked_at: string | null;
};

export type ApiPartnerActivity = {
  id: string;
  action: string;
  payload: Record<string, unknown> | null;
  admin: { id: string; name: string; email: string } | null;
  created_at: string | null;
};

