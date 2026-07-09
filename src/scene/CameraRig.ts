import * as THREE from 'three'
import { Animator, easeInOutCubic } from './Animator'

/** Kamerasystem mit Third-Person-Perspektive und phasenabhängigen Fahrten (Teil 6). */
export class CameraRig {
  camera: THREE.PerspectiveCamera
  private animator = new Animator()
  private lookAtTarget = new THREE.Vector3()
  private shakeMagnitude = 0
  private shakeDecay = 4

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 200)
  }

  setAspect(aspect: number) {
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
  }

  setImmediate(position: THREE.Vector3, lookAt: THREE.Vector3) {
    this.camera.position.copy(position)
    this.lookAtTarget.copy(lookAt)
    this.camera.lookAt(this.lookAtTarget)
  }

  tweenTo(position: THREE.Vector3, lookAt: THREE.Vector3, duration: number, onComplete?: () => void) {
    const startPos = this.camera.position.clone()
    const startLook = this.lookAtTarget.clone()
    this.animator.play(
      duration,
      (t) => {
        this.camera.position.lerpVectors(startPos, position, t)
        const look = new THREE.Vector3().lerpVectors(startLook, lookAt, t)
        this.lookAtTarget.copy(look)
        this.camera.lookAt(look)
      },
      onComplete,
      easeInOutCubic,
    )
  }

  followBehind(target: THREE.Vector3, direction: THREE.Vector3, distance: number, height: number, lerpFactor: number) {
    const desired = target.clone().addScaledVector(direction, distance)
    desired.y = height
    this.camera.position.lerp(desired, lerpFactor)
    this.lookAtTarget.lerp(target, lerpFactor)
    this.camera.lookAt(this.lookAtTarget)
  }

  dollyToward(basePosition: THREE.Vector3, lookAt: THREE.Vector3, forwardDir: THREE.Vector3, amount: number) {
    const pos = basePosition.clone().addScaledVector(forwardDir, amount)
    this.camera.position.copy(pos)
    this.lookAtTarget.copy(lookAt)
    this.camera.lookAt(lookAt)
  }

  triggerShake(magnitude: number) {
    this.shakeMagnitude = magnitude
  }

  update(dt: number) {
    this.animator.update(dt)
    if (this.shakeMagnitude > 0.001) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * this.shakeMagnitude,
        (Math.random() - 0.5) * this.shakeMagnitude,
        0,
      )
      this.camera.position.add(offset)
      this.shakeMagnitude *= Math.max(0, 1 - this.shakeDecay * dt)
    }
  }
}
