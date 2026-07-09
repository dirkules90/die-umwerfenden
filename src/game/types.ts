export type CharacterId = 'daniel' | 'tobias' | 'dirk' | 'fabian' | 'pascal' | 'alex'

export type GameMode = 'hoch' | 'niedrig'

export type BallType = 'leicht' | 'schwer'

export type DigitSlot = 'hundert' | 'zehn' | 'einer'

export interface AvatarConfig {
  id: CharacterId
  name: string
  hairColor: string
  skinColor: string
  hasBeard: boolean
  hasGlasses: boolean
  build: 'schlank' | 'mittel' | 'kraeftig'
  shirtAccent: string
}

export interface Throw {
  playerId: CharacterId
  ballType: BallType
  pinsDown: number
  isGutter: boolean
  resultDigit: number
  slot: DigitSlot | null
}

export interface RoundResult {
  playerId: CharacterId
  roundNumber: number
  houseNumber: number
  digits: Partial<Record<DigitSlot, number>>
}

export interface Achievement {
  id: string
  unlockedAt: number
}

export interface PlayerStatistics {
  gamesPlayed: number
  bestHigh: number | null
  bestLow: number | null
  totalScoreHigh: number
  countHigh: number
  totalScoreLow: number
  countLow: number
  perfectThrows: number
  gutterThrows: number
  longestPerfectStreak: number
  wins: number
  leverPulls: number
  achievements: Achievement[]
}

export interface Settings {
  musicVolume: number
  sfxVolume: number
  hapticsEnabled: boolean
  defaultRounds: number
}

export type GamePhase =
  | 'idle'
  | 'aiming'
  | 'throwing'
  | 'settling'
  | 'digitChoice'
  | 'leverWaiting'
  | 'leverAnimating'
  | 'ballReturning'
  | 'playerSwitch'
  | 'roundResult'
  | 'gameOver'

export interface GameSession {
  mode: GameMode
  totalRounds: number
  activePlayers: CharacterId[]
  currentRoundIndex: number
  currentThrowIndex: number
  currentPlayerIndex: number
  results: RoundResult[]
  currentDigits: Partial<Record<DigitSlot, number>>
  pendingDigit: number | null
  phase: GamePhase
}
