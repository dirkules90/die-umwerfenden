import * as THREE from 'three'
import type RAPIER from '@dimforge/rapier3d-compat'
import { PIN_HEIGHT, PIN_RADIUS } from '../physics/laneConstants'

const RING_COLORS = [0xc0392b, 0x2e7d32]

/** Silhouette eines klassischen Kegels (Sockel, bauchiger Korpus, Hals, rundlicher Kopf),
 * erzeugt per Rotationskörper. Punkte laufen von der Fußfläche (-H/2) bis zur Kopfspitze (+H/2),
 * relativ zum Körperzentrum, damit sie exakt mit dem zentrierten Physik-Collider übereinstimmen. */
function buildPinProfile(): THREE.Vector2[] {
  const h = PIN_HEIGHT
  const r = PIN_RADIUS
  return [
    new THREE.Vector2(0, -h / 2),
    new THREE.Vector2(r * 0.82, -h / 2),
    new THREE.Vector2(r * 0.92, -h / 2 + 0.06 * h),
    new THREE.Vector2(r * 1.0, -h / 2 + 0.28 * h),
    new THREE.Vector2(r * 0.88, -h / 2 + 0.46 * h),
    new THREE.Vector2(r * 0.5, -h / 2 + 0.6 * h),
    new THREE.Vector2(r * 0.58, -h / 2 + 0.66 * h),
    new THREE.Vector2(r * 0.42, -h / 2 + 0.72 * h),
    new THREE.Vector2(r * 0.56, -h / 2 + 0.88 * h),
    new THREE.Vector2(r * 0.18, h / 2),
    new THREE.Vector2(0, h / 2),
  ]
}

export class Pin {
  mesh: THREE.Group
  body: RAPIER.RigidBody
  startPosition: THREE.Vector3
  index: number
  /** Sticky-Flag statt Live-Winkelabfrage bei der Auswertung (siehe LaneScene.tick): ein Kegel,
   * der beim erzwungenen Settle-Abbruch (forceSettle) gerade mitten im Umkippen ist, würde bei
   * einer einmaligen Momentaufnahme seines Winkels manchmal knapp unter der Fallen-Schwelle
   * erwischt und fälschlich als „steht noch” gezählt - bug: „umgefallene Kegel werden manchmal
   * nicht richtig gezählt”. */
  everFallen = false

  constructor(rapier: typeof RAPIER, world: RAPIER.World, position: THREE.Vector3, index: number) {
    this.index = index
    this.startPosition = position.clone()

    const group = new THREE.Group()
    const bodyGeo = new THREE.LatheGeometry(buildPinProfile(), 16)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8d4a8, roughness: 0.6 })
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat)
    bodyMesh.castShadow = true

    const ringColor = index === 8 ? 0xf1c40f : RING_COLORS[index % 2]
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(PIN_RADIUS * 0.62, PIN_RADIUS * 0.62, PIN_HEIGHT * 0.1, 12),
      new THREE.MeshStandardMaterial({ color: ringColor, roughness: 0.5 }),
    )
    ring.position.y = -PIN_HEIGHT / 2 + 0.66 * PIN_HEIGHT
    group.add(bodyMesh, ring)
    this.mesh = group

    const bodyDesc = rapier.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(0.4)
      .setAngularDamping(0.6)
      .setCcdEnabled(true)
    this.body = world.createRigidBody(bodyDesc)

    // Bewusst etwas schwerer als eine reine Bowlingkugel-Proportion nahelegen würde: ein reiner
    // Kraftwurf mittig durch den Kranz soll nicht zuverlässig alle neun umwerfen - dafür braucht
    // es eine gut getroffene Kombination aus Tempo und Spin, die den Aufprall über die Reihen
    // verteilt (Teil 8.4/8.5, "Standfestigkeit").
    const mass = 0.42
    const colliderDesc = rapier.ColliderDesc.cylinder(PIN_HEIGHT / 2, PIN_RADIUS)
      .setDensity(mass / (Math.PI * PIN_RADIUS ** 2 * PIN_HEIGHT))
      .setFriction(0.9)
      .setRestitution(0.05)
    world.createCollider(colliderDesc, this.body)
  }

  syncMesh() {
    const t = this.body.translation()
    const r = this.body.rotation()
    this.mesh.position.set(t.x, t.y, t.z)
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w)
  }
}
