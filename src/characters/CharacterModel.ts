import * as THREE from 'three'
import type { AvatarConfig } from '../game/types'

export type CharacterAnimState = 'idle' | 'backswing' | 'throw' | 'cheer' | 'disappointed'

const BUILD_SCALE: Record<AvatarConfig['build'], number> = {
  schlank: 0.92,
  mittel: 1.0,
  kraeftig: 1.12,
}

/** Stilisiertes Low-Poly Cartoon-Modell (Teil 5.4 / 11.2) – kein Fotorealismus, rein abstrahiert. */
export class CharacterModel {
  group = new THREE.Group()
  private headGroup = new THREE.Group()
  private torsoGroup = new THREE.Group()
  private leftArm: THREE.Mesh
  private rightArm: THREE.Mesh
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

    // Beine
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.55, 4, 8), pantsMat)
      leg.position.set(side * 0.11, 0.35, 0)
      leg.castShadow = true
      this.group.add(leg)
    }

    // Torso (leicht gestauchte Proportionen)
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.42, 4, 10), shirtMat)
    torso.position.y = 0.98
    torso.castShadow = true
    this.torsoGroup.add(torso)

    const accentStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.08, 10), accentMat)
    accentStripe.position.y = 0.82
    this.torsoGroup.add(accentStripe)
    this.group.add(this.torsoGroup)

    // Arme
    this.leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 4, 8), shirtMat)
    this.leftArm.position.set(-0.28, 0.95, 0)
    this.rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 4, 8), shirtMat)
    this.rightArm.position.set(0.28, 0.95, 0)
    this.leftArm.castShadow = true
    this.rightArm.castShadow = true
    this.group.add(this.leftArm, this.rightArm)

    // Kopf (großer Kopf im Verhältnis zum Körper, Mii-artig)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 16), skinMat)
    this.headGroup.add(head)

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat)
    hair.position.y = 0.06
    this.headGroup.add(hair)

    if (config.hasBeard) {
      const beard = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.4), hairMat)
      beard.position.set(0, -0.1, 0.05)
      this.headGroup.add(beard)
    }

    if (config.hasGlasses) {
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3 })
      for (const side of [-1, 1]) {
        const lens = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 16), glassMat)
        lens.position.set(side * 0.09, 0.02, 0.21)
        this.headGroup.add(lens)
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.012), glassMat)
      bridge.position.set(0, 0.02, 0.22)
      this.headGroup.add(bridge)
    }

    this.headGroup.position.y = 1.42
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
        this.rightArm.rotation.x = 0
        this.leftArm.rotation.x = 0
        break
      }
      case 'backswing': {
        const amt = this.backswingAmount
        this.rightArm.rotation.x = -amt * 1.4
        this.torsoGroup.rotation.x = amt * 0.15
        break
      }
      case 'throw': {
        const t = Math.min(this.stateElapsed / 0.4, 1)
        this.rightArm.rotation.x = THREE.MathUtils.lerp(-1.4, 0.6, t)
        this.torsoGroup.rotation.x = THREE.MathUtils.lerp(0.15, -0.05, t)
        break
      }
      case 'cheer': {
        const bounce = Math.abs(Math.sin(this.stateElapsed * 8)) * 0.15
        this.group.position.y = bounce
        this.leftArm.rotation.x = -2.2
        this.rightArm.rotation.x = -2.2
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
    this.leftArm.rotation.set(0, 0, 0)
    this.rightArm.rotation.set(0, 0, 0)
    this.setAnimState('idle')
  }
}
