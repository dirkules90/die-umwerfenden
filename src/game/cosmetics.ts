import type { AvatarConfig, CosmeticLoadout, CosmeticOwnership, HairStyleId, ShirtStyleId } from './types'

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

// Teil: Kosmetik-Shop. Preise sind Platzhalter, bis das Münzen-Verdienen (nächster Schritt)
// steht - dann anhand der tatsächlichen Verdienrate neu austarieren.
export const HAIRSTYLES: HairStyleDef[] = [
  { id: 'standard', title: 'Standard', price: 0 },
  { id: 'kurz', title: 'Kurzhaarschnitt', price: 20 },
  { id: 'lang', title: 'Zottelmähne', price: 20 },
  { id: 'irokese', title: 'Irokese', price: 25 },
]

export const SHIRTS: ShirtStyleDef[] = [
  { id: 'standard', title: 'Vereins-Shirt', price: 0 },
  { id: 'blitz', title: 'Blitz-Shirt', price: 25 },
  { id: 'umwerfenden', title: '„Die Umwerfenden”-Shirt', price: 30 },
]

export const GLOVES_PRICE = 15

export function defaultLoadout(config: AvatarConfig): CosmeticLoadout {
  return { hairStyle: 'standard', hairColor: config.hairColor, shirtStyle: 'standard', gloves: false }
}

export function emptyOwnership(): CosmeticOwnership {
  return { hairStyles: [], shirtStyles: [], gloves: false }
}

export function isHairStyleOwned(ownership: CosmeticOwnership, id: HairStyleId): boolean {
  return id === 'standard' || ownership.hairStyles.includes(id)
}

export function isShirtStyleOwned(ownership: CosmeticOwnership, id: ShirtStyleId): boolean {
  return id === 'standard' || ownership.shirtStyles.includes(id)
}

export function hairStylePrice(id: HairStyleId): number {
  return HAIRSTYLES.find((h) => h.id === id)?.price ?? 0
}

export function shirtStylePrice(id: ShirtStyleId): number {
  return SHIRTS.find((s) => s.id === id)?.price ?? 0
}
