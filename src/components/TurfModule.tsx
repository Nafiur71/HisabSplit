import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  UserPlus,
  Trash2,
  Clock,
  Sparkles,
  Send,
  AlertCircle,
  Plus,
  Check,
  Users,
} from 'lucide-react';
import type { TurfPlayer, TurfState } from '../types';
import {
  calculateTurfSplit,
  togglePlayerPlayingAction,
  togglePlayerPaidAction,
  addTurfPlayerAction,
  removeTurfPlayerAction,
  calculateBillFromHourlyRate,
} from '../controllers/turfController';
import { db } from '../db/db';

interface TurfModuleProps {
  initialState: TurfState;
  onOpenMFS: (opts: {
    amount: number;
    reason: string;
    recipientName?: string;
    recipientPhone?: string;
  }) => void;
}

export const TurfModule: React.FC<TurfModuleProps> = ({
  initialState,
  onOpenMFS,
}) => {
  const [totalTurfBill, setTotalTurfBill] = useState<number>(
    initialState.totalTurfBill || 3200
  );
  const [hourlyRate, setHourlyRate] = useState<number>(
    initialState.hourlyRate || 1600
  );
  const [durationHours, setDurationHours] = useState<number>(
    initialState.durationHours || 2
  );
  const [venueName, setVenueName] = useState<string>(
    initialState.venueName || 'Bashundhara Kings Turf'
  );
  const [players, setPlayers] = useState<TurfPlayer[]>(initialState.players || []);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPlayerPhone, setNewPlayerPhone] = useState<string>('');

  // Flash animation state when players drop out
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const prevActiveCount = useRef<number>(
    players.filter((p) => p.isPlaying).length
  );

  const splitResult = calculateTurfSplit(totalTurfBill, players);

  useEffect(() => {
    const updatedState: TurfState & { id: string } = {
      id: 'current-turf',
      venueName,
      totalTurfBill,
      hourlyRate,
      durationHours,
      players,
    };
    db.turf_state.put(updatedState).catch(console.error);
  }, [totalTurfBill, hourlyRate, durationHours, venueName, players]);

  useEffect(() => {
    const currentActiveCount = players.filter((p) => p.isPlaying).length;
    if (prevActiveCount.current !== currentActiveCount) {
      setIsFlashing(true);
      if (currentActiveCount < prevActiveCount.current) {
        setFlashMessage(
          `Player dropped out. Split dynamically recalculated for ${currentActiveCount} active players.`
        );
      } else {
        setFlashMessage(
          `Player joined. Split reduced across ${currentActiveCount} active players.`
        );
      }

      const timer = setTimeout(() => setIsFlashing(false), 900);
      const msgTimer = setTimeout(() => setFlashMessage(null), 3500);

      prevActiveCount.current = currentActiveCount;
      return () => {
        clearTimeout(timer);
        clearTimeout(msgTimer);
      };
    }
  }, [players]);

  // Confetti when all paid
  useEffect(() => {
    if (
      splitResult.activePlayersCount > 0 &&
      splitResult.unpaidCount === 0 &&
      splitResult.totalPending === 0
    ) {
      confetti({
        particleCount: 45,
        spread: 55,
        origin: { y: 0.6 },
        colors: ['#10B981', '#00FF66', '#E2136E'],
      });
    }
  }, [splitResult.unpaidCount, splitResult.activePlayersCount, splitResult.totalPending]);

  const handleTogglePlaying = (playerId: string) => {
    setPlayers((prev) => togglePlayerPlayingAction(prev, playerId));
  };

  const handleTogglePaid = (playerId: string) => {
    setPlayers((prev) => togglePlayerPaidAction(prev, playerId));
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    setPlayers((prev) => addTurfPlayerAction(prev, newPlayerName, newPlayerPhone));
    setNewPlayerName('');
    setNewPlayerPhone('');
    setShowAddForm(false);
  };

  const handleRemovePlayer = (playerId: string) => {
    setPlayers((prev) => removeTurfPlayerAction(prev, playerId));
  };

  const handleHourlyRateChange = (rate: number, hours: number) => {
    setHourlyRate(rate);
    setDurationHours(hours);
    setTotalTurfBill(calculateBillFromHourlyRate(rate, hours));
  };

  return (
    <div className="w-full space-y-6">
      {/* Dropout Notification Toast */}
      {flashMessage && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-300 animate-fade-in shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium">{flashMessage}</span>
          </div>
          <button
            onClick={() => setFlashMessage(null)}
            className="text-amber-400 hover:text-amber-200 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Full Page 2-Column Responsive Dashboard (100% Width) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start w-full">
        {/* Left Column: Hero Split Card & Slot Parameters (col-span-5 / xl:col-span-4) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <div
            className={`relative overflow-hidden rounded-3xl p-6 sm:p-7 border transition-all duration-300 ${
              isFlashing
                ? 'bg-emerald-950/30 border-emerald-400/80 shadow-[0_0_35px_-5px_rgba(16,185,129,0.3)]'
                : 'bg-[#0E131F] border-slate-800/80 shadow-xl'
            }`}
          >
            <div className="pb-5 border-b border-slate-800/60">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Turf Match Splitter
                </span>
              </div>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="w-full text-xl sm:text-2xl font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-emerald-400 focus:outline-none transition-colors"
              />
            </div>

            {/* Per Active Player Share Callout */}
            <div className="py-6 border-b border-slate-800/60">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Per Active Player Share</span>
                {isFlashing && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-mono animate-pulse">
                    UPDATED
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight font-mono">
                  ৳{splitResult.perPlayerAmount.toLocaleString('en-BD')}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ person</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Dividing total bill strictly among{' '}
                <strong className="text-white">{splitResult.activePlayersCount} active</strong> players
                ({splitResult.totalPlayersCount - splitResult.activePlayersCount} dropped out).
              </p>
            </div>

            {/* Slot Details & Collection Status */}
            <div className="pt-5 space-y-4">
              {/* Rate and Time */}
              <div className="flex items-center justify-between bg-[#141A29] p-3 rounded-2xl border border-slate-800 text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Slot Time & Rate
                </span>
                <div className="flex items-center gap-2 font-mono">
                  <select
                    value={durationHours}
                    onChange={(e) =>
                      handleHourlyRateChange(hourlyRate, Number(e.target.value))
                    }
                    className="bg-transparent text-white focus:outline-none font-bold"
                  >
                    <option value={1} className="bg-[#141A29]">1.0 hr</option>
                    <option value={1.5} className="bg-[#141A29]">1.5 hrs</option>
                    <option value={2} className="bg-[#141A29]">2.0 hrs</option>
                    <option value={2.5} className="bg-[#141A29]">2.5 hrs</option>
                    <option value={3} className="bg-[#141A29]">3.0 hrs</option>
                  </select>
                  <span className="text-slate-600">@</span>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) =>
                      handleHourlyRateChange(Number(e.target.value), durationHours)
                    }
                    className="w-16 bg-transparent text-white text-right focus:outline-none font-bold"
                  />
                  <span className="text-slate-400">৳/hr</span>
                </div>
              </div>

              {/* Total Bill Box */}
              <div className="bg-[#141A29] p-4 rounded-2xl border border-slate-800/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Total Turf Ground Bill</span>
                  <span className="font-mono text-white font-bold text-sm">
                    ৳{splitResult.totalTurfBill.toLocaleString('en-BD')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Collected ({splitResult.paidCount} paid)</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    ৳{splitResult.totalCollected.toLocaleString('en-BD')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Pending Due ({splitResult.unpaidCount} unpaid)</span>
                  <span className="font-mono text-amber-400 font-semibold">
                    ৳{splitResult.totalPending.toLocaleString('en-BD')}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-emerald-400 h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${
                        splitResult.activePlayersCount > 0
                          ? (splitResult.paidCount / splitResult.activePlayersCount) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Quick Action Button for unpaid players */}
              {splitResult.unpaidCount > 0 && (
                <button
                  onClick={() => {
                    const unpaid = players.find((p) => p.isPlaying && !p.hasPaid);
                    if (unpaid) {
                      onOpenMFS({
                        amount: splitResult.perPlayerAmount,
                        reason: `${venueName} match share`,
                        recipientName: unpaid.name,
                        recipientPhone: unpaid.phone,
                      });
                    }
                  }}
                  className="w-full py-2.5 bg-[#E2136E] hover:bg-[#C70059] text-white text-xs font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Request Payment for {splitResult.unpaidCount} Unpaid Players</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Squad & Attendance List (col-span-7 / xl:col-span-8) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="bg-[#0E131F] rounded-3xl border border-slate-800/80 overflow-hidden shadow-xl">
            <div className="p-5 sm:p-6 border-b border-slate-800/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Squad & Attendance ({players.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Toggle any player dropped — split re-balances dynamically for active players.
                </p>
              </div>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3 py-1.5 bg-[#141A29] hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add Player</span>
              </button>
            </div>

            {/* Expandable Add Player Bar */}
            {showAddForm && (
              <form
                onSubmit={handleAddPlayer}
                className="p-4 bg-[#141A29] border-b border-slate-800 flex flex-wrap gap-2.5 items-center animate-fade-in"
              >
                <input
                  type="text"
                  placeholder="Player name (e.g. Siam / Shakib)"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="flex-1 min-w-[160px] bg-[#0E131F] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
                <input
                  type="text"
                  placeholder="bKash / Nagad number (optional)"
                  value={newPlayerPhone}
                  onChange={(e) => setNewPlayerPhone(e.target.value)}
                  className="w-48 bg-[#0E131F] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>
            )}

            {/* Clean Player List Rows */}
            <div className="divide-y divide-slate-800/60">
              {players.map((player) => {
                const isPlaying = player.isPlaying;
                const hasPaid = player.hasPaid;

                return (
                  <div
                    key={player.id}
                    className={`p-4 sm:p-5 flex items-center justify-between gap-3 transition-colors ${
                      !isPlaying
                        ? 'bg-slate-900/40 opacity-60'
                        : 'hover:bg-slate-800/20'
                    }`}
                  >
                    {/* Left: Avatar + Name + Phone */}
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs uppercase border ${
                          !isPlaying
                            ? 'border-slate-800 text-slate-500 bg-slate-900'
                            : hasPaid
                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                            : 'border-slate-700 text-slate-300 bg-[#141A29]'
                        }`}
                      >
                        {player.name.substring(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {player.name}
                          </span>
                          {!isPlaying && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                              Dropped Out
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {player.phone || 'No phone'}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2.5">
                      {/* Status Switch (Playing / Dropped) */}
                      <button
                        onClick={() => handleTogglePlaying(player.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                          isPlaying
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:border-rose-500/40 hover:text-rose-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-emerald-300'
                        }`}
                      >
                        {isPlaying ? 'Playing' : 'Dropped'}
                      </button>

                      {/* Paid / Unpaid Button (Only for active players) */}
                      {isPlaying && (
                        <button
                          onClick={() => handleTogglePaid(player.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1 ${
                            hasPaid
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-amber-500/10 border-amber-500/25 text-amber-300 hover:bg-amber-500/20'
                          }`}
                        >
                          {hasPaid && <Check className="w-3 h-3" />}
                          <span>{hasPaid ? 'Paid' : 'Unpaid'}</span>
                        </button>
                      )}

                      {/* MFS Button */}
                      {isPlaying && !hasPaid && (
                        <button
                          onClick={() =>
                            onOpenMFS({
                              amount: splitResult.perPlayerAmount,
                              reason: `${venueName} share`,
                              recipientName: player.name,
                              recipientPhone: player.phone,
                            })
                          }
                          className="p-2 text-slate-400 hover:text-[#E2136E] rounded-xl hover:bg-slate-800 transition-colors"
                          title="Send MFS Reminder"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={() => handleRemovePlayer(player.id)}
                        className="p-2 text-slate-600 hover:text-rose-400 rounded-xl transition-colors"
                        title="Remove player"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
