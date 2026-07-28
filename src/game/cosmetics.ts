import type { AvatarConfig, CosmeticLoadout, CosmeticOwnership, GlassesStyleId, HairStyleId, ShirtStyleId } from './types'

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

export const GLOVES_PRICE = 30
export const WATCH_PRICE = 90
export const HEADBAND_PRICE = 25

export function defaultLoadout(config: AvatarConfig): CosmeticLoadout {
  return {
    hairStyle: 'standard',
    hairColor: config.hairColor,
    shirtStyle: 'standard',
    gloves: false,
    glassesStyle: 'none',
    watch: false,
    headband: false,
  }
}

export function emptyOwnership(): CosmeticOwnership {
  return { hairStyles: [], shirtStyles: [], gloves: false, glassesStyles: [], watch: false, headband: false }
}

export function isHairStyleOwned(ownership: CosmeticOwnership, id: HairStyleId): boolean {
  return id === 'standard' || ownership.hairStyles.includes(id)
}

export function isShirtStyleOwned(ownership: CosmeticOwnership, id: ShirtStyleId): boolean {
  return id === 'standard' || ownership.shirtStyles.includes(id)
}

export function isGlassesStyleOwned(ownership: CosmeticOwnership, id: GlassesStyleId): boolean {
  return id === 'none' || ownership.glassesStyles.includes(id)
}

export function hairStylePrice(id: HairStyleId): number {
  return HAIRSTYLES.find((h) => h.id === id)?.price ?? 0
}

export function shirtStylePrice(id: ShirtStyleId): number {
  return SHIRTS.find((s) => s.id === id)?.price ?? 0
}

export function glassesStylePrice(id: GlassesStyleId): number {
  return GLASSES_STYLES.find((g) => g.id === id)?.price ?? 0
}
