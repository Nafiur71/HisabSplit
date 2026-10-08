import { calculateTurfSplit, togglePlayerPlayingAction } from '../controllers/turfController';
import {
  calculateMealRate,
  calculateMessCalculations,
  splitFixedCostsEquallyAction,
  createFreshMessState,
  exportMessBackupJson,
  importMessFromJson,
  getLocalDateString,
  getOffsetDateString,
  deleteDepositRecordAction,
  synchronizeMessState,
} from '../controllers/messController';
import { calculateTourSettlement } from '../controllers/tourController';
import { generateMFSRequest } from '../controllers/mfsController';
import type { TurfPlayer, MemberMeal, FixedCostsBreakdown, TourMember, TripExpense } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ Passed: ${message}`);
}

console.log('🧪 Starting HisabSplit Core Architecture & Logic Test Suite...\n');

// 1. TEST MODULE A: Turf Match Splitter
console.log('--- Testing Module A: Turf Match Splitter ---');
const mockPlayers: TurfPlayer[] = [
  { id: 'p1', name: 'Siam', isPlaying: true, hasPaid: false },
  { id: 'p2', name: 'Rafi', isPlaying: true, hasPaid: false },
  { id: 'p3', name: 'Tanvir', isPlaying: true, hasPaid: false },
  { id: 'p4', name: 'Fahim', isPlaying: true, hasPaid: false },
];

// Initial 4 players, 3200 BDT -> 3200 / 4 = 800 BDT
let turfResult = calculateTurfSplit(3200, mockPlayers);
assert(turfResult.activePlayersCount === 4, 'Active player count should be 4');
assert(turfResult.perPlayerAmount === 800, 'Split should be 800 BDT for 4 active players');

// Player drops out last minute: Fahim drops out -> 3 active players -> 3200 / 3 = 1067 BDT
const updatedPlayers = togglePlayerPlayingAction(mockPlayers, 'p4');
assert(updatedPlayers.find(p => p.id === 'p4')?.isPlaying === false, 'Player p4 isPlaying should be false');

turfResult = calculateTurfSplit(3200, updatedPlayers);
assert(turfResult.activePlayersCount === 3, 'Active player count after dropout should be 3');
assert(turfResult.perPlayerAmount === 1067, 'Split should dynamically recalculate to 1067 BDT for remaining 3 players');

// 2. TEST MODULE B: Mess & Sublet Tracker
console.log('\n--- Testing Module B: Mess & Sublet Tracker ---');
const totalMarketCost = 6000;
const totalMeals = 100;
const mealRate = calculateMealRate(totalMarketCost, totalMeals);
assert(mealRate === 60, `Meal rate should be 60 BDT (got ${mealRate})`);

const mockFixedCosts: FixedCostsBreakdown = {
  houseRent: 20000,
  internetBill: 1000,
  maidBill: 3000,
  gasElectricity: 2000,
  others: 0,
}; // Total Fixed = 26,000 BDT

let mockMemberMeals: MemberMeal[] = [
  { memberId: 'm1', name: 'Siam', mealsCount: 30, fixedCostShare: 0, depositAmount: 10000, balance: 0 },
  { memberId: 'm2', name: 'Rafi', mealsCount: 25, fixedCostShare: 0, depositAmount: 5000, balance: 0 },
];

// Test 1-click split fixed costs equally: 26,000 / 2 members = 13,000 BDT/head
mockMemberMeals = splitFixedCostsEquallyAction(mockMemberMeals, mockFixedCosts);
assert(mockMemberMeals[0].fixedCostShare === 13000, 'Fixed cost share should be 13,000 BDT per member');
assert(mockMemberMeals[1].fixedCostShare === 13000, 'Fixed cost share should be 13,000 BDT per member');

// Member m1: (30 meals * 60) + 13000 fixed = 1800 + 13000 = 14800 individual bill.
// Deposit = 10000 -> Balance = 10000 - 14800 = -4800 (Due/Owes)
const messCalculations = calculateMessCalculations(totalMarketCost, totalMeals, mockMemberMeals, mockFixedCosts);
const m1Calc = messCalculations.memberCalculations.find(m => m.memberId === 'm1')!;
assert(m1Calc.individualBill === 14800, `m1 individual bill should be 14,800 BDT (got ${m1Calc.individualBill})`);
assert(m1Calc.balance === -4800, `m1 balance should be -4800 BDT (Due) (got ${m1Calc.balance})`);
assert(m1Calc.status === 'due', 'm1 status should be due');

// 2.1 Multi-Mess Creation & Tenant Isolation Testing
console.log('\n--- Testing Multi-Mess Creation & Tenant Isolation ---');
const freshMess = createFreshMessState({
  messName: 'Uttara Sector 11 Bachelor Mess',
  month: 'November 2026',
  managerName: 'Kazi Nayeem',
  managerPhone: '01799887766',
  managerPin: '8899',
  houseRent: 25000,
});

assert(freshMess.messName === 'Uttara Sector 11 Bachelor Mess', 'Fresh mess name matches');
assert(freshMess.settings?.managerPin === '8899', 'Manager PIN correctly set');
assert(freshMess.fixedCosts.houseRent === 25000, 'House rent matches');
assert(freshMess.memberMeals.length === 1, 'Manager is registered as the initial member');
assert(freshMess.settings?.inviteCode?.startsWith('MES-') === true, 'Invite code generated with prefix');

const exportedJson = exportMessBackupJson(freshMess);
assert(exportedJson.includes('Uttara Sector 11 Bachelor Mess'), 'Backup JSON contains mess name');
assert(exportedJson.includes('HisabSplit'), 'Backup JSON is branded');

const importedMess = importMessFromJson(exportedJson);
assert(importedMess !== null, 'Imported mess should not be null');
assert(importedMess?.messName === freshMess.messName, 'Imported mess name matches original');
assert(importedMess?.settings?.inviteCode === freshMess.settings?.inviteCode, 'Imported invite code preserved');



// 2.2 Timezone & Audit Fixes Verification
console.log('\n--- Testing Local Timezone & Data Integrity Fixes ---');
const todayDateStr = getLocalDateString();
assert(/^\d{4}-\d{2}-\d{2}$/.test(todayDateStr), `getLocalDateString matches YYYY-MM-DD pattern (got ${todayDateStr})`);
const tomorrowDateStr = getOffsetDateString(1);
assert(/^\d{4}-\d{2}-\d{2}$/.test(tomorrowDateStr), `getOffsetDateString matches YYYY-MM-DD pattern (got ${tomorrowDateStr})`);

// Fresh mess without bazarExpenses should strictly have 0 syncedMarketCost (No 15,600 ghost cost fallback)
const syncedFresh = synchronizeMessState(freshMess);
assert(syncedFresh.syncedMarketCost === 0, `Fresh mess market cost should be 0 BDT (got ${syncedFresh.syncedMarketCost})`);

// Deposit deletion action reduces array length
const testDeposits = [{ id: 'd-1', memberId: 'm1', memberName: 'Siam', amount: 5000, date: todayDateStr, paymentMethod: 'bKash' as const }];
const afterDelete = deleteDepositRecordAction(testDeposits, 'd-1');
assert(afterDelete.length === 0, 'Deposit deletion action successfully removes the deposit item');

// 3. TEST MODULE C: Group Tour Splitter (Matrix Settlement Optimization)
console.log('\n--- Testing Module C: Group Tour Splitter ---');
const tourMembers: TourMember[] = [
  { id: 't1', name: 'Siam', phone: '01711223344' },
  { id: 't2', name: 'Rafi', phone: '01822334455' },
];

// Rafi paid 900 BDT for Food, split between Siam and Rafi -> Siam owes Rafi 450 BDT
const tripExpenses: TripExpense[] = [
  {
    expenseId: 'exp-1',
    category: 'Food',
    amount: 900,
    paidByMemberId: 't2', // Rafi paid
    splitBetweenIds: ['t1', 't2'],
    description: 'Bamboo Chicken Dinner',
  },
];

const tourCalc = calculateTourSettlement(tourMembers, tripExpenses);
assert(tourCalc.settlements.length === 1, 'There should be exactly 1 optimized settlement');
assert(tourCalc.settlements[0].fromName === 'Siam', 'Settlement debtor should be Siam');
assert(tourCalc.settlements[0].toName === 'Rafi', 'Settlement creditor should be Rafi');
assert(tourCalc.settlements[0].amount === 450, 'Settlement amount should be 450 BDT');
assert(
  tourCalc.settlements[0].formattedText.includes('Siam needs to send 450 BDT to Rafi'),
  `Formatted text matches requirement: ${tourCalc.settlements[0].formattedText}`
);

// 4. TEST MFS SHARED UTILITY
console.log('\n--- Testing MFS Shared Utility ---');
const mfsRequest = generateMFSRequest(
  '01822334455',
  450,
  'Sajek Bamboo Chicken Dinner',
  'bKash'
);

const expectedSnippet =
  'Hey! Your share for Sajek Bamboo Chicken Dinner is 450 BDT. Please Send Money to my personal bKash number: 01822334455. Thank you!';
assert(mfsRequest.message === expectedSnippet, `MFS Message format match:\n${mfsRequest.message}`);
assert(mfsRequest.whatsappUrl.includes('https://wa.me/?text='), 'WhatsApp deep link generated properly');

console.log('\n🎉 ALL CONTROLLER & REAGENT LOGIC TESTS PASSED PERFECTLY!\n');
