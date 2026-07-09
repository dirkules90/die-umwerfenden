/** Vibration API Wrapper (Teil 2.3): Werfen, „Alle Neune”, Hebel-Ziehen. */
export function vibrate(pattern: number | number[], enabled: boolean) {
  if (!enabled) return
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}
