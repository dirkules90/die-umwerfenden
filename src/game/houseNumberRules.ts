import type { DigitSlot, GameMode } from './types'

export const DIGIT_SLOTS: DigitSlot[] = ['hundert', 'zehn', 'einer']

/** Ziffernwert eines Wurfs gemäß Teil 10.3: Rinne = 9 (niedrig) bzw. 0 (hoch). */
export function digitForThrow(pinsDown: number, isGutter: boolean, mode: GameMode): number {
  if (isGutter) return mode === 'niedrig' ? 9 : 0
  return pinsDown
}

export function freeSlots(digits: Partial<Record<DigitSlot, number>>): DigitSlot[] {
  return DIGIT_SLOTS.filter((slot) => digits[slot] === undefined)
}

export function houseNumberFromDigits(digits: Partial<Record<DigitSlot, number>>): number {
  const h = digits.hundert ?? 0
  const z = digits.zehn ?? 0
  const e = digits.einer ?? 0
  return h * 100 + z * 10 + e
}

/** Sortier-Komparator gemäß Optimierungsziel des Modus: bestes Ergebnis zuerst. */
export function compareByMode(a: number, b: number, mode: GameMode): number {
  return mode === 'niedrig' ? a - b : b - a
}
