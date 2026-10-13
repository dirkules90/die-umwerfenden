import * as THREE from 'three'

interface Popup {
  sprite: THREE.Sprite
  age: number
  lifetime: number
}

const BASE_WIDTH = 1.5
const BASE_HEIGHT = 0.75
const POP_IN_DURATION = 0.15
const LIFETIME = 1.3
const FADE_START = 0.75

/**
 * Kurzes Text-Popup direkt über dem Kegelstand nach jedem Wurf (Teil: Grafik-Feedback, Nutzer-
 * Wunsch "Punkte auch in Grafik geben") - zusätzlich zur Zahl in der Seitenleiste, damit der
 * getroffene Punktwert auch direkt am Ort des Geschehens sichtbar wird. Gleiches Sprite-basierte
 * Muster wie ParticleFX.ts (CanvasTexture statt Text-Mesh/externer Font), bewusst als eigene
 * kleine Klasse statt die Partikel-Klasse zu überladen, weil hier pro Wurf nur genau EIN Popup
 * statt vieler kleiner Partikel entsteht und eigene Timing-/Skalierungslogik braucht.
 */
export class ScorePopup {
  private scene: THREE.Scene
  private active: Popup[] = []

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  show(position: THREE.Vector3, text: string, color: string) {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    ctx.font = 'bold 64px "Segoe UI", Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 12
    ctx.strokeStyle = 'rgba(30, 20, 10, 0.8)'
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2)
    ctx.fillStyle = color
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
    const sprite = new THREE.Sprite(material)
    sprite.position.copy(position)
    sprite.scale.set(0.01, 0.01, 1)
    this.scene.add(sprite)
    this.active.push({ sprite, age: 0, lifetime: LIFETIME })
  }

  update(dt: number) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i]
      p.age += dt
      const t = p.age / p.lifetime

      // Kurzes Reinpoppen statt sofort voller Größe, danach langsames Aufsteigen.
      const popT = Math.min(p.age / POP_IN_DURATION, 1)
      const overshoot = popT < 1 ? 1 + Math.sin(popT * Math.PI) * 0.15 : 1
      const scale = popT * overshoot
      p.sprite.scale.set(BASE_WIDTH * scale, BASE_HEIGHT * scale, 1)
      p.sprite.position.y += dt * 0.35

      const mat = p.sprite.material as THREE.SpriteMaterial
      mat.opacity = t < FADE_START ? 1 : 1 - (t - FADE_START) / (1 - FADE_START)

      if (p.age >= p.lifetime) {
        this.scene.remove(p.sprite)
        mat.map?.dispose()
        mat.dispose()
        this.active.splice(i, 1)
      }
    }
  }

  dispose() {
    for (const p of this.active) {
      this.scene.remove(p.sprite)
      const mat = p.sprite.material as THREE.SpriteMaterial
      mat.map?.dispose()
      mat.dispose()
    }
    this.active = []
  }
}
