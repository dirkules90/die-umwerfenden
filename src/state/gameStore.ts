import { create } from 'zustand'
import type {
  BeardStyleId,
  CapeId,
  CapStyleId,
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
import { ACHIEVEMENT_DEFS, achievementCoinReward, grantAchievement, hasAchievement } from '../game/achievements'
import { computeTotalDailyPoints, dailyWinners, emptyDailyRecord, type DailyRecords } from '../game/dailyWinner'
import { currentWeekKey, todayKey } from '../game/dateKey'
import { AVATAR_CONFIGS } from '../characters/avatarConfigs'
import {
  hairStylePrice,
  isHairStyleOwned,
  isShirtStyleOwned,
  isGlassesStyleOwned,
  isCapStyleOwned,
  isBeardStyleOwned,
  isPantsColorOwned,
  isShoeColorOwned,
  isNecklaceOwned,
  isWristbandOwned,
  isCapeOwned,
  shirtStylePrice,
  glassesStylePrice,
  capStylePrice,
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
import { coinsForHausnummer, coinsForTannenbaum, WEEKLY_WINNER_COIN_BONUS } from '../game/coins'
import { evaluateHausnummerMood, evaluateTannenbaumMood } from '../game/moodRules'
import {
  DEFAULT_PIN,
  emptyCosmetics,
  emptyStatistics,
  loadAllCosmetics,
  loadAllStatistics,
  loadAllTimeBoard,
  loadPins,
  loadRawDaily,
  loadRawWeekly,
  loadSettings,
  resetAllStatistics,
  resetAllTimeBoard,
  resetDailyRecords,
  resetWeeklyRecords,
  saveAllCosmetics,
  saveAllStatistics,
  saveAllTimeBoard,
  saveDailyRecords,
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
  | 'leaderboard'
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
}

interface GameStore {
  screen: Screen
  settingsReturnTo: Screen
  selectedPlayer: CharacterId | null
  session: GameSession | null
  tannenbaumSession: TannenbaumSession | null
  statistics: Record<CharacterId, PlayerStatistics>
  dailyRecords: DailyRecords
  allTimeBoard: Partial<Record<CharacterId, number>>
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
  equipOrBuyCap: (id: CharacterId, style: CapStyleId) => boolean
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
 * Tages- und Wochenabschluss (Teil: All-Time-Bestenliste / Coin-Shop-Wirtschaft): eine echte
 * "um 23:59:59 ausführen"-Aktion gibt es in einer rein clientseitigen PWA ohne Server nicht.
 * Stattdessen wird beim nächsten App-Start geprüft:
 *
 * 1. Stammen die gespeicherten Tagesrekorde von einem älteren Tag? Falls ja, wird für diesen
 *    abgelaufenen Tag einmalig der/die Tagessieger ermittelt, bekommt 1 Punkt (bei Gleichstand
 *    aufgeteilt) in der All-Time-Liste gutgeschrieben (unverändert), UND die Tagespunkte fließen
 *    zusätzlich in den Wochen-Akkumulator ein.
 * 2. Gehört der Wochen-Akkumulator (jetzt inklusive des ggf. gerade abgeschlossenen Tages) noch
 *    zur aktuellen Kalenderwoche? Falls nein, wird der/die Wochensieger aus den gesammelten
 *    Wochenpunkten ermittelt und bekommt einen einmaligen Münzbonus (WEEKLY_WINNER_COIN_BONUS,
 *    bei Gleichstand aufgeteilt) gutgeschrieben - statt eines Bonus für jeden einzelnen Tagessieg.
 */
function processDailyAndWeeklyRollover(): {
  statistics: Record<CharacterId, PlayerStatistics>
  dailyRecords: DailyRecords
  allTimeBoard: Partial<Record<CharacterId, number>>
  weekKey: string
  weeklyPoints: Partial<Record<CharacterId, number>>
} {
  const statistics = loadAllStatistics()
  let allTimeBoard = loadAllTimeBoard()
  const raw = loadRawDaily()

  const rawWeekly = loadRawWeekly()
  let weekKey = rawWeekly?.weekKey ?? currentWeekKey()
  let weeklyPoints = rawWeekly?.points ?? {}

  let dailyRecords: DailyRecords = raw?.records ?? {}

  if (raw && raw.date !== todayKey()) {
    const staleDayTotals = computeTotalDailyPoints(raw.records, statistics, raw.date)
    const { ids: winners } = dailyWinners(staleDayTotals)
    if (winners.length > 0) {
      const share = 1 / winners.length
      const updatedBoard = { ...allTimeBoard }
      for (const id of winners) updatedBoard[id] = (updatedBoard[id] ?? 0) + share
      allTimeBoard = updatedBoard
      saveAllTimeBoard(allTimeBoard)
    }
    for (const [id, points] of Object.entries(staleDayTotals) as [CharacterId, number][]) {
      weeklyPoints = { ...weeklyPoints, [id]: (weeklyPoints[id] ?? 0) + points }
    }
    saveDailyRecords({})
    dailyRecords = {}
  }

  if (weekKey !== currentWeekKey()) {
    const { ids: weekWinners } = dailyWinners(weeklyPoints)
    if (weekWinners.length > 0) {
      const cosmetics = loadAllCosmetics()
      const share = Math.floor(WEEKLY_WINNER_COIN_BONUS / weekWinners.length)
      let updatedCosmetics = cosmetics
      for (const id of weekWinners) {
        updatedCosmetics = addCoins(updatedCosmetics, id, share)
        updatedCosmetics = grantCrown(updatedCosmetics, id)
      }
      saveAllCosmetics(updatedCosmetics)
    }
    weekKey = currentWeekKey()
    weeklyPoints = {}
  }

  saveWeeklyRecords(weekKey, weeklyPoints)
  return { statistics, dailyRecords, allTimeBoard, weekKey, weeklyPoints }
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
  weekKey: initialDailyState.weekKey,
  weeklyPoints: initialDailyState.weeklyPoints,
  pins: loadPins(),
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
    return stored === pin
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

  equipOrBuyCap: (id, style) => {
    const current = cosmeticsFor(get().cosmetics, id)
    let updated = current
    if (!isCapStyleOwned(current.ownership, style)) {
      const price = capStylePrice(style)
      if (current.coins < price) return false
      updated = {
        ...current,
        coins: current.coins - price,
        ownership: { ...current.ownership, capStyles: [...current.ownership.capStyles, style] },
      }
    }
    updated = { ...updated, loadout: { ...updated.loadout, capStyle: style } }
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
      const coins = achievementCoinReward(id)
      updatedCosmetics = addCoins(updatedCosmetics, player, coins)
      banner = { playerId: player, title, coins }
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
        if (!hasAchievement(ps, 'volltreffer', todayKey())) {
          ps = grantWithCoins(ps, 'volltreffer', 'Volltreffer')
        }
        if (counters.perfectStreak >= 3 && !hasAchievement(ps, 'serientaeter', todayKey())) {
          ps = grantWithCoins(ps, 'serientaeter', 'Serientäter')
        }
        updatedStats = { ...updatedStats, [player]: ps }
      }
      if (effect.type === 'GUTTER') {
        let ps = statsFor(updatedStats, player)
        ps = { ...ps, gutterThrows: ps.gutterThrows + 1 }
        if (counters.gutterCount >= GUTTER_STREAK_FOR_ACHIEVEMENT && !hasAchievement(ps, 'bahnrand-kenner', todayKey())) {
          ps = grantWithCoins(ps, 'bahnrand-kenner', 'Bahnrand-Kenner')
        }
        updatedStats = { ...updatedStats, [player]: ps }
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
            const coins = achievementCoinReward(id)
            updatedCosmetics = addCoins(updatedCosmetics, player, coins)
            banner = { playerId: player, title, coins }
            return grantAchievement(ps, id)
          }

          let ps = statsFor(updatedStats, player)
          const v = result.houseNumber
          ps = { ...ps, gamesPlayed: ps.gamesPlayed + 1 }
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

          // Stammgast/Tiefstapler bewusst auf Tageswerten statt Lebenszeit-Rekorden: so bleiben
          // sie wie die übrigen Achievements an jedem neuen Tag wieder frisch erreichbar, statt
          // Spieler, die den Meilenstein längst irgendwann erreicht haben, dauerhaft zu bevorzugen.
          if (next.mode === 'niedrig' && dayRec.bestLow !== null && dayRec.bestLow <= 111 && !hasAchievement(ps, 'tiefstapler', todayKey())) {
            ps = grantWithCoins(ps, 'tiefstapler', 'Tiefstapler')
          }
          if (dayRec.gamesPlayedToday >= 5 && !hasAchievement(ps, 'stammgast', todayKey())) {
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

      const dayRec = { ...emptyDailyRecord(), ...dailyRecords[player] }
      dayRec.bestTannenbaum = dayRec.bestTannenbaum === null ? throwCount : Math.min(dayRec.bestTannenbaum, throwCount)
      dayRec.gamesPlayedToday += 1
      const updatedDaily = { ...dailyRecords, [player]: dayRec }
      saveDailyRecords(updatedDaily)

      const gameCoins = coinsForTannenbaum(throwCount)
      updatedCosmetics = addCoins(updatedCosmetics, player, gameCoins)

      if (dayRec.gamesPlayedToday >= 5 && !hasAchievement(ps, 'stammgast', todayKey())) {
        const achCoins = achievementCoinReward('stammgast')
        updatedCosmetics = addCoins(updatedCosmetics, player, achCoins)
        banner = { playerId: player, title: 'Stammgast', coins: achCoins }
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
      set({ tannenbaumSession: next })
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
    set({ dailyRecords: {} })
  },

  resetStatistics: () => {
    resetAllStatistics()
    resetDailyRecords()
    resetAllTimeBoard()
    resetWeeklyRecords()
    set({
      statistics: {} as Record<CharacterId, PlayerStatistics>,
      dailyRecords: {},
      allTimeBoard: {},
      weekKey: currentWeekKey(),
      weeklyPoints: {},
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
