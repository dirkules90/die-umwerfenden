import { supabase } from './supabaseClient'
import { weekKeyFor } from '../game/dateKey'
import type { Achievement, CharacterId, PlayerStatistics } from '../game/types'

function pickBetter(a: number | null, b: number | null, better: (x: number, y: number) => boolean): number | null {
  if (a === null) return b
  if (b === null) return a
  return better(a, b) ? a : b
}

/** Vereinigt zwei Achievement-Listen ohne Duplikate (Teil: Statistik-Cloud-Sync) - "dasselbe
 * Achievement" heißt hier gleiche id UND gleiche Kalenderwoche, weil ein Achievement laut
 * game/achievements.ts hasAchievementThisWeek ohnehin nur einmal pro Woche freigeschaltet werden
 * kann; zwei Einträge mit dieser Kombination stammen also vom selben Ereignis, nur auf zwei
 * Geräten unabhängig voneinander protokolliert. */
function unionAchievements(a: Achievement[], b: Achievement[]): Achievement[] {
  const byKey = new Map<string, Achievement>()
  for (const ach of [...a, ...b]) {
    const key = `${ach.id}:${weekKeyFor(new Date(ach.unlockedAt))}`
    const existing = byKey.get(key)
    if (!existing || ach.unlockedAt < existing.unlockedAt) byKey.set(key, ach)
  }
  return [...byKey.values()].sort((x, y) => x.unlockedAt - y.unlockedAt)
}

/** Serie (Streak + letztes Datum) folgt dem Stand mit dem AKTUELLEREN Datum, nicht einfach dem
 * höheren Streak-Wert - ein Gerät, das seit Tagen nicht offen war, hat einen niedrigeren, aber
 * nicht veralteten Streak; der Stand mit dem neueren Datum ist aber immer der korrekte Fortsetzung
 * davon. JJJJ-MM-TT ist lexikografisch sortierbar, ein einfacher String-Vergleich reicht. */
function newerStreak(
  streakA: number,
  dateA: string | null,
  streakB: number,
  dateB: string | null,
): { streak: number; date: string | null } {
  if (dateA === null) return { streak: streakB, date: dateB }
  if (dateB === null) return { streak: streakA, date: dateA }
  return dateA >= dateB ? { streak: streakA, date: dateA } : { streak: streakB, date: dateB }
}

/**
 * Reine, seiteneffektfreie Merge-Funktion (Teil: Statistik-Cloud-Sync, siehe auch
 * dailyWinner.test.ts/duels.test.ts für dasselbe Testmuster) - kombiniert zwei Statistik-Stände
 * (z.B. lokal + zuletzt in der Cloud gespeichert) so, dass KEINE Seite Fortschritt verliert:
 * - Bestwerte (bestHigh/bestLow/bestTannenbaum/longestPerfectStreak) nehmen den jeweils besseren
 *   Wert - korrekt unabhängig von der Reihenfolge, ein "Bestwert" ist per Definition niemals
 *   schlechter als jeder seiner Kandidaten.
 * - Achievements werden vereinigt (siehe unionAchievements).
 * - Serien (currentStreak+lastPlayedDate, loginStreak+lastLoginStreakDate) folgen dem jeweils
 *   aktuelleren Datum (siehe newerStreak).
 * - Reine Anzeige-Zähler (gamesPlayed, totalScoreHigh/countHigh, totalScoreLow/countLow,
 *   perfectThrows, gutterThrows) nehmen den höheren Wert. Das ist KEIN echtes CRDT-Additiv-Merge
 *   (bei echtem Parallel-Spiel auf zwei Geräten zwischen zwei Syncs könnte ein Beitrag so
 *   verloren gehen) - bewusst in Kauf genommen, weil diese Felder rein informativ sind (siehe
 *   ui/screens/WeeklyScreen.tsx "Partien gespielt"/Durchschnitte) und NICHT in die Bestenliste
 *   oder Wochenpunkte einfließen; die wettbewerbsrelevanten Felder (Bestwerte, Achievements) bleiben
 *   dagegen unter jeder Reihenfolge exakt korrekt.
 */
export function mergePlayerStatistics(a: PlayerStatistics, b: PlayerStatistics): PlayerStatistics {
  const playStreak = newerStreak(a.currentStreak, a.lastPlayedDate, b.currentStreak, b.lastPlayedDate)
  const loginStreak = newerStreak(a.loginStreak, a.lastLoginStreakDate, b.loginStreak, b.lastLoginStreakDate)

  return {
    gamesPlayed: Math.max(a.gamesPlayed, b.gamesPlayed),
    bestHigh: pickBetter(a.bestHigh, b.bestHigh, (x, y) => x > y),
    bestLow: pickBetter(a.bestLow, b.bestLow, (x, y) => x < y),
    totalScoreHigh: Math.max(a.totalScoreHigh, b.totalScoreHigh),
    countHigh: Math.max(a.countHigh, b.countHigh),
    totalScoreLow: Math.max(a.totalScoreLow, b.totalScoreLow),
    countLow: Math.max(a.countLow, b.countLow),
    bestTannenbaum: pickBetter(a.bestTannenbaum, b.bestTannenbaum, (x, y) => x < y),
    perfectThrows: Math.max(a.perfectThrows, b.perfectThrows),
    gutterThrows: Math.max(a.gutterThrows, b.gutterThrows),
    longestPerfectStreak: Math.max(a.longestPerfectStreak, b.longestPerfectStreak),
    achievements: unionAchievements(a.achievements, b.achievements),
    currentStreak: playStreak.streak,
    lastPlayedDate: playStreak.date,
    loginStreak: loginStreak.streak,
    lastLoginStreakDate: loginStreak.date,
  }
}

/** Holt den zuletzt in der Cloud gespeicherten Stand, mergt ihn mit dem übergebenen lokalen Stand
 * (siehe mergePlayerStatistics) und schreibt das Ergebnis zurück - ein einziger Aufruf deckt damit
 * sowohl "beim Login nachziehen, was ein anderes Gerät beigetragen hat" als auch "nach einer
 * lokalen Änderung synchronisieren" ab. Bewusst kein serverseitiger Transaktions-Merge: bei
 * realistischer Nutzung (eine Person spielt zu einem Zeitpunkt auf einem Gerät) ist ein echter
 * Zusammenstoß zweier Upserts im selben Sekundenbruchteil praktisch ausgeschlossen; sollte er doch
 * eintreten, verliert im schlimmsten Fall nur der zuletzt geschriebene Stand den Beitrag des
 * jeweils anderen - "best effort", konsistent mit dem Rest der App (siehe backend/wallet.ts). Bei
 * Netzwerkfehlern (z.B. offline) wird einfach der unveränderte lokale Stand zurückgegeben. */
export async function syncPlayerStatistics(
  characterId: CharacterId,
  localStats: PlayerStatistics,
): Promise<PlayerStatistics> {
  try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('stats')
      .eq('character_id', characterId)
      .maybeSingle()
    if (error) throw error
    const remoteStats = data?.stats as PlayerStatistics | undefined
    const merged = remoteStats ? mergePlayerStatistics(localStats, remoteStats) : localStats

    const { error: upsertError } = await supabase
      .from('player_stats')
      .upsert({ character_id: characterId, stats: merged, updated_at: new Date().toISOString() })
    if (upsertError) throw upsertError

    return merged
  } catch (err) {
    console.error('syncPlayerStatistics failed', err)
    return localStats
  }
}

/** Additiver Wochenabschluss-Beitrag zur Allzeit-Bestenliste (Teil: Statistik-Cloud-Sync) - siehe
 * add_alltime_progress in der Migration, atomar und unabhängig von der Reihenfolge korrekt. */
export async function addAllTimeProgress(characterId: CharacterId, points: number, weeklyWins: number): Promise<void> {
  if (points === 0 && weeklyWins === 0) return
  try {
    const { error } = await supabase.rpc('add_alltime_progress', {
      p_character_id: characterId,
      p_points: points,
      p_weekly_wins: weeklyWins,
    })
    if (error) throw error
  } catch (err) {
    console.error('addAllTimeProgress failed', err)
  }
}

export async function fetchAllTimeBoard(): Promise<{
  board: Partial<Record<CharacterId, number>>
  weeklyWins: Partial<Record<CharacterId, number>>
}> {
  try {
    const { data, error } = await supabase.from('alltime_board').select('character_id, points, weekly_wins')
    if (error) throw error
    const board: Partial<Record<CharacterId, number>> = {}
    const weeklyWins: Partial<Record<CharacterId, number>> = {}
    for (const row of data ?? []) {
      board[row.character_id as CharacterId] = row.points
      weeklyWins[row.character_id as CharacterId] = row.weekly_wins
    }
    return { board, weeklyWins }
  } catch (err) {
    console.error('fetchAllTimeBoard failed', err)
    return { board: {}, weeklyWins: {} }
  }
}
