import type {
  AvatarConfig,
  BeardStyleId,
  CapeId,
  CosmeticLoadout,
  CosmeticOwnership,
  GlassesStyleId,
  HairStyleId,
  NecklaceId,
  PantsColorId,
  ShirtStyleId,
  ShoeColorId,
  WristbandId,
} from './types'

export interface HairStyleDef {
  id: HairStyleId
  title: string
  price: number
}

export interface ShirtStyleDef {
  id: ShirtStyleId
  title: string
  price: number
}

export interface GlassesStyleDef {
  id: GlassesStyleId
  title: string
  price: number
}

export interface BeardStyleDef {
  id: BeardStyleId
  title: string
  price: number
}

export interface PantsColorDef {
  id: PantsColorId
  title: string
  price: number
}

export interface ShoeColorDef {
  id: ShoeColorId
  title: string
  price: number
}

export interface NecklaceDef {
  id: NecklaceId
  title: string
  price: number
}

export interface WristbandDef {
  id: WristbandId
  title: string
  price: number
}

export interface CapeDef {
  id: CapeId
  title: string
  price: number
}

// Teil: Kosmetik-Shop, Preise ausgerichtet an der tatsächlichen Münzverdienrate (siehe game/coins.ts):
// eine Hausnummer-Partie bringt ~2-22 Münzen, ein Achievement 10-20, der Wochensieger-Bonus 120
// einmalig pro Woche. Alles zusammen zu besitzen kostet absichtlich deutlich mehr, als an einem
// einzelnen (auch sehr aktiven) ersten Spieltag zusammenkommt, damit der Shop ein Ziel über mehrere
// Tage/Wochen bleibt statt nach 5 Partien komplett leergekauft zu sein.
export const HAIRSTYLES: HairStyleDef[] = [
  { id: 'standard', title: 'Standard', price: 0 },
  { id: 'kurz', title: 'Kurzhaarschnitt', price: 40 },
  { id: 'lang', title: 'Zottelmähne', price: 45 },
  { id: 'irokese', title: 'Irokese', price: 60 },
]

export const SHIRTS: ShirtStyleDef[] = [
  { id: 'standard', title: 'Vereins-Shirt', price: 0 },
  { id: 'blitz', title: 'Blitz-Shirt', price: 50 },
  { id: 'umwerfenden', title: '„Die Umwerfenden”-Shirt', price: 70 },
]

export const GLASSES_STYLES: GlassesStyleDef[] = [
  { id: 'none', title: 'Ohne', price: 0 },
  { id: 'cool', title: 'Coole Sonnenbrille', price: 45 },
  { id: 'abgespaced', title: 'Abgespacte Sonnenbrille', price: 65 },
]

export const BEARD_STYLES: BeardStyleDef[] = [
  { id: 'none', title: 'Ohne', price: 0 },
  { id: 'vollbart', title: 'Vollbart', price: 55 },
  { id: 'schnurrbart', title: 'Schnurrbart', price: 35 },
]

export const PANTS_COLORS: PantsColorDef[] = [
  { id: 'standard', title: 'Standard', price: 0 },
  { id: 'schwarz', title: 'Schwarz', price: 20 },
  { id: 'khaki', title: 'Khaki', price: 20 },
  { id: 'rot', title: 'Rot', price: 25 },
  { id: 'camo', title: 'Tarnmuster', price: 45 },
]

export const SHOE_COLORS: ShoeColorDef[] = [
  { id: 'standard', title: 'Standard', price: 0 },
  { id: 'weiss', title: 'Weiß', price: 15 },
  { id: 'rot', title: 'Rot', price: 20 },
  { id: 'neongruen', title: 'Neongrün', price: 25 },
]

export const NECKLACES: NecklaceDef[] = [
  { id: 'none', title: 'Ohne', price: 0 },
  { id: 'gold', title: 'Goldkette', price: 40 },
  { id: 'silber', title: 'Silberkette', price: 30 },
]

export const WRISTBANDS: WristbandDef[] = [
  { id: 'none', title: 'Ohne', price: 0 },
  { id: 'rot', title: 'Rotes Armband', price: 15 },
  { id: 'blau', title: 'Blaues Armband', price: 15 },
  { id: 'schwarz', title: 'Schwarzes Armband', price: 15 },
]

export const CAPES: CapeDef[] = [
  { id: 'none', title: 'Ohne', price: 0 },
  { id: 'rot', title: 'Rotes Umhang', price: 60 },
  { id: 'gold', title: 'Goldenes Umhang', price: 80 },
]

export const GLOVES_PRICE = 30
export const WATCH_PRICE = 90
export const HEADBAND_PRICE = 25

/** Charaktere mit fester "hasGlasses"/"hasBeard"-Eigenschaft (Dirk/Fabian) starten mit der
 * jeweiligen Standard-Variante ausgerüstet statt mit einer vom Shop unabhängigen Extra-Geometrie
 * (Bugfix: Shop zeigte "Ohne" als ausgerüstet, während im 3D-Modell trotzdem eine Brille/Bart zu
 * sehen war). So zeigen Shop und 3D-Modell immer denselben Zustand, und die feste Eigenschaft
 * lässt sich sogar abwählen. */
export function defaultLoadout(config: AvatarConfig): CosmeticLoadout {
  return {
    hairStyle: 'standard',
    hairColor: config.hairColor,
    shirtStyle: 'standard',
    gloves: false,
    glassesStyle: config.hasGlasses ? 'cool' : 'none',
    watch: false,
    headband: false,
    beardStyle: config.hasBeard ? 'vollbart' : 'none',
    pantsColor: 'standard',
    shoeColor: 'standard',
    necklace: 'none',
    wristband: 'none',
    cape: 'none',
    crown: false,
  }
}

export function emptyOwnership(): CosmeticOwnership {
  return {
    hairStyles: [],
    shirtStyles: [],
    gloves: false,
    glassesStyles: [],
    watch: false,
    headband: false,
    beardStyles: [],
    pantsColors: [],
    shoeColors: [],
    necklaces: [],
    wristbands: [],
    capes: [],
    crown: false,
  }
}

export function isHairStyleOwned(ownership: CosmeticOwnership, id: HairStyleId): boolean {
  return id === 'standard' || ownership.hairStyles.includes(id)
}

export function isShirtStyleOwned(ownership: CosmeticOwnership, id: ShirtStyleId): boolean {
  return id === 'standard' || ownership.shirtStyles.includes(id)
}

/** hasGlassesTrait: Charaktere mit fester Brillen-Eigenschaft (Dirk/Fabian) besitzen die
 * 'cool'-Brille kostenlos, ganz ohne das je in `ownership` einzutragen - vermeidet eine
 * Datenmigration für bereits gespeicherte Shop-Stände. */
export function isGlassesStyleOwned(ownership: CosmeticOwnership, id: GlassesStyleId, hasGlassesTrait: boolean): boolean {
  return id === 'none' || (id === 'cool' && hasGlassesTrait) || ownership.glassesStyles.includes(id)
}

/** hasBeardTrait: analog zu isGlassesStyleOwned - Dirk/Fabian besitzen 'vollbart' kostenlos. */
export function isBeardStyleOwned(ownership: CosmeticOwnership, id: BeardStyleId, hasBeardTrait: boolean): boolean {
  return id === 'none' || (id === 'vollbart' && hasBeardTrait) || ownership.beardStyles.includes(id)
}

export function isPantsColorOwned(ownership: CosmeticOwnership, id: PantsColorId): boolean {
  return id === 'standard' || ownership.pantsColors.includes(id)
}

export function isShoeColorOwned(ownership: CosmeticOwnership, id: ShoeColorId): boolean {
  return id === 'standard' || ownership.shoeColors.includes(id)
}

export function isNecklaceOwned(ownership: CosmeticOwnership, id: NecklaceId): boolean {
  return id === 'none' || ownership.necklaces.includes(id)
}

export function isWristbandOwned(ownership: CosmeticOwnership, id: WristbandId): boolean {
  return id === 'none' || ownership.wristbands.includes(id)
}

export function isCapeOwned(ownership: CosmeticOwnership, id: CapeId): boolean {
  return id === 'none' || ownership.capes.includes(id)
}

export function hairStylePrice(id: HairStyleId): number {
  return HAIRSTYLES.find((h) => h.id === id)?.price ?? 0
}

export function shirtStylePrice(id: ShirtStyleId): number {
  return SHIRTS.find((s) => s.id === id)?.price ?? 0
}

export function glassesStylePrice(id: GlassesStyleId, hasGlassesTrait: boolean): number {
  if (id === 'cool' && hasGlassesTrait) return 0
  return GLASSES_STYLES.find((g) => g.id === id)?.price ?? 0
}

export function beardStylePrice(id: BeardStyleId, hasBeardTrait: boolean): number {
  if (id === 'vollbart' && hasBeardTrait) return 0
  return BEARD_STYLES.find((b) => b.id === id)?.price ?? 0
}

export function pantsColorPrice(id: PantsColorId): number {
  return PANTS_COLORS.find((p) => p.id === id)?.price ?? 0
}

export function shoeColorPrice(id: ShoeColorId): number {
  return SHOE_COLORS.find((s) => s.id === id)?.price ?? 0
}

export function necklacePrice(id: NecklaceId): number {
  return NECKLACES.find((n) => n.id === id)?.price ?? 0
}

export function wristbandPrice(id: WristbandId): number {
  return WRISTBANDS.find((w) => w.id === id)?.price ?? 0
}

export function capePrice(id: CapeId): number {
  return CAPES.find((c) => c.id === id)?.price ?? 0
}

/** Anzahl aller käuflichen (nicht kostenlosen Basis-)Items über alle Kategorien hinweg (Teil:
 * Engagement/Sammelfortschritt) - Grundlage für die "X von Y gesammelt"-Anzeige im Shop. Die
 * exklusive Krone zählt bewusst nicht mit, weil sie nicht käuflich ist. */
export function totalPurchasableItemCount(): number {
  return (
    (HAIRSTYLES.length - 1) +
    (SHIRTS.length - 1) +
    1 + // Handschuhe
    (GLASSES_STYLES.length - 1) +
    1 + // Armbanduhr
    1 + // Stirnband
    (BEARD_STYLES.length - 1) +
    (PANTS_COLORS.length - 1) +
    (SHOE_COLORS.length - 1) +
    (NECKLACES.length - 1) +
    (WRISTBANDS.length - 1) +
    (CAPES.length - 1)
  )
}

/** Wie viele der käuflichen Items ein Charakter bereits besitzt - über die isXOwned-Helfer statt
 * direkt über die ownership-Arrays, damit kostenlos-per-Charaktereigenschaft freigeschaltete Items
 * (z.B. die 'cool'-Brille für Dirk/Fabian) ebenfalls mitzählen. */
export function ownedItemCount(ownership: CosmeticOwnership, config: AvatarConfig): number {
  let count = 0
  for (const h of HAIRSTYLES) if (h.id !== 'standard' && isHairStyleOwned(ownership, h.id)) count++
  for (const s of SHIRTS) if (s.id !== 'standard' && isShirtStyleOwned(ownership, s.id)) count++
  if (ownership.gloves) count++
  for (const g of GLASSES_STYLES) if (g.id !== 'none' && isGlassesStyleOwned(ownership, g.id, config.hasGlasses)) count++
  if (ownership.watch) count++
  if (ownership.headband) count++
  for (const b of BEARD_STYLES) if (b.id !== 'none' && isBeardStyleOwned(ownership, b.id, config.hasBeard)) count++
  for (const p of PANTS_COLORS) if (p.id !== 'standard' && isPantsColorOwned(ownership, p.id)) count++
  for (const s of SHOE_COLORS) if (s.id !== 'standard' && isShoeColorOwned(ownership, s.id)) count++
  for (const n of NECKLACES) if (n.id !== 'none' && isNecklaceOwned(ownership, n.id)) count++
  for (const w of WRISTBANDS) if (w.id !== 'none' && isWristbandOwned(ownership, w.id)) count++
  for (const c of CAPES) if (c.id !== 'none' && isCapeOwned(ownership, c.id)) count++
  return count
}
