import * as THREE from 'three'
import { LANE_HALF_WIDTH, PIN_FALLEN_ANGLE_DEG } from './laneConstants'

/** Rinnenlogik (Teil 8.3): Kugel gilt als „im Aus”, sobald sie die Bahnkante verlassen hat -
 * unabhängig davon, wo genau sie innerhalb der Rinne zum Stehen kommt. */
export function isInGutter(ballX: number): boolean {
  return Math.abs(ballX) > LANE_HALF_WIDTH
}

/** Ein Kegel gilt als „gefallen”, sobald sein Neigungswinkel den Schwellenwert überschreitet (Teil 8.4). */
export function isPinFallen(quaternion: { x: number; y: number; z: number; w: number }): boolean {
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(
    new THREE.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w),
  )
  const angleDeg = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(up.y, -1, 1)))
  return angleDeg > PIN_FALLEN_ANGLE_DEG
}

export function isAtRest(
  linvel: { x: number; y: number; z: number },
  angvel: { x: number; y: number; z: number },
  linThreshold: number,
  angThreshold: number,
): boolean {
  const linSpeed = Math.hypot(linvel.x, linvel.y, linvel.z)
  const angSpeed = Math.hypot(angvel.x, angvel.y, angvel.z)
  return linSpeed < linThreshold && angSpeed < angThreshold
}
