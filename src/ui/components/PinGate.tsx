import { useState } from 'react'
import { useGameStore } from '../../state/gameStore'
import type { CharacterId } from '../../game/types'

interface PinGateProps {
  characterId: CharacterId
  characterName: string
  onSuccess: () => void
  onCancel: () => void
}

const pinInputStyle = {
  padding: '0.6rem',
  borderRadius: '10px',
  border: 'none',
  fontSize: '1.4rem',
  letterSpacing: '0.4rem',
  textAlign: 'center' as const,
  width: '8rem',
}

// Eigener, schmalerer Stil für die Ändern-Ansicht: die große Ziffernschrift + Buchstabenabstand
// von pinInputStyle ist für einzelne Ziffern gedacht, schneidet aber die längeren Platzhalter-
// Texte ("Aktuelle PIN" etc.) dieser Felder ab.
const changePinInputStyle = {
  padding: '0.6rem',
  borderRadius: '10px',
  border: 'none',
  fontSize: '1rem',
  textAlign: 'center' as const,
  width: '11rem',
}

/** PIN-Abfrage vor Spielstart (Teil: Charakter-PIN, Vorstufe für den Kosmetik-Shop): jeder
 * Charakter startet mit 0000 und sollte sie beim ersten Mal auf eine persönliche PIN ändern.
 * Wie das Reset-Passwort keine echte Sicherheit, nur eine Hürde gegen "aus Versehen einen
 * fremden Charakter spielen". */
export function PinGate({ characterId, characterName, onSuccess, onCancel }: PinGateProps) {
  const verifyPin = useGameStore((s) => s.verifyPin)
  const changePin = useGameStore((s) => s.changePin)
  const [mode, setMode] = useState<'enter' | 'change'>('enter')
  const [pin, setPin] = useState('')
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')

  function confirmEnter() {
    if (verifyPin(characterId, pin)) {
      onSuccess()
    } else {
      setError('Falsche PIN.')
      setPin('')
    }
  }

  function saveNewPin() {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setError('Neue PIN muss 4 Ziffern haben.')
      return
    }
    if (newPin !== confirmPin) {
      setError('Neue PIN stimmt nicht überein.')
      return
    }
    if (!changePin(characterId, oldPin, newPin)) {
      setError('Aktuelle PIN ist falsch.')
      return
    }
    onSuccess()
  }

  return (
    <div className="round-result-overlay" onClick={onCancel}>
      <div className="panel" style={{ maxWidth: '22rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        {mode === 'enter' ? (
          <>
            <h3 style={{ marginTop: 0 }}>PIN von {characterName}</h3>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="0000"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                setError('')
              }}
              style={pinInputStyle}
              autoFocus
            />
            {error && (
              <p style={{ color: '#ff8a80', margin: '0.6rem 0 0' }}>
                {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '0.9rem' }}>
              <button className="btn" onClick={confirmEnter}>
                Bestätigen
              </button>
              <button className="btn secondary" onClick={onCancel}>
                Abbrechen
              </button>
            </div>
            <button
              className="btn secondary"
              style={{ marginTop: '0.8rem', fontSize: '0.8rem' }}
              onClick={() => {
                setMode('change')
                setError('')
              }}
            >
              PIN ändern
            </button>
          </>
        ) : (
          <>
            <h3 style={{ marginTop: 0 }}>PIN von {characterName} ändern</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'center' }}>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Aktuelle PIN"
                value={oldPin}
                onChange={(e) => {
                  setOldPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                  setError('')
                }}
                style={changePinInputStyle}
                autoFocus
              />
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Neue PIN"
                value={newPin}
                onChange={(e) => {
                  setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                  setError('')
                }}
                style={changePinInputStyle}
              />
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Neue PIN bestätigen"
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                  setError('')
                }}
                style={changePinInputStyle}
              />
            </div>
            {error && <p style={{ color: '#ff8a80', margin: '0.6rem 0 0' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '0.9rem' }}>
              <button className="btn" onClick={saveNewPin}>
                Speichern &amp; spielen
              </button>
              <button
                className="btn secondary"
                onClick={() => {
                  setMode('enter')
                  setError('')
                }}
              >
                Zurück
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
