import { describe, expect, it } from 'vitest'
import { groupHighscore } from './highscore'
import { emptyStatistics } from '../storage/localStorageService'
import type { CharacterId, PlayerStatistics } from './types'

/** Teil: Unit-Tests für die Punkte-/Duell-Logik - deckt den Allzeit-Bestwert-Gleichstand-Fix ab
 * ("was ist, wenn zwei den gleichen Allzeit-Bestwert haben?"): vorher gewann bei exaktem
 * Gleichstand nur, wer zufällig zuerst in CHARACTER_ORDER stand. */

function statsWith(bestHigh: number | null, bestLow: number | null): PlayerStatistics {
  return { ...emptyStatistics(), bestHigh, bestLow }
}

describe('groupHighscore', () => {
  it('liefert alle Halter des Bestwerts bei Gleichstand', () => {
    const statistics: Partial<Record<CharacterId, PlayerStatistics>> = {
      daniel: statsWith(900, null),
      tobias: statsWith(900, null),
      dirk: statsWith(700, null),
    }
    const result = groupHighscore(statistics, 'hoch')
    expect(result?.value).toBe(900)
    expect(result?.playerNames.sort()).toEqual(['Daniel', 'Tobias'])
  })

  it('niedrigere Hausnummer ist besser im Modus "niedrig"', () => {
    const statistics: Partial<Record<CharacterId, PlayerStatistics>> = {
      daniel: statsWith(null, 500),
      tobias: statsWith(null, 111),
    }
    const result = groupHighscore(statistics, 'niedrig')
    expect(result?.value).toBe(111)
    expect(result?.playerNames).toEqual(['Tobias'])
  })

  it('liefert null, wenn noch niemand in diesem Modus gespielt hat', () => {
    expect(groupHighscore({}, 'hoch')).toBeNull()
  })
})
