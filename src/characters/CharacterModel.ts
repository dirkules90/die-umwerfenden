import * as THREE from 'three'
import type { AvatarConfig, CosmeticLoadout, GlassesStyleId, HairStyleId, ShirtStyleId } from '../game/types'
import { drawFace, type Mood } from './faceArt'

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

/** Ein Frisuren-"Kappe" (Kugelausschnitt um den Pol) muss KONZENTRISCH zur Kopfkugel bleiben, um
 * überall flächig aufzuliegen - eine leicht größere capScale (statt 1.0) erzeugt dabei bereits einen
 * gleichmäßigen, kaum sichtbaren Abstand zur Kopfhaut. Ein zusätzlicher y-Versatz verschiebt die
 * Kappe dagegen NICHT entlang der Kopfkrümmung, sondern schiebt die ganze starre Kugelschale
 * geradlinig nach oben/unten - dadurch verliert sie an Rand und Pol gleichermaßen den Bezug zur
 * Kopfoberfläche (Bugfix: Kurzhaarschnitt schwebte sichtbar über dem Kopf, weil der alte, per Hand
 * geschätzte Versatz genau das tat). Ein kleiner konstanter Versatz reicht nur zum Einbetten gegen
 * Z-Fighting am Ansatz, mehr nicht. */
const HAIR_CAP_EMBED_Y = -0.004

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

  constructor(config: AvatarConfig, cosmetics: CosmeticLoadout) {
    const scale = BUILD_SCALE[config.build]
    this.group.scale.setScalar(scale)

    const skinMat = new THREE.MeshStandardMaterial({ color: config.skinColor, roughness: 0.7 })
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
    const accentMat = new THREE.MeshStandardMaterial({ color: config.shirtAccent, roughness: 0.8 })
    const hairMat = new THREE.MeshStandardMaterial({ color: cosmetics.hairColor, roughness: 0.6 })
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3a4a5c, roughness: 0.9 })
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.6 })
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

    if (config.hasBeard) {
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
      skullGroup.add(beard)
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
      // Deutlich unter dem Haaransatz aller Frisuren platziert, sonst überschneidet es sich mit
      // der Frisur oder (bei größeren Gläsern) mit der Sonnenbrille.
      const bandMat = new THREE.MeshStandardMaterial({ color: 0xe0483c, roughness: 0.6 })
      const headband = new THREE.Mesh(new THREE.TorusGeometry(headRadius * 0.97, 0.017, 8, 20), bandMat)
      headband.rotation.x = Math.PI / 2
      headband.position.y = -headRadius * 0.06
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

  /** Vier Frisuren zur Auswahl (Teil: Kosmetik-Shop) - deutlich unterscheidbare Silhouetten statt
   * feiner Detailvarianten, damit man auf einen Blick erkennt, welche gerade ausgerüstet ist. */
  private buildHair(hairMat: THREE.Material, headRadius: number, style: HairStyleId, parent: THREE.Group) {
    switch (style) {
      case 'kurz': {
        // Radius nur minimal größer als der Kopf (statt sichtbar größer): sonst "schwebt" die
        // Frisur als eigene Kugelschale über der Kopfkugel statt bündig damit abzuschließen -
        // konzentrisch zur Kopfkugel (siehe HAIR_CAP_EMBED_Y), nicht per y-Versatz verschoben.
        const hair = new THREE.Mesh(
          new THREE.SphereGeometry(headRadius * 1.015, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.34),
          hairMat,
        )
        hair.position.y = HAIR_CAP_EMBED_Y
        parent.add(hair)
        break
      }
      case 'lang': {
        // Vorher bis 0.54π: reichte damit über den Äquator hinaus bis unter die Augenlinie (Bug:
        // Zottelmähne geht über die Augen). 0.42π endet spürbar oberhalb der Augen.
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(headRadius * 1.015, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
          hairMat,
        )
        cap.position.y = HAIR_CAP_EMBED_Y
        parent.add(cap)
        const back = new THREE.Mesh(new THREE.CapsuleGeometry(headRadius * 0.55, headRadius * 1.1, 4, 8), hairMat)
        back.position.set(0, -headRadius * 0.55, -headRadius * 0.55)
        back.rotation.x = 0.15
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
          new THREE.SphereGeometry(headRadius * 1.015, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.46),
          hairMat,
        )
        hair.position.y = HAIR_CAP_EMBED_Y
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
