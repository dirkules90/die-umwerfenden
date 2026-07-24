/** Tagesschlüssel im Format JJJJ-MM-TT, lokale Zeitzone des Geräts (Teil: Tagessieger). */
export function dateKeyFor(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function todayKey(): string {
  return dateKeyFor(new Date())
}
