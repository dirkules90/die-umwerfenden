export type CharacterId = 'daniel' | 'tobias' | 'dirk' | 'fabian' | 'pascal' | 'alex'

export type GameMode = 'hoch' | 'niedrig'

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
  /** Echtes Spielerfoto (vom Auftraggeber bereitgestellt), z. B. für Auswahl-Bildschirm und HUD. */
  photoUrl: string
}

export interface Throw {
  playerId: CharacterId
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
  /** Wenigste Würfe, um den Tannenbaum vollständig abzuhaken (Teil 10.5, niedriger ist besser). */
  bestTannenbaum: number | null
  perfectThrows: number
  gutterThrows: number
  longestPerfectStreak: number
  achievements: Achievement[]
}

export interface Settings {
  musicVolume: number
  sfxVolume: number
  hapticsEnabled: boolean
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

/** Sitzung des Tannenbaum-Spiels (Teil 10.5): ein Spieler wirft, bis alle Zahlen 2-7
 * abgehakt sind. Ziel ist die geringste Wurfanzahl. */
export interface TannenbaumSession {
  playerId: CharacterId
  remaining: Record<number, number>
  throwCount: number
  phase: GamePhase
}
