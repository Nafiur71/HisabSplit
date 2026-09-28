import type {
  MemberMeal,
  FixedCostsBreakdown,
  MessCalculationResult,
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
 * and balance = depositAmount - individualBill.
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
      mealsCount,
      mealCost,
      fixedCostShare: fixedShare,
      depositAmount,
      individualBill,
      balance,
      status,
    };
  });

  return {
    totalMarketCost: safeMarketCost,
    totalMeals: safeMeals,
    mealRate,
    totalFixedCost,
    fixedCostPerHead,
    totalExpenses,
    totalDeposits,
    memberCalculations,
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
 * Update a specific member's meal count
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
  defaultFixedShare = 0
): MemberMeal[] {
  const trimmed = name.trim();
  if (!trimmed) return memberMeals;

  const newMember: MemberMeal = {
    memberId: `mm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: trimmed,
    phone: phone?.trim() || '',
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
