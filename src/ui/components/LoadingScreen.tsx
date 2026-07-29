/** Lade-Anzeige statt reinem Text (Teil: UI-Politur) - während Three.js/Rapier.js lazy geladen und
 * initialisiert werden (siehe App.tsx Suspense-Fallbacks). Ein unbestimmter, gleitender Balken statt
 * eines echten Fortschritts, weil der Ladevorgang (Chunk-Download + Physik-Engine-Init) keine
 * zuverlässigen Zwischenstände liefert. */
export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="screen loading-screen">
      <div className="loading-icon" aria-hidden="true">
        🎳
      </div>
      <p className="subtitle">{label}</p>
      <div className="loading-bar">
        <div className="loading-bar-fill" />
      </div>
    </div>
  )
}
