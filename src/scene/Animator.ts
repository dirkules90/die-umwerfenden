export type Easing = (t: number) => number

export const easeInOutCubic: Easing = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
export const easeOutBack: Easing = (t) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}
export const linear: Easing = (t) => t

interface ActiveTween {
  elapsed: number
  duration: number
  easing: Easing
  onUpdate: (t: number) => void
  onComplete?: () => void
}

/** Minimaler, framework-freier Tween-Scheduler für Kamera-, Hebel- und Kegelanimationen. */
export class Animator {
  private tweens: ActiveTween[] = []

  play(duration: number, onUpdate: (t: number) => void, onComplete?: () => void, easing: Easing = easeInOutCubic) {
    this.tweens.push({ elapsed: 0, duration: Math.max(duration, 0.001), easing, onUpdate, onComplete })
  }

  update(dt: number) {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i]
      tw.elapsed += dt
      const rawT = Math.min(tw.elapsed / tw.duration, 1)
      tw.onUpdate(tw.easing(rawT))
      if (rawT >= 1) {
        this.tweens.splice(i, 1)
        tw.onComplete?.()
      }
    }
  }

  clear() {
    this.tweens = []
  }
}
