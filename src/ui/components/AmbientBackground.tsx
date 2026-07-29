/** Leise driftende, weich verlaufende Farbflecken hinter dem Menü-Inhalt (Teil: UI-Modernisierung) -
 * genau das "es bewegt sich immer etwas"-Gefühl moderner Apps, aber bewusst dezent (niedrige
 * Deckkraft, sehr langsame Loops) statt vom eigentlichen Inhalt abzulenken. Rein CSS-animiert
 * (kein Canvas/WebGL nötig für ein statisches Menü), respektiert prefers-reduced-motion (siehe
 * index.css). Nicht interaktiv, daher aria-hidden und pointer-events: none. */
export function AmbientBackground() {
  return (
    <div className="ambient-bg" aria-hidden="true">
      <span className="ambient-blob ambient-blob-a" />
      <span className="ambient-blob ambient-blob-b" />
      <span className="ambient-blob ambient-blob-c" />
    </div>
  )
}
