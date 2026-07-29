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

export type HairStyleId = 'standard' | 'kurz' | 'lang' | 'irokese'
export type ShirtStyleId = 'standard' | 'blitz' | 'umwerfenden'
/** 'none' fällt auf die feste Charakterbrille (AvatarConfig.hasGlasses) zurück, falls vorhanden -
 * eine gekaufte Shop-Brille ersetzt diese sonst optisch (Teil: Shop-Erweiterung). */
export type GlassesStyleId = 'none' | 'cool' | 'abgespaced'
export type CapStyleId = 'none' | 'baseball' | 'beanie' | 'party'
/** 'none' fällt auf den festen Charakterbart (AvatarConfig.hasBeard) zurück, falls vorhanden -
 * analog zu GlassesStyleId (Teil: Shop-Erweiterung). */
export type BeardStyleId = 'none' | 'vollbart' | 'schnurrbart'
export type PantsColorId = 'standard' | 'schwarz' | 'khaki' | 'rot' | 'camo'
export type ShoeColorId = 'standard' | 'weiss' | 'rot' | 'neongruen'
export type NecklaceId = 'none' | 'gold' | 'silber'
export type WristbandId = 'none' | 'rot' | 'blau' | 'schwarz'
export type CapeId = 'none' | 'rot' | 'gold'

/** Individuelle Erscheinung eines Charakters im 3D-Modell (Teil: Kosmetik-Shop) - unabhängig von
 * der festen AvatarConfig (Statur, Hautfarbe, feste Bart-/Brillen-EIGENSCHAFT bleiben
 * Charaktermerkmale, siehe defaultLoadout). hairColor ist bewusst frei wählbar statt fest wie in
 * AvatarConfig. */
export interface CosmeticLoadout {
  hairStyle: HairStyleId
  hairColor: string
  shirtStyle: ShirtStyleId
  gloves: boolean
  glassesStyle: GlassesStyleId
  watch: boolean
  headband: boolean
  capStyle: CapStyleId
  beardStyle: BeardStyleId
  pantsColor: PantsColorId
  shoeColor: ShoeColorId
  necklace: NecklaceId
  wristband: WristbandId
  cape: CapeId
  /** Exklusiv, nicht käuflich - wird automatisch vergeben, wenn ein Charakter Wochensieger wird
   * (siehe state/gameStore.ts processDailyAndWeeklyRollover). */
  crown: boolean
}

/** Welche Items ein Charakter bereits gekauft hat - 'standard'/'none' sind immer und für alle
 * kostenlos verfügbar, tauchen deshalb hier nicht extra auf. */
export interface CosmeticOwnership {
  hairStyles: HairStyleId[]
  shirtStyles: ShirtStyleId[]
  gloves: boolean
  glassesStyles: GlassesStyleId[]
  watch: boolean
  headband: boolean
  capStyles: CapStyleId[]
  beardStyles: BeardStyleId[]
  pantsColors: PantsColorId[]
  shoeColors: ShoeColorId[]
  necklaces: NecklaceId[]
  wristbands: WristbandId[]
  capes: CapeId[]
  crown: boolean
}

export interface CharacterCosmetics {
  coins: number
  loadout: CosmeticLoadout
  ownership: CosmeticOwnership
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
