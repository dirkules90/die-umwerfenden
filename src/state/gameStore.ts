import { create } from 'zustand'
import type {
  CharacterId,
  DigitSlot,
  GameMode,
  GameSession,
  PlayerStatistics,
  RoundResult,
  Settings,
  TannenbaumSession,
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
import { ACHIEVEMENT_DEFS, grantAchievement, hasAchievement } from '../game/achievements'
import { computeTotalDailyPoints, dailyWinners, emptyDailyRecord, type DailyRecords } from '../game/dailyWinner'
import { todayKey } from '../game/dateKey'
import {
  emptyStatistics,
  loadAllStatistics,
  loadAllTimeBoard,
  loadRawDaily,
  loadSettings,
  resetAllStatistics,
  resetAllTimeBoard,
  resetDailyRecords,
  saveAllStatistics,
  saveAllTimeBoard,
  saveDailyRecords,
  saveSettings,
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
  | 'allTime'
  | 'settings'

const TOTAL_ROUNDS = 1
const GUTTER_STREAK_FOR_ACHIEVEMENT = 3

interface PerGameCounters {
  gutterCount: number
  perfectStreak: number
}

interface AchievementBanner {
  playerId: CharacterId
  title: string
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
  settings: Settings
  achievementBanner: AchievementBanner | null
  perGameCounters: Partial<Record<CharacterId, PerGameCounters>>
  pendingAllNine: boolean
  finalResult: RoundResult | null
  tannenbaumResult: { throwCount: number; isBest: boolean } | null
  pauseMenuOpen: boolean

  goTo: (screen: Screen) => void
  setPauseMenuOpen: (open: boolean) => void
  openSettings: (from: Screen) => void
  selectPlayer: (id: CharacterId) => void
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

/**
 * Tagesabschluss (Teil: All-Time-Bestenliste): eine echte "um 23:59:59 ausführen"-Aktion gibt es
 * in einer rein clientseitigen PWA ohne Server nicht. Stattdessen wird beim nächsten App-Start
 * geprüft, ob die gespeicherten Tagesrekorde von einem älteren Tag stammen - falls ja, wird für
 * diesen abgelaufenen Tag einmalig der/die Tagessieger ermittelt, bekommt 1 Punkt (bei
 * Gleichstand aufgeteilt) in der All-Time-Liste gutgeschrieben, und die Tagesdaten werden für den
 * neuen Tag zurückgesetzt.
 */
function loadStatisticsAndDailyState(): {
  statistics: Record<CharacterId, PlayerStatistics>
  dailyRecords: DailyRecords
  allTimeBoard: Partial<Record<CharacterId, number>>
} {
  const statistics = loadAllStatistics()
  let allTimeBoard = loadAllTimeBoard()
  const raw = loadRawDaily()

  if (!raw || raw.date === todayKey()) {
    return { statistics, dailyRecords: raw?.records ?? {}, allTimeBoard }
  }

  const staleDayTotals = computeTotalDailyPoints(raw.records, statistics, raw.date)
  const { ids: winners } = dailyWinners(staleDayTotals)
  if (winners.length > 0) {
    const share = 1 / winners.length
    const updatedBoard = { ...allTimeBoard }
    for (const id of winners) updatedBoard[id] = (updatedBoard[id] ?? 0) + share
    allTimeBoard = updatedBoard
    saveAllTimeBoard(allTimeBoard)
  }
  saveDailyRecords({})
  return { statistics, dailyRecords: {}, allTimeBoard }
}

const initialDailyState = loadStatisticsAndDailyState()

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'start',
  settingsReturnTo: 'start',
  selectedPlayer: null,
  session: null,
  tannenbaumSession: null,
  statistics: initialDailyState.statistics,
  dailyRecords: initialDailyState.dailyRecords,
  allTimeBoard: initialDailyState.allTimeBoard,
  settings: loadSettings(),
  achievementBanner: null,
  perGameCounters: {},
  pendingAllNine: false,
  finalResult: null,
  tannenbaumResult: null,
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

  startGame: (mode) => {
    const { selectedPlayer } = get()
    if (!selectedPlayer) return
    set({
      session: createSession(mode, TOTAL_ROUNDS, [selectedPlayer]),
      screen: 'game',
      perGameCounters: { [selectedPlayer]: { gutterCount: 0, perfectStreak: 0 } },
      finalResult: null,
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
    const { session, perGameCounters, statistics, settings } = get()
    if (!session) return
    const player = currentPlayer(session)
    const { session: next, effects } = resolveThrow(session, pinsDown, isGutter)

    const counters = { ...(perGameCounters[player] ?? { gutterCount: 0, perfectStreak: 0 }) }
    let updatedStats = { ...statistics }
    let banner: AchievementBanner | null = null
    let pendingAllNine = false

    if (isGutter) {
      soundManager.playRollGutter()
      counters.gutterCount += 1
      counters.perfectStreak = 0
    } else {
      soundManager.playPinsFall(pinsDown)
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
        if (!hasAchievement(ps, 'volltreffer')) {
          ps = grantAchievement(ps, 'volltreffer')
          banner = { playerId: player, title: 'Volltreffer' }
        }
        if (counters.perfectStreak >= 3 && !hasAchievement(ps, 'serientaeter')) {
          ps = grantAchievement(ps, 'serientaeter')
          banner = { playerId: player, title: 'Serientäter' }
        }
        updatedStats = { ...updatedStats, [player]: ps }
      }
      if (effect.type === 'GUTTER') {
        let ps = statsFor(updatedStats, player)
        ps = { ...ps, gutterThrows: ps.gutterThrows + 1 }
        if (counters.gutterCount >= GUTTER_STREAK_FOR_ACHIEVEMENT && !hasAchievement(ps, 'bahnrand-kenner')) {
          ps = grantAchievement(ps, 'bahnrand-kenner')
          banner = { playerId: player, title: 'Bahnrand-Kenner' }
        }
        updatedStats = { ...updatedStats, [player]: ps }
      }
    }

    saveAllStatistics(updatedStats)
    set({
      session: next,
      perGameCounters: { ...perGameCounters, [player]: counters },
      statistics: updatedStats,
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
    const { session, statistics, dailyRecords } = get()
    if (!session) return
    const { session: next, effects } = ballReturned(session)
    let updatedStats = { ...statistics }
    let updatedDaily = dailyRecords
    let finalResult: RoundResult | null = null

    for (const effect of effects) {
      if (effect.type === 'ROUND_COMPLETE') {
        soundManager.playRoundComplete()
      }
      if (effect.type === 'GAME_COMPLETE') {
        const result = next.results[next.results.length - 1] ?? null
        finalResult = result
        soundManager.playVictory()

        if (result) {
          let ps = statsFor(updatedStats, result.playerId)
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
          if (next.mode === 'niedrig' && ps.bestLow === 0 && !hasAchievement(ps, 'tiefstapler')) {
            ps = grantAchievement(ps, 'tiefstapler')
          }
          if (ps.gamesPlayed >= 10 && !hasAchievement(ps, 'stammgast')) {
            ps = grantAchievement(ps, 'stammgast')
          }
          updatedStats = { ...updatedStats, [result.playerId]: ps }

          const dayRec = { ...emptyDailyRecord(), ...updatedDaily[result.playerId] }
          if (next.mode === 'hoch') {
            dayRec.bestHigh = dayRec.bestHigh === null ? v : Math.max(dayRec.bestHigh, v)
          } else {
            dayRec.bestLow = dayRec.bestLow === null ? v : Math.min(dayRec.bestLow, v)
          }
          dayRec.gamesPlayedToday += 1
          updatedDaily = { ...updatedDaily, [result.playerId]: dayRec }
          saveDailyRecords(updatedDaily)
        }
        saveAllStatistics(updatedStats)
        soundManager.stopAmbientLoop()
      }
    }

    set({
      session: next,
      statistics: updatedStats,
      dailyRecords: updatedDaily,
      finalResult: finalResult ?? get().finalResult,
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
    })
    soundManager.ensureContext()
    soundManager.startAmbientLoop()
  },

  submitTannenbaumThrow: (pinsDown) => {
    const { tannenbaumSession, statistics, dailyRecords } = get()
    if (!tannenbaumSession) return
    soundManager.playPinsFall(pinsDown)
    const { session: next, completed } = resolveTannenbaumThrow(tannenbaumSession, pinsDown)

    if (completed) {
      soundManager.playVictory()
      const player = next.playerId
      const throwCount = next.throwCount

      let ps = statsFor(statistics, player)
      const isBest = ps.bestTannenbaum === null || throwCount < ps.bestTannenbaum
      ps = { ...ps, bestTannenbaum: isBest ? throwCount : ps.bestTannenbaum, gamesPlayed: ps.gamesPlayed + 1 }
      const updatedStats = { ...statistics, [player]: ps }
      saveAllStatistics(updatedStats)

      const dayRec = { ...emptyDailyRecord(), ...dailyRecords[player] }
      dayRec.bestTannenbaum = dayRec.bestTannenbaum === null ? throwCount : Math.min(dayRec.bestTannenbaum, throwCount)
      dayRec.gamesPlayedToday += 1
      const updatedDaily = { ...dailyRecords, [player]: dayRec }
      saveDailyRecords(updatedDaily)

      soundManager.stopAmbientLoop()
      set({
        tannenbaumSession: next,
        statistics: updatedStats,
        dailyRecords: updatedDaily,
        tannenbaumResult: { throwCount, isBest },
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
    set({ statistics: {} as Record<CharacterId, PlayerStatistics>, dailyRecords: {}, allTimeBoard: {} })
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
      pauseMenuOpen: false,
    })
  },
}))

export function achievementTitle(id: string): string {
  return ACHIEVEMENT_DEFS.find((a) => a.id === id)?.title ?? id
}
