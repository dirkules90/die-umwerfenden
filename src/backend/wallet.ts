import { supabase } from './supabaseClient'
import type { CharacterId } from '../game/types'

export interface CoinTransactionRow {
  id: string
  character_id: CharacterId
  amount: number
  reason: string
  meta: Record<string, unknown> | null
  created_at: string
}

/**
 * Bucht eine Münzänderung atomar im Backend (Kontostand + Historien-Eintrag, siehe
 * apply_coin_transaction in supabase/migrations/0001_duels.sql) - wirft bei Fehler (z. B. würde
 * der Kontostand negativ werden, oder das Gerät ist offline), statt still zu scheitern. Aufrufer,
 * denen ein Fehlschlag hier egal sein darf (z. B. Münz-Belohnungen fürs Spielen, die lokal schon
 * gutgeschrieben sind), fangen den Fehler selbst ab; Aufrufer mit echtem Einsatz (Duell-Escrow)
 * müssen ihn behandeln. Netzwerkfehler (z. B. offline) lassen die zugrunde liegende fetch-Promise
 * ablehnen statt ein {error}-Objekt zurückzugeben - deshalb hier explizit try/catch statt nur auf
 * das error-Feld zu prüfen.
 */
export async function syncCoinTransaction(
  characterId: CharacterId,
  amount: number,
  reason: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  if (amount === 0) return
  let result
  try {
    result = await supabase.rpc('apply_coin_transaction', {
      p_character_id: characterId,
      p_amount: amount,
      p_reason: reason,
      p_meta: meta ?? null,
    })
  } catch {
    throw new Error('Keine Verbindung zum Server.')
  }
  if (result.error) throw new Error(result.error.message)
}

/** Best-effort-Variante für Aufrufer, denen ein Fehlschlag (z. B. offline) egal sein darf - der
 * lokale Kontostand bleibt in dem Fall einfach der aktuelle Stand, bis die nächste erfolgreiche
 * Synchronisierung wieder gleichzieht. */
export function syncCoinTransactionBestEffort(
  characterId: CharacterId,
  amount: number,
  reason: string,
  meta?: Record<string, unknown>,
): void {
  void syncCoinTransaction(characterId, amount, reason, meta).catch((err) => {
    console.error('syncCoinTransaction (best effort) failed', reason, err)
  })
}

export async function fetchWalletBalance(characterId: CharacterId): Promise<number | null> {
  try {
    const { data, error } = await supabase.from('wallets').select('coins').eq('character_id', characterId).maybeSingle()
    if (error) throw error
    return data?.coins ?? 0
  } catch (err) {
    console.error('fetchWalletBalance failed', err)
    return null
  }
}

export async function fetchAllWalletBalances(): Promise<Partial<Record<CharacterId, number>>> {
  try {
    const { data, error } = await supabase.from('wallets').select('character_id, coins')
    if (error) throw error
    const result: Partial<Record<CharacterId, number>> = {}
    for (const row of data ?? []) result[row.character_id as CharacterId] = row.coins
    return result
  } catch (err) {
    console.error('fetchAllWalletBalances failed', err)
    return {}
  }
}

export async function fetchCoinHistory(characterId: CharacterId, limit = 100): Promise<CoinTransactionRow[]> {
  try {
    const { data, error } = await supabase
      .from('coin_transactions')
      .select('*')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  } catch (err) {
    console.error('fetchCoinHistory failed', err)
    return []
  }
}

/** Wochenpunkte-Bonus aus gewonnenen Duellen (siehe add_weekly_duel_points) - separat von der
 * lokalen weeklyPoints-Berechnung, weil Duelle geräteübergreifend sind (Teil: Wochenbewertung). */
export async function addWeeklyDuelPoints(characterId: CharacterId, weekKey: string, points: number): Promise<void> {
  if (points === 0) return
  try {
    const { error } = await supabase.rpc('add_weekly_duel_points', {
      p_character_id: characterId,
      p_week_key: weekKey,
      p_points: points,
    })
    if (error) throw error
  } catch (err) {
    console.error('addWeeklyDuelPoints failed', err)
  }
}

export async function fetchWeeklyDuelPoints(weekKey: string): Promise<Partial<Record<CharacterId, number>>> {
  try {
    const { data, error } = await supabase.from('weekly_duel_points').select('character_id, points').eq('week_key', weekKey)
    if (error) throw error
    const result: Partial<Record<CharacterId, number>> = {}
    for (const row of data ?? []) result[row.character_id as CharacterId] = row.points
    return result
  } catch (err) {
    console.error('fetchWeeklyDuelPoints failed', err)
    return {}
  }
}
