import Dexie from 'dexie';
import type { Table } from 'dexie';
import type {
  User,
  Group,
  GroupMember,
  Transaction,
  TurfState,
  MessState,
  TourState,
} from '../types';

export class HisabSplitDatabase extends Dexie {
  users!: Table<User, string>;
  groups!: Table<Group, string>;
  group_members!: Table<GroupMember, [string, string]>;
  transactions!: Table<Transaction, string>;
  turf_state!: Table<TurfState & { id: string }, string>;
  mess_state!: Table<MessState & { id: string }, string>;
  tour_state!: Table<TourState & { id: string }, string>;

  constructor() {
    super('HisabSplitDB');
    this.version(1).stores({
      users: 'id, phone, name, registration_date',
      groups: 'id, name, type, creator_id',
      group_members: '[group_id+user_id], group_id, user_id, status',
      transactions: 'id, group_id, amount, type, created_by',
      turf_state: 'id',
      mess_state: 'id',
      tour_state: 'id',
    });
  }
}

export const db = new HisabSplitDatabase();

// Default seed data tailored for Bangladeshi context
export const SEED_USERS: User[] = [
  { id: 'u1', name: 'Siam Ahmed', phone: '01711223344', registration_date: '2026-01-10' },
  { id: 'u2', name: 'Rafi Hasan', phone: '01822334455', registration_date: '2026-01-15' },
  { id: 'u3', name: 'Tanvir Hossain', phone: '01933445566', registration_date: '2026-02-01' },
  { id: 'u4', name: 'Fahim Shakil', phone: '01644556677', registration_date: '2026-02-10' },
  { id: 'u5', name: 'Abrar Khan', phone: '01555667788', registration_date: '2026-02-20' },
  { id: 'u6', name: 'Zubair Al Mahmud', phone: '01766778899', registration_date: '2026-03-01' },
  { id: 'u7', name: 'Nayeem Islam', phone: '01877889900', registration_date: '2026-03-05' },
  { id: 'u8', name: 'Shahriar Kabir', phone: '01988990011', registration_date: '2026-03-12' },
];

export const SEED_GROUPS: Group[] = [
  {
    id: 'g-turf-1',
    name: 'Bashundhara Kings Turf (Friday 8 PM)',
    type: 'turf',
    creator_id: 'u1',
    created_at: '2026-09-20',
    description: 'Weekly 7v7 friendly football match under floodlights',
  },
  {
    id: 'g-mess-1',
    name: 'Dhanmondi 27 Bachelor Mess',
    type: 'mess',
    creator_id: 'u2',
    created_at: '2026-09-01',
    description: 'Monthly mess accounting, daily bazar & shared utilities',
  },
  {
    id: 'g-tour-1',
    name: 'Sajek Valley & Bandarban Tour 2026',
    type: 'tour',
    creator_id: 'u3',
    created_at: '2026-09-15',
    description: '4-day mountain getaway: Chander Gari, resort & bamboo chicken',
  },
];

export const SEED_GROUP_MEMBERS: GroupMember[] = [
  // Turf Members
  { group_id: 'g-turf-1', user_id: 'u1', status: 'active' },
  { group_id: 'g-turf-1', user_id: 'u2', status: 'active' },
  { group_id: 'g-turf-1', user_id: 'u3', status: 'active' },
  { group_id: 'g-turf-1', user_id: 'u4', status: 'active' },
  { group_id: 'g-turf-1', user_id: 'u5', status: 'active' },
  { group_id: 'g-turf-1', user_id: 'u6', status: 'active' },
  { group_id: 'g-turf-1', user_id: 'u7', status: 'active' },
  { group_id: 'g-turf-1', user_id: 'u8', status: 'active' },

  // Mess Members
  { group_id: 'g-mess-1', user_id: 'u1', status: 'active' },
  { group_id: 'g-mess-1', user_id: 'u2', status: 'active' },
  { group_id: 'g-mess-1', user_id: 'u3', status: 'active' },
  { group_id: 'g-mess-1', user_id: 'u4', status: 'active' },

  // Tour Members
  { group_id: 'g-tour-1', user_id: 'u1', status: 'active' },
  { group_id: 'g-tour-1', user_id: 'u2', status: 'active' },
  { group_id: 'g-tour-1', user_id: 'u3', status: 'active' },
  { group_id: 'g-tour-1', user_id: 'u4', status: 'active' },
  { group_id: 'g-tour-1', user_id: 'u5', status: 'active' },
];

export const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    group_id: 'g-turf-1',
    amount: 3200,
    description: 'Turf Ground Booking Slot (2 Hours @ 1600 BDT/hr)',
    type: 'turf_booking',
    created_by: 'u1',
    split_data: {
      splitType: 'equal_active',
      active_players: 8,
      share_per_head: 400,
    },
    created_at: '2026-09-25T14:30:00Z',
  },
  {
    id: 'tx-2',
    group_id: 'g-mess-1',
    amount: 5850,
    description: 'Weekly Kawran Bazar (Beef, Rui Fish, Rice & Mustard Oil)',
    type: 'market_cost',
    created_by: 'u2',
    split_data: {
      meal_rate: 65,
      total_meals: 90,
    },
    created_at: '2026-09-22T08:15:00Z',
  },
  {
    id: 'tx-3',
    group_id: 'g-tour-1',
    amount: 9000,
    description: 'Chander Gari (Reserved 4WD Jeep) Khagrachari to Sajek',
    type: 'transport_expense',
    created_by: 'u3',
    split_data: {
      category: 'Transport',
      splitBetween: ['u1', 'u2', 'u3', 'u4', 'u5'],
      sharePerPerson: 1800,
    },
    created_at: '2026-09-18T11:00:00Z',
  },
];

export const INITIAL_TURF_STATE: TurfState & { id: string } = {
  id: 'current-turf',
  venueName: 'Bashundhara Kings Turf Arena',
  matchDate: 'Friday 8:00 PM',
  hourlyRate: 1600,
  durationHours: 2,
  totalTurfBill: 3200,
  players: [
    { id: 'u1', name: 'Siam Ahmed', phone: '01711223344', isPlaying: true, hasPaid: true },
    { id: 'u2', name: 'Rafi Hasan', phone: '01822334455', isPlaying: true, hasPaid: true },
    { id: 'u3', name: 'Tanvir Hossain', phone: '01933445566', isPlaying: true, hasPaid: false },
    { id: 'u4', name: 'Fahim Shakil', phone: '01644556677', isPlaying: true, hasPaid: false },
    { id: 'u5', name: 'Abrar Khan', phone: '01555667788', isPlaying: true, hasPaid: false },
    { id: 'u6', name: 'Zubair Mahmud', phone: '01766778899', isPlaying: true, hasPaid: false },
    { id: 'u7', name: 'Nayeem Islam', phone: '01877889900', isPlaying: true, hasPaid: false },
    { id: 'u8', name: 'Shahriar Kabir', phone: '01988990011', isPlaying: true, hasPaid: false },
  ],
};

export const INITIAL_MESS_STATE: MessState & { id: string } = {
  id: 'current-mess',
  messName: 'Dhanmondi 27 Bachelor Flat',
  month: 'September 2026',
  totalMarketCost: 15600,
  totalMeals: 240,
  fixedCosts: {
    houseRent: 24000,
    internetBill: 1200,
    maidBill: 3000,
    gasElectricity: 2800,
    others: 1000,
  },
  memberMeals: [
    { memberId: 'u1', name: 'Siam Ahmed', phone: '01711223344', mealsCount: 65, fixedCostShare: 8000, depositAmount: 13000, balance: 0 },
    { memberId: 'u2', name: 'Rafi Hasan', phone: '01822334455', mealsCount: 58, fixedCostShare: 8000, depositAmount: 10500, balance: 0 },
    { memberId: 'u3', name: 'Tanvir Hossain', phone: '01933445566', mealsCount: 70, fixedCostShare: 8000, depositAmount: 14000, balance: 0 },
    { memberId: 'u4', name: 'Fahim Shakil', phone: '01644556677', mealsCount: 47, fixedCostShare: 8000, depositAmount: 9000, balance: 0 },
  ],
};

export const INITIAL_TOUR_STATE: TourState & { id: string } = {
  id: 'current-tour',
  tripName: 'Sajek Valley Monsoon Tour',
  location: 'Sajek Valley, Rangamati',
  members: [
    { id: 'u1', name: 'Siam Ahmed', phone: '01711223344' },
    { id: 'u2', name: 'Rafi Hasan', phone: '01822334455' },
    { id: 'u3', name: 'Tanvir Hossain', phone: '01933445566' },
    { id: 'u4', name: 'Fahim Shakil', phone: '01644556677' },
    { id: 'u5', name: 'Abrar Khan', phone: '01555667788' },
  ],
  tripExpenses: [
    {
      expenseId: 'exp-1',
      category: 'Transport',
      amount: 9500,
      paidByMemberId: 'u3', // Tanvir paid
      splitBetweenIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
      description: 'Chander Gari (Khagrachari ⇄ Sajek) 2 Days',
      date: '2026-09-18',
    },
    {
      expenseId: 'exp-2',
      category: 'Hotel',
      amount: 14000,
      paidByMemberId: 'u1', // Siam paid
      splitBetweenIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
      description: 'Meghpunji Resort 2 Cottages (2 Nights)',
      date: '2026-09-18',
    },
    {
      expenseId: 'exp-3',
      category: 'Food',
      amount: 4500,
      paidByMemberId: 'u2', // Rafi paid
      splitBetweenIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
      description: 'Traditional Bamboo Chicken & Dinner at Maruti',
      date: '2026-09-19',
    },
    {
      expenseId: 'exp-4',
      category: 'Others',
      amount: 1200,
      paidByMemberId: 'u4', // Fahim paid
      splitBetweenIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
      description: 'Helipad Entry Tickets & Tribal Fruit snacks',
      date: '2026-09-19',
    },
  ],
};

export async function initializeDatabase(): Promise<void> {
  const usersCount = await db.users.count();
  if (usersCount === 0) {
    await db.users.bulkAdd(SEED_USERS);
    await db.groups.bulkAdd(SEED_GROUPS);
    await db.group_members.bulkAdd(SEED_GROUP_MEMBERS);
    await db.transactions.bulkAdd(SEED_TRANSACTIONS);
    await db.turf_state.put(INITIAL_TURF_STATE);
    await db.mess_state.put(INITIAL_MESS_STATE);
    await db.tour_state.put(INITIAL_TOUR_STATE);
  }
}

export async function resetDatabaseToDefault(): Promise<void> {
  await db.users.clear();
  await db.groups.clear();
  await db.group_members.clear();
  await db.transactions.clear();
  await db.turf_state.clear();
  await db.mess_state.clear();
  await db.tour_state.clear();

  await db.users.bulkAdd(SEED_USERS);
  await db.groups.bulkAdd(SEED_GROUPS);
  await db.group_members.bulkAdd(SEED_GROUP_MEMBERS);
  await db.transactions.bulkAdd(SEED_TRANSACTIONS);
  await db.turf_state.put(INITIAL_TURF_STATE);
  await db.mess_state.put(INITIAL_MESS_STATE);
  await db.tour_state.put(INITIAL_TOUR_STATE);
}

export async function exportDatabaseToJson(): Promise<string> {
  const data = {
    exportDate: new Date().toISOString(),
    version: 1,
    users: await db.users.toArray(),
    groups: await db.groups.toArray(),
    group_members: await db.group_members.toArray(),
    transactions: await db.transactions.toArray(),
    turf_state: await db.turf_state.toArray(),
    mess_state: await db.mess_state.toArray(),
    tour_state: await db.tour_state.toArray(),
  };
  return JSON.stringify(data, null, 2);
}

export async function importDatabaseFromJson(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.users || !data.groups) {
      throw new Error('Invalid HisabSplit backup format');
    }

    await db.transaction(
      'rw',
      [
        db.users,
        db.groups,
        db.group_members,
        db.transactions,
        db.turf_state,
        db.mess_state,
        db.tour_state,
      ],
      async () => {
        await db.users.clear();
        await db.groups.clear();
        await db.group_members.clear();
        await db.transactions.clear();
        await db.turf_state.clear();
        await db.mess_state.clear();
        await db.tour_state.clear();

        if (data.users?.length) await db.users.bulkAdd(data.users);
        if (data.groups?.length) await db.groups.bulkAdd(data.groups);
        if (data.group_members?.length) await db.group_members.bulkAdd(data.group_members);
        if (data.transactions?.length) await db.transactions.bulkAdd(data.transactions);
        if (data.turf_state?.length) await db.turf_state.bulkAdd(data.turf_state);
        if (data.mess_state?.length) await db.mess_state.bulkAdd(data.mess_state);
        if (data.tour_state?.length) await db.tour_state.bulkAdd(data.tour_state);
      }
    );
    return true;
  } catch (err) {
    console.error('Import failed:', err);
    return false;
  }
}
