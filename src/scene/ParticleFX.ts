import * as THREE from 'three'

/** Weiche, kreisförmige Sprite-Textur statt eines harten Quadrats (Teil: Optik-Politur) - per
 * Canvas erzeugter Radialverlauf, dieselbe Technik wie buildCamoTexture in CharacterModel.ts. */
function buildSoftDotTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.6)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 32, 32)
  const texture = new THREE.CanvasTexture(canvas)
  return texture
}

interface Particle {
  sprite: THREE.Sprite
  velocity: THREE.Vector3
  gravity: number
  age: number
  lifetime: number
  startScale: number
  endScale: number
  baseOpacity: number
}

/**
 * Leichtgewichtiges Sprite-basiertes Partikelsystem (Teil: Optik-Politur) - deckt zwei Effekte ab:
 * kurze Staub-Bursts beim Kegel-Einschlag und eine ausdünnende Rollspur hinter der Kugel. Bewusst
 * kein GPU-Partikelsystem/Shader, weil bei dieser Spielgröße (max. ~9 Bursts + eine Spur
 * gleichzeitig) ein einfacher Pool aus THREE.Sprite-Objekten völlig ausreicht und einfacher zu
 * pflegen bleibt.
 */
export class ParticleSystem {
  private scene: THREE.Scene
  private texture = buildSoftDotTexture()
  private active: Particle[] = []
  private trailAccumMs = 0

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  /** Staubwolke am Einschlagpunkt eines gerade umgefallenen Kegels. */
  burstDust(position: THREE.Vector3) {
    const count = 7
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 0.6 + Math.random() * 1.1
      const velocity = new THREE.Vector3(Math.cos(angle) * speed, 1.2 + Math.random() * 1.0, Math.sin(angle) * speed)
      this.spawn(position, velocity, {
        gravity: 3.2,
        lifetime: 0.5 + Math.random() * 0.25,
        color: 0xcfc4a8,
        startScale: 0.05 + Math.random() * 0.03,
        endScale: 0.16 + Math.random() * 0.06,
        opacity: 0.55,
      })
    }
  }

  /** Ein einzelner, schnell verblassender Punkt auf der Rollspur - throttled statt jeden Frame,
   * damit die Spur nicht zu einer durchgehenden dichten Linie verschmilzt. */
  emitTrailPoint(position: THREE.Vector3, dtMs: number) {
    this.trailAccumMs += dtMs
    const intervalMs = 28
    if (this.trailAccumMs < intervalMs) return
    this.trailAccumMs = 0
    this.spawn(position, new THREE.Vector3(0, 0.05, 0), {
      gravity: 0,
      lifetime: 0.35,
      color: 0xffffff,
      startScale: 0.05,
      endScale: 0.02,
      opacity: 0.3,
    })
  }

  private spawn(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    opts: { gravity: number; lifetime: number; color: number; startScale: number; endScale: number; opacity: number },
  ) {
    const material = new THREE.SpriteMaterial({
      map: this.texture,
      color: opts.color,
      transparent: true,
      opacity: opts.opacity,
      depthWrite: false,
    })
    const sprite = new THREE.Sprite(material)
    sprite.position.copy(position)
    sprite.scale.setScalar(opts.startScale)
    this.scene.add(sprite)
    this.active.push({
      sprite,
      velocity,
      gravity: opts.gravity,
      age: 0,
      lifetime: opts.lifetime,
      startScale: opts.startScale,
      endScale: opts.endScale,
      baseOpacity: opts.opacity,
    })
  }

  update(dt: number) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i]
      p.age += dt
      const t = Math.min(p.age / p.lifetime, 1)
      p.velocity.y -= p.gravity * dt
      p.sprite.position.addScaledVector(p.velocity, dt)
      const scale = THREE.MathUtils.lerp(p.startScale, p.endScale, t)
      p.sprite.scale.setScalar(scale)
      const mat = p.sprite.material as THREE.SpriteMaterial
      mat.opacity = (1 - t) * p.baseOpacity
      if (p.age >= p.lifetime) {
        this.scene.remove(p.sprite)
        mat.dispose()
        this.active.splice(i, 1)
      }
    }
  }

  dispose() {
    for (const p of this.active) {
      this.scene.remove(p.sprite)
      ;(p.sprite.material as THREE.SpriteMaterial).dispose()
    }
    this.active = []
    this.texture.dispose()
  }
}
