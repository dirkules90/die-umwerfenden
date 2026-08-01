import { create } from 'zustand'
import type {
  BeardStyleId,
  CapeId,
  CharacterCosmetics,
  CharacterId,
  DigitSlot,
  GameMode,
  GameSession,
  GlassesStyleId,
  HairStyleId,
  NecklaceId,
  PantsColorId,
  PlayerStatistics,
  RoundResult,
  Settings,
  ShirtStyleId,
  ShoeColorId,
  TannenbaumSession,
  WristbandId,
} from '../game/types'
import {
  ballReturned,
  beginNextTurn,
  chooseDigitSlot as fsmChooseDigitSlot,
  createSession,
  currentPlayer,
  leverAnimationDone,
  leverPulled,
  resolveThrow,
} from '../game/gameStateMachine'
import {
  createTannenbaumSession,
  resolveTannenbaumThrow,
  tannenbaumBallReturned,
  tannenbaumLeverAnimationDone,
  tannenbaumLeverPulled,
} from '../game/tannenbaumMachine'
import {
  ACHIEVEMENT_DEFS,
  achievementCoinReward,
  weeklyChallengeIdFor,
  WEEKLY_CHALLENGE_BONUS_COINS,
  grantAchievement,
  hasAchievementThisWeek,
} from '../game/achievements'
import { computeTotalDailyPoints, dailyWinners, emptyDailyRecord, type DailyRecords } from '../game/dailyWinner'
import { currentWeekKey, isNextDay, todayKey } from '../game/dateKey'
import { AVATAR_CONFIGS } from '../characters/avatarConfigs'
import {
  hairStylePrice,
  isHairStyleOwned,
  isShirtStyleOwned,
  isGlassesStyleOwned,
  isBeardStyleOwned,
  isPantsColorOwned,
  isShoeColorOwned,
  isNecklaceOwned,
  isWristbandOwned,
  isCapeOwned,
  shirtStylePrice,
  glassesStylePrice,
  beardStylePrice,
  pantsColorPrice,
  shoeColorPrice,
  necklacePrice,
  wristbandPrice,
  capePrice,
  GLOVES_PRICE,
  WATCH_PRICE,
  HEADBAND_PRICE,
} from '../game/cosmetics'
import {
  coinsForHausnummer,
  coinsForTannenbaum,
  LOGIN_BONUS_COINS,
  rollSurpriseBonus,
  WEEKLY_WINNER_COIN_BONUS,
} from '../game/coins'
import { evaluateHausnummerMood, evaluateTannenbaumMood } from '../game/moodRules'
import {
  DEFAULT_PIN,
  emptyCosmetics,
  emptyStatistics,
  loadAllCosmetics,
  loadAllStatistics,
  loadAllTimeBoard,
  loadAllTimeWeeklyWins,
  loadLoginBonusDates,
  loadPins,
  loadRawDaily,
  loadRawWeekly,
  loadSettings,
  resetAllStatistics,
  resetAllTimeBoard,
  resetAllTimeWeeklyWins,
  resetDailyRecords,
  resetWeeklyRecords,
  saveAllCosmetics,
  saveAllStatistics,
  saveAllTimeBoard,
  saveAllTimeWeeklyWins,
  saveDailyRecords,
  saveLoginBonusDates,
  savePins,
  saveSettings,
  saveWeeklyRecords,
} from '../storage/localStorageService'
import { soundManager } from '../audio/soundManager'
import { vibrate } from '../game/haptics'

export type Screen =
  | 'start'
  | 'playerSelect'
  | 'modeSelect'
  | 'game'
  | 'tannenbaum'
  | 'weekly'
  | 'allTime'
  | 'settings'
  | 'shopSelect'
  | 'shop'

const TOTAL_ROUNDS = 1
const GUTTER_STREAK_FOR_ACHIEVEMENT = 3

interface PerGameCounters {
  gutterCount: number
  perfectStreak: number
}

interface AchievementBanner {
  playerId: CharacterId
  title: string
  coins: number
  /** 'login'/'surprise' zeigen einen anderen Text als ein freigeschaltetes Achievement (Teil:
   * Engagement - Tages-Login-Bonus bzw. Überraschungsbonus) - Default 'achievement', wenn
   * weggelassen. */
  kind?: 'achievement' | 'login' | 'surprise'
}

interface GameStore {
  screen: Screen
  settingsReturnTo: Screen
  selectedPlayer: CharacterId | null
  session: GameSession | null
  tannenbaumSession: TannenbaumSession | null
  statistics: Record<CharacterId, PlayerStatistics>
  dailyRecords: DailyRecords
  /** Allzeit-Punktesumme (Teil: Bestenliste-Vereinfachung) - jede Woche fließen ALLE gesammelten
   * Wochenpunkte jedes Charakters hier ein, nicht nur die des Wochensiegers (siehe
   * processDailyAndWeeklyRollover). */
  allTimeBoard: Partial<Record<CharacterId, number>>
  /** Anzahl gewonnener Kalenderwochen je Charakter, separat von der reinen Punktesumme oben. */
  allTimeWeeklyWins: Partial<Record<CharacterId, number>>
  /** Woche, für die weeklyPoints gerade gesammelt werden (Montag der Woche, siehe game/dateKey.ts) -
   * Teil: Wochen-Bestenliste, damit die UI die aktuelle Wochen-Spanne anzeigen kann. */
  weekKey: string
  /** Punkte bereits abgeschlossener Tage DIESER Woche (Teil: Wochen-Bestenliste) - der heutige,
   * noch laufende Tag ist hier bewusst NICHT enthalten (fließt erst beim nächsten App-Start beim
   * Tagesabschluss ein, siehe processDailyAndWeeklyRollover). Für eine live vollständige
   * Wochensumme müssen UI-Screens dies mit computeTotalDailyPoints(dailyRecords, ..., todayKey())
   * addieren. */
  weeklyPoints: Partial<Record<CharacterId, number>>
  pins: Partial<Record<CharacterId, string>>
  /** Letztes Datum je Charakter, an dem der Tages-Login-Bonus bereits gutgeschrieben wurde (Teil:
   * Engagement) - siehe verifyPin. */
  loginBonusDates: Partial<Record<CharacterId, string>>
  cosmetics: Partial<Record<CharacterId, CharacterCosmetics>>
  shopPlayer: CharacterId | null
  settings: Settings
  achievementBanner: AchievementBanner | null
  perGameCounters: Partial<Record<CharacterId, PerGameCounters>>
  pendingAllNine: boolean
  finalResult: RoundResult | null
  tannenbaumResult: { throwCount: number; isBest: boolean } | null
  /** Für die Anzeige "+X Münzen" auf dem Ergebnis-Bildschirm nach einer abgeschlossenen Partie
   * (Teil: Coin-Shop-Wirtschaft) - unabhängig von Achievement-Münzen, die per Banner laufen. */
  lastGameCoins: number | null
  pauseMenuOpen: boolean

  goTo: (screen: Screen) => void
  setPauseMenuOpen: (open: boolean) => void
  openSettings: (from: Screen) => void
  selectPlayer: (id: CharacterId) => void
  verifyPin: (id: CharacterId, pin: string) => boolean
  changePin: (id: CharacterId, oldPin: string, newPin: string) => boolean
  selectShopPlayer: (id: CharacterId) => void
  setHairColor: (id: CharacterId, color: string) => void
  equipOrBuyHairStyle: (id: CharacterId, style: HairStyleId) => boolean
  equipOrBuyShirtStyle: (id: CharacterId, style: ShirtStyleId) => boolean
  equipOrBuyGloves: (id: CharacterId, wantGloves: boolean) => boolean
  equipOrBuyGlasses: (id: CharacterId, style: GlassesStyleId) => boolean
  equipOrBuyWatch: (id: CharacterId, wantWatch: boolean) => boolean
  equipOrBuyHeadband: (id: CharacterId, wantHeadband: boolean) => boolean
  equipOrBuyBeard: (id: CharacterId, style: BeardStyleId) => boolean
  equipOrBuyPantsColor: (id: CharacterId, color: PantsColorId) => boolean
  equipOrBuyShoeColor: (id: CharacterId, color: ShoeColorId) => boolean
  equipOrBuyNecklace: (id: CharacterId, style: NecklaceId) => boolean
  equipOrBuyWristband: (id: CharacterId, style: WristbandId) => boolean
  equipOrBuyCape: (id: CharacterId, style: CapeId) => boolean
  equipCrown: (id: CharacterId, wantCrown: boolean) => boolean
  startGame: (mode: GameMode) => void
  beginAiming: () => void
  submitThrowResult: (pinsDown: number, isGutter: boolean) => void
  chooseDigit: (slot: DigitSlot) => void
  pullLever: () => void
  leverAnimationComplete: () => void
  ballReturnComplete: () => void
  advanceAfterSwitch: () => void
  startTannenbaum: () => void
  submitTannenbaumThrow: (pinsDown: number) => void
  pullTannenbaumLever: () => void
  tannenbaumLeverAnimationComplete: () => void
  tannenbaumBallReturnComplete: () => void
  dismissAchievementBanner: () => void
  resetTodayOnly: () => void
  resetStatistics: () => void
  updateSettings: (partial: Partial<Settings>) => void
  backToStartFromGameOver: () => void
}

function statsFor(store: Record<CharacterId, PlayerStatistics>, id: CharacterId): PlayerStatistics {
  return store[id] ?? emptyStatistics()
}

/** Fehlende Unterfelder (z.B. glassesStyle/watch/headband bei vor dieser Erweiterung gespeicherten
 * Daten) werden hier mit Standardwerten aufgefüllt statt roh durchgereicht - sonst würde ein alter
 * localStorage-Stand nach einem Feature-Update `undefined` statt eines gültigen Loadouts liefern. */
export function cosmeticsFor(
  store: Partial<Record<CharacterId, CharacterCosmetics>>,
  id: CharacterId,
): CharacterCosmetics {
  const empty = emptyCosmetics(AVATAR_CONFIGS[id])
  const stored = store[id]
  if (!stored) return empty
  return {
    coins: stored.coins ?? 0,
    loadout: { ...empty.loadout, ...stored.loadout },
    ownership: { ...empty.ownership, ...stored.ownership },
  }
}

function addCoins(
  cosmeticsMap: Partial<Record<CharacterId, CharacterCosmetics>>,
  id: CharacterId,
  amount: number,
): Partial<Record<CharacterId, CharacterCosmetics>> {
  if (amount <= 0) return cosmeticsMap
  const current = cosmeticsFor(cosmeticsMap, id)
  return { ...cosmeticsMap, [id]: { ...current, coins: current.coins + amount } }
}

/** Aktualisiert currentStreak/lastPlayedDate anhand des heutigen Datums (Teil: Engagement/Streak) -
 * aufgerufen einmal pro abgeschlossener Partie. Mehrere Partien am selben Tag zählen nur einmal
 * (lastPlayedDate ist bereits heute, also unverändert); ein Tag Pause setzt die Serie zurück auf 1
 * statt auf 0, weil der heutige Tag selbst ja gerade gespielt wird. */
function updateStreak(ps: PlayerStatistics): PlayerStatistics {
  const today = todayKey()
  if (ps.lastPlayedDate === today) return ps
  const currentStreak = ps.lastPlayedDate && isNextDay(ps.lastPlayedDate, today) ? ps.currentStreak + 1 : 1
  return { ...ps, currentStreak, lastPlayedDate: today }
}

/** Exklusive Wochensieger-Krone (Teil: Shop-Erweiterung) - nicht käuflich, wird nur hier beim
 * Wochenabschluss vergeben. Bereits besitzende Wochensieger behalten sie über weitere Siege hinweg
 * natürlich (kein erneutes Eintragen nötig, aber auch kein Schaden). */
function grantCrown(
  cosmeticsMap: Partial<Record<CharacterId, CharacterCosmetics>>,
  id: CharacterId,
): Partial<Record<CharacterId, CharacterCosmetics>> {
  const current = cosmeticsFor(cosmeticsMap, id)
  if (current.ownership.crown) return cosmeticsMap
  return { ...cosmeticsMap, [id]: { ...current, ownership: { ...current.ownership, crown: true } } }
}

/**
 * Tages- und Wochenabschluss (Teil: Bestenliste-Vereinfachung / Coin-Shop-Wirtschaft): eine echte
 * "um 23:59:59 ausführen"-Aktion gibt es in einer rein clientseitigen PWA ohne Server nicht.
 * Stattdessen wird beim nächsten App-Start geprüft:
 *
 * 1. Stammen die gespeicherten Tagesrekorde von einem älteren Tag? Falls ja, fließen die
 *    Tagespunkte dieses abgelaufenen Tages in den Wochen-Akkumulator ein - ohne eigene
 *    Tagessieger-Wertung, denn die gibt es als eigene Bestenliste nicht mehr (nur noch Woche und
 *    Allzeit, siehe Nutzer-Feedback: "was bringt eine Unterteilung, wenn wir sowieso eine Woche
 *    warten und das dann übernehmen").
 * 2. Gehört der Wochen-Akkumulator (jetzt inklusive des ggf. gerade abgeschlossenen Tages) noch
 *    zur aktuellen Kalenderwoche? Falls nein, wird abgerechnet:
 *    - JEDER Charakter bekommt seine in dieser Woche gesammelten Punkte in die Allzeit-Punktesumme
 *      gutgeschrieben, nicht nur der/die Wochensieger - sonst wäre ein Wochensieg in einer Woche,
 *      in der alle anderen wenig gespielt haben, unfair "billig" gegenüber jemandem, der über
 *      mehrere Wochen konstant viele Punkte sammelt, aber nie ganz vorne liegt.
 *    - Der/die Wochensieger (höchste Punktsumme der Woche, bei Gleichstand aufgeteilt) bekommen
 *      zusätzlich einen einmaligen Münzbonus (WEEKLY_WINNER_COIN_BONUS), die Krone, UND einen
 *      Zähler-Punkt in der separaten "Wochensiege"-Spalte der Allzeit-Liste.
 */
function processDailyAndWeeklyRollover(): {
  statistics: Record<CharacterId, PlayerStatistics>
  dailyRecords: DailyRecords
  allTimeBoard: Partial<Record<CharacterId, number>>
  allTimeWeeklyWins: Partial<Record<CharacterId, number>>
  weekKey: string
  weeklyPoints: Partial<Record<CharacterId, number>>
} {
  const statistics = loadAllStatistics()
  let allTimeBoard = loadAllTimeBoard()
  let allTimeWeeklyWins = loadAllTimeWeeklyWins()
  const raw = loadRawDaily()

  const rawWeekly = loadRawWeekly()
  let weekKey = rawWeekly?.weekKey ?? currentWeekKey()
  let weeklyPoints = rawWeekly?.points ?? {}

  let dailyRecords: DailyRecords = raw?.records ?? {}

  if (raw && raw.date !== todayKey()) {
    const staleDayTotals = computeTotalDailyPoints(raw.records, statistics, raw.date)
    for (const [id, points] of Object.entries(staleDayTotals) as [CharacterId, number][]) {
      weeklyPoints = { ...weeklyPoints, [id]: (weeklyPoints[id] ?? 0) + points }
    }
    saveDailyRecords({})
    dailyRecords = {}
  }

  if (weekKey !== currentWeekKey()) {
    const updatedBoard = { ...allTimeBoard }
    for (const [id, points] of Object.entries(weeklyPoints) as [CharacterId, number][]) {
      if (points > 0) updatedBoard[id] = (updatedBoard[id] ?? 0) + points
    }
    allTimeBoard = updatedBoard
    saveAllTimeBoard(allTimeBoard)

    const { ids: weekWinners } = dailyWinners(weeklyPoints)
    if (weekWinners.length > 0) {
      const share = 1 / weekWinners.length
      const updatedWins = { ...allTimeWeeklyWins }
      for (const id of weekWinners) updatedWins[id] = (updatedWins[id] ?? 0) + share
      allTimeWeeklyWins = updatedWins
      saveAllTimeWeeklyWins(allTimeWeeklyWins)

      const cosmetics = loadAllCosmetics()
      const coinShare = Math.floor(WEEKLY_WINNER_COIN_BONUS / weekWinners.length)
      let updatedCosmetics = cosmetics
      for (const id of weekWinners) {
        updatedCosmetics = addCoins(updatedCosmetics, id, coinShare)
        updatedCosmetics = grantCrown(updatedCosmetics, id)
      }
      saveAllCosmetics(updatedCosmetics)
    }
    weekKey = currentWeekKey()
    weeklyPoints = {}
  }

  saveWeeklyRecords(weekKey, weeklyPoints)
  return { statistics, dailyRecords, allTimeBoard, allTimeWeeklyWins, weekKey, weeklyPoints }
}

const initialDailyState = processDailyAndWeeklyRollover()

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'start',
  settingsReturnTo: 'start',
  selectedPlayer: null,
  session: null,
  tannenbaumSession: null,
  statistics: initialDailyState.statistics,
  dailyRecords: initialDailyState.dailyRecords,
  allTimeBoard: initialDailyState.allTimeBoard,
  allTimeWeeklyWins: initialDailyState.allTimeWeeklyWins,
  weekKey: initialDailyState.weekKey,
  weeklyPoints: initialDailyState.weeklyPoints,
  pins: loadPins(),
  loginBonusDates: loadLoginBonusDates(),
  cosmetics: loadAllCosmetics(),
  shopPlayer: null,
  settings: loadSettings(),
  achievementBanner: null,
  perGameCounters: {},
  pendingAllNine: false,
  finalResult: null,
  tannenbaumResult: null,
  lastGameCoins: null,
  pauseMenuOpen: false,

  setPauseMenuOpen: (open) => set({ pauseMenuOpen: open }),

  goTo: (screen) => {
    soundManager.playButtonClick()
    set({ screen })
  },

  openSettings: (from) => {
    soundManager.playButtonClick()
    set({ settingsReturnTo: from, screen: 'settings' })
  },

  selectPlayer: (id) => {
    soundManager.playButtonClick()
    set({ selectedPlayer: id })
  },

  verifyPin: (id, pin) => {
    const stored = get().pins[id] ?? DEFAULT_PIN
    if (stored !== pin) return false

    // Tages-Login-Bonus (Teil: Engagement): ein paar Münzen fürs erste erfolgreiche Einloggen an
    // diesem Tag, unabhängig davon ob danach tatsächlich gespielt wird. verifyPin ist bewusst der
    // gemeinsame Ort dafür, weil sowohl Spieler- als auch Shop-Auswahl darüber laufen (PinGate) -
    // so gilt der Bonus für "heute überhaupt reingeschaut" statt nur für einen der beiden Wege.
    const today = todayKey()
    if (get().loginBonusDates[id] !== today) {
      const cosmetics = addCoins(get().cosmetics, id, LOGIN_BONUS_COINS)
      saveAllCosmetics(cosmetics)
      const loginBonusDates = { ...get().loginBonusDates, [id]: today }
      saveLoginBonusDates(loginBonusDates)
      soundManager.playCoinGain()
      set({
        cosmetics,
        loginBonusDates,
        achievementBanner: { playerId: id, title: 'Willkommen zurück', coins: LOGIN_BONUS_COINS, kind: 'login' },
      })
    }
    return true
  },

  changePin: (id, oldPin, newPin) => {
    const stored = get().pins[id] ?? DEFAULT_PIN
    if (stored !== oldPin) return false
    const pins = { ...get().pins, [id]: newPin }
    savePins(pins)
    set({ pins })
    return true
  },

  selectShopPlayer: (id) => {
    soundManager.playButtonClick()
    set({ shopPlayer: id })
  },

  setHairColor: (id, color) => {
    const current = cosmeticsFor(get().cosmetics, id)
    const updated = { ...current, loadout: { ...current.loadout, hairColor: color } }
    const cosmetics = { ...get().cosmetics, [id]: updated }
    saveAllCosmetics(cosmetics)
    set({ cosmetics })
  },

  equipOrBuyHairStyle: (id, style) => {
    const current = cosmeticsFor(get().cosmetics, id)
    let updated = current
    if (!isHairStyleOwned(current.ownership, style)) {
      const price = hairStylePrice(style)
      if (current.coins < price) return false
      updated = {
        ...current,
        coins: current.coins - price,
        ownership: { ...current.ownership, hairStyles: [...current.ownership.hairStyles, style] },
      }
    }
    updated = { ...updated, loadout: { ...updated.loadout, hairStyle: style } }
    const cosmetics = { ...get().cosmetics, [id]: updated }
    saveAllCosmetics(cosmetics)
    set({ cosmetics })
    return true
  },

  equipOrBuyShirtStyle: (id, style) => {
    const current = cosmeticsFor(get().cosmetics, id)
    let updated = current
    if (!isShirtStyleOwned(current.ownership, style)) {
      const price = shirtStylePrice(style)
      if (current.coins < price) return false
      updated = {
        ...current,
        coins: current.coins - price,
        ownership: { ...current.ownership, shirtStyles: [...current.ownership.shirtStyles, style] },
      }
    }
    updated = { ...updated, loadout: { ...updated.loadout, shirtStyle: style } }
    const cosmetics = { ...get().cosmetics, [id]: updated }
    saveAllCosmetics(cosmetics)
    set({ cosmetics })
    return true
  },

  equipOrBuyGloves: (id, wantGloves) => {
    const current = cosmeticsFor(get().cosmetics, id)
    let updated = current
    if (wantGloves && !current.ownership.gloves) {
      if (current.coins < GLOVES_PRICE) return false
      updated = { ...current, coins: current.coins - GLOVES_PRICE, ownership: { ...current.ownership, gloves: true } }
    }
    updated = { ...updated, loadout: { ...updated.loadout, gloves: wantGloves } }
    const cosmetics = { ...get().cosmetics, [id]: updated }
    saveAllCosmetics(cosmetics)
    set({ cosmetics })
    return true
  },

  equipOrBuyGlasses: (id, style) => {
    const current = cosmeticsFor(get().cosmetics, id)
    const hasGlassesTrait = AVATAR_CONFIGS[id].hasGlasses
    let updated = current
    if (!isGlassesStyleOwned(current.ownership, style, hasGlassesTrait)) {
      const price = glassesStylePrice(style, hasGlassesTrait)
      if (current.coins < price) return false
      updated = {
        ...current,
        coins: current.coins - price,
        ownership: { ...current.ownership, glassesStyles: [...current.ownership.glassesStyles, style] },
      }
    }
    updated = { ...updated, loadout: { ...updated.loadout, glassesStyle: style } }
    const cosmetics = { ...get().cosmetics, [id]: updated }
    saveAllCosmetics(cosmetics)
    set({ cosmetics })
    return true
  },

  equipOrBuyWatch: (id, wantWatch) => {
    const current = cosmeticsFor(get().cosmetics, id)
    let updated = current
    if (wantWatch && !current.ownership.watch) {
      if (current.coins < WATCH_PRICE) return false
      updated = { ...current, coins: current.coins - WATCH_PRICE, ownership: { ...current.ownership, watch: true } }
    }
    updated = { ...updated, loadout: { ...updated.loadout, watch: wantWatch } }
    const cosmetics = { ...get().cosmetics, [id]: updated }
    saveAllCosmetics(cosmetics)
    set({ cosmetics })
    return true
  },

  equipOrBuyHeadband: (id, wantHeadband) => {
    const current = cosmeticsFor(get().cosmetics, id)
    let updated = current
    if (wantHeadband && !current.ownership.headband) {
      if (current.coins < HEADBAND_PRICE) return false
      updated = { ...current, coins: current.coins - HEADBAND_PRICE, ownership: { ...current.ownership, headband: true } }
    }
    updated = { ...updated, loadout: { ...updated.loadout, headband: wantHeadband } }
    const cosmetics = { ...get().cosmetics, [id]: updated }
    saveAllCosmetics(cosmetics)
    set({ cosmetics })
    return true
  },

  equipOrBuyBeard: (id, style) => {
    const current = cosmeticsFor(get().cosmetics, id)
    const hasBeardTrait = AVATAR_CONFIGS[id].hasBeard
    let updated = current
    if (!isBeardStyleOwned(current.ownership, style, hasBeardTrait)) {
      const price = beardStylePrice(style, hasBeardTrait)
      if (current.coins < price) return false
      updated = {
        ...current,
        coins: current.coins - price,
        ownership: { ...current.ownership, beardStyles: [...current.ownership.beardStyles, style] },
      }
    }
    updated = { ...updated, loadout: { ...updated.loadout, beardStyle: style } }
    const cosmetics = { ...get().cosmetics, [id]: updated }
    saveAllCosmetics(cosmetics)
    set({ cosmetics })
    return true
  },

  equipOrBuyPantsColor: (id, color) => {
    const current = cosmeticsFor(get().cosmetics, id)
    let updated = current
    if (!isPantsColorOwned(current.ownership, color)) {
      const price = pantsColorPrice(color)
      if (current.coins < price) return false
      updated = {
        ...current,
        coins: current.coins - price,
        ownership: { ...current.ownership, pantsColors: [...current.ownership.pantsColors, color] },
      }
    }
    updated = { ...updated, loadout: { ...updated.loadout, pantsColor: color } }
    const cosmetics = { ...get().cosmetics, [id]: updated }
    saveAllCosmetics(cosmetics)
    set({ cosmetics })
    return true
  },

  equipOrBuyShoeColor: (id, color) => {
    const current = cosmeticsFor(get().cosmetics, id)
    let updated = current
    if (!isShoeColorOwned(current.ownership, color)) {
      const price = shoeColorPrice(color)
      if (current.coins < price) return false
      updated = {
        ...current,
        coins: current.coins - price,
        ownership: { ...current.ownership, shoeColors: [...current.ownership.shoeColors, color] },
      }
    }
    updated = { ...updated, loadout: { ...updated.loadout, shoeColor: color } }
    const cosmetics = { ...get().cosmetics, [id]: updated }
    saveAllCosmetics(cosmetics)
    set({ cosmetics })
    return true
  },

  equipOrBuyNecklace: (id, style) => {
    const current = cosmeticsFor(get().cosmetics, id)
    let updated = current
    if (!isNecklaceOwned(current.ownership, style)) {
      const price = necklacePrice(style)
      if (current.coins < price) return false
      updated = {
        ...current,
        coins: current.coins - price,
        ownership: { ...current.ownership, necklaces: [...current.ownership.necklaces, style] },
      }
    }
    updated = { ...updated, loadout: { ...updated.loadout, necklace: style } }
    const cosmetics = { ...get().cosmetics, [id]: updated }
    saveAllCosmetics(cosmetics)
    set({ cosmetics })
    return true
  },

  equipOrBuyWristband: (id, style) => {
    const current = cosmeticsFor(get().cosmetics, id)
    let updated = current
    if (!isWristbandOwned(current.ownership, style)) {
      const price = wristbandPrice(style)
      if (current.coins < price) return false
      updated = {
        ...current,
        coins: current.coins - price,
        ownership: { ...current.ownership, wristbands: [...current.ownership.wristbands, style] },
      }
    }
    updated = { ...updated, loadout: { ...updated.loadout, wristband: style } }
    const cosmetics = { ...get().cosmetics, [id]: updated }
    saveAllCosmetics(cosmetics)
    set({ cosmetics })
    return true
  },

  equipOrBuyCape: (id, style) => {
    const current = cosmeticsFor(get().cosmetics, id)
    let updated = current
    if (!isCapeOwned(current.ownership, style)) {
      const price = capePrice(style)
      if (current.coins < price) return false
      updated = {
        ...current,
        coins: current.coins - price,
        ownership: { ...current.ownership, capes: [...current.ownership.capes, style] },
      }
    }
    updated = { ...updated, loadout: { ...updated.loadout, cape: style } }
    const cosmetics = { ...get().cosmetics, [id]: updated }
    saveAllCosmetics(cosmetics)
    set({ cosmetics })
    return true
  },

  /** Die Krone ist nicht käuflich, sondern eine exklusive Trophäe (Teil: Shop-Erweiterung) - nur wer
   * sie bereits durch einen Wochensieg besitzt (siehe processDailyAndWeeklyRollover), kann sie hier
   * an-/ausziehen. */
  equipCrown: (id, wantCrown) => {
    const current = cosmeticsFor(get().cosmetics, id)
    if (wantCrown && !current.ownership.crown) return false
    const updated = { ...current, loadout: { ...current.loadout, crown: wantCrown } }
    const cosmetics = { ...get().cosmetics, [id]: updated }
    saveAllCosmetics(cosmetics)
    set({ cosmetics })
    return true
  },

  startGame: (mode) => {
    const { selectedPlayer } = get()
    if (!selectedPlayer) return
    set({
      session: createSession(mode, TOTAL_ROUNDS, [selectedPlayer]),
      screen: 'game',
      perGameCounters: { [selectedPlayer]: { gutterCount: 0, perfectStreak: 0 } },
      finalResult: null,
      lastGameCoins: null,
    })
    soundManager.ensureContext()
    soundManager.startAmbientLoop()
  },

  beginAiming: () => {
    const { session } = get()
    if (!session) return
    set({ session: { ...session, phase: 'aiming' } })
  },

  submitThrowResult: (pinsDown, isGutter) => {
    const { session, perGameCounters, statistics, settings, cosmetics } = get()
    if (!session) return
    const player = currentPlayer(session)
    const { session: next, effects } = resolveThrow(session, pinsDown, isGutter)

    const counters = { ...(perGameCounters[player] ?? { gutterCount: 0, perfectStreak: 0 }) }
    let updatedStats = { ...statistics }
    let updatedCosmetics = cosmetics
    let banner: AchievementBanner | null = null
    let pendingAllNine = false

    function grantWithCoins(ps: PlayerStatistics, id: string, title: string): PlayerStatistics {
      // Extra-Bonus, wenn dieses Achievement zufällig die Wochenaufgabe ist (siehe
      // weeklyChallengeIdFor) - derselbe Achievement-Pool dient als Vorrat für den Rundlauf.
      const isWeeklyChallenge = id === weeklyChallengeIdFor(currentWeekKey())
      const coins = achievementCoinReward(id) + (isWeeklyChallenge ? WEEKLY_CHALLENGE_BONUS_COINS : 0)
      updatedCosmetics = addCoins(updatedCosmetics, player, coins)
      banner = { playerId: player, title: isWeeklyChallenge ? `${title} (Wochenaufgabe!)` : title, coins }
      soundManager.playCoinGain()
      return grantAchievement(ps, id)
    }

    if (isGutter) {
      soundManager.playRollGutter()
      counters.gutterCount += 1
      counters.perfectStreak = 0
    } else {
      soundManager.playPinsFall(pinsDown)
    }

    // Stimmungs-Sound (Teil: Reaktions-Mimik) - Alle-Neune hat mit playAllNine() bereits seine
    // eigene, größere Fanfare weiter unten, daher hier ausgenommen. Kurze Verzögerung, damit der
    // Ton nicht direkt mit dem Kegel-/Rinnengeräusch kollidiert.
    if (!(pinsDown === 9 && !isGutter)) {
      const mood = evaluateHausnummerMood(session.mode, pinsDown, isGutter)
      window.setTimeout(() => {
        if (mood === 'happy') soundManager.playMoodHappy()
        else if (mood === 'sad') soundManager.playMoodSad()
        else soundManager.playMoodMeh()
      }, 200)
    }

    for (const effect of effects) {
      if (effect.type === 'ALL_NINE') {
        pendingAllNine = true
        counters.perfectStreak += 1
        soundManager.playAllNine()
        vibrate([40, 30, 40, 30, 80], settings.hapticsEnabled)
        let ps = statsFor(updatedStats, player)
        ps = {
          ...ps,
          perfectThrows: ps.perfectThrows + 1,
          longestPerfectStreak: Math.max(ps.longestPerfectStreak, counters.perfectStreak),
        }
        if (!hasAchievementThisWeek(ps, 'volltreffer', currentWeekKey())) {
          ps = grantWithCoins(ps, 'volltreffer', 'Volltreffer')
        }
        updatedStats = { ...updatedStats, [player]: ps }
      }
      if (effect.type === 'GUTTER') {
        let ps = statsFor(updatedStats, player)
        ps = { ...ps, gutterThrows: ps.gutterThrows + 1 }
        if (
          counters.gutterCount >= GUTTER_STREAK_FOR_ACHIEVEMENT &&
          !hasAchievementThisWeek(ps, 'bahnrand-kenner', currentWeekKey())
        ) {
          ps = grantWithCoins(ps, 'bahnrand-kenner', 'Bahnrand-Kenner')
        }
        updatedStats = { ...updatedStats, [player]: ps }
      }
    }

    // Variable Überraschungsbelohnung (Teil: Engagement) - nur wenn dieser Wurf nicht schon ein
    // Achievement-Banner ausgelöst hat, sonst würden sich zwei Banner überschreiben.
    if (!banner) {
      const surpriseBonus = rollSurpriseBonus()
      if (surpriseBonus !== null) {
        updatedCosmetics = addCoins(updatedCosmetics, player, surpriseBonus)
        banner = { playerId: player, title: 'Überraschungsbonus', coins: surpriseBonus, kind: 'surprise' }
        soundManager.playSurpriseBonus()
      }
    }

    saveAllStatistics(updatedStats)
    if (updatedCosmetics !== cosmetics) saveAllCosmetics(updatedCosmetics)
    set({
      session: next,
      perGameCounters: { ...perGameCounters, [player]: counters },
      statistics: updatedStats,
      cosmetics: updatedCosmetics,
      pendingAllNine,
      achievementBanner: banner ?? get().achievementBanner,
    })
  },

  chooseDigit: (slot) => {
    const { session } = get()
    if (!session) return
    soundManager.playButtonClick()
    set({ session: fsmChooseDigitSlot(session, slot) })
  },

  pullLever: () => {
    const { session, settings } = get()
    if (!session) return
    soundManager.playLeverPull()
    vibrate(35, settings.hapticsEnabled)
    set({ session: leverPulled(session) })
    window.setTimeout(() => soundManager.playGearMechanism(), 150)
  },

  leverAnimationComplete: () => {
    const { session } = get()
    if (!session) return
    soundManager.playPinUpright()
    soundManager.playBallReturn()
    set({ session: leverAnimationDone(session), pendingAllNine: false })
  },

  ballReturnComplete: () => {
    const { session, statistics, dailyRecords, cosmetics } = get()
    if (!session) return
    const { session: next, effects } = ballReturned(session)
    let updatedStats = { ...statistics }
    let updatedDaily = dailyRecords
    let updatedCosmetics = cosmetics
    let finalResult: RoundResult | null = null
    let banner: AchievementBanner | null = null
    let gameCoins: number | null = null

    for (const effect of effects) {
      if (effect.type === 'ROUND_COMPLETE') {
        soundManager.playRoundComplete()
      }
      if (effect.type === 'GAME_COMPLETE') {
        const result = next.results[next.results.length - 1] ?? null
        finalResult = result
        soundManager.playVictory()

        if (result) {
          const player = result.playerId
          function grantWithCoins(ps: PlayerStatistics, id: string, title: string): PlayerStatistics {
            const isWeeklyChallenge = id === weeklyChallengeIdFor(currentWeekKey())
            const coins = achievementCoinReward(id) + (isWeeklyChallenge ? WEEKLY_CHALLENGE_BONUS_COINS : 0)
            updatedCosmetics = addCoins(updatedCosmetics, player, coins)
            banner = { playerId: player, title: isWeeklyChallenge ? `${title} (Wochenaufgabe!)` : title, coins }
            window.setTimeout(() => soundManager.playCoinGain(), 250)
            return grantAchievement(ps, id)
          }

          let ps = statsFor(updatedStats, player)
          const v = result.houseNumber
          ps = { ...ps, gamesPlayed: ps.gamesPlayed + 1 }
          ps = updateStreak(ps)
          if (next.mode === 'hoch') {
            ps = {
              ...ps,
              bestHigh: ps.bestHigh === null ? v : Math.max(ps.bestHigh, v),
              totalScoreHigh: ps.totalScoreHigh + v,
              countHigh: ps.countHigh + 1,
            }
          } else {
            ps = {
              ...ps,
              bestLow: ps.bestLow === null ? v : Math.min(ps.bestLow, v),
              totalScoreLow: ps.totalScoreLow + v,
              countLow: ps.countLow + 1,
            }
          }

          const dayRec = { ...emptyDailyRecord(), ...updatedDaily[player] }
          if (next.mode === 'hoch') {
            dayRec.bestHigh = dayRec.bestHigh === null ? v : Math.max(dayRec.bestHigh, v)
          } else {
            dayRec.bestLow = dayRec.bestLow === null ? v : Math.min(dayRec.bestLow, v)
          }
          dayRec.gamesPlayedToday += 1
          updatedDaily = { ...updatedDaily, [player]: dayRec }
          saveDailyRecords(updatedDaily)

          gameCoins = coinsForHausnummer(next.mode, v)
          updatedCosmetics = addCoins(updatedCosmetics, player, gameCoins)
          window.setTimeout(() => soundManager.playCoinGain(), 250)

          // Die Bedingungen (Tiefstapler: Tageswert <= 111, Stammgast: 5 Partien an einem Tag)
          // bleiben tagesbasiert - nur die Wiederholbarkeits-Sperre (schon diese Woche geschafft?)
          // ist jetzt wöchentlich statt täglich (siehe hasAchievementThisWeek), damit sie zur
          // wöchentlichen Bestenliste passt statt inkonsistent täglich zurückzusetzen.
          if (
            next.mode === 'niedrig' &&
            dayRec.bestLow !== null &&
            dayRec.bestLow <= 111 &&
            !hasAchievementThisWeek(ps, 'tiefstapler', currentWeekKey())
          ) {
            ps = grantWithCoins(ps, 'tiefstapler', 'Tiefstapler')
          }
          if (dayRec.gamesPlayedToday >= 5 && !hasAchievementThisWeek(ps, 'stammgast', currentWeekKey())) {
            ps = grantWithCoins(ps, 'stammgast', 'Stammgast')
          }
          updatedStats = { ...updatedStats, [player]: ps }
        }
        saveAllStatistics(updatedStats)
        if (updatedCosmetics !== cosmetics) saveAllCosmetics(updatedCosmetics)
        soundManager.stopAmbientLoop()
      }
    }

    set({
      session: next,
      statistics: updatedStats,
      dailyRecords: updatedDaily,
      cosmetics: updatedCosmetics,
      finalResult: finalResult ?? get().finalResult,
      lastGameCoins: gameCoins ?? get().lastGameCoins,
      achievementBanner: banner ?? get().achievementBanner,
    })
  },

  advanceAfterSwitch: () => {
    const { session } = get()
    if (!session) return
    soundManager.playPlayerSwitch()
    set({ session: beginNextTurn(session) })
  },

  startTannenbaum: () => {
    const { selectedPlayer } = get()
    if (!selectedPlayer) return
    set({
      tannenbaumSession: createTannenbaumSession(selectedPlayer),
      screen: 'tannenbaum',
      tannenbaumResult: null,
      lastGameCoins: null,
    })
    soundManager.ensureContext()
    soundManager.startAmbientLoop()
  },

  submitTannenbaumThrow: (pinsDown) => {
    const { tannenbaumSession, statistics, dailyRecords, cosmetics } = get()
    if (!tannenbaumSession) return
    soundManager.playPinsFall(pinsDown)
    const mood = evaluateTannenbaumMood(tannenbaumSession.remaining, pinsDown)
    const { session: next, completed } = resolveTannenbaumThrow(tannenbaumSession, pinsDown)

    // Stimmungs-Sound (Teil: Reaktions-Mimik) - bei Spielende übernimmt playVictory() weiter unten
    // die Feier, daher hier ausgenommen. Kurze Verzögerung gegen Kollision mit dem Kegelgeräusch.
    if (!completed) {
      window.setTimeout(() => {
        if (mood === 'happy') soundManager.playMoodHappy()
        else soundManager.playMoodSad()
      }, 200)
    }

    if (completed) {
      soundManager.playVictory()
      const player = next.playerId
      const throwCount = next.throwCount
      let banner: AchievementBanner | null = null
      let updatedCosmetics = cosmetics

      let ps = statsFor(statistics, player)
      const isBest = ps.bestTannenbaum === null || throwCount < ps.bestTannenbaum
      ps = { ...ps, bestTannenbaum: isBest ? throwCount : ps.bestTannenbaum, gamesPlayed: ps.gamesPlayed + 1 }
      ps = updateStreak(ps)

      const dayRec = { ...emptyDailyRecord(), ...dailyRecords[player] }
      dayRec.bestTannenbaum = dayRec.bestTannenbaum === null ? throwCount : Math.min(dayRec.bestTannenbaum, throwCount)
      dayRec.gamesPlayedToday += 1
      const updatedDaily = { ...dailyRecords, [player]: dayRec }
      saveDailyRecords(updatedDaily)

      const gameCoins = coinsForTannenbaum(throwCount)
      updatedCosmetics = addCoins(updatedCosmetics, player, gameCoins)
      window.setTimeout(() => soundManager.playCoinGain(), 250)

      if (dayRec.gamesPlayedToday >= 5 && !hasAchievementThisWeek(ps, 'stammgast', currentWeekKey())) {
        const isWeeklyChallenge = weeklyChallengeIdFor(currentWeekKey()) === 'stammgast'
        const achCoins = achievementCoinReward('stammgast') + (isWeeklyChallenge ? WEEKLY_CHALLENGE_BONUS_COINS : 0)
        updatedCosmetics = addCoins(updatedCosmetics, player, achCoins)
        banner = { playerId: player, title: isWeeklyChallenge ? 'Stammgast (Wochenaufgabe!)' : 'Stammgast', coins: achCoins }
        window.setTimeout(() => soundManager.playCoinGain(), 400)
        ps = grantAchievement(ps, 'stammgast')
      }
      const updatedStats = { ...statistics, [player]: ps }
      saveAllStatistics(updatedStats)
      if (updatedCosmetics !== cosmetics) saveAllCosmetics(updatedCosmetics)

      soundManager.stopAmbientLoop()
      set({
        tannenbaumSession: next,
        statistics: updatedStats,
        dailyRecords: updatedDaily,
        cosmetics: updatedCosmetics,
        tannenbaumResult: { throwCount, isBest },
        lastGameCoins: gameCoins,
        achievementBanner: banner ?? get().achievementBanner,
      })
    } else {
      // Variable Überraschungsbelohnung (Teil: Engagement) - auch bei laufenden Tannenbaum-Partien,
      // nicht nur bei Hausnummer-Würfen.
      const surpriseBonus = rollSurpriseBonus()
      if (surpriseBonus !== null) {
        const updatedCosmetics = addCoins(cosmetics, tannenbaumSession.playerId, surpriseBonus)
        saveAllCosmetics(updatedCosmetics)
        soundManager.playSurpriseBonus()
        set({
          tannenbaumSession: next,
          cosmetics: updatedCosmetics,
          achievementBanner: { playerId: tannenbaumSession.playerId, title: 'Überraschungsbonus', coins: surpriseBonus, kind: 'surprise' },
        })
      } else {
        set({ tannenbaumSession: next })
      }
    }
  },

  pullTannenbaumLever: () => {
    const { tannenbaumSession, settings } = get()
    if (!tannenbaumSession) return
    soundManager.playLeverPull()
    vibrate(35, settings.hapticsEnabled)
    set({ tannenbaumSession: tannenbaumLeverPulled(tannenbaumSession) })
    window.setTimeout(() => soundManager.playGearMechanism(), 150)
  },

  tannenbaumLeverAnimationComplete: () => {
    const { tannenbaumSession } = get()
    if (!tannenbaumSession) return
    soundManager.playPinUpright()
    soundManager.playBallReturn()
    set({ tannenbaumSession: tannenbaumLeverAnimationDone(tannenbaumSession) })
  },

  tannenbaumBallReturnComplete: () => {
    const { tannenbaumSession } = get()
    if (!tannenbaumSession) return
    set({ tannenbaumSession: tannenbaumBallReturned(tannenbaumSession) })
  },

  dismissAchievementBanner: () => set({ achievementBanner: null }),

  resetTodayOnly: () => {
    resetDailyRecords()
    saveLoginBonusDates({})
    set({ dailyRecords: {}, loginBonusDates: {} })
  },

  resetStatistics: () => {
    resetAllStatistics()
    resetDailyRecords()
    resetAllTimeBoard()
    resetAllTimeWeeklyWins()
    resetWeeklyRecords()
    saveLoginBonusDates({})
    set({
      statistics: {} as Record<CharacterId, PlayerStatistics>,
      dailyRecords: {},
      allTimeBoard: {},
      allTimeWeeklyWins: {},
      weekKey: currentWeekKey(),
      weeklyPoints: {},
      loginBonusDates: {},
    })
  },

  updateSettings: (partial) => {
    const settings = { ...get().settings, ...partial }
    saveSettings(settings)
    soundManager.setMusicVolume(settings.musicVolume)
    soundManager.setSfxVolume(settings.sfxVolume)
    set({ settings })
  },

  backToStartFromGameOver: () => {
    set({
      session: null,
      tannenbaumSession: null,
      selectedPlayer: null,
      screen: 'start',
      finalResult: null,
      tannenbaumResult: null,
      lastGameCoins: null,
      pauseMenuOpen: false,
    })
  },
}))

export function achievementTitle(id: string): string {
  return ACHIEVEMENT_DEFS.find((a) => a.id === id)?.title ?? id
}
