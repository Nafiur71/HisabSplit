import React, { useState, useEffect } from 'react';
import {
  Compass,
  Plus,
  Trash2,
  ArrowRight,
  Send,
  Coffee,
  Car,
  Building,
  Tag,
  Check,
  CheckCircle2,
  UserPlus,
  Layers,
} from 'lucide-react';
import type {
  TourState,
  TourMember,
  TripExpense,
  TourExpenseCategory,
} from '../types';
import {
  calculateTourSettlement,
  addTripExpenseAction,
  removeTripExpenseAction,
  addTourMemberAction,
  removeTourMemberAction,
} from '../controllers/tourController';
import { db } from '../db/db';

interface TourModuleProps {
  initialState: TourState;
  onOpenMFS: (opts: {
    amount: number;
    reason: string;
    recipientName?: string;
    recipientPhone?: string;
  }) => void;
}

export const TourModule: React.FC<TourModuleProps> = ({
  initialState,
  onOpenMFS,
}) => {
  const [tripName, setTripName] = useState<string>(
    initialState.tripName || 'Sajek Valley Tour'
  );
  const [location, setLocation] = useState<string>(
    initialState.location || 'Sajek Valley, Rangamati'
  );
  const [members, setMembers] = useState<TourMember[]>(initialState.members || []);
  const [tripExpenses, setTripExpenses] = useState<TripExpense[]>(
    initialState.tripExpenses || []
  );

  const [showAddExpense, setShowAddExpense] = useState<boolean>(false);
  const [showAddMember, setShowAddMember] = useState<boolean>(false);
  const [expDescription, setExpDescription] = useState<string>('');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expCategory, setExpCategory] = useState<TourExpenseCategory>('Food');
  const [expPaidBy, setExpPaidBy] = useState<string>(members[0]?.id || '');
  const [expSplitBetween, setExpSplitBetween] = useState<string[]>(
    members.map((m) => m.id)
  );

  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberPhone, setNewMemberPhone] = useState<string>('');

  const settlementResult = calculateTourSettlement(members, tripExpenses);

  useEffect(() => {
    const updatedState: TourState & { id: string } = {
      id: 'current-tour',
      tripName,
      location,
      members,
      tripExpenses,
    };
    db.tour_state.put(updatedState).catch(console.error);
  }, [tripName, location, members, tripExpenses]);

  useEffect(() => {
    if (members.length > 0 && !members.some((m) => m.id === expPaidBy)) {
      setExpPaidBy(members[0].id);
    }
  }, [members, expPaidBy]);

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDescription.trim() || expAmount <= 0 || !expPaidBy) return;

    const participants =
      expSplitBetween.length > 0 ? expSplitBetween : members.map((m) => m.id);

    setTripExpenses((prev) =>
      addTripExpenseAction(prev, {
        description: expDescription.trim(),
        amount: expAmount,
        category: expCategory,
        paidByMemberId: expPaidBy,
        splitBetweenIds: participants,
        date: new Date().toISOString().split('T')[0],
      })
    );

    setExpDescription('');
    setExpAmount(0);
    setShowAddExpense(false);
  };

  const handleToggleParticipant = (memberId: string) => {
    if (expSplitBetween.includes(memberId)) {
      if (expSplitBetween.length > 1) {
        setExpSplitBetween(expSplitBetween.filter((id) => id !== memberId));
      }
    } else {
      setExpSplitBetween([...expSplitBetween, memberId]);
    }
  };

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    setMembers((prev) => addTourMemberAction(prev, newMemberName, newMemberPhone));
    setNewMemberName('');
    setNewMemberPhone('');
    setShowAddMember(false);
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers((prev) => removeTourMemberAction(prev, memberId));
  };

  const handleRemoveExpense = (expenseId: string) => {
    setTripExpenses((prev) => removeTripExpenseAction(prev, expenseId));
  };

  const getCategoryIcon = (cat: TourExpenseCategory) => {
    switch (cat) {
      case 'Food':
        return <Coffee className="w-3.5 h-3.5 text-amber-400" />;
      case 'Transport':
        return <Car className="w-3.5 h-3.5 text-sky-400" />;
      case 'Hotel':
        return <Building className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Tag className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* 2-Column Responsive Dashboard Layout (100% Width) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start w-full">
        {/* Left Column: Trip Overview Hero + Record Expense (col-span-5 / xl:col-span-4) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Trip Overview Card */}
          <div className="bg-[#0E131F] rounded-3xl p-6 sm:p-7 border border-slate-800/80 shadow-xl">
            <div className="pb-5 border-b border-slate-800/60">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Group Tour Splitter
                </span>
              </div>
              <input
                type="text"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                className="w-full text-xl sm:text-2xl font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-400 focus:outline-none transition-colors"
              />
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                <span>Destination:</span>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-transparent text-slate-300 font-mono border-b border-transparent hover:border-slate-700 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Total Expenditure Big Display */}
            <div className="py-6 border-b border-slate-800/60">
              <span className="text-xs text-slate-400 block mb-1">
                Total Trip Expenditure
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight font-mono">
                  ৳{settlementResult.totalTripCost.toLocaleString('en-BD')}
                </span>
                <span className="text-xs text-slate-400 font-mono">BDT</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Tracked across {tripExpenses.length} entries for {members.length} travelers.
              </p>
            </div>

            {/* Category Chips */}
            <div className="pt-5 space-y-3">
              <span className="text-xs text-slate-400 block font-medium">
                Category Breakdown
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(['Transport', 'Hotel', 'Food', 'Others'] as TourExpenseCategory[]).map(
                  (cat) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between p-2.5 bg-[#141A29] rounded-xl border border-slate-800"
                    >
                      <span className="text-slate-400 flex items-center gap-1.5">
                        {getCategoryIcon(cat)}
                        <span className="text-[11px] font-medium">{cat}</span>
                      </span>
                      <span className="font-mono font-bold text-white text-xs">
                        ৳{settlementResult.categoryTotals[cat].toLocaleString('en-BD')}
                      </span>
                    </div>
                  )
                )}
              </div>

              <button
                onClick={() => setShowAddExpense(!showAddExpense)}
                className="w-full mt-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-black rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddExpense ? 'Close Expense Form' : 'Record New Trip Expense'}</span>
              </button>
            </div>
          </div>

          {/* Record Expense Form (When opened or inline) */}
          {showAddExpense && (
            <form
              onSubmit={handleAddExpenseSubmit}
              className="bg-[#0E131F] rounded-3xl p-6 sm:p-7 border border-amber-500/40 shadow-2xl space-y-4 animate-fade-in"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="text-sm font-bold text-white">Record Trip Expense</h4>
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Expense Description</label>
                  <input
                    type="text"
                    value={expDescription}
                    onChange={(e) => setExpDescription(e.target.value)}
                    placeholder="e.g. Sajek Chander Gari / Resort Cottage"
                    className="w-full bg-[#141A29] text-white rounded-xl border border-slate-700/80 px-3 py-2 focus:border-amber-400 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Amount (BDT)</label>
                    <input
                      type="number"
                      value={expAmount || ''}
                      onChange={(e) => setExpAmount(Number(e.target.value))}
                      placeholder="BDT"
                      className="w-full bg-[#141A29] text-white font-mono font-bold rounded-xl border border-slate-700/80 px-3 py-2 focus:border-amber-400 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Category</label>
                    <select
                      value={expCategory}
                      onChange={(e) => setExpCategory(e.target.value as TourExpenseCategory)}
                      className="w-full bg-[#141A29] text-white rounded-xl border border-slate-700/80 px-3 py-2 focus:border-amber-400 focus:outline-none"
                    >
                      <option value="Transport">🚗 Transport</option>
                      <option value="Hotel">🏨 Hotel & Resort</option>
                      <option value="Food">🍽️ Food & Meals</option>
                      <option value="Others">🏷️ Other Expenses</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Who Paid Out-of-Pocket?</label>
                  <select
                    value={expPaidBy}
                    onChange={(e) => setExpPaidBy(e.target.value)}
                    className="w-full bg-[#141A29] text-white rounded-xl border border-slate-700/80 px-3 py-2 focus:border-amber-400 focus:outline-none"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Split Between Pills */}
                <div>
                  <label className="text-slate-400 block text-xs mb-1.5">
                    Split Between Travelers:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {members.map((m) => {
                      const isSelected = expSplitBetween.includes(m.id);
                      return (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => handleToggleParticipant(m.id)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all border ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-[#141A29] border-slate-800 text-slate-400'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-amber-400" />}
                          <span>{m.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-xs transition-colors"
                  >
                    Save Expense
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Settlements Matrix + Expense History (col-span-7 / xl:col-span-8) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* FINALIZED SETTLEMENT MATRIX (WHO PAYS WHOM) */}
          <div className="bg-[#0E131F] rounded-3xl border border-amber-500/30 overflow-hidden shadow-xl">
            <div className="p-5 sm:p-6 border-b border-slate-800/60 bg-[#121827] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-400" />
                  <span>Optimized Settlements (Debt Minimization)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Direct instructions for minimal transactions. Click MFS to send instant payment link.
                </p>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                {settlementResult.settlements.length} Transfers
              </span>
            </div>

            <div className="p-5 sm:p-6">
              {settlementResult.settlements.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <span>All expenses are balanced! No pending transfers.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {settlementResult.settlements.map((settle) => (
                    <div
                      key={settle.id}
                      className="p-4 bg-[#141A29] border border-slate-800 rounded-2xl flex flex-col justify-between gap-3 hover:border-amber-500/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <span className="text-rose-400">{settle.fromName}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-emerald-400">{settle.toName}</span>
                        </div>

                        <span className="font-mono font-black text-white text-base">
                          ৳{settle.amount.toLocaleString('en-BD')}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 font-mono">
                        {settle.formattedText}
                      </p>

                      <div className="pt-2 border-t border-slate-800 flex justify-end">
                        <button
                          onClick={() =>
                            onOpenMFS({
                              amount: settle.amount,
                              reason: `${tripName} settlement to ${settle.toName}`,
                              recipientName: settle.fromName,
                              recipientPhone: settle.fromPhone,
                            })
                          }
                          className="px-3 py-1 bg-[#E2136E]/15 hover:bg-[#E2136E]/25 border border-[#E2136E]/30 text-[#E2136E] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          <span>Request via MFS</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Expenses History */}
          <div className="bg-[#0E131F] rounded-3xl border border-slate-800/80 overflow-hidden shadow-xl">
            <div className="p-5 sm:p-6 border-b border-slate-800/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Expenses History ({tripExpenses.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete ledger of payments and split participants
                </p>
              </div>

              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="px-3 py-1.5 bg-[#141A29] hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>Add Traveler</span>
              </button>
            </div>

            {showAddMember && (
              <form
                onSubmit={handleAddMemberSubmit}
                className="p-4 bg-[#141A29] border-b border-slate-800 flex gap-2 items-center text-xs animate-fade-in"
              >
                <input
                  type="text"
                  placeholder="Traveler name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="flex-1 bg-[#0E131F] border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
                <input
                  type="text"
                  placeholder="Phone (optional)"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  className="w-40 bg-[#0E131F] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-black font-bold rounded-xl"
                >
                  Add
                </button>
              </form>
            )}

            <div className="divide-y divide-slate-800/60">
              {tripExpenses.map((exp) => {
                const payer = members.find((m) => m.id === exp.paidByMemberId);
                const count = exp.splitBetweenIds?.length || members.length;

                return (
                  <div
                    key={exp.expenseId}
                    className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-slate-800/15 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#141A29] border border-slate-700/80 flex items-center justify-center">
                        {getCategoryIcon(exp.category)}
                      </div>
                      <div>
                        <h5 className="font-semibold text-white text-sm">
                          {exp.description}
                        </h5>
                        <p className="text-slate-500 mt-0.5">
                          Paid by <span className="text-slate-300 font-medium">{payer?.name || 'Unknown'}</span> •{' '}
                          Split by {count} people
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-white text-sm">
                        ৳{exp.amount.toLocaleString('en-BD')}
                      </span>
                      <button
                        onClick={() => handleRemoveExpense(exp.expenseId)}
                        className="p-1.5 text-slate-600 hover:text-rose-400 rounded-lg transition-colors"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Travelers Pills */}
            <div className="p-4 bg-[#141A29] border-t border-slate-800 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Travelers:</span>
              {members.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0E131F] border border-slate-800 text-slate-300"
                >
                  <span>{m.name}</span>
                  {members.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.id)}
                      className="text-slate-500 hover:text-rose-400"
                      title="Remove traveler"
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
