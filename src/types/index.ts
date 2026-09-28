// Database Schema Types mapping directly to relational concepts
export interface User {
  id: string;
  phone: string;
  name: string;
  registration_date: string;
}

export type GroupType = 'turf' | 'mess' | 'tour';

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  creator_id: string;
  created_at?: string;
  description?: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  status: 'active' | 'pending';
}

export interface Transaction {
  id: string;
  group_id: string;
  amount: number;
  description: string;
  type: string;
  created_by: string;
  split_data: Record<string, any>; // JSON matrix representation
  created_at?: string;
}

// MODULE A: Turf Match Splitter Types
export interface TurfPlayer {
  id: string;
  name: string;
  phone?: string;
  isPlaying: boolean;
  hasPaid: boolean;
  avatar?: string;
}

export interface TurfState {
  totalTurfBill: number;
  players: TurfPlayer[];
  venueName?: string;
  matchDate?: string;
  hourlyRate?: number;
  durationHours?: number;
  notes?: string;
}

export interface TurfSplitResult {
  totalTurfBill: number;
  activePlayersCount: number;
  totalPlayersCount: number;
  perPlayerAmount: number;
  totalCollected: number;
  totalPending: number;
  paidCount: number;
  unpaidCount: number;
}

// MODULE B: Mess & Sublet Tracker Types
export interface MemberMeal {
  memberId: string;
  name: string;
  phone?: string;
  mealsCount: number;
  fixedCostShare: number;
  depositAmount: number; // Advance paid towards mess/market
  balance: number; // Positive = Surplus, Negative = Due
}

export interface FixedCostsBreakdown {
  houseRent: number;
  internetBill: number;
  maidBill: number;
  gasElectricity: number;
  others: number;
}

export interface MessState {
  messName: string;
  month: string;
  totalMarketCost: number;
  totalMeals: number;
  memberMeals: MemberMeal[];
  fixedCosts: FixedCostsBreakdown;
}

export interface MessCalculationResult {
  totalMarketCost: number;
  totalMeals: number;
  mealRate: number;
  totalFixedCost: number;
  fixedCostPerHead: number;
  totalExpenses: number;
  totalDeposits: number;
  memberCalculations: {
    memberId: string;
    name: string;
    phone?: string;
    mealsCount: number;
    mealCost: number;
    fixedCostShare: number;
    depositAmount: number;
    individualBill: number;
    balance: number; // deposit - individualBill
    status: 'surplus' | 'due' | 'settled';
  }[];
}

// MODULE C: Group Tour Splitter Types
export type TourExpenseCategory = 'Food' | 'Transport' | 'Hotel' | 'Others';

export interface TripExpense {
  expenseId: string;
  category: TourExpenseCategory;
  amount: number;
  paidByMemberId: string;
  splitBetweenIds: string[];
  description: string;
  date?: string;
}

export interface TourMember {
  id: string;
  name: string;
  phone?: string;
}

export interface TourSettlement {
  id: string;
  fromMemberId: string;
  fromName: string;
  fromPhone?: string;
  toMemberId: string;
  toName: string;
  toPhone?: string;
  amount: number;
  formattedText: string;
}

export interface TourState {
  tripName: string;
  location: string;
  members: TourMember[];
  tripExpenses: TripExpense[];
}

export interface TourCalculationResult {
  totalTripCost: number;
  categoryTotals: Record<TourExpenseCategory, number>;
  memberSpending: Record<string, number>; // How much each person paid out of pocket
  memberConsumption: Record<string, number>; // How much each person actually owes based on split
  netBalances: Record<string, number>; // positive = creditor (receives), negative = debtor (pays)
  settlements: TourSettlement[];
}

// MFS Common Utility Types
export type MFSPlatform = 'bKash' | 'Nagad' | 'Rocket' | 'Upay';

export interface MFSRequestPayload {
  managerNumber: string;
  amount: number;
  reason: string;
  platform: MFSPlatform;
  recipientName?: string;
  recipientPhone?: string;
}

export interface MFSRequestResult {
  message: string;
  whatsappUrl: string;
  smsUrl: string;
  messengerUrl: string;
  isNativeShareAvailable: boolean;
}
