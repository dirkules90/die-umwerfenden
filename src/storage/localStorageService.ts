import type { DailyRecords } from '../game/dailyWinner'
import { todayKey } from '../game/dateKey'
import { defaultLoadout, emptyOwnership } from '../game/cosmetics'
import type { AvatarConfig, CharacterCosmetics, CharacterId, PlayerStatistics, Settings } from '../game/types'

const STATS_KEY = 'kegeln-lembeck:stats:v1'
const SETTINGS_KEY = 'kegeln-lembeck:settings:v1'
const DAILY_KEY = 'kegeln-lembeck:daily:v1'
const ALLTIME_KEY = 'kegeln-lembeck:alltime:v1'
const ALLTIME_WEEKLY_WINS_KEY = 'kegeln-lembeck:alltime-weekly-wins:v1'
const PIN_KEY = 'kegeln-lembeck:pins:v1'
const COSMETICS_KEY = 'kegeln-lembeck:cosmetics:v1'
const WEEKLY_KEY = 'kegeln-lembeck:weekly:v1'
const WEEKLY_DUEL_BONUS_SYNCED_KEY = 'kegeln-lembeck:weekly-duel-bonus-synced:v1'
const WEEKLY_LOGIN_DAYS_KEY = 'kegeln-lembeck:weekly-login-days:v1'
const LOGIN_BONUS_KEY = 'kegeln-lembeck:login-bonus:v1'

/** Start-PIN jedes Charakters, bis er/sie sie einmal persönlich ändert (Teil: Charakter-PIN,
 * Vorstufe für den Kosmetik-Shop). Wie das Reset-Passwort keine echte Sicherheit, nur eine Hürde
 * gegen "aus Versehen einen fremden Charakter spielen/dessen Coins ausgeben". */
export const DEFAULT_PIN = '0000'

export function emptyStatistics(): PlayerStatistics {
  return {
    gamesPlayed: 0,
    bestHigh: null,
    bestLow: null,
    totalScoreHigh: 0,
    countHigh: 0,
    totalScoreLow: 0,
    countLow: 0,
    bestTannenbaum: null,
    perfectThrows: 0,
    gutterThrows: 0,
    longestPerfectStreak: 0,
    achievements: [],
    currentStreak: 0,
    lastPlayedDate: null,
    loginStreak: 0,
    lastLoginStreakDate: null,
  }
}

export const DEFAULT_SETTINGS: Settings = {
  musicVolume: 0.6,
  sfxVolume: 0.85,
  hapticsEnabled: true,
}

/** Lädt gespeicherte Statistiken und füllt bei jedem Spieler fehlende Felder mit ihren
 * Standardwerten auf - sonst fehlen bei älteren, vor einem Feature-Update gespeicherten
 * Datensätzen neue Felder (z. B. bestTannenbaum) komplett und rendern als "undefined". */
export function loadAllStatistics(): Record<CharacterId, PlayerStatistics> {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return {} as Record<CharacterId, PlayerStatistics>
    const parsed = JSON.parse(raw) as Record<CharacterId, Partial<PlayerStatistics>>
    const result = {} as Record<CharacterId, PlayerStatistics>
    for (const [id, stats] of Object.entries(parsed) as [CharacterId, Partial<PlayerStatistics>][]) {
      result[id] = { ...emptyStatistics(), ...stats, achievements: stats.achievements ?? [] }
    }
    return result
  } catch {
    return {} as Record<CharacterId, PlayerStatistics>
  }
}

export function saveAllStatistics(stats: Record<CharacterId, PlayerStatistics>): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats))
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function resetAllStatistics(): void {
  localStorage.removeItem(STATS_KEY)
}

/** Liest die gespeicherten Tagesrekorde unabhängig vom Datum - der Aufrufer entscheidet, ob
 * ein gespeicherter Tag noch "heute" ist oder abgeschlossen werden muss (Teil: Tagessieger). */
export function loadRawDaily(): { date: string; records: DailyRecords } | null {
  try {
    const raw = localStorage.getItem(DAILY_KEY)
    if (!raw) return null
    return JSON.parse(raw) as { date: string; records: DailyRecords }
  } catch {
    return null
  }
}

export function saveDailyRecords(records: DailyRecords): void {
  localStorage.setItem(DAILY_KEY, JSON.stringify({ date: todayKey(), records }))
}

export function resetDailyRecords(): void {
  localStorage.removeItem(DAILY_KEY)
}

/** Allzeit-Punktesumme (Teil: Bestenliste-Vereinfachung) - bei jedem Wochenabschluss bekommt JEDER
 * Charakter seine in dieser Woche gesammelten Punkte gutgeschrieben, nicht nur der/die
 * Wochensieger. Das macht eine schwache Spielwoche der ganzen Gruppe nicht "unfair billig" für
 * den, der zufällig etwas mehr gespielt hat, wie es ein reiner Sieger-Punkt täte. */
export function loadAllTimeBoard(): Partial<Record<CharacterId, number>> {
  try {
    const raw = localStorage.getItem(ALLTIME_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function saveAllTimeBoard(board: Partial<Record<CharacterId, number>>): void {
  localStorage.setItem(ALLTIME_KEY, JSON.stringify(board))
}

export function resetAllTimeBoard(): void {
  localStorage.removeItem(ALLTIME_KEY)
}

/** Anzahl gewonnener Kalenderwochen je Charakter (Teil: Bestenliste-Vereinfachung) - ersetzt die
 * frühere tagesbasierte Siegzählung durch dieselbe Zählweise auf Wochenebene (bei Gleichstand
 * aufgeteilt), separat von der reinen Punktesumme oben. */
export function loadAllTimeWeeklyWins(): Partial<Record<CharacterId, number>> {
  try {
    const raw = localStorage.getItem(ALLTIME_WEEKLY_WINS_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function saveAllTimeWeeklyWins(wins: Partial<Record<CharacterId, number>>): void {
  localStorage.setItem(ALLTIME_WEEKLY_WINS_KEY, JSON.stringify(wins))
}

export function resetAllTimeWeeklyWins(): void {
  localStorage.removeItem(ALLTIME_WEEKLY_WINS_KEY)
}

/** Fehlende Einträge bedeuten "noch nie geändert" - Aufrufer fällt dann auf DEFAULT_PIN zurück. */
export function loadPins(): Partial<Record<CharacterId, string>> {
  try {
    const raw = localStorage.getItem(PIN_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function savePins(pins: Partial<Record<CharacterId, string>>): void {
  localStorage.setItem(PIN_KEY, JSON.stringify(pins))
}

export function emptyCosmetics(config: AvatarConfig): CharacterCosmetics {
  return { coins: 0, loadout: defaultLoadout(config), ownership: emptyOwnership() }
}

/** Fehlende Einträge (noch nie geöffneter Shop) füllt der Aufrufer über emptyCosmetics(config)
 * auf - hier bewusst nur roh geladen, ohne Kenntnis der jeweiligen AvatarConfig-Standardfarbe. */
export function loadAllCosmetics(): Partial<Record<CharacterId, CharacterCosmetics>> {
  try {
    const raw = localStorage.getItem(COSMETICS_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function saveAllCosmetics(data: Partial<Record<CharacterId, CharacterCosmetics>>): void {
  localStorage.setItem(COSMETICS_KEY, JSON.stringify(data))
}

/** Wochen-Punkte-Akkumulator für den Wochensieger-Münzbonus (Teil: Coin-Shop-Wirtschaft) -
 * unabhängig vom Tages-/Allzeit-Punktesystem der Bestenliste. weekKey ist der Montag der Woche,
 * für die `points` gerade gesammelt werden (siehe game/dateKey.ts weekKeyFor). */
export function loadRawWeekly(): { weekKey: string; points: Partial<Record<CharacterId, number>> } | null {
  try {
    const raw = localStorage.getItem(WEEKLY_KEY)
    if (!raw) return null
    return JSON.parse(raw) as { weekKey: string; points: Partial<Record<CharacterId, number>> }
  } catch {
    return null
  }
}

export function saveWeeklyRecords(weekKey: string, points: Partial<Record<CharacterId, number>>): void {
  localStorage.setItem(WEEKLY_KEY, JSON.stringify({ weekKey, points }))
}

export function resetWeeklyRecords(): void {
  localStorage.removeItem(WEEKLY_KEY)
}

/** Wie viel Duell-Wochenbonus (siehe backend/wallet.ts fetchWeeklyDuelPoints) je Charakter bereits
 * in die lokale weeklyPoints-Summe eingerechnet wurde (Teil: Online-Duelle) - verhindert doppeltes
 * Gutschreiben, wenn syncWeeklyDuelBonus mehrfach pro Woche läuft (z. B. bei jedem App-Start), weil
 * das Backend immer den Gesamtstand der Woche liefert statt einzelner neuer Ereignisse. */
export function loadWeeklyDuelBonusSynced(): Partial<Record<CharacterId, number>> {
  try {
    const raw = localStorage.getItem(WEEKLY_DUEL_BONUS_SYNCED_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function saveWeeklyDuelBonusSynced(synced: Partial<Record<CharacterId, number>>): void {
  localStorage.setItem(WEEKLY_DUEL_BONUS_SYNCED_KEY, JSON.stringify(synced))
}

export function resetWeeklyDuelBonusSynced(): void {
  localStorage.removeItem(WEEKLY_DUEL_BONUS_SYNCED_KEY)
}

/** An welchen Tagen (JJJJ-MM-TT) dieser Kalenderwoche sich ein Charakter schon eingeloggt hat
 * (Teil: Engagement/Login-Streak) - Grundlage für das "Wochentreue"-Achievement (alle 7 Tage einer
 * echten Montag-Sonntag-Woche eingeloggt). Reset erfolgt zusammen mit den übrigen Wochenwerten
 * beim Wochenabschluss, siehe state/gameStore.ts processDailyAndWeeklyRollover. */
export function loadWeeklyLoginDays(): Partial<Record<CharacterId, string[]>> {
  try {
    const raw = localStorage.getItem(WEEKLY_LOGIN_DAYS_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function saveWeeklyLoginDays(days: Partial<Record<CharacterId, string[]>>): void {
  localStorage.setItem(WEEKLY_LOGIN_DAYS_KEY, JSON.stringify(days))
}

export function resetWeeklyLoginDays(): void {
  localStorage.removeItem(WEEKLY_LOGIN_DAYS_KEY)
}

/** Letztes Datum (JJJJ-MM-TT), an dem ein Charakter den Tages-Login-Bonus bereits bekommen hat
 * (Teil: Engagement) - fehlender Eintrag bedeutet "heute noch nicht". */
export function loadLoginBonusDates(): Partial<Record<CharacterId, string>> {
  try {
    const raw = localStorage.getItem(LOGIN_BONUS_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function saveLoginBonusDates(dates: Partial<Record<CharacterId, string>>): void {
  localStorage.setItem(LOGIN_BONUS_KEY, JSON.stringify(dates))
}
