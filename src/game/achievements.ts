import type { PlayerStatistics } from './types'

export interface AchievementDef {
  id: string
  title: string
  description: string
  /** Bonuspunkte für den Tagessieger-Score, wenn dieses Achievement am selben Tag
   * freigeschaltet wird (Teil: Tagessieger-Bonus). Bewusst niedrig gehalten, damit die
   * Kategorie-Rangpunkte (Hausnummern, Tannenbaum) den Ausschlag geben. */
  bonusPoints: number
}

// Teil 15.3
export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'volltreffer', title: 'Volltreffer', description: 'Erster „Alle Neune”-Wurf überhaupt', bonusPoints: 0.5 },
  {
    id: 'serientaeter',
    title: 'Serientäter',
    description: 'Drei „Alle Neune”-Würfe in Folge innerhalb einer Partie',
    bonusPoints: 1,
  },
  {
    id: 'bahnrand-kenner',
    title: 'Bahnrand-Kenner',
    description: 'Drei Rinnenwürfe innerhalb einer Hausnummer',
    bonusPoints: 0.5,
  },
  { id: 'stammgast', title: 'Stammgast', description: 'Zehn gespielte Partien insgesamt', bonusPoints: 1 },
  {
    id: 'tiefstapler',
    title: 'Tiefstapler',
    description: 'Bestwert 111 oder niedriger im Modus „Niedrige Hausnummer”',
    bonusPoints: 0.5,
  },
]

export function hasAchievement(stats: PlayerStatistics, id: string): boolean {
  return stats.achievements.some((a) => a.id === id)
}

export function grantAchievement(stats: PlayerStatistics, id: string): PlayerStatistics {
  if (hasAchievement(stats, id)) return stats
  return { ...stats, achievements: [...stats.achievements, { id, unlockedAt: Date.now() }] }
}
