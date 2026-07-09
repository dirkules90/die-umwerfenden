import { create } from 'zustand'
import type { CharacterId, DigitSlot, GameMode, GameSession, PlayerStatistics, RoundResult, Settings } from '../game/types'
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
import { computeRanking } from '../game/scoring'
import { ACHIEVEMENT_DEFS, grantAchievement, hasAchievement } from '../game/achievements'
import {
  emptyStatistics,
  loadAllStatistics,
  loadSettings,
  resetAllStatistics,
  saveAllStatistics,
  saveSettings,
} from '../storage/localStorageService'
import { soundManager } from '../audio/soundManager'
import { vibrate } from '../game/haptics'

export type Screen =
  | 'start'
  | 'playerSelect'
  | 'modeSelect'
  | 'game'
  | 'leaderboard'
  | 'statistics'
  | 'settings'

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
  selectedPlayers: CharacterId[]
  session: GameSession | null
  statistics: Record<CharacterId, PlayerStatistics>
  settings: Settings
  achievementBanner: AchievementBanner | null
  perGameCounters: Partial<Record<CharacterId, PerGameCounters>>
  pendingAllNine: boolean
  finalRanking: { playerId: CharacterId; total: number }[] | null
  lastRoundResult: RoundResult | null
  pauseMenuOpen: boolean

  goTo: (screen: Screen) => void
  setPauseMenuOpen: (open: boolean) => void
  clearLastRoundResult: () => void
  openSettings: (from: Screen) => void
  togglePlayer: (id: CharacterId) => void
  reorderPlayers: (order: CharacterId[]) => void
  startGame: (mode: GameMode, rounds: number) => void
  beginAiming: () => void
  submitThrowResult: (pinsDown: number, isGutter: boolean) => void
  chooseDigit: (slot: DigitSlot) => void
  pullLever: () => void
  leverAnimationComplete: () => void
  ballReturnComplete: () => void
  advanceAfterSwitch: () => void
  dismissAchievementBanner: () => void
  resetStatistics: () => void
  updateSettings: (partial: Partial<Settings>) => void
  backToStartFromGameOver: () => void
}

function statsFor(store: Record<CharacterId, PlayerStatistics>, id: CharacterId): PlayerStatistics {
  return store[id] ?? emptyStatistics()
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'start',
  settingsReturnTo: 'start',
  selectedPlayers: [],
  session: null,
  statistics: loadAllStatistics(),
  settings: loadSettings(),
  achievementBanner: null,
  perGameCounters: {},
  pendingAllNine: false,
  finalRanking: null,
  lastRoundResult: null,
  pauseMenuOpen: false,

  setPauseMenuOpen: (open) => set({ pauseMenuOpen: open }),
  clearLastRoundResult: () => set({ lastRoundResult: null }),

  goTo: (screen) => {
    soundManager.playButtonClick()
    set({ screen })
  },

  openSettings: (from) => {
    soundManager.playButtonClick()
    set({ settingsReturnTo: from, screen: 'settings' })
  },

  togglePlayer: (id) => {
    soundManager.playButtonClick()
    set((s) => ({
      selectedPlayers: s.selectedPlayers.includes(id)
        ? s.selectedPlayers.filter((p) => p !== id)
        : [...s.selectedPlayers, id],
    }))
  },

  reorderPlayers: (order) => set({ selectedPlayers: order }),

  startGame: (mode, rounds) => {
    const { selectedPlayers } = get()
    if (selectedPlayers.length === 0) return
    const counters: Partial<Record<CharacterId, PerGameCounters>> = {}
    for (const p of selectedPlayers) counters[p] = { gutterCount: 0, perfectStreak: 0 }
    set({
      session: createSession(mode, rounds, selectedPlayers),
      screen: 'game',
      perGameCounters: counters,
      finalRanking: null,
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
        ps = { ...ps, perfectThrows: ps.perfectThrows + 1 }
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
        if (counters.gutterCount >= 5 && !hasAchievement(ps, 'bahnrand-kenner')) {
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
    const { session, statistics } = get()
    if (!session) return
    const player = currentPlayer(session)
    let ps = statsFor(statistics, player)
    ps = { ...ps, leverPulls: ps.leverPulls + 1 }
    let banner: AchievementBanner | null = null
    if (ps.leverPulls >= 100 && !hasAchievement(ps, 'hebel-profi')) {
      ps = grantAchievement(ps, 'hebel-profi')
      banner = { playerId: player, title: 'Hebel-Profi' }
    }
    const updatedStats = { ...statistics, [player]: ps }
    saveAllStatistics(updatedStats)
    soundManager.playPinUpright()
    soundManager.playBallReturn()
    set({
      session: leverAnimationDone(session),
      statistics: updatedStats,
      achievementBanner: banner ?? get().achievementBanner,
      pendingAllNine: false,
    })
  },

  ballReturnComplete: () => {
    const { session, statistics, perGameCounters } = get()
    if (!session) return
    const { session: next, effects } = ballReturned(session)
    let updatedStats = { ...statistics }
    let finalRanking: { playerId: CharacterId; total: number }[] | null = null
    let lastRoundResult: RoundResult | null = null

    for (const effect of effects) {
      if (effect.type === 'ROUND_COMPLETE') {
        soundManager.playRoundComplete()
        lastRoundResult = effect.result
      }
      if (effect.type === 'GAME_COMPLETE') {
        const ranking = computeRanking(next.results, next.mode)
        finalRanking = ranking.map((r) => ({ playerId: r.playerId, total: r.total }))
        soundManager.playVictory()

        for (const r of ranking) {
          let ps = statsFor(updatedStats, r.playerId)
          const perRoundValues = next.results.filter((res) => res.playerId === r.playerId).map((res) => res.houseNumber)
          ps = { ...ps, gamesPlayed: ps.gamesPlayed + 1 }
          for (const v of perRoundValues) {
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
          }
          const streak = perGameCounters[r.playerId]?.perfectStreak ?? 0
          ps = { ...ps, longestPerfectStreak: Math.max(ps.longestPerfectStreak, streak) }

          if (next.mode === 'hoch' && ps.bestHigh === 999 && !hasAchievement(ps, 'hausnummer-meister')) {
            ps = grantAchievement(ps, 'hausnummer-meister')
          }
          if (next.mode === 'niedrig' && ps.bestLow === 0 && !hasAchievement(ps, 'tiefstapler')) {
            ps = grantAchievement(ps, 'tiefstapler')
          }
          if (ps.gamesPlayed >= 10 && !hasAchievement(ps, 'stammgast')) {
            ps = grantAchievement(ps, 'stammgast')
          }
          updatedStats = { ...updatedStats, [r.playerId]: ps }
        }
        if (ranking.length > 0) {
          const winnerId = ranking[0].playerId
          const wps = statsFor(updatedStats, winnerId)
          updatedStats = { ...updatedStats, [winnerId]: { ...wps, wins: wps.wins + 1 } }
        }
        saveAllStatistics(updatedStats)
        soundManager.stopAmbientLoop()
      }
    }

    set({
      session: next,
      statistics: updatedStats,
      finalRanking: finalRanking ?? get().finalRanking,
      lastRoundResult: lastRoundResult ?? get().lastRoundResult,
    })
  },

  advanceAfterSwitch: () => {
    const { session } = get()
    if (!session) return
    soundManager.playPlayerSwitch()
    set({ session: beginNextTurn(session) })
  },

  dismissAchievementBanner: () => set({ achievementBanner: null }),

  resetStatistics: () => {
    resetAllStatistics()
    set({ statistics: {} as Record<CharacterId, PlayerStatistics> })
  },

  updateSettings: (partial) => {
    const settings = { ...get().settings, ...partial }
    saveSettings(settings)
    soundManager.setMusicVolume(settings.musicVolume)
    soundManager.setSfxVolume(settings.sfxVolume)
    set({ settings })
  },

  backToStartFromGameOver: () => {
    set({ session: null, selectedPlayers: [], screen: 'start', finalRanking: null, lastRoundResult: null, pauseMenuOpen: false })
  },
}))

export function achievementTitle(id: string): string {
  return ACHIEVEMENT_DEFS.find((a) => a.id === id)?.title ?? id
}
