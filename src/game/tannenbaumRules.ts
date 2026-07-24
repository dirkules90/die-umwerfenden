/** Zahlenverteilung des Tannenbaums, von unten (Stamm) nach oben (Spitze): Teil 10.5.
 * Bewusst getrimmt (9 statt vorher 15 Zahlen) - eine ganze Partie dauerte im Vergleich zu
 * Hausnummer/Tannenbaum deutlich zu lange, bis alle Werte abgehakt waren. */
export const TANNENBAUM_ROWS: { value: number; count: number; trunk: boolean }[] = [
  { value: 2, count: 1, trunk: true },
  { value: 3, count: 1, trunk: true },
  { value: 4, count: 3, trunk: false },
  { value: 5, count: 2, trunk: false },
  { value: 6, count: 1, trunk: false },
  { value: 7, count: 1, trunk: false },
]

export const TANNENBAUM_VALUES = TANNENBAUM_ROWS.map((r) => r.value)

export function initialTannenbaumRemaining(): Record<number, number> {
  const remaining: Record<number, number> = {}
  for (const row of TANNENBAUM_ROWS) remaining[row.value] = row.count
  return remaining
}

export function isTannenbaumComplete(remaining: Record<number, number>): boolean {
  return TANNENBAUM_VALUES.every((v) => remaining[v] === 0)
}

/** Ein Wurfergebnis hakt automatisch eine noch offene Zahl ab, sofern diese noch nicht
 * vollständig abgehakt ist. Werte außerhalb 2-7 (z. B. Rinne oder Alle-Neune) verpuffen. */
export function applyTannenbaumThrow(remaining: Record<number, number>, pinsDown: number): Record<number, number> {
  if (!(pinsDown in remaining) || remaining[pinsDown] <= 0) return remaining
  return { ...remaining, [pinsDown]: remaining[pinsDown] - 1 }
}
