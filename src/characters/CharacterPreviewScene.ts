import * as THREE from 'three'
import { CharacterModel } from './CharacterModel'
import type { AvatarConfig, CosmeticLoadout } from '../game/types'

/** Leichtgewichtige Vorschau für den Kosmetik-Shop: nur Charaktermodell + Licht, ganz ohne Bahn,
 * Physik oder Kegel - im Gegensatz zu LaneScene, die dafür deutlich zu schwer wäre. */
export class CharacterPreviewScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private clock = new THREE.Clock()
  private model: CharacterModel | null = null
  private disposed = false

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.camera = new THREE.PerspectiveCamera(36, canvas.clientWidth / Math.max(canvas.clientHeight, 1), 0.1, 10)
    this.camera.position.set(0, 0.98, 3.1)
    this.camera.lookAt(0, 0.82, 0)

    const hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 0.9)
    this.scene.add(hemi)
    const sun = new THREE.DirectionalLight(0xfff4d6, 1.1)
    sun.position.set(-2, 3, 2)
    this.scene.add(sun)
    const fill = new THREE.AmbientLight(0xffffff, 0.35)
    this.scene.add(fill)

    this.renderer.setAnimationLoop(() => this.tick())
  }

  setCharacter(config: AvatarConfig, cosmetics: CosmeticLoadout) {
    if (this.model) this.scene.remove(this.model.group)
    this.model = new CharacterModel(config, cosmetics)
    this.model.group.rotation.y = Math.PI * 0.12
    this.scene.add(this.model.group)
  }

  resize(width: number, height: number) {
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(height, 1)
    this.camera.updateProjectionMatrix()
  }

  private tick() {
    if (this.disposed) return
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.model?.update(dt)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    this.renderer.setAnimationLoop(null)
    this.renderer.dispose()
  }
}
