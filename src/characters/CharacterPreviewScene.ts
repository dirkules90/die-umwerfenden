import * as THREE from 'three'
import { CharacterModel } from './CharacterModel'
import { ParticleSystem } from '../scene/ParticleFX'
import type { AvatarConfig, CosmeticLoadout } from '../game/types'

const INITIAL_ROTATION_Y = Math.PI * 0.12
const DRAG_SENSITIVITY = 0.012
// Ab dieser Gesamt-Zeigerbewegung (Pixel) gilt eine Geste als Ziehen/Drehen statt als Antippen -
// Fingertipps zittern leicht, ein zu niedriger Schwellwert würde jedes Antippen fälschlich als
// (winziges) Drehen werten und nie eine Geste auslösen.
const TAP_MAX_MOVEMENT = 10
const TAP_MAX_DURATION_MS = 400

export interface CharacterPreviewCamera {
  fov: number
  position: THREE.Vector3
  lookAt: THREE.Vector3
}

/** Enge Nahaufnahme auf Oberkörper/Kosmetik (Shop-Standard). */
export const SHOP_PREVIEW_CAMERA: CharacterPreviewCamera = {
  fov: 36,
  position: new THREE.Vector3(0, 0.98, 3.1),
  lookAt: new THREE.Vector3(0, 0.82, 0),
}

/** Weitere Einstellung mit vollem Körper sichtbar (Teil: Charakter auf dem Startbildschirm) - für
 * den seitlich stehenden, eher hochformatigen Rahmen dort etwas näher heran als die Shop-Variante,
 * damit der Charakter trotz der schmalen Breite präsent/groß wirkt statt klein in der Mitte zu
 * stehen (Nutzer-Wunsch: "größer/präsenter hinstellen"). lookAt liegt bewusst unterhalb der
 * Körpermitte und die Kamera etwas weiter weg als rein fürs Stehbild nötig - der Jubel-Doppelsprung-
 * Fidget hebt den Kopf per group.position.y+Sprung deutlich an (Nutzer-Wunsch: "komplexere
 * Bewegungen"), ohne dieses Polster würde der Kopf dabei oben aus dem Bild laufen. */
export const FULL_BODY_PREVIEW_CAMERA: CharacterPreviewCamera = {
  fov: 30,
  position: new THREE.Vector3(0, 0.78, 3.6),
  lookAt: new THREE.Vector3(0, 0.52, 0),
}

/** Leichtgewichtige Vorschau für Kosmetik-Shop und Startbildschirm: nur Charaktermodell + Licht,
 * ganz ohne Bahn, Physik oder Kegel - im Gegensatz zu LaneScene, die dafür deutlich zu schwer wäre.
 * Per Touch/Maus horizontal drehbar, damit man die Ausrüstung von allen Seiten begutachten kann;
 * ein einfaches Antippen (ohne nennenswerte Bewegung) löst stattdessen sofort eine Idle-Geste aus
 * (Nutzer-Wunsch: "wenn man drauftippt macht er etwas, springt hoch, jubelt..."). */
export class CharacterPreviewScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private clock = new THREE.Clock()
  private model: CharacterModel | null = null
  private particles: ParticleSystem
  private disposed = false
  private rotationY = INITIAL_ROTATION_Y
  private dragging = false
  private lastPointerX = 0
  private pointerDownAt = 0
  private totalPointerMovement = 0
  private canvas: HTMLCanvasElement

  private onPointerDown = (e: PointerEvent) => {
    this.dragging = true
    this.lastPointerX = e.clientX
    this.pointerDownAt = performance.now()
    this.totalPointerMovement = 0
    this.canvas.setPointerCapture(e.pointerId)
  }

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return
    const dx = e.clientX - this.lastPointerX
    this.lastPointerX = e.clientX
    this.totalPointerMovement += Math.abs(dx)
    this.rotationY += dx * DRAG_SENSITIVITY
    if (this.model) this.model.group.rotation.y = this.rotationY
  }

  private onPointerUp = () => {
    if (
      this.dragging &&
      this.totalPointerMovement < TAP_MAX_MOVEMENT &&
      performance.now() - this.pointerDownAt < TAP_MAX_DURATION_MS
    ) {
      this.model?.triggerFidget()
    }
    this.dragging = false
  }

  constructor(canvas: HTMLCanvasElement, cameraConfig: CharacterPreviewCamera = SHOP_PREVIEW_CAMERA) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    // Gleicher Tonemapper wie LaneScene (Teil: optische Überarbeitung) - sonst wirkt der
    // Charakter in der Shop-Vorschau sichtbar anders (kälter/flacher) als im Spiel selbst.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05

    this.camera = new THREE.PerspectiveCamera(
      cameraConfig.fov,
      canvas.clientWidth / Math.max(canvas.clientHeight, 1),
      0.1,
      10,
    )
    this.camera.position.copy(cameraConfig.position)
    this.camera.lookAt(cameraConfig.lookAt)

    const hemi = new THREE.HemisphereLight(0xfff0d8, 0x445533, 0.9)
    this.scene.add(hemi)
    const sun = new THREE.DirectionalLight(0xffdfae, 1.1)
    sun.position.set(-2, 3, 2)
    this.scene.add(sun)
    const fill = new THREE.AmbientLight(0xfff2e0, 0.35)
    this.scene.add(fill)

    this.particles = new ParticleSystem(this.scene)

    canvas.style.touchAction = 'none'
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointercancel', this.onPointerUp)
    canvas.addEventListener('pointerleave', this.onPointerUp)

    this.renderer.setAnimationLoop(() => this.tick())
  }

  setCharacter(config: AvatarConfig, cosmetics: CosmeticLoadout) {
    if (this.model) this.scene.remove(this.model.group)
    this.model = new CharacterModel(config, cosmetics)
    this.model.group.rotation.y = this.rotationY
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
    const confettiPos = this.model?.consumeConfettiBurst()
    if (confettiPos) this.particles.burstConfetti(confettiPos)
    this.particles.update(dt)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    this.renderer.setAnimationLoop(null)
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onPointerUp)
    this.canvas.removeEventListener('pointerleave', this.onPointerUp)
    this.particles.dispose()
    this.renderer.dispose()
  }
}
