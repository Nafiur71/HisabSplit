import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  UserPlus,
  Trash2,
  Clock,
  Sparkles,
  Send,
  AlertCircle,
  Plus,
  Check,
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
    <div className="space-y-6 max-w-4xl mx-auto">
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

      {/* Hero Split Card */}
      <div
        className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 border transition-all duration-300 ${
          isFlashing
            ? 'bg-emerald-950/30 border-emerald-400/80 shadow-[0_0_35px_-5px_rgba(16,185,129,0.3)]'
            : 'bg-[#0E131F] border-slate-800/80 shadow-xl'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/60">
          <div>
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
              className="text-xl sm:text-2xl font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-emerald-400 focus:outline-none transition-colors"
            />
          </div>

          {/* Rate & Duration Pill */}
          <div className="flex items-center gap-2 bg-[#141A29] px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={durationHours}
              onChange={(e) =>
                handleHourlyRateChange(hourlyRate, Number(e.target.value))
              }
              className="bg-transparent text-slate-200 focus:outline-none"
            >
              <option value={1} className="bg-[#141A29]">1.0 hr</option>
              <option value={1.5} className="bg-[#141A29]">1.5 hrs</option>
              <option value={2} className="bg-[#141A29]">2.0 hrs</option>
              <option value={2.5} className="bg-[#141A29]">2.5 hrs</option>
              <option value={3} className="bg-[#141A29]">3.0 hrs</option>
            </select>
            <span className="text-slate-600">•</span>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) =>
                handleHourlyRateChange(Number(e.target.value), durationHours)
              }
              className="w-16 bg-transparent text-slate-200 font-mono text-right focus:outline-none"
            />
            <span className="text-slate-400">৳/hr</span>
          </div>
        </div>

        {/* Big Numbers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 items-center">
          {/* Main Active Player Share */}
          <div className="sm:col-span-2">
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

          {/* Total Bill Mini Box */}
          <div className="bg-[#141A29] p-4 rounded-2xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Turf Bill</span>
              <span className="font-mono text-white font-bold">
                ৳{splitResult.totalTurfBill.toLocaleString('en-BD')}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Collected</span>
              <span className="font-mono text-emerald-400 font-semibold">
                ৳{splitResult.totalCollected.toLocaleString('en-BD')}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Remaining Due</span>
              <span className="font-mono text-amber-400 font-semibold">
                ৳{splitResult.totalPending.toLocaleString('en-BD')}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
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
        </div>
      </div>

      {/* Squad List Header */}
      <div className="bg-[#0E131F] rounded-3xl border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span>Squad & Attendance ({players.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Switch any player off if they drop out — split re-balances instantly.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {splitResult.unpaidCount > 0 && (
              <button
                onClick={() => {
                  const unpaid = players.find((p) => p.isPlaying && !p.hasPaid);
                  if (unpaid) {
                    onOpenMFS({
                      amount: splitResult.perPlayerAmount,
                      reason: `${venueName} share`,
                      recipientName: unpaid.name,
                      recipientPhone: unpaid.phone,
                    });
                  }
                }}
                className="px-3 py-1.5 bg-[#E2136E]/15 hover:bg-[#E2136E]/25 border border-[#E2136E]/30 text-[#E2136E] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Request Unpaid ({splitResult.unpaidCount})</span>
              </button>
            )}

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
              title="Add Player"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
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
              className="flex-1 min-w-[160px] bg-[#0E131F] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
            />
            <input
              type="text"
              placeholder="bKash / Nagad number (optional)"
              value={newPlayerPhone}
              onChange={(e) => setNewPlayerPhone(e.target.value)}
              className="w-44 bg-[#0E131F] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
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
                className={`p-4 flex items-center justify-between gap-3 transition-colors ${
                  !isPlaying
                    ? 'bg-slate-900/40 opacity-60'
                    : 'hover:bg-slate-800/20'
                }`}
              >
                {/* Left: Avatar + Name */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase border ${
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
                    <div className="text-xs text-slate-500 font-mono">
                      {player.phone || 'No phone'}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2.5">
                  {/* Status Switch (Playing / Dropped) */}
                  <button
                    onClick={() => handleTogglePlaying(player.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all border ${
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
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1 ${
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
                      className="p-1.5 text-slate-400 hover:text-[#E2136E] rounded-lg hover:bg-slate-800 transition-colors"
                      title="Send MFS Reminder"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => handleRemovePlayer(player.id)}
                    className="p-1.5 text-slate-600 hover:text-rose-400 rounded-lg transition-colors"
                    title="Remove"
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
  );
};
