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
  /** Wiederholbare Achievements (spielbedingt, z.B. "3 Rinnenwürfe in einer Partie") dürfen an
   * jedem neuen Tag erneut freigeschaltet werden und geben dann erneut Bonuspunkte. Achievements
   * auf Basis eines Lebenszeit-Rekords/Meilensteins (z.B. "10 Partien insgesamt") bleiben
   * einmalig - der Rekord verschwindet an einem neuen Tag ja nicht wieder, ihn erneut zu
   * "belohnen" wäre ein täglicher Gratispunkt ohne neue Leistung. */
  repeatable: boolean
}

// Teil 15.3
export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'volltreffer', title: 'Volltreffer', description: 'Ein „Alle Neune”-Wurf', bonusPoints: 0.5, repeatable: true },
  {
    id: 'serientaeter',
    title: 'Serientäter',
    description: 'Drei „Alle Neune”-Würfe in Folge innerhalb einer Partie',
    bonusPoints: 1,
    repeatable: true,
  },
  {
    id: 'bahnrand-kenner',
    title: 'Bahnrand-Kenner',
    description: 'Drei Rinnenwürfe innerhalb einer Hausnummer',
    bonusPoints: 0.5,
    repeatable: true,
  },
  {
    id: 'stammgast',
    title: 'Stammgast',
    description: 'Zehn gespielte Partien insgesamt',
    bonusPoints: 1,
    repeatable: false,
  },
  {
    id: 'tiefstapler',
    title: 'Tiefstapler',
    description: 'Bestwert 111 oder niedriger im Modus „Niedrige Hausnummer”',
    bonusPoints: 0.5,
    repeatable: false,
  },
]

function isRepeatable(id: string): boolean {
  return ACHIEVEMENT_DEFS.find((d) => d.id === id)?.repeatable ?? false
}

/** Ohne dateKey (z.B. Anzeige im Trophäenschrank für einmalige Lebenszeit-Achievements): "jemals
 * geschafft". Mit dateKey UND wiederholbarem Achievement: "heute schon wieder geschafft" - so
 * zeigt die Anzeige ein wiederholbares Achievement an einem neuen Tag wieder als gesperrt, bis es
 * erneut geschafft wird. */
export function hasAchievement(stats: PlayerStatistics, id: string, dateKey?: string): boolean {
  if (dateKey && isRepeatable(id)) {
    return stats.achievements.some((a) => a.id === id && dateKeyFor(new Date(a.unlockedAt)) === dateKey)
  }
  return stats.achievements.some((a) => a.id === id)
}

export function grantAchievement(stats: PlayerStatistics, id: string): PlayerStatistics {
  return { ...stats, achievements: [...stats.achievements, { id, unlockedAt: Date.now() }] }
}
