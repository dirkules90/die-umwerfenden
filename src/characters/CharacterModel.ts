import * as THREE from 'three'
import type { AvatarConfig, CosmeticLoadout, HairStyleId, ShirtStyleId } from '../game/types'

export type CharacterAnimState = 'idle' | 'backswing' | 'throw' | 'cheer' | 'disappointed'

const BUILD_SCALE: Record<AvatarConfig['build'], number> = {
  schlank: 0.92,
  mittel: 1.0,
  kraeftig: 1.12,
}

const ARM_LENGTH = 0.34
const SHOULDER_Y = 0.97
const SHOULDER_X = 0.27

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

      pivot.rotation.z = sign * 0.08
      this.group.add(pivot)
    }

    // Kopf (großer Kopf im Verhältnis zum Körper, Mii-artig, Teil 5.4)
    const headRadius = 0.2
    const head = new THREE.Mesh(new THREE.SphereGeometry(headRadius, 20, 16), skinMat)
    this.headGroup.add(head)

    this.buildHair(hairMat, headRadius, cosmetics.hairStyle)

    // Augen - ohne diese wirkt der Kopf ausdruckslos/leer.
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x241f1a, roughness: 0.3 })
    for (const side of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), eyeWhiteMat)
      eyeWhite.position.set(side * 0.075, 0.01, headRadius * 0.92)
      this.headGroup.add(eyeWhite)
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 8), pupilMat)
      pupil.position.set(side * 0.075, 0.01, headRadius * 0.97)
      this.headGroup.add(pupil)
    }

    // Einfacher Mund für etwas Persönlichkeit.
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 10, Math.PI), pupilMat)
    mouth.position.set(0, -0.075, headRadius * 0.94)
    mouth.rotation.z = Math.PI
    this.headGroup.add(mouth)

    if (config.hasBeard) {
      const beard = new THREE.Mesh(
        new THREE.SphereGeometry(headRadius * 0.7, 12, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.4),
        hairMat,
      )
      beard.position.set(0, -0.09, 0.04)
      this.headGroup.add(beard)
    }

    if (config.hasGlasses) {
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3 })
      for (const side of [-1, 1]) {
        const lens = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.011, 8, 16), glassMat)
        lens.position.set(side * 0.078, 0.01, headRadius * 0.92)
        this.headGroup.add(lens)
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.011, 0.011), glassMat)
      bridge.position.set(0, 0.01, headRadius * 0.94)
      this.headGroup.add(bridge)
    }

    this.headGroup.position.y = 1.12 + headRadius
    this.headGroup.castShadow = true
    this.group.add(this.headGroup)
  }

  /** Vier Frisuren zur Auswahl (Teil: Kosmetik-Shop) - deutlich unterscheidbare Silhouetten statt
   * feiner Detailvarianten, damit man auf einen Blick erkennt, welche gerade ausgerüstet ist. */
  private buildHair(hairMat: THREE.Material, headRadius: number, style: HairStyleId) {
    switch (style) {
      case 'kurz': {
        const hair = new THREE.Mesh(
          new THREE.SphereGeometry(headRadius * 1.08, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
          hairMat,
        )
        hair.position.y = 0.05
        this.headGroup.add(hair)
        break
      }
      case 'lang': {
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(headRadius * 1.05, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
          hairMat,
        )
        cap.position.y = 0.015
        this.headGroup.add(cap)
        const back = new THREE.Mesh(new THREE.CapsuleGeometry(headRadius * 0.55, headRadius * 1.1, 4, 8), hairMat)
        back.position.set(0, -headRadius * 0.55, -headRadius * 0.55)
        back.rotation.x = 0.15
        this.headGroup.add(back)
        break
      }
      case 'irokese': {
        const spikeCount = 5
        for (let i = 0; i < spikeCount; i++) {
          const t = i / (spikeCount - 1) - 0.5
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 8), hairMat)
          spike.position.set(0, headRadius + 0.09 - Math.abs(t) * 0.06, t * headRadius * 1.35)
          spike.rotation.x = -t * 0.9
          this.headGroup.add(spike)
        }
        break
      }
      case 'standard':
      default: {
        const hair = new THREE.Mesh(
          new THREE.SphereGeometry(headRadius * 1.05, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
          hairMat,
        )
        hair.position.y = 0.015
        this.headGroup.add(hair)
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
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.085, 20), badgeMat)
    badge.position.set(0, 0.86, 0.185)
    this.torsoGroup.add(badge)
  }

  setAnimState(state: CharacterAnimState) {
    if (this.state !== state) {
      this.state = state
      this.stateElapsed = 0
    }
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
        break
      }
      case 'throw': {
        const t = Math.min(this.stateElapsed / 0.4, 1)
        this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(-1.7, 0.7, t)
        this.torsoGroup.rotation.x = THREE.MathUtils.lerp(0.15, -0.05, t)
        break
      }
      case 'cheer': {
        const bounce = Math.abs(Math.sin(this.stateElapsed * 8)) * 0.15
        this.group.position.y = bounce
        this.leftArmPivot.rotation.x = -2.6
        this.rightArmPivot.rotation.x = -2.6
        break
      }
      case 'disappointed': {
        this.headGroup.rotation.x = Math.min(this.stateElapsed * 2, 0.3)
        this.torsoGroup.rotation.x = Math.min(this.stateElapsed * 1.5, 0.2)
        break
      }
    }
  }

  resetPose() {
    this.group.position.y = 0
    this.headGroup.rotation.set(0, 0, 0)
    this.torsoGroup.rotation.set(0, 0, 0)
    this.leftArmPivot.rotation.set(0, 0, -0.08)
    this.rightArmPivot.rotation.set(0, 0, 0.08)
    this.setAnimState('idle')
  }
}
