import * as THREE from 'three'
import type RAPIER from '@dimforge/rapier3d-compat'
import { BALL_RADIUS_HEAVY, BALL_RADIUS_LIGHT, START_Z } from '../physics/laneConstants'
import type { BallType } from '../game/types'

export class Ball {
  mesh: THREE.Mesh
  body: RAPIER.RigidBody
  type: BallType

  constructor(rapier: typeof RAPIER, world: RAPIER.World, type: BallType) {
    this.type = type
    const radius = type === 'schwer' ? BALL_RADIUS_HEAVY : BALL_RADIUS_LIGHT
    const color = type === 'schwer' ? 0x7a3b28 : 0x4c9a3a

    const geo = new THREE.SphereGeometry(radius, 24, 18)
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1 })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.castShadow = true

    const bodyDesc = rapier.RigidBodyDesc.dynamic()
      .setTranslation(0, radius + 0.05, START_Z)
      .setLinearDamping(0.15)
      .setAngularDamping(0.3)
      .setCcdEnabled(true)
    this.body = world.createRigidBody(bodyDesc)

    const mass = type === 'schwer' ? 1.6 : 1.0
    const colliderDesc = rapier.ColliderDesc.ball(radius)
      .setDensity(mass / ((4 / 3) * Math.PI * radius ** 3))
      .setFriction(0.55)
      .setRestitution(0.25)
    world.createCollider(colliderDesc, this.body)
  }

  reset(radiusOverride?: number) {
    const r = radiusOverride ?? (this.type === 'schwer' ? BALL_RADIUS_HEAVY : BALL_RADIUS_LIGHT)
    this.body.setTranslation({ x: 0, y: r + 0.05, z: START_Z }, true)
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    this.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
  }

  applyThrow(power: number, angleDeg: number, spin: number) {
    const speed = 3.5 + power * 7.5
    const angleRad = THREE.MathUtils.degToRad(angleDeg)
    const vx = Math.sin(angleRad) * speed
    const vz = -Math.cos(angleRad) * speed
    this.body.setLinvel({ x: vx, y: 0, z: vz }, true)
    this.body.setAngvel({ x: spin * 2, y: spin * 6, z: 0 }, true)
  }

  syncMesh() {
    const t = this.body.translation()
    const r = this.body.rotation()
    this.mesh.position.set(t.x, t.y, t.z)
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w)
  }
}
