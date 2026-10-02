import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Home,
  Wifi,
  Sparkles,
  Zap,
  UserPlus,
  Trash2,
  Send,
  Plus,
  Minus,
  CheckCircle2,
} from 'lucide-react';
import type { MessState, MemberMeal, FixedCostsBreakdown } from '../types';
import {
  calculateMessCalculations,
  splitFixedCostsEquallyAction,
  updateMemberMealsCountAction,
  updateMemberDepositAction,
  addMessMemberAction,
  removeMessMemberAction,
} from '../controllers/messController';
import { db } from '../db/db';

interface MessModuleProps {
  initialState: MessState;
  onOpenMFS: (opts: {
    amount: number;
    reason: string;
    recipientName?: string;
    recipientPhone?: string;
  }) => void;
}

export const MessModule: React.FC<MessModuleProps> = ({
  initialState,
  onOpenMFS,
}) => {
  const [messName, setMessName] = useState<string>(
    initialState.messName || 'Dhanmondi 27 Bachelor Flat'
  );
  const [totalMarketCost, setTotalMarketCost] = useState<number>(
    initialState.totalMarketCost || 15600
  );
  const [totalMeals, setTotalMeals] = useState<number>(
    initialState.totalMeals || 240
  );
  const [fixedCosts, setFixedCosts] = useState<FixedCostsBreakdown>(
    initialState.fixedCosts || {
      houseRent: 24000,
      internetBill: 1200,
      maidBill: 3000,
      gasElectricity: 2800,
      others: 1000,
    }
  );
  const [memberMeals, setMemberMeals] = useState<MemberMeal[]>(
    initialState.memberMeals || []
  );

  const [showAddMember, setShowAddMember] = useState<boolean>(false);
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberPhone, setNewMemberPhone] = useState<string>('');
  const [justSplitFlash, setJustSplitFlash] = useState<boolean>(false);

  const calculations = calculateMessCalculations(
    totalMarketCost,
    totalMeals,
    memberMeals,
    fixedCosts
  );

  useEffect(() => {
    const updatedState: MessState & { id: string } = {
      id: 'current-mess',
      messName,
      month: 'September 2026',
      totalMarketCost,
      totalMeals: calculations.totalMeals,
      fixedCosts,
      memberMeals,
    };
    db.mess_state.put(updatedState).catch(console.error);
  }, [messName, totalMarketCost, fixedCosts, memberMeals, calculations.totalMeals]);

  const handleSplitFixedCostsEqually = () => {
    const updated = splitFixedCostsEquallyAction(memberMeals, fixedCosts);
    setMemberMeals(updated);
    setJustSplitFlash(true);
    setTimeout(() => setJustSplitFlash(false), 2000);
  };

  const handleMealCountChange = (memberId: string, delta: number) => {
    const target = memberMeals.find((m) => m.memberId === memberId);
    if (!target) return;
    const current = Math.max(0, target.mealsCount || 0);
    const updated = Math.max(0, current + delta);
    setMemberMeals((prev) => updateMemberMealsCountAction(prev, memberId, updated));
  };

  const handleDepositChange = (memberId: string, deposit: number) => {
    setMemberMeals((prev) => updateMemberDepositAction(prev, memberId, deposit));
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const defaultFixed =
      calculations.fixedCostPerHead > 0 ? calculations.fixedCostPerHead : 0;
    setMemberMeals((prev) =>
      addMessMemberAction(prev, newMemberName, newMemberPhone, defaultFixed)
    );
    setNewMemberName('');
    setNewMemberPhone('');
    setShowAddMember(false);
  };

  const handleRemoveMember = (memberId: string) => {
    setMemberMeals((prev) => removeMessMemberAction(prev, memberId));
  };

  const handleFixedCostChange = (
    key: keyof FixedCostsBreakdown,
    val: number
  ) => {
    setFixedCosts((prev) => ({
      ...prev,
      [key]: Math.max(0, val),
    }));
  };

  return (
    <div className="w-full space-y-6">
      {/* 2-Column Responsive Dashboard Layout (100% Width) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start w-full">
        {/* Left Column: Meal Rate Hero + Fixed Overhead Inputs (col-span-5 / xl:col-span-4) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Meal Rate Card */}
          <div className="bg-[#0E131F] rounded-3xl p-6 sm:p-7 border border-slate-800/80 shadow-xl">
            <div className="pb-5 border-b border-slate-800/60">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Mess & Sublet Tracker
                </span>
              </div>
              <input
                type="text"
                value={messName}
                onChange={(e) => setMessName(e.target.value)}
                className="w-full text-xl sm:text-2xl font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-sky-400 focus:outline-none transition-colors"
              />
            </div>

            {/* Dynamic Meal Rate Big Display */}
            <div className="py-6 border-b border-slate-800/60">
              <div className="flex items-center gap-1.5 text-xs text-sky-400 font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Current Dynamic Meal Rate</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight font-mono">
                  ৳{calculations.mealRate.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ meal</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Total Market ৳{calculations.totalMarketCost.toLocaleString('en-BD')} ÷{' '}
                {calculations.totalMeals} total meals.
              </p>
            </div>

            {/* Market & Meals Input Fields */}
            <div className="pt-5 space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Total Market / Bazar Cost
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={totalMarketCost}
                    onChange={(e) => setTotalMarketCost(Number(e.target.value))}
                    className="w-full bg-[#141A29] text-white font-mono font-bold rounded-2xl border border-slate-700/80 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-3 text-xs text-slate-500 font-mono">৳ BDT</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Total Meals Consumed
                </label>
                <input
                  type="number"
                  value={totalMeals}
                  onChange={(e) => setTotalMeals(Number(e.target.value))}
                  className="w-full bg-[#141A29] text-white font-mono font-bold rounded-2xl border border-slate-700/80 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Everyday Fixed Overhead Card */}
          <div className="bg-[#0E131F] rounded-3xl p-6 sm:p-7 border border-slate-800/80 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Everyday Fixed Overhead
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total: ৳{calculations.totalFixedCost.toLocaleString('en-BD')} • ৳{calculations.fixedCostPerHead}/person
                  </p>
                </div>
              </div>

              <button
                onClick={handleSplitFixedCostsEqually}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                  justSplitFlash
                    ? 'bg-sky-400 text-black font-bold'
                    : 'bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{justSplitFlash ? 'Split!' : 'Split Equally'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">House Rent</label>
                <input
                  type="number"
                  value={fixedCosts.houseRent || ''}
                  onChange={(e) => handleFixedCostChange('houseRent', Number(e.target.value))}
                  className="w-full bg-[#141A29] text-white font-mono rounded-xl border border-slate-700/80 px-3 py-2 focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-sky-400" />
                  WiFi Net
                </label>
                <input
                  type="number"
                  value={fixedCosts.internetBill || ''}
                  onChange={(e) => handleFixedCostChange('internetBill', Number(e.target.value))}
                  className="w-full bg-[#141A29] text-white font-mono rounded-xl border border-slate-700/80 px-3 py-2 focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Maid Bill</label>
                <input
                  type="number"
                  value={fixedCosts.maidBill || ''}
                  onChange={(e) => handleFixedCostChange('maidBill', Number(e.target.value))}
                  className="w-full bg-[#141A29] text-white font-mono rounded-xl border border-slate-700/80 px-3 py-2 focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Gas & Electric</label>
                <input
                  type="number"
                  value={fixedCosts.gasElectricity || ''}
                  onChange={(e) => handleFixedCostChange('gasElectricity', Number(e.target.value))}
                  className="w-full bg-[#141A29] text-white font-mono rounded-xl border border-slate-700/80 px-3 py-2 focus:border-sky-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Roommates Ledger Cards (col-span-7 / xl:col-span-8) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="bg-[#0E131F] rounded-3xl border border-slate-800/80 overflow-hidden shadow-xl">
            <div className="p-5 sm:p-6 border-b border-slate-800/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-sky-400" />
                  <span>Roommates Ledger & Balance ({memberMeals.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Individual Bill = (Meals × Rate) + Fixed Share. Balance = Deposit - Bill.
                </p>
              </div>

              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="px-3 py-1.5 bg-[#141A29] hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                <span>Add Roommate</span>
              </button>
            </div>

            {/* Add Member Bar */}
            {showAddMember && (
              <form
                onSubmit={handleAddMember}
                className="p-4 bg-[#141A29] border-b border-slate-800 flex flex-wrap gap-2.5 items-center animate-fade-in"
              >
                <input
                  type="text"
                  placeholder="Roommate name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="flex-1 min-w-[160px] bg-[#0E131F] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
                <input
                  type="text"
                  placeholder="bKash / Nagad number (optional)"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  className="w-48 bg-[#0E131F] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-sky-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-black text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>
            )}

            {/* Member Cards List */}
            <div className="divide-y divide-slate-800/60">
              {calculations.memberCalculations.map((item) => {
                const isDue = item.balance < 0;
                const isSurplus = item.balance > 0;
                const isSettled = item.balance === 0;

                return (
                  <div
                    key={item.memberId}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/20 transition-colors"
                  >
                    {/* Member Info */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-[#141A29] border border-slate-700/80 flex items-center justify-center font-bold text-xs text-slate-200 uppercase">
                        {item.name.substring(0, 2)}
                      </div>
                      <div>
                        <h5 className="text-sm font-semibold text-white">{item.name}</h5>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {item.phone || 'No phone'}
                        </p>
                      </div>
                    </div>

                    {/* Stepper, Bill, Deposit & Balance */}
                    <div className="flex flex-wrap items-center gap-3.5 text-xs">
                      {/* Meals Stepper */}
                      <div className="flex items-center gap-1 bg-[#141A29] p-1 rounded-2xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleMealCountChange(item.memberId, -1)}
                          className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-12 text-center font-mono font-bold text-white text-sm">
                          {item.mealsCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMealCountChange(item.memberId, 1)}
                          className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Total Bill & Deposit */}
                      <div className="flex items-center gap-3 bg-[#141A29] px-3.5 py-2 rounded-2xl border border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Total Bill</span>
                          <span className="font-mono font-bold text-white text-xs">
                            ৳{item.individualBill.toLocaleString('en-BD')}
                          </span>
                        </div>
                        <span className="text-slate-700">•</span>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Deposit</span>
                          <input
                            type="number"
                            value={item.depositAmount || ''}
                            onChange={(e) =>
                              handleDepositChange(item.memberId, Number(e.target.value))
                            }
                            placeholder="৳0"
                            className="w-16 bg-transparent text-emerald-400 font-mono font-bold text-xs focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Net Balance Chip */}
                      {isDue && (
                        <div className="px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 font-mono text-xs font-bold">
                          Owes ৳{Math.abs(item.balance).toLocaleString('en-BD')}
                        </div>
                      )}
                      {isSurplus && (
                        <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono text-xs font-bold">
                          Surplus +৳{item.balance.toLocaleString('en-BD')}
                        </div>
                      )}
                      {isSettled && (
                        <div className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-mono text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Settled</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 ml-auto md:ml-0">
                        {isDue && (
                          <button
                            onClick={() =>
                              onOpenMFS({
                                amount: Math.abs(item.balance),
                                reason: `${messName} mess bill`,
                                recipientName: item.name,
                                recipientPhone: item.phone,
                              })
                            }
                            className="p-2 text-slate-400 hover:text-[#E2136E] rounded-xl hover:bg-slate-800 transition-colors"
                            title="Send MFS Reminder"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleRemoveMember(item.memberId)}
                          className="p-2 text-slate-600 hover:text-rose-400 rounded-xl transition-colors"
                          title="Remove roommate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
