import type { TurfPlayer, TurfSplitResult } from '../types';

/**
 * MODULE A: Turf Match Splitter Pure Controller
 * 
 * Divides totalTurfBill ONLY by the count of active players (isPlaying === true).
 * Ensures mathematical safety and reactive updates when players drop out.
 */
export function calculateTurfSplit(
  totalTurfBill: number,
  players: TurfPlayer[]
): TurfSplitResult {
  const safeTotalBill = Math.max(0, Number(totalTurfBill) || 0);
  const totalPlayersCount = players.length;
  const activePlayers = players.filter((p) => p.isPlaying === true);
  const activePlayersCount = activePlayers.length;

  // Prevent divide-by-zero if all players drop out
  const perPlayerAmount =
    activePlayersCount > 0 ? Math.ceil(safeTotalBill / activePlayersCount) : 0;

  // Count paid and unpaid among active players
  const activePaidPlayers = activePlayers.filter((p) => p.hasPaid);
  const paidCount = activePaidPlayers.length;
  const unpaidCount = activePlayersCount - paidCount;

  const totalCollected = paidCount * perPlayerAmount;
  const totalPending = Math.max(0, safeTotalBill - totalCollected);

  return {
    totalTurfBill: safeTotalBill,
    activePlayersCount,
    totalPlayersCount,
    perPlayerAmount,
    totalCollected,
    totalPending,
    paidCount,
    unpaidCount,
  };
}

/**
 * Toggle a player's isPlaying status (active / dropped out)
 */
export function togglePlayerPlayingAction(
  players: TurfPlayer[],
  playerId: string
): TurfPlayer[] {
  return players.map((player) =>
    player.id === playerId ? { ...player, isPlaying: !player.isPlaying } : player
  );
}

/**
 * Toggle a player's hasPaid status
 */
export function togglePlayerPaidAction(
  players: TurfPlayer[],
  playerId: string
): TurfPlayer[] {
  return players.map((player) =>
    player.id === playerId ? { ...player, hasPaid: !player.hasPaid } : player
  );
}

/**
 * Add a new player to the turf squad
 */
export function addTurfPlayerAction(
  players: TurfPlayer[],
  name: string,
  phone?: string
): TurfPlayer[] {
  const trimmedName = name.trim();
  if (!trimmedName) return players;

  const newPlayer: TurfPlayer = {
    id: `tp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: trimmedName,
    phone: phone?.trim() || '',
    isPlaying: true,
    hasPaid: false,
  };

  return [...players, newPlayer];
}

/**
 * Remove a player from the turf squad
 */
export function removeTurfPlayerAction(
  players: TurfPlayer[],
  playerId: string
): TurfPlayer[] {
  return players.filter((player) => player.id !== playerId);
}

/**
 * Calculate total turf bill from hourly rate and duration
 */
export function calculateBillFromHourlyRate(
  hourlyRate: number,
  durationHours: number
): number {
  const safeRate = Math.max(0, Number(hourlyRate) || 0);
  const safeHours = Math.max(0, Number(durationHours) || 0);
  return Math.round(safeRate * safeHours);
}
