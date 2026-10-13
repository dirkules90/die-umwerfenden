import { describe, expect, it } from 'vitest'
import { mergePlayerStatistics } from './playerStats'
import { emptyStatistics } from '../storage/localStorageService'
import type { PlayerStatistics } from '../game/types'

/** Teil: Unit-Tests für die Punkte-/Duell-Logik, erweitert um den Statistik-Cloud-Sync-Merge -
 * die wettbewerbsrelevanten Felder (Bestwerte, Achievements) müssen unter JEDER Argument-Reihen-
 * folge verlustfrei bleiben, sonst könnte ein Gerätewechsel einen Bestwert/ein Achievement
 * "zurückdrehen" statt nur Fortschritt zu verlieren, der ohnehin schon das eigentliche Problem war. */

function stats(overrides: Partial<PlayerStatistics>): PlayerStatistics {
  return { ...emptyStatistics(), ...overrides }
}

describe('mergePlayerStatistics', () => {
  it('nimmt den höheren bestHigh- und den niedrigeren bestLow-/bestTannenbaum-Wert', () => {
    const a = stats({ bestHigh: 700, bestLow: 300, bestTannenbaum: 20 })
    const b = stats({ bestHigh: 900, bestLow: 150, bestTannenbaum: 12 })
    const merged = mergePlayerStatistics(a, b)
    expect(merged.bestHigh).toBe(900)
    expect(merged.bestLow).toBe(150)
    expect(merged.bestTannenbaum).toBe(12)
    // Symmetrisch - das Ergebnis darf nicht von der Argumentreihenfolge abhängen.
    expect(mergePlayerStatistics(b, a)).toEqual(merged)
  })

  it('behandelt null (noch nie gespielt) als "kein Kandidat", nicht als 0', () => {
    const a = stats({ bestHigh: null })
    const b = stats({ bestHigh: 500 })
    expect(mergePlayerStatistics(a, b).bestHigh).toBe(500)
    expect(mergePlayerStatistics(b, a).bestHigh).toBe(500)
    expect(mergePlayerStatistics(a, stats({ bestHigh: null })).bestHigh).toBeNull()
  })

  it('vereinigt Achievements ohne Duplikate, auch wenn beide Seiten dasselbe Ereignis haben', () => {
    const t = Date.now()
    const a = stats({ achievements: [{ id: 'volltreffer', unlockedAt: t }] })
    const b = stats({ achievements: [{ id: 'volltreffer', unlockedAt: t + 500 }, { id: 'stammgast', unlockedAt: t }] })
    const merged = mergePlayerStatistics(a, b)
    expect(merged.achievements.map((x) => x.id).sort()).toEqual(['stammgast', 'volltreffer'])
  })

  it('verliert kein Achievement, das nur auf einer Seite existiert', () => {
    const t = Date.now()
    const a = stats({ achievements: [{ id: 'volltreffer', unlockedAt: t }] })
    const b = stats({ achievements: [] })
    expect(mergePlayerStatistics(a, b).achievements).toHaveLength(1)
    expect(mergePlayerStatistics(b, a).achievements).toHaveLength(1)
  })

  it('übernimmt Streak + Datum vom Stand mit dem aktuelleren Datum, nicht vom höheren Streak', () => {
    // Gerät A ist seit Tagen nicht offen (alter, hoher Streak-Wert von damals), Gerät B hat heute
    // gerade erst gespielt (niedrigerer, aber AKTUELLER Streak) - der aktuelle Stand muss gewinnen.
    const a = stats({ currentStreak: 10, lastPlayedDate: '2026-01-01' })
    const b = stats({ currentStreak: 2, lastPlayedDate: '2026-01-15' })
    const merged = mergePlayerStatistics(a, b)
    expect(merged.currentStreak).toBe(2)
    expect(merged.lastPlayedDate).toBe('2026-01-15')
  })

  it('null-Datum (noch nie gespielt) verliert immer gegen ein vorhandenes Datum', () => {
    const a = stats({ currentStreak: 0, lastPlayedDate: null })
    const b = stats({ currentStreak: 3, lastPlayedDate: '2026-01-15' })
    expect(mergePlayerStatistics(a, b).lastPlayedDate).toBe('2026-01-15')
    expect(mergePlayerStatistics(b, a).lastPlayedDate).toBe('2026-01-15')
  })

  it('Zähler (gamesPlayed etc.) nehmen den höheren Wert', () => {
    const a = stats({ gamesPlayed: 10, perfectThrows: 1 })
    const b = stats({ gamesPlayed: 7, perfectThrows: 3 })
    const merged = mergePlayerStatistics(a, b)
    expect(merged.gamesPlayed).toBe(10)
    expect(merged.perfectThrows).toBe(3)
  })
})
