import { describe, expect, it } from 'vitest'
import { rankParticipants, selectWinners, weeklyDuelBonusPoints, type DuelParticipantRow, type DuelRow } from './duels'

/** Reine Auswertungslogik für Duelle (Teil: Unit-Tests für die Punkte-/Duell-Logik) - genau hier
 * steckte der zuletzt gefundene Bug (Gleichstand-Gewinner bekamen jeweils den VOLLEN statt eines
 * geteilten Punkte-Bonus), der nur durch genaues Code-Lesen auffiel statt durch einen Test. Deckt
 * die Rang-/Gleichstand-Fälle ab, die tryResolveDuel (nicht direkt testbar, da es Supabase-Aufrufe
 * macht) darauf aufbaut. */

function participant(characterId: string, score: number | null): DuelParticipantRow {
  return {
    duel_id: 'duel-1',
    character_id: characterId as DuelParticipantRow['character_id'],
    is_challenger: false,
    response: score === null ? 'pending' : 'accepted',
    score,
    played_at: score === null ? null : new Date().toISOString(),
    payout: null,
    seen: false,
  }
}

function duel(mode: DuelRow['mode']): DuelRow {
  return {
    id: 'duel-1',
    created_at: new Date().toISOString(),
    challenger_id: 'daniel',
    mode,
    stake: 10,
    split_mode: 'winner_takes_all',
    status: 'accepted',
    resolved_at: null,
  }
}

describe('weeklyDuelBonusPoints', () => {
  it('ist 0,5 Punkte je Teilnehmer, ohne Deckel', () => {
    expect(weeklyDuelBonusPoints(2)).toBe(1)
    expect(weeklyDuelBonusPoints(3)).toBe(1.5)
    expect(weeklyDuelBonusPoints(6)).toBe(3)
  })
})

describe('rankParticipants', () => {
  it('sortiert für Hohe Hausnummer absteigend (höher ist besser)', () => {
    const ranked = rankParticipants(duel('hausnummer_hoch'), [
      participant('daniel', 500),
      participant('tobias', 900),
      participant('dirk', 700),
    ])
    expect(ranked.map((p) => p.character_id)).toEqual(['tobias', 'dirk', 'daniel'])
  })

  it('sortiert für Niedrige Hausnummer aufsteigend (niedriger ist besser)', () => {
    const ranked = rankParticipants(duel('hausnummer_niedrig'), [
      participant('daniel', 500),
      participant('tobias', 111),
      participant('dirk', 222),
    ])
    expect(ranked.map((p) => p.character_id)).toEqual(['tobias', 'dirk', 'daniel'])
  })

  it('sortiert für Tannenbaum aufsteigend (weniger Würfe ist besser)', () => {
    const ranked = rankParticipants(duel('tannenbaum'), [
      participant('daniel', 20),
      participant('tobias', 12),
    ])
    expect(ranked.map((p) => p.character_id)).toEqual(['tobias', 'daniel'])
  })

  it('lässt nicht angenommene oder noch nicht gespielte Teilnehmer außen vor', () => {
    const ranked = rankParticipants(duel('hausnummer_hoch'), [
      participant('daniel', 500),
      { ...participant('tobias', null), response: 'declined' },
      participant('dirk', null),
    ])
    expect(ranked.map((p) => p.character_id)).toEqual(['daniel'])
  })
})

describe('selectWinners', () => {
  it('winner_takes_all ohne Gleichstand: nur die/der Erstplatzierte gewinnt', () => {
    const ranked = rankParticipants(duel('hausnummer_hoch'), [
      participant('daniel', 900),
      participant('tobias', 700),
    ])
    const winners = selectWinners(ranked, 1)
    expect(winners.map((p) => p.character_id)).toEqual(['daniel'])
  })

  it('winner_takes_all bei Gleichstand um Platz 1: BEIDE gewinnen und teilen sich den Pott', () => {
    const ranked = rankParticipants(duel('hausnummer_hoch'), [
      participant('daniel', 900),
      participant('tobias', 900),
      participant('dirk', 700),
    ])
    const winners = selectWinners(ranked, 1)
    expect(winners.map((p) => p.character_id).sort()).toEqual(['daniel', 'tobias'])
  })

  it('top2 bei Gleichstand um Platz 1: alle drei an der Spitze zählen, nicht nur 2 Personen', () => {
    // Rang-Gruppen-basiert statt Positions-Abschneidung (siehe Kommentar in duels.ts): ein
    // Gleichstand um den bezahlten letzten Platz zahlt ALLE in dieser Gruppe aus.
    const ranked = rankParticipants(duel('hausnummer_hoch'), [
      participant('daniel', 900),
      participant('tobias', 900),
      participant('dirk', 700),
      participant('fabian', 500),
    ])
    const winners = selectWinners(ranked, 2)
    expect(winners.map((p) => p.character_id).sort()).toEqual(['daniel', 'dirk', 'tobias'])
  })

  it('top2 ohne Gleichstand: genau die besten zwei', () => {
    const ranked = rankParticipants(duel('hausnummer_hoch'), [
      participant('daniel', 900),
      participant('tobias', 700),
      participant('dirk', 500),
    ])
    const winners = selectWinners(ranked, 2)
    expect(winners.map((p) => p.character_id)).toEqual(['daniel', 'tobias'])
  })
})
