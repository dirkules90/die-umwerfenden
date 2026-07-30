import type { PlayerStatistics } from './types'
import { dateKeyFor } from './dateKey'

export interface AchievementDef {
  id: string
  title: string
  description: string
  /** Bonuspunkte für den Tagessieger-Score, wenn dieses Achievement am selben Tag
   * freigeschaltet wird (Teil: Tagessieger-Bonus). Bewusst niedrig gehalten, damit die
   * Kategorie-Rangpunkte (Hausnummern, Tannenbaum) den Ausschlag geben. */
  bonusPoints: number
  /** Münzen für den Shop, unabhängig von den Bonuspunkten (Teil: Coin-Shop-Wirtschaft) - grob am
   * Faktor 20 der Bonuspunkte orientiert, damit beide Skalen zueinander passen. */
  coinReward: number
}

// Teil 15.3. Alle Achievements sind an einem neuen Tag wieder erreichbar (siehe hasAchievement) -
// jeder Spieltag startet damit wieder bei null, statt dass ältere Spieler durch längst erreichte
// Lebenszeit-Meilensteine dauerhaft im Vorteil bleiben.
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
]

function coinRewardFor(id: string): number {
  return ACHIEVEMENT_DEFS.find((d) => d.id === id)?.coinReward ?? 0
}

/** Extra-Münzen, wenn genau das heute im Fokus stehende Achievement geschafft wird (Teil:
 * Tagesaufgabe/Engagement) - kommt oben auf den normalen coinReward drauf. */
export const DAILY_CHALLENGE_BONUS_COINS = 15

/** Welches Achievement heute die "Tagesaufgabe" ist: ein fester Rundlauf durch ACHIEVEMENT_DEFS
 * nach Kalendertag (Tage seit der Unix-Epoche modulo Listenlänge) statt täglich neu gewürfelt -
 * so wiederholt sich die Auswahl nicht direkt am Folgetag, ist für alle Charaktere gleichzeitig
 * dieselbe (gemeinsames Tagesziel für die Gruppe) und braucht keinen eigenen Speicherplatz, weil
 * sie sich jederzeit erneut aus dem Datum berechnen lässt. */
export function dailyChallengeIdFor(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dayIndex = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
  const index = ((dayIndex % ACHIEVEMENT_DEFS.length) + ACHIEVEMENT_DEFS.length) % ACHIEVEMENT_DEFS.length
  return ACHIEVEMENT_DEFS[index].id
}

export function dailyChallengeDef(dateKey: string): AchievementDef {
  const id = dailyChallengeIdFor(dateKey)
  return ACHIEVEMENT_DEFS.find((d) => d.id === id)!
}

/** Ohne dateKey: "jemals geschafft" (z.B. für Statistik-Zwecke). Mit dateKey: "heute schon
 * geschafft" - jedes Achievement gilt nur für den Tag, an dem es freigeschaltet wurde, und muss
 * an einem neuen Tag erneut erreicht werden, um wieder Bonuspunkte und den 🏆-Status zu geben. */
export function hasAchievement(stats: PlayerStatistics, id: string, dateKey?: string): boolean {
  if (dateKey) {
    return stats.achievements.some((a) => a.id === id && dateKeyFor(new Date(a.unlockedAt)) === dateKey)
  }
  return stats.achievements.some((a) => a.id === id)
}

export function grantAchievement(stats: PlayerStatistics, id: string): PlayerStatistics {
  return { ...stats, achievements: [...stats.achievements, { id, unlockedAt: Date.now() }] }
}

/** Praktisch für Aufrufer, die nach grantAchievement() direkt wissen wollen, wie viele Münzen für
 * dieses Achievement gutzuschreiben sind (siehe gameStore.ts). */
export { coinRewardFor as achievementCoinReward }
