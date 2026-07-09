import * as THREE from 'three'
import type RAPIER from '@dimforge/rapier3d-compat'
import { BALL_MASS, BALL_RADIUS, START_Z } from '../physics/laneConstants'

const BALL_COLOR = 0x8a2e22

export class Ball {
  mesh: THREE.Mesh
  body: RAPIER.RigidBody

  constructor(rapier: typeof RAPIER, world: RAPIER.World) {
    const geo = new THREE.SphereGeometry(BALL_RADIUS, 24, 18)
    const mat = new THREE.MeshStandardMaterial({ color: BALL_COLOR, roughness: 0.4, metalness: 0.1 })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.castShadow = true

    const bodyDesc = rapier.RigidBodyDesc.dynamic()
      .setTranslation(0, BALL_RADIUS + 0.05, START_Z)
      .setLinearDamping(0.15)
      .setAngularDamping(0.3)
      .setCcdEnabled(true)
    this.body = world.createRigidBody(bodyDesc)

    const colliderDesc = rapier.ColliderDesc.ball(BALL_RADIUS)
      .setDensity(BALL_MASS / ((4 / 3) * Math.PI * BALL_RADIUS ** 3))
      .setFriction(0.55)
      .setRestitution(0.25)
    world.createCollider(colliderDesc, this.body)
  }

  reset() {
    this.body.setTranslation({ x: 0, y: BALL_RADIUS + 0.05, z: START_Z }, true)
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
