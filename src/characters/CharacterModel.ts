import * as THREE from 'three'
import type { AvatarConfig } from '../game/types'

export type CharacterAnimState = 'idle' | 'backswing' | 'throw' | 'cheer' | 'disappointed'

const BUILD_SCALE: Record<AvatarConfig['build'], number> = {
  schlank: 0.92,
  mittel: 1.0,
  kraeftig: 1.12,
}

const ARM_LENGTH = 0.34
const SHOULDER_Y = 0.97
const SHOULDER_X = 0.27

/**
 * Stilisiertes Low-Poly Cartoon-Modell (Teil 5.4 / 11.2) – kein Fotorealismus, rein abstrahiert.
 * Arme hängen an Schulter-Pivots (statt an ihrem eigenen Mittelpunkt), damit Wurf-/Ausholanimationen
 * sich glaubwürdig um das Schultergelenk drehen statt durch den Körper zu rotieren.
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

  constructor(config: AvatarConfig) {
    const scale = BUILD_SCALE[config.build]
    this.group.scale.setScalar(scale)

    const skinMat = new THREE.MeshStandardMaterial({ color: config.skinColor, roughness: 0.7 })
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
    const accentMat = new THREE.MeshStandardMaterial({ color: config.shirtAccent, roughness: 0.8 })
    const hairMat = new THREE.MeshStandardMaterial({ color: config.hairColor, roughness: 0.6 })
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3a4a5c, roughness: 0.9 })
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.6 })

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

      pivot.rotation.z = sign * 0.08
      this.group.add(pivot)
    }

    // Kopf (großer Kopf im Verhältnis zum Körper, Mii-artig, Teil 5.4)
    const headRadius = 0.2
    const head = new THREE.Mesh(new THREE.SphereGeometry(headRadius, 20, 16), skinMat)
    this.headGroup.add(head)

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(headRadius * 1.05, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
      hairMat,
    )
    hair.position.y = 0.015
    this.headGroup.add(hair)

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
