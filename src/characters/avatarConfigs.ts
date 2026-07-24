import type { AvatarConfig, CharacterId } from '../game/types'

/** Vom Auftraggeber bereitgestellte Fotos, z. B. `public/icons/Daniel.png`. */
function photoUrl(fileName: string): string {
  return `${import.meta.env.BASE_URL}icons/${fileName}.png`
}

// Stilisierte, eigenständige Cartoon-Avatare (Teil 11.2) – Merkmale wie Statur,
// Haar- und Barttracht sind bewusst abstrahiert und nicht fotorealistisch. photoUrl verweist
// auf das echte Spielerfoto, das in der Charakterauswahl und im HUD angezeigt wird.
export const AVATAR_CONFIGS: Record<CharacterId, AvatarConfig> = {
  daniel: {
    id: 'daniel',
    name: 'Daniel',
    hairColor: '#3b352f',
    skinColor: '#e8b894',
    hasBeard: false,
    hasGlasses: false,
    build: 'kraeftig',
    shirtAccent: '#2E5B3E',
    photoUrl: photoUrl('Daniel'),
  },
  tobias: {
    id: 'tobias',
    name: 'Tobias',
    hairColor: '#8a6a3c',
    skinColor: '#f0c9a3',
    hasBeard: false,
    hasGlasses: false,
    build: 'mittel',
    shirtAccent: '#2E5B3E',
    photoUrl: photoUrl('Tobias'),
  },
  dirk: {
    id: 'dirk',
    name: 'Dirk',
    hairColor: '#2b2b2b',
    skinColor: '#e3b48c',
    hasBeard: true,
    hasGlasses: true,
    build: 'mittel',
    shirtAccent: '#2E5B3E',
    photoUrl: photoUrl('Dirk'),
  },
  fabian: {
    id: 'fabian',
    name: 'Fabian',
    hairColor: '#241f1a',
    skinColor: '#e8b894',
    hasBeard: true,
    hasGlasses: true,
    build: 'schlank',
    shirtAccent: '#2E5B3E',
    photoUrl: photoUrl('Fabian'),
  },
  pascal: {
    id: 'pascal',
    name: 'Pascal',
    hairColor: '#3d2b1f',
    skinColor: '#f2caa0',
    hasBeard: false,
    hasGlasses: false,
    build: 'kraeftig',
    shirtAccent: '#2E5B3E',
    photoUrl: photoUrl('Pascal'),
  },
  alex: {
    id: 'alex',
    name: 'Alex',
    hairColor: '#c9a86a',
    skinColor: '#f0c9a3',
    hasBeard: false,
    hasGlasses: false,
    build: 'schlank',
    shirtAccent: '#2E5B3E',
    photoUrl: photoUrl('Alex'),
  },
}

export const CHARACTER_ORDER: CharacterId[] = ['daniel', 'tobias', 'dirk', 'fabian', 'pascal', 'alex']
