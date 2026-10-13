import * as THREE from 'three'

/** Gestufte Graustufen-Rampe (3 sichtbare Helligkeitsbänder statt eines weichen PBR-Verlaufs) für
 * MeshToonMaterial.gradientMap - erzeugt den harten Schatten-/Licht-Kantenübergang, der den
 * gewünschten Comic-/Cel-Shading-Look ausmacht (Teil: optische Überarbeitung). NEAREST-Filterung
 * ist Pflicht, sonst interpoliert die GPU zwischen den Stufen und das Band verschwimmt wieder zu
 * einem weichen Verlauf. */
let gradientMap: THREE.DataTexture | null = null
function getToonGradientMap(): THREE.DataTexture {
  if (!gradientMap) {
    const data = new Uint8Array([60, 140, 200, 255])
    gradientMap = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat)
    gradientMap.minFilter = THREE.NearestFilter
    gradientMap.magFilter = THREE.NearestFilter
    gradientMap.needsUpdate = true
  }
  return gradientMap
}

/** Gemeinsamer Ersatz für die bisher pro Datei lokal duplizierten `toonMat()`-Helfer (Environment.ts,
 * Pin.ts, CharacterModel.ts), die trotz des Namens nur gewöhnliches MeshStandardMaterial erzeugten -
 * echtes Cel-Shading gab es bisher gar nicht. MeshToonMaterial ignoriert roughness/metalness (keine
 * PBR-Spekularität), deshalb bewusst nicht für Metall-/Glas-Teile (Schienen, Uhr, Brille) verwenden -
 * dort bleibt MeshStandardMaterial, damit die Hochglanz-Anmutung erhalten bleibt. */
export function toonMaterial(
  color: THREE.ColorRepresentation,
  opts?: { emissive?: THREE.ColorRepresentation },
): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: getToonGradientMap(),
    emissive: opts?.emissive ?? 0x000000,
  })
}
