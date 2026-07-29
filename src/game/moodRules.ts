import type { GameMode } from './types'

/** Stimmung eines einzelnen Wurfs (Teil: Reaktions-Mimik) - wird sowohl für die 3D-Kamera-
 * Reaktion/Mimik (siehe scene/LaneScene.ts, characters/CharacterModel.ts) als auch für die
 * Stimmungs-Sounds (siehe state/gameStore.ts) verwendet, damit beide garantiert dieselbe
 * Einschätzung eines Wurfs treffen statt zweier separat gepflegter Regelsätze. */
export type ThrowMood = 'happy' | 'meh' | 'sad'

/** "gut" bedeutet je nach Modus etwas anderes: bei "Hoch" ist eine hohe Ziffer gut, bei "Niedrig"
 * eine niedrige. Rinne ist unabhängig vom Modus immer ein "trauriger" Moment - auch wenn sie bei
 * "Niedrig" zufällig die Ziffer 9 gibt, die dort eigentlich schlecht wäre, bleibt der Rinnenwurf
 * visuell/akustisch ein Fehlwurf. */
export function evaluateHausnummerMood(mode: GameMode, pinsDown: number, isGutter: boolean): ThrowMood {
  if (isGutter) return 'sad'
  if (mode === 'hoch') {
    if (pinsDown >= 6) return 'happy'
    if (pinsDown <= 2) return 'sad'
    return 'meh'
  }
  if (pinsDown <= 3) return 'happy'
  if (pinsDown >= 7) return 'sad'
  return 'meh'
}

/** Beim Tannenbaum gibt es bewusst nur Freude oder Trauer, kein "naja" - ein Wurf trifft entweder
 * eine noch offene Zahl oder verpufft wirkungslos, ein Mittelding gibt es hier nicht. */
export function evaluateTannenbaumMood(remaining: Record<number, number>, pinsDown: number): ThrowMood {
  return remaining[pinsDown] > 0 ? 'happy' : 'sad'
}
