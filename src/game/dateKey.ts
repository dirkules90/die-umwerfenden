/** Tagesschlüssel im Format JJJJ-MM-TT, lokale Zeitzone des Geräts (Teil: Tagessieger). */
export function dateKeyFor(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function todayKey(): string {
  return dateKeyFor(new Date())
}

/** Montag der Woche, in der `date` liegt (Teil: Wochensieger-Münzbonus) - als Datum, nicht als
 * ISO-Wochennummer, damit kein Sonderfall für Jahresgrenzen/Wochennummerierung nötig ist. */
export function mondayOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diffToMonday)
  return d
}

/** Wochenschlüssel = Datum des Montags dieser Woche im JJJJ-MM-TT-Format - ändert sich also genau
 * einmal pro Woche und ist stabil vergleichbar wie todayKey(). */
export function weekKeyFor(date: Date): string {
  return dateKeyFor(mondayOfWeek(date))
}

export function currentWeekKey(): string {
  return weekKeyFor(new Date())
}
