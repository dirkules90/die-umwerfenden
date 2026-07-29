import { useState } from 'react'

export function ControlsHelp({ className = 'btn secondary' }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        ❓ Steuerung
      </button>
      {open && (
        <div className="round-result-overlay" onClick={() => setOpen(false)}>
          <div
            className="panel"
            style={{ maxWidth: '26rem', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>So wirfst du</h3>
            <p>
              Finger auf die Bahn setzen und nach unten ziehen, dann loslassen. Eine Geste steuert drei Dinge
              gleichzeitig:
            </p>
            <p>
              <strong>↕ Tempo</strong> – wie weit du nach unten ziehst. Kurzer Zug = sanfter Wurf, langer Zug =
              volle Kraft.
            </p>
            <p>
              <strong>↔ Richtung</strong> – wie weit du beim Ziehen seitlich abweichst. Die gestrichelte Linie
              zeigt die Zielrichtung.
            </p>
            <p>
              <strong>🌀 Spin</strong> – ein schneller seitlicher Schwung genau im Moment des Loslassens lässt die
              Kugel im Bogen kurven, statt geradeaus zu rollen.
            </p>
            <p>
              <strong>👉 Nachkorrektur</strong> – während die Kugel rollt, kannst du kurz nach links oder rechts
              wischen, um sie noch etwas zu lenken. Das Budget dafür ist klein und lässt mit dem Ausrollen der
              Kugel nach – ein schlechter Wurf lässt sich damit nur fein korrigieren, nicht retten.
            </p>
            <button className="btn secondary" onClick={() => setOpen(false)}>
              Verstanden
            </button>
          </div>
        </div>
      )}
    </>
  )
}
