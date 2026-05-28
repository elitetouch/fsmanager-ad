/**
 * Realistic dummy data for screenshots and offline UI demos.
 *
 * Activated when `NEXT_PUBLIC_DEMO_MODE === '1'`. Every endpoint in
 * api.ts checks this flag and returns a fixture instead of hitting the
 * live API. This file is the ONLY source of fake data; everything
 * else stays production-shaped.
 */

import type {
  AdminUser,
  AuditLogRow,
  DashboardSnapshot,
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
import type { AccountRow, AdminNote, FarmMember, UserMembership } from '@/lib/api';

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

const DAY = 86_400_000;
const today = new Date(2026, 4, 25); // 2026-05-25 (frozen for deterministic screenshots)
const isoDay = (offset = 0) => new Date(today.getTime() - offset * DAY).toISOString();
const dateOnly = (offset = 0) => isoDay(offset).slice(0, 10);

export const demoAdmin: AdminUser = {
  id: '01HXY3PEFAKEPLATFORMOPS01',
  name: 'Ngozi Adamu',
  email: 'ngozi@fsinnovation.net',
  role: 'super_admin',
  status: 'active',
  permissions: null,
  lastLoginAt: isoDay(0),
  lastLoginIp: '102.89.14.7',
  createdAt: isoDay(420),
  updatedAt: isoDay(0),
};

export const demoCapabilities = ['*'];

// ---------------- Dashboard ----------------

export const demoDashboard: DashboardSnapshot = {
  generatedAt: isoDay(0),
  totals: {
    users: 12450,
    verifiedUsers: 10982,
    accounts: 9210,
    activeAccounts: 8703,
    farms: 11500,
    activeFarms: 10412,
    activeFlocks: 18209,
    currentBirds: 4203189,
    placedBirdsAllTime: 12055000,
    staffInvitesOutstanding: 41,
  },
  growth: {
    usersThisMonth: 412,
    farmsThisMonth: 380,
    flocksThisMonth: 610,
    dailyRecordsLast30d: 184500,
  },
  engagement: {
    activeUsersLast30d: 8129,
    activeFarmsLast30d: 7012,
  },
  tokens: {
    totalBalancesByType: [
      { tokenType: 'broiler', tier: 'basic', total: 8500000 },
      { tokenType: 'broiler', tier: 'premium', total: 920000 },
      { tokenType: 'layer', tier: 'basic', total: 6100000 },
      { tokenType: 'layer', tier: 'premium', total: 450000 },
    ],
    tokensIssuedLast30d: 1200000,
    tokensConsumedLast30d: 850000,
    revenueMonthMinor: 25400000,
    successfulPurchasesMonth: 162,
    failedPurchasesMonth: 19,
  },
  support: {
    openThreads: 47,
    resolvedLast30d: 312,
    messagesLast30d: 2104,
    byStatus: {
      open: 23,
      pending_admin: 18,
      pending_user: 6,
      resolved: 312,
      closed: 980,
    },
  },
};

function jitter(seed: number, amp = 1) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return (x - Math.floor(x)) * amp;
}

function trend(base: number, vol: number, length = 30): { date: string; count: number }[] {
  const out: { date: string; count: number }[] = [];
  for (let i = length - 1; i >= 0; i--) {
    const drift = (length - i) * 0.12;
    const noise = jitter(i + base, vol);
    out.push({
      date: dateOnly(i),
      count: Math.max(0, Math.round(base + drift * (base * 0.04) + noise)),
    });
  }
  return out;
}

export const demoTrends: TrendBundle = {
  userSignups: trend(38, 20),
  farmCreations: trend(28, 14),
  flockPlacements: trend(56, 26),
  dailyRecords: trend(5400, 1100),
  mortalityEvents: trend(120, 70),
  tokenPurchases: trend(11, 9),
};

// ---------------- Users ----------------

const FIRST_NAMES = ['Adaeze', 'Tunde', 'Chioma', 'Kwame', 'Amadou', 'Aisha', 'Femi', 'Akosua', 'Ifeanyi', 'Bola', 'Mariam', 'Olusegun', 'Nkechi', 'Yaw', 'Halima', 'Ezekiel', 'Funke', 'Idris', 'Lola', 'Sani'];
const LAST_NAMES = ['Okafor', 'Bello', 'Eze', 'Mensah', 'Diallo', 'Yusuf', 'Adebayo', 'Mensa', 'Okeke', 'Adekunle', 'Diop', 'Otieno', 'Mwangi', 'Asante', 'Bah', 'Salawu', 'Olatunji', 'Ndiaye', 'Adejumo', 'Ibrahim'];

export function demoUsers(): TenantUser[] {
  return Array.from({ length: 18 }).map((_, i) => {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    return {
      id: 1000 + i,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@example.${['ng', 'gh', 'ke', 'za'][i % 4]}`,
      phone: `+234803${String(1000000 + i * 137).slice(0, 7)}`,
      emailVerifiedAt: i % 4 === 0 ? null : isoDay(i + 20),
      phoneVerifiedAt: i % 5 === 0 ? null : isoDay(i + 22),
      photoUrl: null,
      farmsCount: 1 + (i % 4),
      ownedFarmsCount: i % 3 === 0 ? 1 : 0,
      createdAt: isoDay(i * 7 + 5),
      updatedAt: isoDay(i),
    };
  });
}

export const demoUser: TenantUser = demoUsers()[2];

export const demoUserDetail = {
  user: demoUser,
  memberships: [
    {
      farmId: '01HXY3PEFARMABUJA001',
      farmName: 'Adamu Layer Farm — Abuja',
      countryCode: 'NG',
      state: 'FCT',
      role: 'owner',
      status: 'active',
      joinedAt: isoDay(220),
      lastActiveAt: isoDay(1),
    },
    {
      farmId: '01HXY3PEFARMENUGU002',
      farmName: 'Eze Family Broilers — Enugu',
      countryCode: 'NG',
      state: 'Enugu',
      role: 'manager',
      status: 'active',
      joinedAt: isoDay(140),
      lastActiveAt: isoDay(3),
    },
  ] as UserMembership[],
  recentActivity: [
    { id: '01HXY3PERECORDA01', event_type: 'feed', record_date: dateOnly(0), birds_delta: null, birds_snapshot: 4820, quantity: 145, unit: 'kg', note: 'Morning feed' },
    { id: '01HXY3PERECORDA02', event_type: 'mortality', record_date: dateOnly(0), birds_delta: 3, birds_snapshot: 4820, quantity: null, unit: null, note: 'Heat stress suspected' },
    { id: '01HXY3PERECORDA03', event_type: 'eggs', record_date: dateOnly(1), birds_delta: null, birds_snapshot: 4823, quantity: null, unit: null, note: '' },
    { id: '01HXY3PERECORDA04', event_type: 'water', record_date: dateOnly(1), birds_delta: null, birds_snapshot: 4823, quantity: 380, unit: 'liters', note: '' },
    { id: '01HXY3PERECORDA05', event_type: 'vaccination', record_date: dateOnly(2), birds_delta: null, birds_snapshot: 4823, quantity: 1, unit: 'dose', note: 'Newcastle booster' },
  ],
  flags: { isSuspended: false },
};

export const demoUserNotes: AdminNote[] = [
  {
    id: '01HXY3PENOTE001',
    subjectType: 'user',
    subjectId: String(demoUser.id),
    body: 'VIP customer — pilot partner since launch. Call before suspending.',
    pinned: true,
    metadata: null,
    createdAt: isoDay(60),
    updatedAt: isoDay(60),
    author: { id: demoAdmin.id, name: demoAdmin.name },
  },
  {
    id: '01HXY3PENOTE002',
    subjectType: 'user',
    subjectId: String(demoUser.id),
    body: 'Asked for a Paystack refund on 2026-04-12 — issued via dashboard, ledger adjusted +500.',
    pinned: false,
    metadata: null,
    createdAt: isoDay(43),
    updatedAt: isoDay(43),
    author: { id: demoAdmin.id, name: demoAdmin.name },
  },
];

// ---------------- Farms ----------------

const FARM_NAMES = [
  'Adamu Layer Farm — Abuja',
  'Eze Family Broilers — Enugu',
  'GreenPen Kumasi',
  'Diallo Volaille Dakar',
  'Mwangi Layers Naivasha',
  'Bah Poultry Conakry',
  'Asante Hybrid Layers Tema',
  'Otieno Smart Pens Kisumu',
  'Bello Hatchery — Ibadan',
  'Diop Layers Thiès',
  'Mensa Farms — Cape Coast',
  'Yusuf Broiler Co. — Kano',
];

const COUNTRIES = ['NG', 'GH', 'KE', 'SN', 'GH', 'KE', 'GH', 'KE', 'NG', 'SN', 'GH', 'NG'];
const STATES = ['FCT', 'Enugu', 'Ashanti', 'Dakar', 'Nakuru', 'Conakry', 'Greater Accra', 'Kisumu', 'Oyo', 'Thiès', 'Central', 'Kano'];
const TYPES = ['layer', 'broiler', 'mixed', 'breeder'];

export function demoFarms(): TenantFarm[] {
  return FARM_NAMES.map((name, i) => ({
    id: `01HXY3PEFARM${String(i).padStart(3, '0')}DEMO`,
    accountId: `01HXY3PEACCT${String(i).padStart(3, '0')}`,
    ownerUserId: 1000 + i,
    name,
    countryCode: COUNTRIES[i],
    state: STATES[i],
    lga: null,
    address: null,
    timezone: 'Africa/Lagos',
    farmType: TYPES[i % TYPES.length],
    primaryProduction: TYPES[i % TYPES.length],
    estimatedCapacity: 1000 + i * 1500,
    targetMarket: i % 2 === 0 ? 'wholesale' : 'retail',
    isActive: true,
    archivedAt: null,
    logoUrl: null,
    createdAt: isoDay(i * 28 + 11),
    updatedAt: isoDay(i),
    stats: {
      activeFlocksCount: 1 + (i % 5),
      activePensCount: 2 + (i % 7),
      currentBirds: 800 + i * 720,
      placedBirdsAllTime: 3000 + i * 2400,
      staffCount: 2 + (i % 6),
    },
  }));
}

export const demoFarmDetail = (() => {
  const farm = demoFarms()[0];
  return {
    farm,
    members: [
      { id: 1000, name: 'Adaeze Okafor', email: 'adaeze@example.ng', role: 'owner', status: 'active', joined_at: isoDay(180), last_active_at: isoDay(1) },
      { id: 1003, name: 'Tunde Bello', email: 'tunde@example.ng', role: 'manager', status: 'active', joined_at: isoDay(120), last_active_at: isoDay(2) },
      { id: 1011, name: 'Sani Ibrahim', email: 'sani@example.ng', role: 'staff', status: 'active', joined_at: isoDay(60), last_active_at: isoDay(0) },
      { id: 1015, name: 'Mariam Salawu', email: 'mariam@example.ng', role: 'staff', status: 'invited', joined_at: null, last_active_at: null },
    ] as FarmMember[],
    flocks: Array.from({ length: 4 }).map((_, i) => ({
      id: `01HXY3PEFLOCK${i}DEMO`,
      pen_id: `01HXY3PEPEN${i}DEMO`,
      production_type: i % 2 === 0 ? 'layer' : 'broiler',
      placed_birds: 1000 + i * 250,
      current_birds: 980 + i * 245,
      is_active: i !== 3,
      archived_at: i === 3 ? isoDay(10) : null,
      start_date: dateOnly(40 + i * 7),
      created_at: isoDay(40 + i * 7),
    })),
    recordTotals: [
      { eventType: 'feed', count: 412, totalBirdsDelta: 0 },
      { eventType: 'water', count: 380, totalBirdsDelta: 0 },
      { eventType: 'eggs', count: 175, totalBirdsDelta: 0 },
      { eventType: 'mortality', count: 23, totalBirdsDelta: 89 },
      { eventType: 'sale', count: 4, totalBirdsDelta: 320 },
      { eventType: 'vaccination', count: 11, totalBirdsDelta: 0 },
    ],
  };
})();

export const demoFarmNotes: AdminNote[] = [
  {
    id: '01HXY3PEFARMNOTE001',
    subjectType: 'farm',
    subjectId: demoFarmDetail.farm.id,
    body: 'Visited 2026-03 — biosecurity solid; recommended footbath rotation. Owner very engaged.',
    pinned: true,
    metadata: null,
    createdAt: isoDay(70),
    updatedAt: isoDay(70),
    author: { id: demoAdmin.id, name: demoAdmin.name },
  },
];

// ---------------- Accounts ----------------

export function demoAccounts(): AccountRow[] {
  return Array.from({ length: 14 }).map((_, i) => ({
    id: `01HXY3PEACCT${String(i).padStart(3, '0')}`,
    name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]} Agro`,
    ownerUserId: 1000 + i,
    countryCode: COUNTRIES[i % COUNTRIES.length],
    state: STATES[i % STATES.length],
    currency: ['NGN', 'GHS', 'KES', 'XOF'][i % 4],
    businessType: ['sole_proprietor', 'limited_company', 'cooperative'][i % 3],
    industry: 'poultry',
    sizeBand: ['micro', 'small', 'medium'][i % 3],
    isActive: i !== 11,
    archivedAt: i === 11 ? isoDay(20) : null,
    freemiumEnabled: i % 4 === 0,
    farmsCount: 1 + (i % 4),
    createdAt: isoDay(i * 21 + 10),
  }));
}

export const demoAccountDetail = (() => {
  const account = demoAccounts()[0];
  return {
    account,
    tokenBalances: [
      { tokenType: 'broiler', tier: 'basic', balance: 12000 },
      { tokenType: 'broiler', tier: 'premium', balance: 800 },
      { tokenType: 'layer', tier: 'basic', balance: 8000 },
    ],
    recentLedger: Array.from({ length: 12 }).map((_, i) => ({
      id: `01HXY3PELEDG${i}`,
      account_id: account.id,
      token_type: i % 2 === 0 ? 'broiler' : 'layer',
      tier: i % 3 === 0 ? 'premium' : 'basic',
      entry_type: (i % 4 === 0 ? 'credit' : 'debit') as 'credit' | 'debit',
      quantity: 100 + i * 70,
      reason: i % 4 === 0 ? 'token_purchase.success' : 'flock.placement',
      created_at: isoDay(i),
    })) as TokenLedgerRow[],
    recentPurchases: Array.from({ length: 5 }).map((_, i) => ({
      id: `01HXY3PEPURCH${i}`,
      provider: i % 2 === 0 ? 'paystack' : 'flutterwave',
      status: i === 1 ? 'failed' : 'success',
      token_type: 'broiler',
      tier: 'basic',
      quantity: 5000 - i * 500,
      amount_minor: (5000 - i * 500) * 500,
      currency: 'NGN',
      created_at: isoDay(i * 7 + 3),
      credited_at: i === 1 ? null : isoDay(i * 7 + 3),
    })) as TokenPurchase[],
  };
})();

// ---------------- Tokens ----------------

export function demoTokenBalances(): TokenBalanceRow[] {
  return Array.from({ length: 18 }).map((_, i) => ({
    account_id: `01HXY3PEACCT${String(i).padStart(3, '0')}`,
    account_name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]} Agro`,
    country_code: COUNTRIES[i % COUNTRIES.length],
    token_type: i % 2 === 0 ? 'broiler' : 'layer',
    tier: i % 3 === 0 ? 'premium' : 'basic',
    balance: 500 + i * 1800,
    updated_at: isoDay(i % 5),
  }));
}

export function demoTokenLedger(): TokenLedgerRow[] {
  return Array.from({ length: 22 }).map((_, i) => ({
    id: `01HXY3PELEDGER${i.toString().padStart(3, '0')}`,
    account_id: `01HXY3PEACCT${String(i % 14).padStart(3, '0')}`,
    token_type: i % 2 === 0 ? 'broiler' : 'layer',
    tier: i % 3 === 0 ? 'premium' : 'basic',
    entry_type: (i % 5 === 0 ? 'credit' : 'debit') as 'credit' | 'debit',
    quantity: 80 + i * 65,
    reason: ['flock.placement', 'token_purchase.success', 'flock.renewal', 'admin.adjustment'][i % 4],
    created_at: isoDay(i * 0.3),
  }));
}

export const demoTokenPrices: TokenPrice[] = [
  { id: '01HXY3PEPRICE001', token_type: 'broiler', tier: 'basic', unit_price_minor: 12000, currency: 'NGN', effective_from: isoDay(80), is_active: true },
  { id: '01HXY3PEPRICE002', token_type: 'broiler', tier: 'premium', unit_price_minor: 22000, currency: 'NGN', effective_from: isoDay(80), is_active: true },
  { id: '01HXY3PEPRICE003', token_type: 'layer', tier: 'basic', unit_price_minor: 9500, currency: 'NGN', effective_from: isoDay(80), is_active: true },
  { id: '01HXY3PEPRICE004', token_type: 'layer', tier: 'premium', unit_price_minor: 18500, currency: 'NGN', effective_from: isoDay(80), is_active: true },
  { id: '01HXY3PEPRICE005', token_type: 'broiler', tier: 'basic', unit_price_minor: 10500, currency: 'NGN', effective_from: isoDay(180), is_active: false },
];

export function demoTokenPurchases(): TokenPurchase[] {
  return Array.from({ length: 16 }).map((_, i) => ({
    id: `01HXY3PEPUR${i.toString().padStart(3, '0')}`,
    provider: i % 2 === 0 ? 'paystack' : 'flutterwave',
    status: (['success', 'success', 'success', 'pending', 'failed', 'success'][i % 6]) as 'success' | 'pending' | 'failed',
    token_type: i % 2 === 0 ? 'broiler' : 'layer',
    tier: i % 3 === 0 ? 'premium' : 'basic',
    quantity: 2000 + i * 400,
    amount_minor: (2000 + i * 400) * (i % 3 === 0 ? 220 : 120),
    currency: 'NGN',
    created_at: isoDay(i * 2),
    credited_at: i % 6 === 3 || i % 6 === 4 ? null : isoDay(i * 2),
  }));
}

// ---------------- Support ----------------

const THREAD_SUBJECTS = [
  'Mortality spike on Pen 3 — need vet advice',
  'Cannot complete Paystack purchase — error code 422',
  'Vaccination protocol for Lohmann Brown at 10 weeks?',
  'Staff invite to staff@kade.example.gh not delivered',
  'Token balance disappeared after flock renewal',
  'Egg production dropped 18% in 4 days',
  'Request: bulk SMS reminder for vaccination due-dates',
  'Lost access after phone change — please reset 2FA',
  'Want to migrate from broiler to layer mid-cycle',
  'Refund request for 2026-04-12 charge',
];

export function demoThreads(): SupportThread[] {
  const statuses: SupportThread['status'][] = ['open', 'pending_admin', 'pending_user', 'resolved', 'closed'];
  const priorities: SupportThread['priority'][] = ['normal', 'high', 'urgent', 'low', 'normal'];
  return THREAD_SUBJECTS.map((subject, i) => ({
    id: `01HXY3PETHREAD${i.toString().padStart(3, '0')}`,
    subject,
    subjectType: i % 3 === 0 ? 'general' : 'farm',
    subjectId: i % 3 === 0 ? null : `01HXY3PEFARM${String(i).padStart(3, '0')}DEMO`,
    openedBy: { type: 'user', id: String(1000 + i) },
    farmId: i % 3 === 0 ? null : `01HXY3PEFARM${String(i).padStart(3, '0')}DEMO`,
    assignedAdminUserId: i % 3 === 0 ? null : demoAdmin.id,
    status: statuses[i % statuses.length],
    priority: priorities[i % priorities.length],
    tags: null,
    lastMessageAt: isoDay(i * 0.3),
    resolvedAt: statuses[i % statuses.length] === 'resolved' ? isoDay(i * 0.3 - 0.1) : null,
    closedAt: statuses[i % statuses.length] === 'closed' ? isoDay(i * 0.3 - 0.1) : null,
    createdAt: isoDay(i * 1.4 + 1),
    updatedAt: isoDay(i * 0.3),
    messagesCount: 2 + (i % 6),
  }));
}

export const demoThreadDetail = (() => {
  const thread = demoThreads()[0];
  const messages: SupportMessage[] = [
    {
      id: '01HXY3PEMSG001',
      threadId: thread.id,
      author: { type: 'user', id: '1000' },
      body: 'Hi team — we lost 14 birds in Pen 3 over the last 36 hours. Temperatures hit 38°C, ventilation was on. What should we do?',
      isInternal: false,
      attachments: null,
      readAt: isoDay(2),
      createdAt: isoDay(2.1),
      updatedAt: isoDay(2.1),
    },
    {
      id: '01HXY3PEMSG002',
      threadId: thread.id,
      author: { type: 'admin', id: demoAdmin.id },
      body: 'Sorry to hear that. Three quick checks: (1) drinker line pressure, (2) ventilation differential, (3) feed batch consistency. Could you send today\'s daily record so I can see the trend?',
      isInternal: false,
      attachments: null,
      readAt: isoDay(2),
      createdAt: isoDay(2),
      updatedAt: isoDay(2),
    },
    {
      id: '01HXY3PEMSG003',
      threadId: thread.id,
      author: { type: 'admin', id: demoAdmin.id },
      body: 'Internal: pen 3 is on the same shed as pen 4 which also flagged a heat anomaly last week. Likely shared ventilator issue. Flag for field follow-up.',
      isInternal: true,
      attachments: null,
      readAt: null,
      createdAt: isoDay(1.9),
      updatedAt: isoDay(1.9),
    },
    {
      id: '01HXY3PEMSG004',
      threadId: thread.id,
      author: { type: 'user', id: '1000' },
      body: 'Just submitted today\'s record. Mortality is still elevated. We\'ve doubled the water and switched to night feeding.',
      isInternal: false,
      attachments: null,
      readAt: null,
      createdAt: isoDay(1),
      updatedAt: isoDay(1),
    },
  ];
  return { thread: { ...thread, messagesCount: messages.length }, messages };
})();

// ---------------- Segmentation ----------------

export const demoSegByCountry = {
  rows: [
    { countryCode: 'NG', farms: 8412, accounts: 6210, activeFlocks: 15021, currentBirds: 3210004 },
    { countryCode: 'GH', farms: 1102, accounts: 980, activeFlocks: 1809, currentBirds: 480000 },
    { countryCode: 'KE', farms: 612, accounts: 540, activeFlocks: 902, currentBirds: 240500 },
    { countryCode: 'SN', farms: 410, accounts: 380, activeFlocks: 480, currentBirds: 122000 },
    { countryCode: 'ZA', farms: 380, accounts: 320, activeFlocks: 502, currentBirds: 84000 },
    { countryCode: 'CI', farms: 320, accounts: 280, activeFlocks: 410, currentBirds: 71000 },
    { countryCode: 'CM', farms: 264, accounts: 220, activeFlocks: 320, currentBirds: 52000 },
  ],
};

export const demoSegByState = {
  countryCode: 'NG',
  rows: [
    { countryCode: 'NG', state: 'Oyo', farms: 1402, accounts: 1102, activeFlocks: 2210, currentBirds: 540000 },
    { countryCode: 'NG', state: 'Ogun', farms: 980, accounts: 740, activeFlocks: 1640, currentBirds: 410000 },
    { countryCode: 'NG', state: 'Kaduna', farms: 870, accounts: 690, activeFlocks: 1402, currentBirds: 360000 },
    { countryCode: 'NG', state: 'Anambra', farms: 740, accounts: 590, activeFlocks: 1180, currentBirds: 290000 },
    { countryCode: 'NG', state: 'Enugu', farms: 620, accounts: 510, activeFlocks: 940, currentBirds: 235000 },
    { countryCode: 'NG', state: 'FCT', farms: 580, accounts: 490, activeFlocks: 820, currentBirds: 198000 },
  ],
};

export const demoFarmTypeSeg = {
  rows: [
    { bucket: 'broiler', farms: 5402, currentBirds: 2400000, activeFlocks: 8412 },
    { bucket: 'layer', farms: 4012, currentBirds: 1480000, activeFlocks: 6210 },
    { bucket: 'mixed', farms: 1404, currentBirds: 220000, activeFlocks: 2401 },
    { bucket: 'breeder', farms: 682, currentBirds: 103189, activeFlocks: 1186 },
  ],
};

export const demoProductionSeg = {
  rows: [
    { bucket: 'broiler', farms: 5402, currentBirds: 2400000, activeFlocks: 8412 },
    { bucket: 'layer', farms: 4012, currentBirds: 1480000, activeFlocks: 6210 },
    { bucket: 'mixed', farms: 1404, currentBirds: 220000, activeFlocks: 2401 },
  ],
};

export const demoMarketSeg = {
  rows: [
    { bucket: 'wholesale', farms: 6202, currentBirds: 2900000, activeFlocks: 9821 },
    { bucket: 'retail', farms: 3402, currentBirds: 980000, activeFlocks: 5412 },
    { bucket: 'export', farms: 412, currentBirds: 220000, activeFlocks: 612 },
    { bucket: 'home', farms: 1484, currentBirds: 103189, activeFlocks: 2364 },
  ],
};

export const demoFlockProductionSeg = {
  rows: [
    { productionType: 'broiler', flocks: 11210, currentBirds: 2400000, placedBirds: 7200000 },
    { productionType: 'layer', flocks: 6999, currentBirds: 1803189, placedBirds: 4855000 },
  ],
};

export const demoTopSuppliers = {
  breeds: [
    { name: 'Cobb 500', productionType: 'broiler', flocks: 4020, currentBirds: 1480000 },
    { name: 'Lohmann Brown Classic', productionType: 'layer', flocks: 3210, currentBirds: 980000 },
    { name: 'Ross 308', productionType: 'broiler', flocks: 2810, currentBirds: 720000 },
    { name: 'ISA Brown', productionType: 'layer', flocks: 1420, currentBirds: 440000 },
    { name: 'Hy-Line Brown', productionType: 'layer', flocks: 1102, currentBirds: 312000 },
    { name: 'Bovans Brown', productionType: 'layer', flocks: 902, currentBirds: 280000 },
    { name: '(unspecified)', productionType: null, flocks: 740, currentBirds: 122000 },
  ],
  hatcheries: [
    { name: 'CHI Farms', country: 'NG', flocks: 1820, placedBirds: 5400000 },
    { name: 'Darko Farms', country: 'GH', flocks: 902, placedBirds: 2400000 },
    { name: 'Kuipers Breeders', country: 'GH', flocks: 612, placedBirds: 1800000 },
    { name: 'Kenchic', country: 'KE', flocks: 480, placedBirds: 1240000 },
    { name: 'Sayed Farms', country: 'NG', flocks: 412, placedBirds: 980000 },
    { name: 'Senegindia', country: 'SN', flocks: 220, placedBirds: 540000 },
    { name: '(unspecified)', country: null, flocks: 184, placedBirds: 280000 },
  ],
};

export const demoMortalityByCountry = {
  days: 30,
  rows: [
    { countryCode: 'NG', mortality: 8210, sales: 14200, birdCountReductions: 612 },
    { countryCode: 'GH', mortality: 1240, sales: 2402, birdCountReductions: 91 },
    { countryCode: 'KE', mortality: 802, sales: 1410, birdCountReductions: 58 },
    { countryCode: 'SN', mortality: 482, sales: 920, birdCountReductions: 41 },
    { countryCode: 'ZA', mortality: 391, sales: 612, birdCountReductions: 22 },
    { countryCode: 'CI', mortality: 312, sales: 502, birdCountReductions: 18 },
    { countryCode: 'CM', mortality: 240, sales: 410, birdCountReductions: 12 },
  ],
};

// ---------------- Audit ----------------

const AUDIT_ACTIONS = [
  'auth.login',
  'tokens.adjust',
  'users.suspend',
  'support.thread.assign',
  'farms.archive',
  'support.thread.status',
  'tokens.price.create',
  'users.verify_email',
  'auth.logout',
  'admin_users.create',
];

export function demoAuditLogs(): AuditLogRow[] {
  return AUDIT_ACTIONS.flatMap((action, ai) =>
    Array.from({ length: 2 }).map((_, i) => {
      const at = ai * 0.7 + i * 0.4;
      return {
        id: `01HXY3PEAUDIT${ai}${i}`,
        action,
        subjectType: action.startsWith('users') ? 'user' : action.startsWith('farms') ? 'farm' : action.startsWith('tokens.adjust') ? 'token_ledger' : action.startsWith('tokens.price') ? 'token_price' : action.startsWith('support') ? 'support_thread' : action.startsWith('admin_users') ? 'admin_user' : null,
        subjectId: `01HXY3PESUBJ${ai}${i}`,
        requestIp: '102.89.14.7',
        userAgent: 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120',
        payload: {
          reason: 'Sample audit entry',
          actor: 'ngozi@fsinnovation.net',
        },
        createdAt: isoDay(at),
        admin: { id: demoAdmin.id, name: demoAdmin.name, email: demoAdmin.email, role: demoAdmin.role },
      };
    }),
  );
}

// ---------------- Generic paginated wrapper ----------------

export function page<T>(items: T[], page = 1, perPage = 25) {
  const start = (page - 1) * perPage;
  return {
    rows: items.slice(start, start + perPage),
    meta: {
      currentPage: page,
      perPage,
      total: items.length,
      lastPage: Math.max(1, Math.ceil(items.length / perPage)),
    },
  };
}
