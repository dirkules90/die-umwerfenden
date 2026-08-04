import { supabase } from './supabaseClient'
import { syncCoinTransaction, syncCoinTransactionBestEffort, addWeeklyDuelPoints } from './wallet'
import type { CharacterId } from '../game/types'
import { weekKeyFor } from '../game/dateKey'

export type DuelMode = 'hausnummer_hoch' | 'hausnummer_niedrig' | 'tannenbaum'
export type DuelSplitMode = 'winner_takes_all' | 'top2' | 'top3'
export type DuelStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed'
export type DuelResponse = 'pending' | 'accepted' | 'declined'

export interface DuelParticipantRow {
  duel_id: string
  character_id: CharacterId
  is_challenger: boolean
  response: DuelResponse
  score: number | null
  played_at: string | null
  payout: number | null
  seen: boolean
}

export interface DuelRow {
  id: string
  created_at: string
  challenger_id: CharacterId
  mode: DuelMode
  stake: number
  split_mode: DuelSplitMode
  status: DuelStatus
  resolved_at: string | null
}

export interface Duel extends DuelRow {
  participants: DuelParticipantRow[]
}

const SPLIT_COUNT: Record<DuelSplitMode, number> = { winner_takes_all: 1, top2: 2, top3: 3 }

const NETWORK_ERROR = 'Keine Verbindung zum Server. Bitte Internetverbindung prüfen und erneut versuchen.'

/** Wochenpunkte-Bonus für Duell-Gewinner (Teil: Wochenbewertung) - 0,5 Punkte pro Teilnehmer ab dem
 * zweiten, gedeckelt bei 2,5 (bei maximal 6 Charakteren in der Gruppe ohnehin die natürliche
 * Obergrenze) - bewusst klein gehalten, der Haupt-Reiz eines Duells ist der Münz-Einsatz, nicht die
 * Bestenliste (Nutzer-Feedback: "Fördert auf jeden Fall das Spiel", aber nicht dominant). */
export function weeklyDuelBonusPoints(participantCount: number): number {
  return Math.min(0.5 * (participantCount - 1), 2.5)
}

/** Netzwerkfehler (z. B. offline) lassen die zugrunde liegenden Supabase-Aufrufe die Promise
 * ablehnen statt ein {error}-Objekt zurückzugeben - jede exportierte Funktion in dieser Datei
 * kapselt ihren Ablauf deshalb in try/catch, statt sich nur auf geprüfte error-Felder zu
 * verlassen (siehe auch backend/wallet.ts). */
async function fetchDuel(id: string): Promise<Duel | null> {
  try {
    const { data: duel, error } = await supabase.from('duels').select('*').eq('id', id).maybeSingle()
    if (error || !duel) return null
    const { data: participants } = await supabase.from('duel_participants').select('*').eq('duel_id', id)
    return { ...duel, participants: participants ?? [] }
  } catch (err) {
    console.error('fetchDuel failed', err)
    return null
  }
}

/** Alle Duelle, an denen dieser Charakter beteiligt ist (Herausforderer oder Herausgeforderter),
 * neueste zuerst. */
export async function fetchMyDuels(characterId: CharacterId): Promise<Duel[]> {
  try {
    const { data: myParticipations, error } = await supabase
      .from('duel_participants')
      .select('duel_id')
      .eq('character_id', characterId)
    if (error || !myParticipations || myParticipations.length === 0) return []
    const ids = myParticipations.map((p) => p.duel_id)

    const { data: duels, error: duelsError } = await supabase
      .from('duels')
      .select('*')
      .in('id', ids)
      .order('created_at', { ascending: false })
    if (duelsError || !duels) return []

    const { data: allParticipants } = await supabase.from('duel_participants').select('*').in('duel_id', ids)
    return duels.map((d) => ({ ...d, participants: (allParticipants ?? []).filter((p) => p.duel_id === d.id) }))
  } catch (err) {
    console.error('fetchMyDuels failed', err)
    return []
  }
}

export interface CreateDuelInput {
  challengerId: CharacterId
  opponentIds: CharacterId[]
  mode: DuelMode
  stake: number
  splitMode: DuelSplitMode
}

type Result = { ok: true } | { ok: false; error: string }

/** Legt ein neues Duell an und escrowt sofort den Einsatz des Herausforderers (siehe
 * apply_coin_transaction) - erst mit gedecktem Einsatz ist der Pott am Ende garantiert echt
 * gedeckt, auch wenn der Einsatz zwischen Anfrage und Annahme woanders ausgegeben würde. */
export async function createDuel(input: CreateDuelInput): Promise<Result & { duelId?: string }> {
  try {
    const { data: duel, error } = await supabase
      .from('duels')
      .insert({
        challenger_id: input.challengerId,
        mode: input.mode,
        stake: input.stake,
        split_mode: input.splitMode,
      })
      .select()
      .single()
    if (error || !duel) return { ok: false, error: error?.message ?? 'Duell konnte nicht angelegt werden.' }

    const participantRows: Omit<DuelParticipantRow, 'score' | 'played_at' | 'payout' | 'seen'>[] = [
      { duel_id: duel.id, character_id: input.challengerId, is_challenger: true, response: 'accepted' },
      ...input.opponentIds.map((id) => ({
        duel_id: duel.id,
        character_id: id,
        is_challenger: false,
        response: 'pending' as const,
      })),
    ]
    const { error: participantsError } = await supabase.from('duel_participants').insert(participantRows)
    if (participantsError) {
      await supabase.from('duels').delete().eq('id', duel.id)
      return { ok: false, error: participantsError.message }
    }

    try {
      await syncCoinTransaction(input.challengerId, -input.stake, 'duel_stake', { duelId: duel.id, mode: input.mode })
    } catch (e) {
      await supabase.from('duels').delete().eq('id', duel.id)
      return { ok: false, error: e instanceof Error ? e.message : 'Einsatz konnte nicht abgebucht werden.' }
    }

    return { ok: true, duelId: duel.id }
  } catch (err) {
    console.error('createDuel failed', err)
    return { ok: false, error: NETWORK_ERROR }
  }
}

/** Antwort eines Herausgeforderten: Annahme escrowt sofort dessen Einsatz. Sobald alle Eingeladenen
 * geantwortet haben, wird ausgewertet, ob genug Leute (>= 2, inkl. Herausforderer) angenommen haben
 * - falls nicht (alle abgelehnt), wird der Einsatz des Herausforderers zurückerstattet. */
export async function respondToDuel(duelId: string, characterId: CharacterId, accept: boolean): Promise<Result> {
  try {
    const duel = await fetchDuel(duelId)
    if (!duel) return { ok: false, error: 'Duell nicht gefunden.' }

    if (accept) {
      try {
        await syncCoinTransaction(characterId, -duel.stake, 'duel_stake', { duelId, mode: duel.mode })
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Nicht genug Münzen für diesen Einsatz.' }
      }
    }

    const { error } = await supabase
      .from('duel_participants')
      .update({ response: accept ? 'accepted' : 'declined' })
      .eq('duel_id', duelId)
      .eq('character_id', characterId)
    if (error) return { ok: false, error: error.message }

    const refreshed = await fetchDuel(duelId)
    if (!refreshed) return { ok: true }
    const stillWaiting = refreshed.participants.some((p) => p.response === 'pending')
    if (!stillWaiting) {
      const acceptedCount = refreshed.participants.filter((p) => p.response === 'accepted').length
      if (acceptedCount >= 2) {
        await supabase.from('duels').update({ status: 'accepted' }).eq('id', duelId)
      } else {
        await supabase.from('duels').update({ status: 'declined' }).eq('id', duelId)
        syncCoinTransactionBestEffort(refreshed.challenger_id, refreshed.stake, 'duel_refund', { duelId })
      }
    }
    return { ok: true }
  } catch (err) {
    console.error('respondToDuel failed', err)
    return { ok: false, error: NETWORK_ERROR }
  }
}

/** Herausforderer bricht ein noch offenes (nicht vollständig beantwortetes) Duell ab - erstattet
 * seinen eigenen Einsatz zurück. */
export async function cancelDuel(duelId: string, characterId: CharacterId): Promise<Result> {
  try {
    const duel = await fetchDuel(duelId)
    if (!duel) return { ok: false, error: 'Duell nicht gefunden.' }
    if (duel.challenger_id !== characterId || duel.status !== 'pending') {
      return { ok: false, error: 'Duell kann nicht mehr abgebrochen werden.' }
    }
    await supabase.from('duels').update({ status: 'cancelled' }).eq('id', duelId)
    syncCoinTransactionBestEffort(duel.challenger_id, duel.stake, 'duel_refund', { duelId })
    return { ok: true }
  } catch (err) {
    console.error('cancelDuel failed', err)
    return { ok: false, error: NETWORK_ERROR }
  }
}

function rankParticipants(duel: DuelRow, participants: DuelParticipantRow[]): DuelParticipantRow[] {
  const played = participants.filter((p) => p.response === 'accepted' && p.score !== null)
  const higherIsBetter = duel.mode === 'hausnummer_hoch'
  const better = (a: number, b: number) => (higherIsBetter ? a > b : a < b)
  return [...played].sort((a, b) => (better(a.score!, b.score!) ? -1 : better(b.score!, a.score!) ? 1 : 0))
}

/** Versucht ein Duell abzuschließen, sobald alle Teilnehmer ihr Ergebnis eingereicht haben -
 * optimistischer Lock über den status-Wechsel 'accepted' -> 'completed' (nur das Gerät, dessen
 * Update tatsächlich eine Zeile trifft, wertet aus) verhindert doppelte Pott-Auszahlung, falls zwei
 * Geräte fast gleichzeitig den letzten fehlenden Wurf einreichen. */
async function tryResolveDuel(duelId: string): Promise<void> {
  try {
    const duel = await fetchDuel(duelId)
    if (!duel || duel.status !== 'accepted') return
    const accepted = duel.participants.filter((p) => p.response === 'accepted')
    if (!accepted.every((p) => p.score !== null)) return

    const { data: claimed } = await supabase
      .from('duels')
      .update({ status: 'completed', resolved_at: new Date().toISOString() })
      .eq('id', duelId)
      .eq('status', 'accepted')
      .select()
      .maybeSingle()
    if (!claimed) return

    const ranked = rankParticipants(duel, accepted)
    const pot = duel.stake * accepted.length
    const placeCount = Math.min(SPLIT_COUNT[duel.split_mode], ranked.length)
    const winners = ranked.slice(0, placeCount)
    const share = Math.floor(pot / winners.length)
    let remainder = pot - share * winners.length

    const weekKey = weekKeyFor(new Date())
    const bonusPoints = weeklyDuelBonusPoints(accepted.length)

    for (const p of accepted) {
      const isWinner = winners.some((w) => w.character_id === p.character_id)
      let grossPayout = 0
      if (isWinner) {
        grossPayout = share + (remainder > 0 ? 1 : 0)
        if (remainder > 0) remainder -= 1
        syncCoinTransactionBestEffort(p.character_id, grossPayout, 'duel_win', { duelId, mode: duel.mode })
        void addWeeklyDuelPoints(p.character_id, weekKey, bonusPoints)
      }
      await supabase
        .from('duel_participants')
        .update({ payout: grossPayout - duel.stake })
        .eq('duel_id', duelId)
        .eq('character_id', p.character_id)
    }
  } catch (err) {
    console.error('tryResolveDuel failed', err)
  }
}

/** Ergebnis eines unabhängig gespielten Duell-Durchgangs melden (Teil: Asynchrones Spielen) - löst
 * bei Bedarf direkt die Pott-Auswertung aus, wenn dies der letzte fehlende Wurf war. */
export async function submitDuelScore(duelId: string, characterId: CharacterId, score: number): Promise<void> {
  try {
    await supabase
      .from('duel_participants')
      .update({ score, played_at: new Date().toISOString() })
      .eq('duel_id', duelId)
      .eq('character_id', characterId)
    await tryResolveDuel(duelId)
  } catch (err) {
    console.error('submitDuelScore failed', err)
  }
}

export async function markDuelSeen(duelId: string, characterId: CharacterId): Promise<void> {
  try {
    await supabase.from('duel_participants').update({ seen: true }).eq('duel_id', duelId).eq('character_id', characterId)
  } catch (err) {
    console.error('markDuelSeen failed', err)
  }
}
