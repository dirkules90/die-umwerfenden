import type { PlayerStatistics } from './types'
import { weekKeyFor } from './dateKey'

export interface AchievementDef {
  id: string
  title: string
  description: string
  /** Bonuspunkte für den Wochensieger-Score, wenn dieses Achievement in der laufenden Woche
   * freigeschaltet wird (Teil: Tagessieger-Bonus). Bewusst niedrig gehalten, damit die
   * Kategorie-Rangpunkte (Hausnummern, Tannenbaum) den Ausschlag geben. */
  bonusPoints: number
  /** Münzen für den Shop, unabhängig von den Bonuspunkten (Teil: Coin-Shop-Wirtschaft) - grob am
   * Faktor 20 der Bonuspunkte orientiert, damit beide Skalen zueinander passen. */
  coinReward: number
}

// Alle Achievements sind an einer neuen Kalenderwoche wieder erreichbar (siehe
// hasAchievementThisWeek) - vorher galt ein täglicher Reset, was bei Nutzer-Feedback als
// verwirrend auffiel ("ich verstehe diese Tagespunkte nicht, wir können nicht mal eine Woche
// warten"): die Bestenliste selbst läuft ja ohnehin auf Wochenbasis, ein täglicher Achievement-
// Reset war dazu inkonsistent. Jede Kalenderwoche startet jetzt wieder bei null, statt dass
// ältere Spieler durch längst erreichte Lebenszeit-Meilensteine dauerhaft im Vorteil bleiben.
export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'volltreffer', title: 'Volltreffer', description: 'Ein „Alle Neune”-Wurf', bonusPoints: 3, coinReward: 10 },
  {
    id: 'bahnrand-kenner',
    title: 'Bahnrand-Kenner',
    description: 'Drei Rinnenwürfe innerhalb einer Hausnummer',
    bonusPoints: 0.5,
    coinReward: 10,
  },
  {
    id: 'stammgast',
    title: 'Stammgast',
    description: 'Fünf gespielte Partien an einem Tag',
    bonusPoints: 1,
    coinReward: 20,
  },
  {
    id: 'tiefstapler',
    title: 'Tiefstapler',
    description: 'Ergebnis 111 oder niedriger im Modus „Niedrige Hausnummer”',
    bonusPoints: 0.5,
    coinReward: 10,
  },
  {
    id: 'dranbleiber',
    title: 'Dranbleiber',
    description: 'Drei Kalendertage in Folge eingeloggt (egal an welchen Wochentagen)',
    bonusPoints: 1,
    coinReward: 15,
  },
  {
    id: 'wochentreue',
    title: 'Wochentreue',
    description: 'An jedem Tag einer kompletten Kalenderwoche (Montag bis Sonntag) eingeloggt',
    bonusPoints: 2,
    coinReward: 30,
  },
]

function coinRewardFor(id: string): number {
  return ACHIEVEMENT_DEFS.find((d) => d.id === id)?.coinReward ?? 0
}

/** Extra-Münzen, wenn genau das diese Woche im Fokus stehende Achievement geschafft wird (Teil:
 * Wochenaufgabe/Engagement) - kommt oben auf den normalen coinReward drauf. */
export const WEEKLY_CHALLENGE_BONUS_COINS = 15

/** Welches Achievement diese Woche die "Wochenaufgabe" ist: ein fester Rundlauf durch
 * ACHIEVEMENT_DEFS nach Kalenderwoche (Wochen seit der Unix-Epoche modulo Listenlänge) statt
 * wöchentlich neu gewürfelt - so wiederholt sich die Auswahl nicht direkt in der Folgewoche, ist
 * für alle Charaktere gleichzeitig dieselbe (gemeinsames Wochenziel für die Gruppe) und braucht
 * keinen eigenen Speicherplatz, weil sie sich jederzeit erneut aus dem Wochenschlüssel berechnen
 * lässt. weekKey ist das Montagsdatum der Woche (siehe game/dateKey.ts currentWeekKey). */
export function weeklyChallengeIdFor(weekKey: string): string {
  const [y, m, d] = weekKey.split('-').map(Number)
  const weekIndex = Math.floor(Date.UTC(y, m - 1, d) / (7 * 86_400_000))
  const index = ((weekIndex % ACHIEVEMENT_DEFS.length) + ACHIEVEMENT_DEFS.length) % ACHIEVEMENT_DEFS.length
  return ACHIEVEMENT_DEFS[index].id
}

export function weeklyChallengeDef(weekKey: string): AchievementDef {
  const id = weeklyChallengeIdFor(weekKey)
  return ACHIEVEMENT_DEFS.find((d) => d.id === id)!
}

/** Ohne weekKey: "jemals geschafft" (z.B. für Statistik-Zwecke). Mit weekKey: "diese Woche schon
 * geschafft" - jedes Achievement gilt nur für die Kalenderwoche, in der es freigeschaltet wurde,
 * und muss in einer neuen Woche erneut erreicht werden, um wieder Bonuspunkte und den 🏆-Status
 * zu geben. */
export function hasAchievementThisWeek(stats: PlayerStatistics, id: string, weekKey: string): boolean {
  return stats.achievements.some((a) => a.id === id && weekKeyFor(new Date(a.unlockedAt)) === weekKey)
}

export function grantAchievement(stats: PlayerStatistics, id: string): PlayerStatistics {
  return { ...stats, achievements: [...stats.achievements, { id, unlockedAt: Date.now() }] }
}

/** Praktisch für Aufrufer, die nach grantAchievement() direkt wissen wollen, wie viele Münzen für
 * dieses Achievement gutzuschreiben sind (siehe gameStore.ts). */
export { coinRewardFor as achievementCoinReward }
