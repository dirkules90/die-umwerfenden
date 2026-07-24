import * as THREE from 'three'
import type RAPIER from '@dimforge/rapier3d-compat'
import { BALL_MASS, BALL_RADIUS, START_Z } from '../physics/laneConstants'

const BALL_COLOR = 0x8a2e22
const CURVE_STRENGTH = 1.1

export class Ball {
  mesh: THREE.Mesh
  body: RAPIER.RigidBody
  private collider: RAPIER.Collider
  private spinFactor = 0

  constructor(rapier: typeof RAPIER, world: RAPIER.World) {
    const geo = new THREE.SphereGeometry(BALL_RADIUS, 24, 18)
    const mat = new THREE.MeshStandardMaterial({ color: BALL_COLOR, roughness: 0.4, metalness: 0.1 })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.castShadow = true

    const bodyDesc = rapier.RigidBodyDesc.dynamic()
      .setTranslation(0, BALL_RADIUS + 0.05, START_Z)
      // Bewusst niedrige Dämpfung/Reibung: Auf der echten Kegelbahn erreicht auch ein
      // schwacher Wurf zuverlässig die Kegel, die Herausforderung liegt in Richtung und Spin,
      // nicht darin, ob die Kugel überhaupt ankommt (siehe Teil 3.1 „Warum Variante A”).
      .setLinearDamping(0.035)
      .setAngularDamping(0.15)
      .setCcdEnabled(true)
    this.body = world.createRigidBody(bodyDesc)

    const colliderDesc = rapier.ColliderDesc.ball(BALL_RADIUS)
      .setDensity(BALL_MASS / ((4 / 3) * Math.PI * BALL_RADIUS ** 3))
      .setFriction(0.12)
      .setRestitution(0.2)
    this.collider = world.createCollider(colliderDesc, this.body)
  }

  /** Während der Kegel-Aufrichtung wird die Kugel zum Sensor, damit sie ruhende oder noch
   * animierte Kegel nicht anrempeln kann, egal wo sie gerade zum Stehen gekommen ist. */
  setSensor(enabled: boolean) {
    this.collider.setSensor(enabled)
  }

  reset() {
    this.spinFactor = 0
    this.body.setTranslation({ x: 0, y: BALL_RADIUS + 0.05, z: START_Z }, true)
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    this.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
  }

  /** @param spin Effet/Spin unabhängig von der Wurfrichtung, -1 (Linksdrall) bis 1 (Rechtsdrall). */
  applyThrow(power: number, angleDeg: number, spin: number) {
    const speed = 6.5 + power * 5.5
    const angleRad = THREE.MathUtils.degToRad(angleDeg)
    const vx = Math.sin(angleRad) * speed
    const vz = -Math.cos(angleRad) * speed
    this.spinFactor = THREE.MathUtils.clamp(spin, -1, 1)
    this.body.setLinvel({ x: vx, y: 0, z: vz }, true)
    this.body.setAngvel({ x: speed * 3, y: this.spinFactor * 10, z: 0 }, true)
  }

  /** Vereinfachter Magnus-Effekt: krümmt die Flugbahn abhängig vom Spin, spürbar nur bei
   * ausreichender Geschwindigkeit und lässt mit dem Ausrollen der Kugel natürlich nach. */
  applyCurve(dt: number) {
    if (this.spinFactor === 0) return
    const v = this.body.linvel()
    const speed = Math.hypot(v.x, v.z)
    if (speed < 0.4) return
    const lateralX = -v.z / speed
    const lateralZ = v.x / speed
    const impulseMag = this.spinFactor * CURVE_STRENGTH * speed * dt
    this.body.applyImpulse({ x: lateralX * impulseMag, y: 0, z: lateralZ * impulseMag }, true)
  }

  syncMesh() {
    const t = this.body.translation()
    const r = this.body.rotation()
    this.mesh.position.set(t.x, t.y, t.z)
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w)
  }
}
