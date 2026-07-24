import type { PlayerStatistics } from './types'

export interface AchievementDef {
  id: string
  title: string
  description: string
}

// Teil 15.3
export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'volltreffer', title: 'Volltreffer', description: 'Erster „Alle Neune”-Wurf überhaupt' },
  { id: 'serientaeter', title: 'Serientäter', description: 'Drei „Alle Neune”-Würfe in Folge innerhalb einer Partie' },
  { id: 'bahnrand-kenner', title: 'Bahnrand-Kenner', description: 'Drei Rinnenwürfe innerhalb einer Hausnummer' },
  { id: 'stammgast', title: 'Stammgast', description: 'Zehn gespielte Partien insgesamt' },
  { id: 'hausnummer-meister', title: 'Hausnummer-Meister', description: 'Bestwert 999 im Modus „Hohe Hausnummer”' },
  { id: 'tiefstapler', title: 'Tiefstapler', description: 'Bestwert 000 im Modus „Niedrige Hausnummer”' },
]

export function hasAchievement(stats: PlayerStatistics, id: string): boolean {
  return stats.achievements.some((a) => a.id === id)
}

export function grantAchievement(stats: PlayerStatistics, id: string): PlayerStatistics {
  if (hasAchievement(stats, id)) return stats
  return { ...stats, achievements: [...stats.achievements, { id, unlockedAt: Date.now() }] }
}
