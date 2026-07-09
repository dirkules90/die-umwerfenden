import * as THREE from 'three'
import { GUTTER_HALF_OUTER, PIN_STAND_Z, START_Z } from '../physics/laneConstants'

/** Hebel-Station mit Gestänge (Teil 9.4): Metallpfosten, Griff, sichtbare Übertragungsstangen. */
export class Lever {
  group = new THREE.Group()
  private handle: THREE.Mesh
  private linkageSegments: THREE.Mesh[] = []
  private glowMat: THREE.MeshStandardMaterial

  readonly stationPosition: THREE.Vector3

  constructor() {
    this.stationPosition = new THREE.Vector3(GUTTER_HALF_OUTER + 0.6, 0, START_Z - 2)
    this.group.position.copy(this.stationPosition)

    const metalMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 0.7, roughness: 0.35 })
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.15, 12), new THREE.MeshStandardMaterial({ color: 0x9c9c94 }))
    base.position.y = 0.075
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.1, 10), metalMat)
    post.position.y = 0.65
    post.castShadow = true

    this.glowMat = new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xffb300, emissiveIntensity: 0.6 })
    const handleGroup = new THREE.Group()
    handleGroup.position.set(0, 1.05, 0)
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), metalMat)
    arm.rotation.z = Math.PI / 2
    arm.position.x = 0.25
    const grip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), this.glowMat)
    grip.position.x = 0.5
    handleGroup.add(arm, grip)
    this.handle = handleGroup as unknown as THREE.Mesh

    this.group.add(base, post, handleGroup)

    // Gestänge zum Kegelstand.
    const linkageLength = Math.abs(PIN_STAND_Z - (START_Z - 2))
    const segCount = 6
    const linkageMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.6, roughness: 0.45 })
    for (let i = 0; i < segCount; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, linkageLength / segCount - 0.05), linkageMat)
      seg.position.set(-0.1, 0.1, -(i + 0.5) * (linkageLength / segCount))
      this.linkageSegments.push(seg)
      this.group.add(seg)
    }
  }

  setGlow(active: boolean) {
    this.glowMat.emissiveIntensity = active ? 0.6 : 0.15
  }

  pulseGlow(t: number) {
    this.glowMat.emissiveIntensity = 0.3 + Math.sin(t * Math.PI * 4) * 0.3 + 0.3
  }

  /** progress: 0 (Ruhelage) bis 1 (unterer Anschlag). */
  setPullProgress(progress: number) {
    this.handle.rotation.z = -progress * (Math.PI / 2.4)
  }

  animateLinkage(t: number) {
    // Rhythmisches Klacken/Rattern (Teil 13.2): leichte Versatzbewegung je Segment.
    this.linkageSegments.forEach((seg, i) => {
      const phase = (t * 6 + i) % 1
      seg.position.y = 0.1 + Math.sin(phase * Math.PI * 2) * 0.015
    })
  }
}
