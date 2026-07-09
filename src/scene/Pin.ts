import * as THREE from 'three'
import type RAPIER from '@dimforge/rapier3d-compat'
import { PIN_HEIGHT, PIN_RADIUS } from '../physics/laneConstants'

const RING_COLORS = [0xc0392b, 0x2e7d32]

export class Pin {
  mesh: THREE.Group
  body: RAPIER.RigidBody
  startPosition: THREE.Vector3
  index: number

  constructor(rapier: typeof RAPIER, world: RAPIER.World, position: THREE.Vector3, index: number) {
    this.index = index
    this.startPosition = position.clone()

    const group = new THREE.Group()
    const bodyGeo = new THREE.CylinderGeometry(PIN_RADIUS * 0.55, PIN_RADIUS, PIN_HEIGHT, 12)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8d4a8, roughness: 0.6 })
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat)
    bodyMesh.position.y = PIN_HEIGHT / 2
    bodyMesh.castShadow = true

    const ringColor = index === 8 ? 0xf1c40f : RING_COLORS[index % 2]
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(PIN_RADIUS * 0.58, PIN_RADIUS * 0.58, PIN_HEIGHT * 0.18, 12),
      new THREE.MeshStandardMaterial({ color: ringColor, roughness: 0.5 }),
    )
    ring.position.y = PIN_HEIGHT * 0.78
    group.add(bodyMesh, ring)
    this.mesh = group

    const bodyDesc = rapier.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(0.4)
      .setAngularDamping(0.6)
      .setCcdEnabled(true)
    this.body = world.createRigidBody(bodyDesc)

    const mass = 0.3
    const colliderDesc = rapier.ColliderDesc.cylinder(PIN_HEIGHT / 2, PIN_RADIUS)
      .setDensity(mass / (Math.PI * PIN_RADIUS ** 2 * PIN_HEIGHT))
      .setFriction(0.9)
      .setRestitution(0.05)
    world.createCollider(colliderDesc, this.body)
  }

  resetUpright() {
    this.body.setTranslation({ x: this.startPosition.x, y: this.startPosition.y, z: this.startPosition.z }, true)
    this.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }

  syncMesh() {
    const t = this.body.translation()
    const r = this.body.rotation()
    this.mesh.position.set(t.x, t.y, t.z)
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w)
  }
}
