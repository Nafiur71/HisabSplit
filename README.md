# HisabSplit (হিসাব-স্প্লিট) 🇧🇩

> Lightweight, Local-First Bill Splitting & Micro-Accounting Mobile/Web Application tailored for Bangladesh.

Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Dexie.js (IndexedDB)**. Features a dark-mode-first aesthetic with neon sports and clean Bangladeshi fintech accents (**bKash**, **Nagad**, **Rocket**, **Upay**).

---

## 🚀 Live Demo & Development

```bash
# Navigate to project directory
cd "C:\Users\User\.gemini\antigravity\scratch\hisab-split"

# Run development server (runs at http://localhost:5173/)
npm run dev

# Run automated logic and unit test suite
npx tsx src/tests/test-runner.ts

# Build production bundle
npm run build
```

---

## 🎨 Core Modules & Architecture

### 1. Module A: Turf Match Splitter (Sports Utility)
- **State Model**: `totalTurfBill`, `players` (`id`, `name`, `isPlaying`, `hasPaid`).
- **Core Controller**: `calculateTurfSplit(totalTurfBill, players)` divides total turf cost strictly by active players (`isPlaying === true`).
- **Reactivity & Visual Flash**: When a player drops out last minute, toggling `isPlaying` immediately flashes a neon green highlight and recalculates the split for active players.
- **Fintech Integration**: 1-click bKash/Nagad payment requests for unpaid players.

### 2. Module B: Mess & Sublet Tracker (Daily Life Utility)
- **State Model**: `totalMarketCost`, `totalMeals`, `memberMeals` (`memberId`, `name`, `mealsCount`, `fixedCostShare`, `balance`).
- **Core Controller**:
  1. `mealRate = totalMarketCost / totalMeals`
  2. `individualBill = (mealsCount * mealRate) + fixedCostShare`
  3. `balance = depositAmount - individualBill` (Negative = Due/Owed, Positive = Surplus)
- **1-Click UX**: Quick input fields for "House Rent", "Internet Bill", "Maid Bill", and "Utilities" with a one-click button to split fixed costs evenly among all roommates.

### 3. Module C: Group Tour Splitter (Travel Utility)
- **State Model**: `tripExpenses` (`expenseId`, `category` ['Food', 'Transport', 'Hotel', 'Others'], `amount`, `paidByMemberId`, `splitBetweenIds`).
- **Optimization Algorithm**: Matrix-style greedy debt minimization pairs creditors and debtors, yielding the minimal number of transactions (e.g., *"Siam needs to send 450 BDT to Rafi"*).

### 4. ⚡ Local MFS Utility (Common Component)
- **Generator**: `generateMFSRequest(managerNumber, amount, reason, platform)`
- **Standardized Format**:
  > *"Hey! Your share for [Reason] is [Amount] BDT. Please Send Money to my personal [bKash/Nagad] number: [Manager Number]. Thank you!"*
- **Action Sharing**: WhatsApp deep link (`https://wa.me/...`), Messenger, Web Share API, Clipboard copy, and USSD dial codes (`*247#` for bKash, `*167#` for Nagad).

---

## 🛠️ Relational Database Schema (IndexedDB / Dexie.js)

- **`Users`**: `id`, `phone`, `name`, `registration_date`
- **`Groups`**: `id`, `name`, `type` (`'turf' | 'mess' | 'tour'`), `creator_id`
- **`Group_Members`**: `group_id`, `user_id`, `status` (`'active' | 'pending'`)
- **`Transactions`**: `id`, `group_id`, `amount`, `description`, `type`, `created_by`, `split_data` (JSON matrix)

Includes a real-time schema and JSON inspector modal, full JSON export/import backup functionality, and realistic Bangladeshi demo seed data.
