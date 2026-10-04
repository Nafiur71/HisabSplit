import type {
  MemberMeal,
  FixedCostsBreakdown,
  MessCalculationResult,
  MessState,
  MessRole,
  DailyMealRecord,
  BazarExpenseRecord,
  ShoppingWishlistItem,
  DepositRecord,
} from '../types';

/**
 * MODULE B: Mess & Sublet Tracker Pure Controller
 * 
 * Implements Bangladeshi Mess Accounting:
 * 1. mealRate = totalMarketCost / totalMeals
 * 2. individualBill = (mealsCount * mealRate) + fixedCostShare
 * 3. balance = depositAmount - individualBill
 *    Negative Balance = Member owes money (Due)
 *    Positive Balance = Member has credit remaining (Surplus)
 * 4. Mess Cash Fund = Total Deposits - (Total Market Cost + Total Paid Fixed Costs)
 */

export function calculateMealRate(
  totalMarketCost: number,
  totalMeals: number
): number {
  const safeCost = Math.max(0, Number(totalMarketCost) || 0);
  const safeMeals = Math.max(0, Number(totalMeals) || 0);

  if (safeMeals <= 0) return 0;
  return parseFloat((safeCost / safeMeals).toFixed(2));
}

/**
 * Pure calculation for all mess members
 * Computes mealRate = totalMarketCost / totalMeals,
 * individualBill = (mealsCount * mealRate) + fixedCostShare,
 * balance = depositAmount - individualBill,
 * and cashInHand = totalDeposits - totalExpenses.
 */
export function calculateMessCalculations(
  totalMarketCost: number,
  totalMeals: number,
  memberMeals: MemberMeal[],
  fixedCosts: FixedCostsBreakdown
): MessCalculationResult {
  const safeMarketCost = Math.max(0, Number(totalMarketCost) || 0);

  // If totalMeals is provided (>0), use it; otherwise compute dynamically from memberMeals
  const dynamicSum = memberMeals.reduce(
    (sum, m) => sum + (Math.max(0, Number(m.mealsCount)) || 0),
    0
  );
  const safeMeals = totalMeals > 0 ? totalMeals : dynamicSum;

  const mealRate = calculateMealRate(safeMarketCost, safeMeals);

  // Sum total fixed costs
  const totalFixedCost =
    (Math.max(0, Number(fixedCosts.houseRent)) || 0) +
    (Math.max(0, Number(fixedCosts.internetBill)) || 0) +
    (Math.max(0, Number(fixedCosts.maidBill)) || 0) +
    (Math.max(0, Number(fixedCosts.gasElectricity)) || 0) +
    (Math.max(0, Number(fixedCosts.others)) || 0);

  const memberCount = memberMeals.length;
  const fixedCostPerHead =
    memberCount > 0 ? Math.round(totalFixedCost / memberCount) : 0;

  let totalDeposits = 0;
  const totalExpenses = safeMarketCost + totalFixedCost;

  const memberCalculations = memberMeals.map((member) => {
    const mealsCount = Math.max(0, Number(member.mealsCount) || 0);
    const depositAmount = Math.max(0, Number(member.depositAmount) || 0);
    const fixedShare = Math.max(0, Number(member.fixedCostShare) || 0);

    totalDeposits += depositAmount;

    // individualBill = (mealsCount * mealRate) + fixedCostShare
    const mealCost = parseFloat((mealsCount * mealRate).toFixed(2));
    const individualBill = Math.round(mealCost + fixedShare);

    // balance = depositAmount - individualBill
    const balance = depositAmount - individualBill;

    let status: 'surplus' | 'due' | 'settled' = 'settled';
    if (balance < 0) status = 'due';
    else if (balance > 0) status = 'surplus';

    return {
      memberId: member.memberId,
      name: member.name,
      phone: member.phone,
      role: member.role || 'member',
      mealsCount,
      mealCost,
      fixedCostShare: fixedShare,
      depositAmount,
      individualBill,
      balance,
      status,
    };
  });

  const cashInHand = totalDeposits - totalExpenses;

  return {
    totalMarketCost: safeMarketCost,
    totalMeals: safeMeals,
    mealRate,
    totalFixedCost,
    fixedCostPerHead,
    totalExpenses,
    totalDeposits,
    cashInHand,
    memberCalculations,
  };
}

/**
 * Synchronize comprehensive Mess state:
 * - If bazarExpenses exist, compute totalMarketCost from them.
 * - If deposits exist, compute depositAmount per member from them.
 * - If dailyMeals exist, compute mealsCount per member from them.
 */
export function synchronizeMessState(state: MessState): {
  syncedMemberMeals: MemberMeal[];
  syncedMarketCost: number;
  syncedTotalMeals: number;
  calculations: MessCalculationResult;
} {
  // 1. Calculate synced market cost from bazarExpenses (if any)
  const bazarTotal = state.bazarExpenses && state.bazarExpenses.length > 0
    ? state.bazarExpenses.reduce((sum, b) => sum + (Math.max(0, Number(b.amount)) || 0), 0)
    : state.totalMarketCost;

  // 2. Map meal counts from dailyMeals if available
  const mealsByMember: Record<string, number> = {};
  if (state.dailyMeals && state.dailyMeals.length > 0) {
    for (const record of state.dailyMeals) {
      if (!record.isOff) {
        const count = Math.max(0, Number(record.total) || 0);
        mealsByMember[record.memberId] = (mealsByMember[record.memberId] || 0) + count;
      }
    }
  }

  // 3. Map deposits from deposits list if available
  const depositsByMember: Record<string, number> = {};
  if (state.deposits && state.deposits.length > 0) {
    for (const d of state.deposits) {
      const amt = Math.max(0, Number(d.amount)) || 0;
      depositsByMember[d.memberId] = (depositsByMember[d.memberId] || 0) + amt;
    }
  }

  // 4. Update memberMeals array
  const hasDailyMeals = state.dailyMeals && state.dailyMeals.length > 0;
  const hasDeposits = state.deposits && state.deposits.length > 0;

  const syncedMemberMeals = state.memberMeals.map((m) => {
    const updatedMeals = hasDailyMeals ? (mealsByMember[m.memberId] ?? m.mealsCount) : m.mealsCount;
    const updatedDeposit = hasDeposits ? (depositsByMember[m.memberId] ?? m.depositAmount) : m.depositAmount;
    return {
      ...m,
      mealsCount: updatedMeals,
      depositAmount: updatedDeposit,
    };
  });

  const dynamicMealsSum = syncedMemberMeals.reduce((sum, m) => sum + m.mealsCount, 0);
  const syncedTotalMeals = hasDailyMeals ? dynamicMealsSum : (state.totalMeals || dynamicMealsSum);

  const calculations = calculateMessCalculations(
    bazarTotal,
    syncedTotalMeals,
    syncedMemberMeals,
    state.fixedCosts
  );

  return {
    syncedMemberMeals,
    syncedMarketCost: bazarTotal,
    syncedTotalMeals,
    calculations,
  };
}

/**
 * One-Click UX Action: Split Fixed Costs Equally among all members
 */
export function splitFixedCostsEquallyAction(
  memberMeals: MemberMeal[],
  fixedCosts: FixedCostsBreakdown
): MemberMeal[] {
  if (memberMeals.length === 0) return memberMeals;

  const totalFixedCost =
    (Math.max(0, Number(fixedCosts.houseRent)) || 0) +
    (Math.max(0, Number(fixedCosts.internetBill)) || 0) +
    (Math.max(0, Number(fixedCosts.maidBill)) || 0) +
    (Math.max(0, Number(fixedCosts.gasElectricity)) || 0) +
    (Math.max(0, Number(fixedCosts.others)) || 0);

  const perMemberShare = Math.round(totalFixedCost / memberMeals.length);

  return memberMeals.map((member) => ({
    ...member,
    fixedCostShare: perMemberShare,
  }));
}

/**
 * Update a specific member's meal count directly
 */
export function updateMemberMealsCountAction(
  memberMeals: MemberMeal[],
  memberId: string,
  mealsCount: number
): MemberMeal[] {
  const safeCount = Math.max(0, Number(mealsCount) || 0);
  return memberMeals.map((m) =>
    m.memberId === memberId ? { ...m, mealsCount: safeCount } : m
  );
}

/**
 * Update a specific member's deposit amount
 */
export function updateMemberDepositAction(
  memberMeals: MemberMeal[],
  memberId: string,
  depositAmount: number
): MemberMeal[] {
  const safeDeposit = Math.max(0, Number(depositAmount) || 0);
  return memberMeals.map((m) =>
    m.memberId === memberId ? { ...m, depositAmount: safeDeposit } : m
  );
}

/**
 * Update a specific member's custom fixed cost share
 */
export function updateMemberFixedShareAction(
  memberMeals: MemberMeal[],
  memberId: string,
  fixedCostShare: number
): MemberMeal[] {
  const safeFixed = Math.max(0, Number(fixedCostShare) || 0);
  return memberMeals.map((m) =>
    m.memberId === memberId ? { ...m, fixedCostShare: safeFixed } : m
  );
}

/**
 * Add a new member to the mess
 */
export function addMessMemberAction(
  memberMeals: MemberMeal[],
  name: string,
  phone?: string,
  defaultFixedShare = 0,
  role: MessRole = 'member',
  roomNo = ''
): MemberMeal[] {
  const trimmed = name.trim();
  if (!trimmed) return memberMeals;

  const newMember: MemberMeal = {
    memberId: `mm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: trimmed,
    phone: phone?.trim() || '',
    role,
    roomNo: roomNo.trim(),
    mealsCount: 0,
    fixedCostShare: defaultFixedShare,
    depositAmount: 0,
    balance: 0,
  };

  return [...memberMeals, newMember];
}

/**
 * Remove a member from the mess
 */
export function removeMessMemberAction(
  memberMeals: MemberMeal[],
  memberId: string
): MemberMeal[] {
  return memberMeals.filter((m) => m.memberId !== memberId);
}

/**
 * Update or insert a Daily Meal entry for a specific date and member
 */
export function upsertDailyMealRecordAction(
  records: DailyMealRecord[],
  date: string,
  memberId: string,
  breakfast: number,
  lunch: number,
  dinner: number,
  isOff = false,
  note = ''
): DailyMealRecord[] {
  const safeB = Math.max(0, Number(breakfast) || 0);
  const safeL = Math.max(0, Number(lunch) || 0);
  const safeD = Math.max(0, Number(dinner) || 0);
  const total = isOff ? 0 : parseFloat((safeB + safeL + safeD).toFixed(1));

  const existingIndex = records.findIndex(
    (r) => r.date === date && r.memberId === memberId
  );

  const updatedRecord: DailyMealRecord = {
    date,
    memberId,
    breakfast: safeB,
    lunch: safeL,
    dinner: safeD,
    total,
    isOff,
    note: note.trim(),
  };

  if (existingIndex >= 0) {
    const updated = [...records];
    updated[existingIndex] = updatedRecord;
    return updated;
  }
  return [...records, updatedRecord];
}

/**
 * Toggle Advance Meal Off for a member on a specific date
 */
export function toggleAdvanceMealOffAction(
  records: DailyMealRecord[],
  date: string,
  memberId: string,
  defaultLunch = 1,
  defaultDinner = 1
): DailyMealRecord[] {
  const existing = records.find(
    (r) => r.date === date && r.memberId === memberId
  );

  if (existing) {
    const toggledOff = !existing.isOff;
    const total = toggledOff ? 0 : (existing.breakfast + existing.lunch + existing.dinner);
    return records.map((r) =>
      r.date === date && r.memberId === memberId
        ? { ...r, isOff: toggledOff, total }
        : r
    );
  } else {
    // If no record existed yet, create one that is marked OFF
    const newRecord: DailyMealRecord = {
      date,
      memberId,
      breakfast: 0,
      lunch: defaultLunch,
      dinner: defaultDinner,
      total: 0,
      isOff: true,
      note: 'Advance Off',
    };
    return [...records, newRecord];
  }
}

/**
 * Bazar Expense Actions
 */
export function addBazarExpenseAction(
  bazarExpenses: BazarExpenseRecord[],
  shopperId: string,
  shopperName: string,
  amount: number,
  title: string,
  date: string,
  items?: string,
  receiptImage?: string
): BazarExpenseRecord[] {
  const safeAmount = Math.max(0, Number(amount) || 0);
  const newExpense: BazarExpenseRecord = {
    id: `bazar-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    date: date || new Date().toISOString().split('T')[0],
    shopperId,
    shopperName,
    amount: safeAmount,
    title: title.trim() || 'Daily Bazar',
    items: items?.trim(),
    receiptImage,
  };
  return [newExpense, ...bazarExpenses];
}

export function deleteBazarExpenseAction(
  bazarExpenses: BazarExpenseRecord[],
  id: string
): BazarExpenseRecord[] {
  return bazarExpenses.filter((b) => b.id !== id);
}

/**
 * Deposit Record Actions
 */
export function addDepositRecordAction(
  deposits: DepositRecord[],
  memberId: string,
  memberName: string,
  amount: number,
  date: string,
  paymentMethod: 'bKash' | 'Nagad' | 'Cash' | 'Rocket' | 'Bank',
  note?: string
): DepositRecord[] {
  const safeAmount = Math.max(0, Number(amount) || 0);
  const newDeposit: DepositRecord = {
    id: `dep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    date: date || new Date().toISOString().split('T')[0],
    memberId,
    memberName,
    amount: safeAmount,
    paymentMethod,
    note: note?.trim(),
  };
  return [newDeposit, ...deposits];
}

export function deleteDepositRecordAction(
  deposits: DepositRecord[],
  id: string
): DepositRecord[] {
  return deposits.filter((d) => d.id !== id);
}

/**
 * Shopping Wishlist Actions
 */
export function addShoppingItemAction(
  shoppingList: ShoppingWishlistItem[],
  item: string,
  requestedBy: string,
  quantity?: string,
  approxCost?: number
): ShoppingWishlistItem[] {
  const newItem: ShoppingWishlistItem = {
    id: `shop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    item: item.trim(),
    requestedBy: requestedBy.trim() || 'General',
    quantity: quantity?.trim() || '',
    isBought: false,
    approxCost: approxCost ? Math.max(0, approxCost) : undefined,
    date: new Date().toISOString().split('T')[0],
  };
  return [newItem, ...shoppingList];
}

export function toggleShoppingItemBoughtAction(
  shoppingList: ShoppingWishlistItem[],
  id: string
): ShoppingWishlistItem[] {
  return shoppingList.map((s) =>
    s.id === id ? { ...s, isBought: !s.isBought } : s
  );
}

export function deleteShoppingItemAction(
  shoppingList: ShoppingWishlistItem[],
  id: string
): ShoppingWishlistItem[] {
  return shoppingList.filter((s) => s.id !== id);
}

/**
 * CSV Export Generator (UTF-8 BOM formatted for Excel & Sheets)
 */
export function generateMessCsvReport(
  calc: MessCalculationResult,
  messName: string,
  month: string
): string {
  const bom = '\uFEFF';
  const headers = [
    'Member Name',
    'Role',
    'Phone',
    'Total Meals',
    'Meal Cost (BDT)',
    'Fixed Overhead (BDT)',
    'Total Deposit (BDT)',
    'Total Bill (BDT)',
    'Balance (BDT)',
    'Status',
  ];

  const rows = calc.memberCalculations.map((m) => [
    `"${m.name.replace(/"/g, '""')}"`,
    m.role === 'manager' ? 'Manager' : 'Member',
    `"${m.phone || ''}"`,
    m.mealsCount,
    m.mealCost,
    m.fixedCostShare,
    m.depositAmount,
    m.individualBill,
    m.balance >= 0 ? `+${m.balance}` : `${m.balance}`,
    m.status === 'surplus' ? 'Surplus' : m.status === 'due' ? 'Due' : 'Settled',
  ]);

  const summary = [
    [],
    ['--- Overall Mess Accounting Summary ---'],
    ['Mess Name:', `"${messName}"`],
    ['Month:', `"${month}"`],
    ['Total Bazar Expenses:', calc.totalMarketCost],
    ['Total Consumed Meals:', calc.totalMeals],
    ['Meal Rate:', `${calc.mealRate} BDT`],
    ['Total Fixed Overhead:', calc.totalFixedCost],
    ['Total Deposits Collected:', calc.totalDeposits],
    ['Mess Cash-in-Hand (Fund):', calc.cashInHand],
  ];

  const csvRows = [
    headers.join(','),
    ...rows.map((r) => r.join(',')),
    ...summary.map((r) => r.join(',')),
  ];

  return bom + csvRows.join('\r\n');
}

/**
 * Client-Side Trigger to Download CSV
 */
export function downloadMessCsv(
  calc: MessCalculationResult,
  messName: string,
  month: string
): void {
  const csvContent = generateMessCsvReport(calc, messName, month);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const sanitizedName = messName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  a.download = `hisabsplit-${sanitizedName}-${month.replace(/\s+/g, '-')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate Share / Invite text for WhatsApp
 */
export function generateMessInviteText(
  messName: string,
  inviteCode: string,
  managerName?: string
): string {
  return `📢 You are invited to join *${messName}* on HisabSplit!\n🔑 Mess Invite Code: *${inviteCode}*\n${managerName ? `Manager: ${managerName}\n` : ''}Join to track your daily meals, bazar expenses, and balances: ${window.location.origin}`;
}

/**
 * Generate Bazar Duty WhatsApp message
 */
export function generateBazarDutyText(
  shopperName: string,
  date: string,
  approxBudget?: number
): string {
  return `🛒 Hello ${shopperName}!\nTomorrow (${date}) is your scheduled turn for Mess Bazar.\n${approxBudget ? `Estimated Budget: ৳${approxBudget}\n` : ''}Please check the shared shopping list on HisabSplit. Thank you!`;
}

/**
 * Generate Meal Cut-off Alert message
 */
export function generateMealCutoffText(
  cutoffTime: string,
  targetDate: string
): string {
  return `⏰ *Meal Cut-off Reminder!*\nThe cutoff time to set or turn off meals for tomorrow (${targetDate}) is tonight at *${cutoffTime}*. Please update your meal status on the app if needed!`;
}

/**
 * Generate a random 6-character Mess Invite Code (e.g. MES-7K92)
 */
export function generateInviteCode(prefix: string = 'MES'): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${suffix}`;
}

/**
 * Direct Join URL generator with query params
 */
export function generateMessDirectJoinLink(inviteCode: string): string {
  const base = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
  return `${base}?tab=mess&invite=${encodeURIComponent(inviteCode)}`;
}

/**
 * Create a brand new, isolated Mess State
 */
export function createFreshMessState(params: {
  messName: string;
  month: string;
  managerName: string;
  managerPhone?: string;
  managerPin?: string;
  houseRent?: number;
}): MessState & { id: string } {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  const messId = `mess-${timestamp}-${randomSuffix}`;
  const managerId = `u-${timestamp}`;
  const inviteCode = generateInviteCode('MES');
  const rent = Math.max(0, Number(params.houseRent) || 0);
  const cleanManagerName = params.managerName.trim() || 'Mess Manager';

  const managerMember: MemberMeal = {
    memberId: managerId,
    name: cleanManagerName,
    phone: params.managerPhone?.trim() || '',
    role: 'manager',
    roomNo: 'Room 101',
    mealsCount: 0,
    fixedCostShare: rent,
    depositAmount: 0,
    balance: 0,
  };

  return {
    id: messId,
    messName: params.messName.trim() || 'New Bachelor Flat',
    month: params.month.trim() || 'October 2026',
    totalMarketCost: 0,
    totalMeals: 0,
    fixedCosts: {
      houseRent: rent,
      internetBill: 0,
      maidBill: 0,
      gasElectricity: 0,
      others: 0,
    },
    memberMeals: [managerMember],
    members: [
      {
        id: managerId,
        name: cleanManagerName,
        phone: params.managerPhone?.trim() || '',
        role: 'manager',
        roomNo: 'Room 101',
        defaultMeal: { breakfast: 0, lunch: 1, dinner: 1 },
        fixedCostShare: rent,
        depositAmount: 0,
      },
    ],
    dailyMeals: [],
    bazarExpenses: [],
    deposits: [],
    shoppingList: [],
    settings: {
      cutoffTime: '22:00',
      inviteCode,
      autoMealActive: true,
      managerPhone: params.managerPhone?.trim() || '',
      managerPin: params.managerPin?.trim() || '1234',
    },
  };
}

/**
 * Export a single Mess as JSON backup string
 */
export function exportMessBackupJson(mess: MessState & { id: string }): string {
  return JSON.stringify(
    {
      app: 'HisabSplit',
      exportType: 'SingleMessBackup',
      version: 1,
      timestamp: new Date().toISOString(),
      mess,
    },
    null,
    2
  );
}

/**
 * Trigger download of Mess backup file (.json)
 */
export function downloadMessBackupJson(mess: MessState & { id: string }): void {
  const json = exportMessBackupJson(mess);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = mess.messName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  a.download = `hisabsplit-mess-${safeName}-${mess.settings?.inviteCode || 'backup'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import a single Mess from JSON backup string
 */
export function importMessFromJson(jsonStr: string): (MessState & { id: string }) | null {
  try {
    const parsed = JSON.parse(jsonStr);
    const mess = parsed.mess || parsed;
    if (!mess.messName || !Array.isArray(mess.memberMeals)) {
      return null;
    }
    const cleanId = mess.id || `mess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const inviteCode = mess.settings?.inviteCode || generateInviteCode('MES');
    return {
      ...mess,
      id: cleanId,
      settings: {
        cutoffTime: mess.settings?.cutoffTime || '22:00',
        inviteCode,
        autoMealActive: mess.settings?.autoMealActive ?? true,
        managerPhone: mess.settings?.managerPhone || '',
        managerPin: mess.settings?.managerPin || '1234',
      },
    };
  } catch (e) {
    console.error('Failed to parse mess JSON:', e);
    return null;
  }
}

