import type {
  TourMember,
  TripExpense,
  TourExpenseCategory,
  TourCalculationResult,
  TourSettlement,
} from '../types';

/**
 * MODULE C: Group Tour Splitter Pure Controller
 * 
 * Implements a matrix settlement optimization algorithm:
 * 1. Tracks total payments per member (out-of-pocket).
 * 2. Computes consumption shares per expense based on splitBetweenIds matrix.
 * 3. Calculates net balances (Creditors vs. Debtors).
 * 4. Runs greedy transaction minimization to generate clean settlements:
 *    e.g., "Siam needs to send 450 BDT to Rafi".
 */

export function calculateTourSettlement(
  members: TourMember[],
  tripExpenses: TripExpense[]
): TourCalculationResult {
  const memberMap = new Map<string, TourMember>();
  members.forEach((m) => memberMap.set(m.id, m));

  const categoryTotals: Record<TourExpenseCategory, number> = {
    Food: 0,
    Transport: 0,
    Hotel: 0,
    Others: 0,
  };

  const memberSpending: Record<string, number> = {};
  const memberConsumption: Record<string, number> = {};
  const netBalances: Record<string, number> = {};

  // Initialize records for all members
  members.forEach((m) => {
    memberSpending[m.id] = 0;
    memberConsumption[m.id] = 0;
    netBalances[m.id] = 0;
  });

  let totalTripCost = 0;

  // Process all trip expenses
  tripExpenses.forEach((exp) => {
    const amount = Math.max(0, Number(exp.amount) || 0);
    totalTripCost += amount;

    // Track category totals
    if (categoryTotals[exp.category] !== undefined) {
      categoryTotals[exp.category] += amount;
    } else {
      categoryTotals.Others += amount;
    }

    // Track who paid out-of-pocket
    if (memberSpending[exp.paidByMemberId] !== undefined) {
      memberSpending[exp.paidByMemberId] += amount;
    } else {
      memberSpending[exp.paidByMemberId] = amount;
    }

    // Split consumption among participants
    const participants =
      exp.splitBetweenIds && exp.splitBetweenIds.length > 0
        ? exp.splitBetweenIds
        : members.map((m) => m.id);

    const sharePerPerson = amount / (participants.length || 1);

    participants.forEach((participantId) => {
      if (memberConsumption[participantId] !== undefined) {
        memberConsumption[participantId] += sharePerPerson;
      } else {
        memberConsumption[participantId] = sharePerPerson;
      }
    });
  });

  // Calculate net balances: positive = creditor (receives), negative = debtor (owes)
  members.forEach((m) => {
    const paid = memberSpending[m.id] || 0;
    const consumed = memberConsumption[m.id] || 0;
    netBalances[m.id] = Math.round(paid - consumed);
  });

  // Matrix-style Settlement Minimization Algorithm (Greedy Pairwise Optimization)
  interface BalanceNode {
    memberId: string;
    name: string;
    phone?: string;
    balance: number;
  }

  const debtors: BalanceNode[] = [];
  const creditors: BalanceNode[] = [];

  members.forEach((m) => {
    const bal = netBalances[m.id] || 0;
    if (bal < -1) {
      debtors.push({
        memberId: m.id,
        name: m.name,
        phone: m.phone,
        balance: -bal,
      });
    } else if (bal > 1) {
      creditors.push({
        memberId: m.id,
        name: m.name,
        phone: m.phone,
        balance: bal,
      });
    }
  });

  // Sort descending by magnitude to minimize transactions
  debtors.sort((a, b) => b.balance - a.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  const settlements: TourSettlement[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settleAmount = Math.round(Math.min(debtor.balance, creditor.balance));

    if (settleAmount > 0) {
      settlements.push({
        id: `settle-${debtor.memberId}-${creditor.memberId}-${dIdx}-${cIdx}`,
        fromMemberId: debtor.memberId,
        fromName: debtor.name,
        fromPhone: debtor.phone,
        toMemberId: creditor.memberId,
        toName: creditor.name,
        toPhone: creditor.phone,
        amount: settleAmount,
        formattedText: `${debtor.name} needs to send ${settleAmount.toLocaleString('en-BD')} BDT to ${creditor.name}`,
      });
    }

    debtor.balance -= settleAmount;
    creditor.balance -= settleAmount;

    if (debtor.balance <= 1) dIdx++;
    if (creditor.balance <= 1) cIdx++;
  }

  return {
    totalTripCost,
    categoryTotals,
    memberSpending,
    memberConsumption,
    netBalances,
    settlements,
  };
}

/**
 * Add a new trip expense
 */
export function addTripExpenseAction(
  expenses: TripExpense[],
  newExpense: Omit<TripExpense, 'expenseId'>
): TripExpense[] {
  const expense: TripExpense = {
    ...newExpense,
    expenseId: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  };
  return [expense, ...expenses];
}

/**
 * Remove an existing trip expense
 */
export function removeTripExpenseAction(
  expenses: TripExpense[],
  expenseId: string
): TripExpense[] {
  return expenses.filter((e) => e.expenseId !== expenseId);
}

/**
 * Add a new tour member
 */
export function addTourMemberAction(
  members: TourMember[],
  name: string,
  phone?: string
): TourMember[] {
  const trimmed = name.trim();
  if (!trimmed) return members;

  const newMember: TourMember = {
    id: `tm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: trimmed,
    phone: phone?.trim() || '',
  };
  return [...members, newMember];
}

/**
 * Remove a tour member and clean up references
 */
export function removeTourMemberAction(
  members: TourMember[],
  memberId: string
): TourMember[] {
  return members.filter((m) => m.id !== memberId);
}
