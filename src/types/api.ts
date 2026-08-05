/**
 * TypeScript types that mirror the API responses documented in
 * docs/API_ENDPOINTS.md. Add new types here when you wire a new endpoint.
 */

export type Paginated<T = unknown> = {
  rows?: T[];
  meta: {
    currentPage: number;
    perPage: number;
    total: number;
    lastPage: number;
  };
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'support' | 'analyst' | 'read_only' | 'social_media_manager';
  status: 'active' | 'suspended' | 'archived';
  permissions: Record<string, unknown> | null;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type TenantUser = {
  id: number | string;
  name: string;
  email: string;
  phone?: string | number | null;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  photoUrl?: string | null;
  farmsCount?: number;
  ownedFarmsCount?: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type TenantFarm = {
  id: string;
  accountId: string;
  ownerUserId: number | string;
  name: string;
  countryCode: string;
  state: string | null;
  lga: string | null;
  address: string | null;
  timezone: string;
  farmType: string | null;
  primaryProduction: string | null;
  estimatedCapacity: number | null;
  targetMarket: string | null;
  isActive: boolean;
  archivedAt: string | null;
  logoUrl?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  stats?: {
    activeFlocksCount?: number;
    activePensCount?: number;
    currentBirds?: number;
    placedBirdsAllTime?: number;
    staffCount?: number;
  };
};

export type DashboardSnapshot = {
  generatedAt: string;
  totals: {
    users: number;
    verifiedUsers: number;
    accounts: number;
    activeAccounts: number;
    farms: number;
    activeFarms: number;
    activeFlocks: number;
    currentBirds: number;
    placedBirdsAllTime: number;
    staffInvitesOutstanding: number;
  };
  growth: {
    usersThisMonth: number;
    farmsThisMonth: number;
    flocksThisMonth: number;
    dailyRecordsLast30d: number;
  };
  engagement: {
    activeUsersLast30d: number;
    activeFarmsLast30d: number;
  };
  tokens: {
    totalBalancesByType: { tokenType: string | null; tier: string | null; total: number }[];
    tokensIssuedLast30d: number;
    tokensConsumedLast30d: number;
    revenueMonthMinor: number;
    successfulPurchasesMonth: number;
    failedPurchasesMonth: number;
  };
  support: {
    openThreads: number;
    resolvedLast30d: number;
    messagesLast30d: number;
    byStatus: Record<string, number>;
  };
};

export type TrendPoint = { date: string; count: number };
export type TrendBundle = {
  userSignups: TrendPoint[];
  farmCreations: TrendPoint[];
  flockPlacements: TrendPoint[];
  dailyRecords: TrendPoint[];
  mortalityEvents: TrendPoint[];
  tokenPurchases: TrendPoint[];
};

export type TokenBalanceRow = {
  account_id: string;
  account_name?: string | null;
  country_code?: string | null;
  token_type: string;
  tier: string;
  balance: number;
  updated_at?: string | null;
};

export type TokenLedgerRow = {
  id: string;
  account_id: string;
  token_type: string;
  tier: string;
  entry_type: 'credit' | 'debit';
  quantity: number;
  farm_id?: string | null;
  flock_id?: string | null;
  event_id?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type TokenPrice = {
  id: string;
  token_type: 'broiler' | 'layer';
  tier: 'basic' | 'premium';
  unit_price_minor: number;
  currency: string;
  effective_from?: string | null;
  effective_until?: string | null;
  is_active: boolean;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type TokenPurchase = {
  id: string;
  account_id?: string;
  provider: 'paystack' | 'flutterwave' | string;
  status: 'pending' | 'success' | 'failed' | 'abandoned' | string;
  token_type: string;
  tier: string;
  quantity: number;
  amount_minor: number;
  currency: string;
  created_at?: string | null;
  credited_at?: string | null;
};

export type SupportThread = {
  id: string;
  subject: string;
  subjectType: 'user' | 'farm' | 'account' | 'general' | string;
  subjectId: string | null;
  openedBy: { type: 'user' | 'admin'; id: string };
  farmId: string | null;
  assignedAdminUserId: string | null;
  status: 'open' | 'pending_user' | 'pending_admin' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags?: string[] | null;
  lastMessageAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  messagesCount?: number;
};

export type SupportMessage = {
  id: string;
  threadId: string;
  author: { type: 'user' | 'admin'; id: string };
  body: string;
  isInternal: boolean;
  attachments?: Array<Record<string, unknown>> | null;
  readAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

/* ────────────────────── Email Marketing ────────────────────── */

export type ProspectStatus = 'new' | 'contacted' | 'bounced' | 'registered' | 'unsubscribed' | 'invalid';

export type EmailProspect = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  farmName: string | null;
  country: string | null;
  source: string | null;
  uploadBatchId: string | null;
  status: ProspectStatus;
  unsubscribedAt: string | null;
  registeredUserId: number | null;
  registeredAt: string | null;
  createdAt: string | null;
};

export type EmailBlockType =
  | 'heading' | 'paragraph' | 'image' | 'button'
  | 'divider' | 'spacer' | 'columns' | 'html';

export type EmailBlock = {
  id: string;
  type: EmailBlockType;
  props: Record<string, unknown>;
};

export type EmailTemplateSummary = {
  id: string;
  name: string;
  subject: string;
  preheader: string | null;
  blockCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type EmailTemplate = EmailTemplateSummary & {
  blocks: EmailBlock[];
  previewHtml: string | null;
};

export type CampaignStatus =
  | 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed';

export type AudienceFilter = {
  source: 'prospects' | 'users' | 'both';
  batch_ids?: string[];
  countries?: string[];
  statuses?: ProspectStatus[];
  exclude_unsubscribed?: boolean;
  exclude_registered?: boolean;
};

export type EmailCampaign = {
  id: string;
  name: string;
  templateId: string;
  templateName: string | null;
  templateSubject: string | null;
  fromEmail: string | null;
  fromName: string | null;
  replyTo: string | null;
  audienceFilter: AudienceFilter;
  status: CampaignStatus;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  stats: {
    recipients: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
    failed: number;
    openRate: number | null;
    clickRate: number | null;
  };
  createdAt: string | null;
  updatedAt: string | null;
};

export type EmailSendStatus =
  | 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked'
  | 'bounced' | 'complained' | 'failed' | 'unsubscribed';

export type EmailSendRow = {
  id: string;
  campaignId: string | null;
  campaignName: string | null;
  recipientEmail: string;
  recipientName: string | null;
  status: EmailSendStatus;
  sentAt: string | null;
  firstOpenedAt: string | null;
  openCount: number;
  firstClickedAt: string | null;
  clickCount: number;
  bouncedAt: string | null;
  bounceType: string | null;
  errorMessage: string | null;
  unsubscribedAt: string | null;
  createdAt: string | null;
};

export type AuditLogRow = {
  id: string;
  action: string;
  subjectType: string | null;
  subjectId: string | null;
  requestIp: string | null;
  userAgent: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string | null;
  admin?: { id: string; name: string; email: string; role: string } | null;
};
