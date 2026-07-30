import * as THREE from 'three'
import type {
  AvatarConfig,
  BeardStyleId,
  CapeId,
  CosmeticLoadout,
  GlassesStyleId,
  HairStyleId,
  NecklaceId,
  PantsColorId,
  ShirtStyleId,
  ShoeColorId,
  WristbandId,
} from '../game/types'
import { drawFace, type Mood } from './faceArt'

const PANTS_COLORS: Record<PantsColorId, number> = {
  standard: 0x3a4a5c,
  schwarz: 0x1c1c1c,
  khaki: 0x8a7a4e,
  rot: 0x8c2f2f,
  camo: 0x5c5f3a,
}

const SHOE_COLORS: Record<ShoeColorId, number> = {
  standard: 0x2a2420,
  weiss: 0xf2f2ec,
  rot: 0x8c2f2f,
  neongruen: 0x8fff4d,
}

const WRISTBAND_COLORS: Record<Exclude<WristbandId, 'none'>, number> = {
  rot: 0xc0392b,
  blau: 0x2f6fb0,
  schwarz: 0x1c1c1c,
}

/** Kleine kachelbare Tarnmuster-Textur (Teil: Shop-Erweiterung) - dieselbe Technik wie das
 * Blitz-Shirt-Badge (buildBlitzBadgeTexture): ein Canvas statt einer externen Bilddatei. */
function buildCamoTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#5c5f3a'
  ctx.fillRect(0, 0, 64, 64)
  const blobColors = ['#43502c', '#7a7a52', '#33351f']
  let seed = 42
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return (seed % 1000) / 1000
  }
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = blobColors[i % blobColors.length]
    ctx.beginPath()
    ctx.ellipse(rand() * 64, rand() * 64, 10 + rand() * 10, 6 + rand() * 8, rand() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  return texture
}

export type CharacterAnimState = 'idle' | 'backswing' | 'throw' | 'cheer' | 'meh' | 'disappointed'

const STATE_MOOD: Record<CharacterAnimState, Mood> = {
  idle: 'neutral',
  backswing: 'neutral',
  throw: 'neutral',
  cheer: 'happy',
  meh: 'meh',
  disappointed: 'sad',
}

/**
 * Bemaltes Mii-artiges Gesicht statt einzelner 3D-Geometrie für Augen/Mund (Teil: Charaktermodell-
 * Überarbeitung, Vorbild Wii-Bowling-Mii) - ein Canvas-Portrait pro Stimmung (siehe faceArt.ts) wird
 * auf einen kleinen, gewölbten Kugelausschnitt direkt vor dem Kopf projiziert. Der Hintergrund
 * entspricht exakt der Hautfarbe des Charakters, damit der Rand des Ausschnitts unsichtbar mit der
 * Kopfkugel verschmilzt, statt wie ein aufgeklebter Sticker mit sichtbarer Kante zu wirken.
 */
function buildFaceTexture(mood: Mood, skinColor: string): THREE.CanvasTexture {
  const W = 256
  const H = 224
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  drawFace(ctx, mood, skinColor, W, H)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** Ein Frisuren-"Kappe" (Kugelausschnitt um den Pol) muss KONZENTRISCH zur Kopfkugel bleiben (also
 * OHNE y-Versatz), um überall flächig aufzuliegen - ein y-Versatz verschiebt die starre Kugelschale
 * geradlinig statt entlang der Kopfkrümmung und lässt sie den Bezug zur Kopfoberfläche verlieren
 * (Bugfix: Kurzhaarschnitt schwebte sichtbar über dem Kopf). HAIR_CAP_SCALE muss dafür spürbar über
 * 1.0 liegen (statt nur ~1.5%) - sonst hat die Kappe kaum sichtbares Volumen und wirkt wie ein
 * dünnes, durchscheinendes Muster auf der Kopfhaut statt wie echtes Haar (Bugfix: Frisuren "schimmern
 * nur durch, bedecken den Kopf aber nicht"). */
const HAIR_CAP_SCALE = 1.07

const BUILD_SCALE: Record<AvatarConfig['build'], number> = {
  schlank: 0.92,
  mittel: 1.0,
  kraeftig: 1.12,
}

const ARM_LENGTH = 0.34
const SHOULDER_Y = 0.97
const SHOULDER_X = 0.205
const ARM_REST_LEAN = 0.16

// Gecachte Textur für das "Die Umwerfenden"-Shirt-Badge (Teil: Kosmetik-Shop) - dieselbe Textur
// wird bei jedem Charakterwechsel und jeder Shop-Vorschau neu gebraucht, ein wiederholter
// Netzwerk-/Decode-Aufwand pro CharacterModel-Instanz wäre unnötig.
let umwerfendenBadgeTexture: THREE.Texture | null = null
function getUmwerfendenBadgeTexture(): THREE.Texture {
  if (!umwerfendenBadgeTexture) {
    umwerfendenBadgeTexture = new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL}icons/logo-icon-source.png`,
    )
    umwerfendenBadgeTexture.colorSpace = THREE.SRGBColorSpace
  }
  return umwerfendenBadgeTexture
}

/** Blitz-Symbol als CanvasTexture gezeichnet statt als Bilddatei - hält das Badge unabhängig von
 * externen Assets und leicht in der Akzentfarbe des Shirts einfärgbar. */
function buildBlitzBadgeTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f4d03f'
  ctx.beginPath()
  ctx.moveTo(70, 8)
  ctx.lineTo(30, 70)
  ctx.lineTo(58, 70)
  ctx.lineTo(50, 120)
  ctx.lineTo(98, 55)
  ctx.lineTo(68, 55)
  ctx.closePath()
  ctx.fillStyle = '#e8b923'
  ctx.lineWidth = 6
  ctx.strokeStyle = '#6b4a06'
  ctx.fill()
  ctx.stroke()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/**
 * Stilisiertes Low-Poly Cartoon-Modell (Teil 5.4 / 11.2) – kein Fotorealismus, rein abstrahiert.
 * Arme hängen an Schulter-Pivots (statt an ihrem eigenen Mittelpunkt), damit Wurf-/Ausholanimationen
 * sich glaubwürdig um das Schultergelenk drehen statt durch den Körper zu rotieren.
 *
 * cosmetics (Teil: Kosmetik-Shop) bestimmt Frisur, Haarfarbe, Shirt-Design und Handschuhe -
 * unabhängig von der festen AvatarConfig (Statur, Hautfarbe, Bart/Brille bleiben Charaktermerkmale).
 */
export class CharacterModel {
  group = new THREE.Group()
  private headGroup = new THREE.Group()
  private torsoGroup = new THREE.Group()
  private leftArmPivot = new THREE.Group()
  private rightArmPivot = new THREE.Group()
  private faceMesh: THREE.Mesh | null = null
  private faceTextures: Record<Mood, THREE.Texture> | null = null
  private time = 0
  private state: CharacterAnimState = 'idle'
  private stateElapsed = 0
  private backswingAmount = 0
  // Idle-Politur (Teil: UI-Politur): gelegentliches kurzes Blinzeln statt einer komplett
  // reglosen Ruhehaltung. Zufälliges Intervall statt eines festen Takts, damit es nicht
  // mechanisch wirkt.
  private blinkTimer = 2 + Math.random() * 4
  private isBlinking = false
  private blinkElapsed = 0

  constructor(config: AvatarConfig, cosmetics: CosmeticLoadout) {
    const scale = BUILD_SCALE[config.build]
    this.group.scale.setScalar(scale)

    const skinMat = new THREE.MeshStandardMaterial({ color: config.skinColor, roughness: 0.7 })
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
    const accentMat = new THREE.MeshStandardMaterial({ color: config.shirtAccent, roughness: 0.8 })
    const hairMat = new THREE.MeshStandardMaterial({ color: cosmetics.hairColor, roughness: 0.6 })
    // Hosenfarbe/Schuhfarbe (Teil: Shop-Erweiterung) statt fester Farben - Tarnmuster bekommt
    // zusätzlich eine gekachelte Canvas-Textur statt nur einer flachen Farbe.
    const pantsMat = new THREE.MeshStandardMaterial({ color: PANTS_COLORS[cosmetics.pantsColor], roughness: 0.9 })
    if (cosmetics.pantsColor === 'camo') {
      pantsMat.map = buildCamoTexture()
    }
    const shoeMat = new THREE.MeshStandardMaterial({ color: SHOE_COLORS[cosmetics.shoeColor], roughness: 0.6 })
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 })

    // Beine + Schuhe (Boden bis Hüfte y=0.58)
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.34, 4, 8), pantsMat)
      leg.position.set(side * 0.12, 0.315, 0)
      leg.castShadow = true
      this.group.add(leg)

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.2), shoeMat)
      shoe.position.set(side * 0.12, 0.04, 0.03)
      shoe.castShadow = true
      this.group.add(shoe)
    }

    // Hüfte: schließt die sonst sichtbare Lücke zwischen den beiden einzelnen Bein-Kapseln und
    // der spitz zulaufenden Torso-Unterseite - ohne dieses Stück "schweben" Beine und Torso
    // sichtbar getrennt voneinander statt wie ein zusammenhängender Körper zu wirken.
    const hip = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.15, 4, 8), pantsMat)
    hip.rotation.z = Math.PI / 2
    hip.position.y = 0.55
    hip.castShadow = true
    this.group.add(hip)

    // Torso (Hüfte 0.58 bis Schulterbereich ~1.02)
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.08, 4, 10), shirtMat)
    torso.position.y = 0.8
    torso.castShadow = true
    this.torsoGroup.add(torso)

    const accentStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.07, 10), accentMat)
    accentStripe.position.y = 0.63
    this.torsoGroup.add(accentStripe)

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 12), accentMat)
    collar.position.y = 1.0
    collar.rotation.x = Math.PI / 2
    this.torsoGroup.add(collar)

    this.buildShirtBadge(cosmetics.shirtStyle)

    if (cosmetics.necklace !== 'none') {
      this.buildNecklace(cosmetics.necklace)
    }

    if (cosmetics.cape !== 'none') {
      this.buildCape(cosmetics.cape)
    }

    this.group.add(this.torsoGroup)

    // Hals (verhindert, dass Kopf und Torso ineinander clippen)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 10), skinMat)
    neck.position.y = 1.06
    this.torsoGroup.add(neck)

    // Arme, an Schulter-Pivots aufgehängt statt am eigenen Mittelpunkt.
    this.leftArmPivot.position.set(-SHOULDER_X, SHOULDER_Y, 0)
    this.rightArmPivot.position.set(SHOULDER_X, SHOULDER_Y, 0)
    for (const [pivot, sign] of [
      [this.leftArmPivot, -1],
      [this.rightArmPivot, 1],
    ] as const) {
      const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, ARM_LENGTH - 0.124, 4, 8), shirtMat)
      upperArm.position.y = -ARM_LENGTH / 2
      upperArm.castShadow = true
      pivot.add(upperArm)

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), skinMat)
      hand.position.y = -ARM_LENGTH
      pivot.add(hand)

      if (cosmetics.gloves) {
        const glove = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 8), gloveMat)
        glove.position.y = -ARM_LENGTH
        pivot.add(glove)
      }

      pivot.rotation.z = sign * ARM_REST_LEAN
      this.group.add(pivot)
    }

    if (cosmetics.watch) {
      // Goldene Uhr am rechten Handgelenk (Teil: Shop-Erweiterung) - rein kosmetisch, keine
      // Spielwirkung, daher bewusst nur an einem festen Arm statt konfigurierbar. Das Zifferblatt
      // sitzt deutlich außerhalb des Arm-Radius (0.062) statt knapp daran, sonst verschwindet die
      // Scheibe optisch im Arm-Mesh und nur der Ring bleibt sichtbar (Bug: "nur ein goldener Ring").
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.6 })
      const bezelMat = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.4 })
      const watchY = -ARM_LENGTH + 0.09
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.014, 8, 12), goldMat)
      band.rotation.x = Math.PI / 2
      band.position.y = watchY
      this.rightArmPivot.add(band)
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.01, 16), bezelMat)
      bezel.rotation.x = Math.PI / 2
      bezel.position.set(0, watchY, 0.086)
      this.rightArmPivot.add(bezel)
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.014, 16), goldMat)
      face.rotation.x = Math.PI / 2
      face.position.set(0, watchY, 0.09)
      this.rightArmPivot.add(face)
    }

    if (cosmetics.wristband !== 'none') {
      // Am LINKEN Handgelenk statt am rechten (Teil: Shop-Erweiterung) - so bleibt Armbanduhr und
      // Armband gleichzeitig sichtbar statt sich am selben Arm zu überlagern.
      const bandMat = new THREE.MeshStandardMaterial({
        color: WRISTBAND_COLORS[cosmetics.wristband],
        roughness: 0.7,
      })
      const wristbandY = -ARM_LENGTH + 0.09
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.017, 8, 12), bandMat)
      band.rotation.x = Math.PI / 2
      band.position.y = wristbandY
      this.leftArmPivot.add(band)
    }

    // Kopf (großer Kopf im Verhältnis zum Körper, Mii-artig, Teil 5.4), leicht eiförmig statt
    // perfekt rund gestreckt (Teil: Charaktermodell-Überarbeitung) - näher am Wii-Mii-Vorbild.
    // ALLE kopfoberflächen-gebundenen Teile (Kopf, Frisur, Gesicht, Bart, Brille, Stirnband) hängen
    // an EINER gemeinsam eiförmig skalierten Gruppe statt einzeln zu skalieren - sonst passen
    // Frisur/Brille/Stirnband nicht mehr zur gestreckten Kopfform (Bug: Kurzhaarschnitt schwebte
    // über dem Kopf, weil nur die Kopf-Kugel selbst gestreckt wurde, die Frisur aber nicht mit).
    const headRadius = 0.2
    const skullGroup = new THREE.Group()
    skullGroup.scale.set(1, 1.08, 0.94)
    this.headGroup.add(skullGroup)

    const head = new THREE.Mesh(new THREE.SphereGeometry(headRadius, 24, 18), skinMat)
    skullGroup.add(head)

    this.buildHair(hairMat, headRadius, cosmetics.hairStyle, skullGroup)

    // Bemaltes Gesicht statt einzelner Augen-/Mund-Geometrie (Teil: Charaktermodell-Überarbeitung,
    // Vorbild Wii-Bowling-Mii) - ein Canvas-Portrait pro Stimmung, aufgezogen auf einen kleinen, der
    // Kopfkrümmung angepassten Kugelausschnitt. setAnimState tauscht später nur die Textur aus.
    this.faceTextures = {
      neutral: buildFaceTexture('neutral', config.skinColor),
      happy: buildFaceTexture('happy', config.skinColor),
      meh: buildFaceTexture('meh', config.skinColor),
      sad: buildFaceTexture('sad', config.skinColor),
      blink: buildFaceTexture('blink', config.skinColor),
    }
    const faceMat = new THREE.MeshStandardMaterial({ map: this.faceTextures.neutral, roughness: 0.75 })
    const facePhiWidth = 1.25
    const faceThetaHeight = 1.1
    const faceGeo = new THREE.SphereGeometry(
      headRadius * 1.006,
      20,
      16,
      Math.PI / 2 - facePhiWidth / 2,
      facePhiWidth,
      Math.PI / 2 - faceThetaHeight / 2,
      faceThetaHeight,
    )
    this.faceMesh = new THREE.Mesh(faceGeo, faceMat)
    skullGroup.add(this.faceMesh)

    // Bart rein über cosmetics.beardStyle gesteuert (Bugfix Shop-Erweiterung, analog zur Brille
    // oben) - die feste "hasBeard"-Eigenschaft (Dirk/Fabian) wirkt nur noch als Standard-
    // Loadout-Wert (siehe defaultLoadout) und als kostenlose Option (siehe isBeardStyleOwned), OHNE
    // hier zusätzlich einzugreifen. Ein früherer Fallback auf 'vollbart' für Träger dieser
    // Eigenschaft, sobald cosmetics.beardStyle==='none' war, überschrieb ein bewusst gewähltes
    // "Ohne" (Bugfix: "wenn ich auf Ohne klicke, habe ich trotzdem einen Bart" - Vollbart und Ohne
    // sahen dadurch identisch aus).
    if (cosmetics.beardStyle !== 'none') {
      this.buildBeard(cosmetics.beardStyle, headRadius, hairMat, skullGroup)
    }

    if (cosmetics.crown) {
      // Exklusiv, nicht käuflich - Wochensieger-Bonus (siehe gameStore.grantCrown). Einfache
      // goldene Zackenkrone knapp über dem Scheitel.
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd447, roughness: 0.25, metalness: 0.65 })
      const band = new THREE.Mesh(new THREE.CylinderGeometry(headRadius * 0.72, headRadius * 0.78, 0.05, 12), goldMat)
      band.position.y = headRadius * 0.95
      skullGroup.add(band)
      const spikeCount = 5
      for (let i = 0; i < spikeCount; i++) {
        const t = (i / (spikeCount - 1) - 0.5) * 2
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 6), goldMat)
        spike.position.set(t * headRadius * 0.55, headRadius * 1.02, 0)
        skullGroup.add(spike)
      }
    }

    // Sonnenbrille rein über cosmetics.glassesStyle gesteuert (Bugfix Shop-Erweiterung) - vorher
    // fiel ein Charakter mit fester "hasGlasses"-Eigenschaft (Dirk/Fabian) IMMER auf eine Brille
    // zurück, selbst wenn im Shop "Ohne" ausgerüstet war ("Ausgerüstet" stand da, obwohl sichtbar
    // eine Brille saß). Die feste Eigenschaft ist jetzt nur noch der Standard-Loadout-Wert (siehe
    // defaultLoadout) und für diese Charaktere eine kostenlose Option (siehe isGlassesStyleOwned) -
    // Shop-Anzeige und 3D-Modell zeigen dadurch immer dasselbe.
    if (cosmetics.glassesStyle !== 'none') {
      this.buildGlasses(cosmetics.glassesStyle, headRadius, skullGroup)
    }

    if (cosmetics.headband) {
      // Deutlich über den Augenbrauen/der Brille platziert (Bugfix: Stirnband saß zu tief und ging
      // durch die Sonnenbrille) statt knapp über der Augenhöhe.
      const bandMat = new THREE.MeshStandardMaterial({ color: 0xe0483c, roughness: 0.6 })
      const headband = new THREE.Mesh(new THREE.TorusGeometry(headRadius * 0.97, 0.017, 8, 20), bandMat)
      headband.rotation.x = Math.PI / 2
      headband.position.y = headRadius * 0.38
      skullGroup.add(headband)
    }

    this.headGroup.position.y = 1.12 + headRadius
    this.headGroup.castShadow = true
    // headGroup hängt jetzt an torsoGroup statt als eigenständiges Geschwister direkt an group
    // (Bugfix Kopf-Körper-Trennung) - vorher rotierten Kopf und Oberkörper beim "disappointed"-
    // Zustand unabhängig um zwei völlig verschiedene Drehpunkte (Kopf um sein eigenes Zentrum,
    // Torso um die Fußposition), wodurch der Kopf sichtbar vom Hals abriss. Jetzt erbt der Kopf
    // die Oberkörper-Neigung automatisch und bekommt nur noch eine kleine eigene Nickbewegung.
    this.torsoGroup.add(this.headGroup)
  }

  /** 'cool' = dezente dunkle Gläser, 'abgespaced' = zweifarbig-neonbunt mit auffälligem Rahmen
   * (Teil: Shop-Erweiterung) - deutlich unterscheidbare Optik statt nur leichter Farbvarianten.
   * z-Koordinaten sind gegenüber der Kopfoberfläche durch 0.94 geteilt, weil dieser Aufbau
   * innerhalb der eiförmig gestauchten skullGroup hängt (siehe Konstruktor) - ohne Ausgleich würde
   * die Brille durch die gestauchte Kopfvorderseite ins Gesicht einsinken. */
  private buildGlasses(style: GlassesStyleId, headRadius: number, parent: THREE.Group) {
    const isWild = style === 'abgespaced'
    const frameMat = new THREE.MeshStandardMaterial({ color: isWild ? 0xffe14d : 0x1a1a1a, roughness: 0.3 })
    const lensColors = isWild ? [0xff2fb0, 0x2fe0ff] : [0x1a1a1a, 0x1a1a1a]
    ;[-1, 1].forEach((side, i) => {
      const lens = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.011, 8, 16), frameMat)
      lens.position.set(side * 0.078, 0.01, (headRadius * 0.92) / 0.94)
      parent.add(lens)
      const lensMat = new THREE.MeshStandardMaterial({
        color: lensColors[i],
        roughness: 0.25,
        metalness: isWild ? 0.3 : 0,
      })
      const glass = new THREE.Mesh(new THREE.CircleGeometry(0.046, 16), lensMat)
      glass.position.set(side * 0.078, 0.01, (headRadius * 0.925) / 0.94)
      parent.add(glass)
    })
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.011, 0.011), frameMat)
    bridge.position.set(0, 0.01, headRadius)
    parent.add(bridge)
  }

  /** 'vollbart' = voller Bart über Kinn/Wangen (die ursprüngliche Bart-Geometrie), 'schnurrbart' =
   * nur ein kleiner Streifen direkt über der Oberlippe (Teil: Shop-Erweiterung). */
  private buildBeard(style: BeardStyleId, headRadius: number, hairMat: THREE.Material, parent: THREE.Group) {
    if (style === 'schnurrbart') {
      // Vorher thetaLength=0.09 (nur ~5°) UND ein zusätzlicher position-Versatz: der Streifen war
      // hauchdünn und durch den Versatz nicht mehr konzentrisch zur Kopfkugel, dadurch praktisch
      // unsichtbar (Bugfix: "bei Schnurrbart habe ich keinen Bart"). Jetzt spürbar dicker (0.16π)
      // und ohne eigenen Versatz - sitzt dadurch wie die Vollbart-Geometrie direkt auf der
      // Kopfoberfläche, nur eben nur ein schmaler Streifen knapp über der Mundhöhe statt des
      // vollen Bogens.
      const width = 1.0
      const moustache = new THREE.Mesh(
        new THREE.SphereGeometry(headRadius * 0.78, 12, 8, Math.PI / 2 - width / 2, width, Math.PI * 0.46, Math.PI * 0.07),
        hairMat,
      )
      parent.add(moustache)
      return
    }
    // thetaStart vorher bei 0.45π: die Bart-Oberkante lag dadurch auf Höhe des Munds statt
    // darunter, sah aus wie ein Bart, der durch den Mund reicht. 0.55π beginnt spürbar unter
    // der Mundhöhe. phiLength war vorher 2π (kompletter Ring um den ganzen Kopf) statt nur die
    // Vorderseite - sah dadurch wie eine durchgehende Balaclava/Kragen statt eines Bartes aus
    // (Bugfix: "Bart sitzt nicht richtig"). Jetzt nur noch ein vorderer Bogen über Kinn/Wangen.
    const beardPhiWidth = 2.3
    const beard = new THREE.Mesh(
      new THREE.SphereGeometry(
        headRadius * 0.78,
        12,
        10,
        Math.PI / 2 - beardPhiWidth / 2,
        beardPhiWidth,
        Math.PI * 0.55,
        Math.PI * 0.32,
      ),
      hairMat,
    )
    beard.position.set(0, -0.09, 0.04)
    parent.add(beard)
  }

  /** Vier Frisuren zur Auswahl (Teil: Kosmetik-Shop) - deutlich unterscheidbare Silhouetten statt
   * feiner Detailvarianten, damit man auf einen Blick erkennt, welche gerade ausgerüstet ist. */
  private buildHair(hairMat: THREE.Material, headRadius: number, style: HairStyleId, parent: THREE.Group) {
    switch (style) {
      case 'kurz': {
        // Konzentrisch zur Kopfkugel (siehe HAIR_CAP_SCALE), kein y-Versatz.
        const hair = new THREE.Mesh(
          new THREE.SphereGeometry(headRadius * HAIR_CAP_SCALE, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.34),
          hairMat,
        )
        parent.add(hair)
        break
      }
      case 'lang': {
        // Vorher bis 0.54π: reichte damit über den Äquator hinaus bis unter die Augenlinie (Bug:
        // Zottelmähne geht über die Augen). 0.42π endet spürbar oberhalb der Augen. Diese vordere
        // Deckelhöhe reichte aber am Hinterkopf nicht bis zum Pferdeschwanz herunter - von hinten
        // betrachtet klaffte eine sichtbare Lücke zwischen Kopfhaar und Zopf (Bugfix: "keine
        // Verbindung zwischen dem langen Haar und den Haaren oben auf dem Kopf"). Ein zweiter,
        // NUR am Hinterkopf sichtbarer Deckel (Phi-Ausschnitt wie beim Bart/Rückenteil-Cape)
        // reicht deutlich tiefer herunter und überlappt großzügig mit dem Zopf darunter.
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(headRadius * HAIR_CAP_SCALE, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
          hairMat,
        )
        parent.add(cap)
        const backWidth = Math.PI * 1.3
        const backCap = new THREE.Mesh(
          new THREE.SphereGeometry(
            headRadius * HAIR_CAP_SCALE,
            16,
            12,
            (3 * Math.PI) / 2 - backWidth / 2,
            backWidth,
            0,
            Math.PI * 0.68,
          ),
          hairMat,
        )
        parent.add(backCap)
        const back = new THREE.Mesh(new THREE.CapsuleGeometry(headRadius * 0.5, headRadius * 1.0, 4, 8), hairMat)
        back.position.set(0, -headRadius * 0.75, -headRadius * 0.78)
        back.rotation.x = 0.35
        parent.add(back)
        break
      }
      case 'irokese': {
        // Jeder Stachel wird als Punkt AUF der Kopfkugel platziert und entlang der eigenen
        // Oberflächennormale ausgerichtet statt an einem festen Punkt mit fester Neigung - vorher
        // lag die Kegelbasis nicht auf der gekrümmten Oberfläche, was von der Seite betrachtet als
        // Lücke zwischen Stachel und Kopf sichtbar wurde.
        const spikeCount = 5
        const coneHeight = 0.2
        const sweep = 0.85
        for (let i = 0; i < spikeCount; i++) {
          const t = i / (spikeCount - 1) - 0.5
          const theta = t * sweep
          const dir = new THREE.Vector3(0, Math.cos(theta), Math.sin(theta))
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.042, coneHeight, 8), hairMat)
          const base = dir.clone().multiplyScalar(headRadius * 0.97)
          spike.position.copy(base).addScaledVector(dir, coneHeight * 0.42)
          spike.rotation.x = theta
          parent.add(spike)
        }
        break
      }
      case 'standard':
      default: {
        // Vorher bis 0.62π: reichte damit sichtbar bis unter die Augen. 0.46π endet knapp über
        // der Augenbrauen-Linie.
        const hair = new THREE.Mesh(
          new THREE.SphereGeometry(headRadius * HAIR_CAP_SCALE, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.46),
          hairMat,
        )
        parent.add(hair)
        break
      }
    }
  }

  /** Shirt-Badge auf der Brust (Teil: Kosmetik-Shop) - eine kleine texturierte Fläche knapp vor
   * der Torso-Oberfläche statt eines UV-verzerrten Prints direkt auf der Kapsel-Geometrie. */
  private buildShirtBadge(style: ShirtStyleId) {
    if (style === 'standard') return
    const texture = style === 'umwerfenden' ? getUmwerfendenBadgeTexture() : buildBlitzBadgeTexture()
    const badgeMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, transparent: true })
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.115, 20), badgeMat)
    badge.position.set(0, 0.86, 0.185)
    this.torsoGroup.add(badge)
  }

  /** Kette knapp unter dem Kinn/Bart, oberhalb des Shirt-Badges (Teil: Shop-Erweiterung). Der
   * Ring-Radius (0.15) ist bewusst größer als der Torso-Querschnitt an dieser Höhe (~0.12 bei
   * y=0.95, Torso-Kapsel-Radius 0.19 verjüngt sich zum Hals hin) - sonst verschwindet die Kette
   * optisch im Oberkörper-Mesh (Bugfix: "ich sehe keine Kette, wenn ich sie anklicke"). */
  private buildNecklace(style: NecklaceId) {
    const necklaceMat = new THREE.MeshStandardMaterial({
      color: style === 'gold' ? 0xd4af37 : 0xc7ccd1,
      roughness: 0.3,
      metalness: 0.6,
    })
    const necklace = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.014, 8, 20), necklaceMat)
    necklace.rotation.x = Math.PI / 2
    necklace.position.y = 0.95
    this.torsoGroup.add(necklace)
  }

  /** Rückenteil-Cape als gebogener Zylinderausschnitt statt einer flachen Ebene (Bugfix: ein
   * flaches PlaneGeometry folgte der runden Torso-Silhouette nicht und schnitt bei Drehung
   * sichtbar durch den Körper). Der Zylinderradius (0.26) liegt deutlich außerhalb des
   * Torso-Radius (max. 0.19), damit garantiert nichts überschneidet. Die Eckpunkte bekommen
   * zusätzlich eine sinusförmige Auslenkung Richtung Saum, damit es wie leicht bewegter Stoff
   * wirkt statt wie eine starre Fläche (Bugfix: "aktuell nur ein Viereck"). */
  private buildCape(style: CapeId) {
    const capeMat = new THREE.MeshStandardMaterial({
      color: style === 'gold' ? 0xd4af37 : 0x8c2f2f,
      roughness: 0.85,
      side: THREE.DoubleSide,
    })
    const capeRadius = 0.26
    const capeHeight = 0.55
    const backWidth = Math.PI * 0.9
    // Wichtig: CylinderGeometry zählt sein theta anders als SphereGeometry sein phi (dort ist
    // vorne bei π/2, bei einem Zylinder aber bei 0 und hinten bei π statt 3π/2) - das falsche
    // Vorzeichen hier hätte das Cape seitlich statt hinten platziert (Bugfix: Cape lag quer über
    // der Vorderseite/Seite statt auf dem Rücken zu liegen).
    const capeGeo = new THREE.CylinderGeometry(
      capeRadius,
      capeRadius,
      capeHeight,
      16,
      8,
      true,
      Math.PI - backWidth / 2,
      backWidth,
    )
    const pos = capeGeo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const angle = Math.atan2(z, x)
      const hemFactor = (capeHeight / 2 - y) / capeHeight // 0 oben, 1 am Saum
      const wave = Math.sin(angle * 6) * 0.03 * hemFactor
      const scale = 1 + wave / capeRadius
      pos.setX(i, x * scale)
      pos.setZ(i, z * scale)
    }
    capeGeo.computeVertexNormals()
    const cape = new THREE.Mesh(capeGeo, capeMat)
    cape.position.set(0, 0.73, 0)
    this.torsoGroup.add(cape)
  }

  setAnimState(state: CharacterAnimState) {
    if (this.state !== state) {
      this.state = state
      this.stateElapsed = 0
      this.applyMood(STATE_MOOD[state])
      if (state === 'cheer' || state === 'meh' || state === 'disappointed') {
        // Saubere Ausgangshaltung für die Reaktion, statt eine Neigung aus dem vorherigen Wurf
        // (z.B. das Vorlehnen am Ende von 'throw') unbeabsichtigt mit hinüberzunehmen.
        this.torsoGroup.rotation.set(0, 0, 0)
        this.headGroup.rotation.set(0, 0, 0)
      }
    }
  }

  /** Tauscht nur die Gesichtstextur (siehe buildFaceTexture) statt Geometrie neu zu bauen - günstig
   * genug, um bei jedem Stimmungswechsel (siehe setAnimState) aufgerufen zu werden. */
  private applyMood(mood: Mood) {
    if (!this.faceMesh || !this.faceTextures) return
    const mat = this.faceMesh.material as THREE.MeshStandardMaterial
    mat.map = this.faceTextures[mood]
    mat.needsUpdate = true
  }

  setBackswingAmount(amount: number) {
    this.backswingAmount = THREE.MathUtils.clamp(amount, 0, 1)
  }

  update(dt: number) {
    this.time += dt
    this.stateElapsed += dt

    switch (this.state) {
      case 'idle': {
        const wobble = Math.sin(this.time * 2) * 0.02
        this.torsoGroup.rotation.z = wobble
        this.headGroup.rotation.z = wobble * 0.5
        this.rightArmPivot.rotation.x = 0
        this.leftArmPivot.rotation.x = Math.sin(this.time * 2) * 0.05
        break
      }
      case 'backswing': {
        const amt = this.backswingAmount
        this.rightArmPivot.rotation.x = -amt * 1.7
        this.torsoGroup.rotation.x = amt * 0.15
        // Leichtes Einsinken beim Ausholen, damit der Wurf wie eine echte Körperbewegung wirkt statt
        // nur eine reine Armdrehung zu sein (Teil: Wurf-Animation).
        this.group.position.y = -amt * 0.045
        break
      }
      case 'throw': {
        const t = Math.min(this.stateElapsed / 0.4, 1)
        this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(-1.7, 0.7, t)
        this.torsoGroup.rotation.x = THREE.MathUtils.lerp(0.15, -0.05, t)
        this.group.position.y = THREE.MathUtils.lerp(-0.045, 0, t)
        break
      }
      case 'cheer': {
        const bounce = Math.abs(Math.sin(this.stateElapsed * 8)) * 0.15
        this.group.position.y = bounce
        this.leftArmPivot.rotation.x = -2.6
        this.rightArmPivot.rotation.x = -2.6
        break
      }
      case 'meh': {
        const settle = Math.min(this.stateElapsed / 0.6, 1)
        const shrug = Math.sin(Math.min(this.stateElapsed * 6, Math.PI)) * 0.3 * (1 - settle * 0.4)
        this.leftArmPivot.rotation.x = -shrug
        this.rightArmPivot.rotation.x = -shrug
        this.headGroup.rotation.z = Math.sin(this.stateElapsed * 4) * 0.07 * (1 - settle)
        break
      }
      case 'disappointed': {
        // headGroup hängt jetzt an torsoGroup (siehe Konstruktor) und erbt dessen Neigung
        // automatisch - hier nur noch eine kleine ZUSÄTZLICHE Nickbewegung fürs Genick obendrauf,
        // statt Kopf und Oberkörper unabhängig um verschiedene Drehpunkte zu kippen (Bugfix: Kopf
        // war nicht mehr auf dem Körper).
        this.torsoGroup.rotation.x = Math.min(this.stateElapsed * 1.5, 0.2)
        this.headGroup.rotation.x = Math.min(this.stateElapsed * 2, 0.15)
        // Enttäuscht hängende Arme statt der neutralen Ruhehaltung (Teil: Reaktions-Mimik).
        const droop = Math.min(this.stateElapsed * 2, 1)
        this.leftArmPivot.rotation.x = droop * 0.35
        this.rightArmPivot.rotation.x = droop * 0.35
        break
      }
    }

    // Idle-Blinzeln (Teil: UI-Politur) - nur in echter Ruhehaltung, damit ein Blinzeln nicht
    // mitten in eine Wurf-/Reaktionsanimation hineinplatzt und die dortige Stimmungstextur
    // überschreibt.
    if (this.state === 'idle') {
      if (this.isBlinking) {
        this.blinkElapsed += dt
        if (this.blinkElapsed > 0.12) {
          this.isBlinking = false
          this.blinkTimer = 2.5 + Math.random() * 3.5
          this.applyMood('neutral')
        }
      } else {
        this.blinkTimer -= dt
        if (this.blinkTimer <= 0) {
          this.isBlinking = true
          this.blinkElapsed = 0
          this.applyMood('blink')
        }
      }
    }
  }

  resetPose() {
    this.group.position.y = 0
    this.headGroup.rotation.set(0, 0, 0)
    this.torsoGroup.rotation.set(0, 0, 0)
    this.leftArmPivot.rotation.set(0, 0, -ARM_REST_LEAN)
    this.rightArmPivot.rotation.set(0, 0, ARM_REST_LEAN)
    this.setAnimState('idle')
  }
}
