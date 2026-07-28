import type { GameMode } from './types'
import { TANNENBAUM_ROWS } from './tannenbaumRules'

/**
 * Münzvergabe (Teil: Coin-Shop-Wirtschaft). Konzept:
 *
 * - Für jede abgeschlossene Partie (Hausnummer hoch/niedrig, Tannenbaum) gibt es Münzen,
 *   gestaffelt nach Leistung: ein besseres Ergebnis gibt spürbar mehr Münzen als ein
 *   schwaches, aber JEDE Partie gibt mindestens eine Teilnahme-Mindestmenge (siehe
 *   HAUSNUMMER_MIN/TANNENBAUM_FLOOR) - niemand geht leer aus.
 * - Tannenbaum-Partien dauern deutlich länger als eine einzelne Hausnummer-Partie (mehrere
 *   Würfe bis alle 9 Zahlen abgehakt sind, siehe tannenbaumRules.ts), deshalb liegt die
 *   Tannenbaum-Ausbeute für ein durchschnittliches Ergebnis bei etwa dem Dreifachen einer
 *   durchschnittlichen Hausnummer-Partie.
 * - Achievements geben zusätzlich einen festen Münzbetrag (siehe achievements.ts), unabhängig
 *   von der Partie, in der sie freigeschaltet wurden.
 * - Der/die Wochensieger (höchste Punktsumme über eine volle, abgeschlossene Kalenderwoche,
 *   siehe gameStore.ts processDailyAndWeeklyRollover) bekommen zusätzlich einen einmaligen
 *   Bonus pro Woche statt eines täglichen Bonus - das lohnt sich als mittelfristiges Ziel,
 *   ohne jeden einzelnen Tag zusätzlich zu belohnen.
 *
 * Alle Werte sind bewusst als benannte Konstanten hier gesammelt, statt verstreut im Store, um
 * sie an einer Stelle austarieren zu können, sobald echtes Spielverhalten vorliegt.
 */

const HAUSNUMMER_MIN = 2
const HAUSNUMMER_PER_POINT = 1 / 40 // 1 Münze pro 40 Punkte Richtung Bestwert (max. Score 999)

/** @param houseNumber 0-999, bei "hoch" ist höher besser, bei "niedrig" ist niedriger besser. */
export function coinsForHausnummer(mode: GameMode, houseNumber: number): number {
  const scoreTowardBest = mode === 'hoch' ? houseNumber : 999 - houseNumber
  return HAUSNUMMER_MIN + Math.floor(scoreTowardBest * HAUSNUMMER_PER_POINT)
}

const TANNENBAUM_MIN_THROWS = TANNENBAUM_ROWS.reduce((sum, r) => sum + r.count, 0)
const TANNENBAUM_BEST = 75 // Bestmögliches Ergebnis: TANNENBAUM_MIN_THROWS Würfe, keiner verpufft
const TANNENBAUM_STEP = 3 // Abzug je Wurf über dem Minimum hinaus
const TANNENBAUM_FLOOR = 6 // Teilnahme-Mindestmenge, auch bei sehr vielen Würfen

export function coinsForTannenbaum(throwCount: number): number {
  const extraThrows = Math.max(0, throwCount - TANNENBAUM_MIN_THROWS)
  return Math.max(TANNENBAUM_FLOOR, TANNENBAUM_BEST - extraThrows * TANNENBAUM_STEP)
}

/** Einmaliger Bonus für den/die Wochensieger einer vollständig abgeschlossenen Kalenderwoche,
 * bei Gleichstand anteilig aufgeteilt (wie schon beim Tagessieger-Punkt in der Allzeit-Liste). */
export const WEEKLY_WINNER_COIN_BONUS = 120
