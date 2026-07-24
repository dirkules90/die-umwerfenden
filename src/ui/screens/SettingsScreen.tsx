import { useState } from 'react'
import { useGameStore } from '../../state/gameStore'

const REPO_URL = 'https://github.com/dirkules90/die-umwerfenden'
const APP_VERSION = '1.0.0'
// Kein echter Sicherheitsschutz (rein clientseitig, im Quelltext sichtbar) - dient nur als
// kleine Hürde gegen versehentliches oder spaßeshalber ausgelöstes Zurücksetzen durch Mitspieler.
const RESET_PASSWORD = 'FCBayern'

type ResetMode = 'none' | 'today' | 'all'

export function SettingsScreen() {
  const settings = useGameStore((s) => s.settings)
  const updateSettings = useGameStore((s) => s.updateSettings)
  const resetTodayOnly = useGameStore((s) => s.resetTodayOnly)
  const resetStatistics = useGameStore((s) => s.resetStatistics)
  const settingsReturnTo = useGameStore((s) => s.settingsReturnTo)
  const goTo = useGameStore((s) => s.goTo)
  const setPauseMenuOpen = useGameStore((s) => s.setPauseMenuOpen)
  const [resetMode, setResetMode] = useState<ResetMode>('none')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  function close() {
    if (settingsReturnTo === 'game' || settingsReturnTo === 'tannenbaum') setPauseMenuOpen(true)
    goTo(settingsReturnTo)
  }

  function cancelReset() {
    setResetMode('none')
    setPassword('')
    setPasswordError(false)
  }

  function confirmReset() {
    if (password !== RESET_PASSWORD) {
      setPasswordError(true)
      return
    }
    if (resetMode === 'today') resetTodayOnly()
    else if (resetMode === 'all') resetStatistics()
    cancelReset()
  }

  return (
    <div className="screen">
      <button className="btn secondary screen-nav" onClick={close}>
        ← Zurück
      </button>
      <h2 style={{ margin: 0 }}>Einstellungen</h2>

      <div className="panel" style={{ width: '100%', maxWidth: '28rem' }}>
        <div className="settings-row">
          <label htmlFor="music">Musiklautstärke</label>
          <input
            id="music"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.musicVolume}
            onChange={(e) => updateSettings({ musicVolume: Number(e.target.value) })}
          />
        </div>
        <div className="settings-row">
          <label htmlFor="sfx">Effektlautstärke</label>
          <input
            id="sfx"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.sfxVolume}
            onChange={(e) => updateSettings({ sfxVolume: Number(e.target.value) })}
          />
        </div>
        <div className="settings-row">
          <label htmlFor="haptics">Haptisches Feedback</label>
          <input
            id="haptics"
            type="checkbox"
            checked={settings.hapticsEnabled}
            onChange={(e) => updateSettings({ hapticsEnabled: e.target.checked })}
          />
        </div>
      </div>

      <div className="panel" style={{ width: '100%', maxWidth: '28rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {resetMode === 'none' ? (
          <>
            <button className="btn warn" onClick={() => setResetMode('today')}>
              Heutige Daten zurücksetzen
            </button>
            <button className="btn warn" onClick={() => setResetMode('all')}>
              Alles zurücksetzen (inkl. Allzeit)
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <p style={{ margin: 0 }}>
              {resetMode === 'today'
                ? 'Wirklich die heutigen Punkte und Tageswerte löschen? Statistik und Allzeit-Bestenliste bleiben erhalten.'
                : 'Wirklich ALLES löschen? Statistik, heutige Punkte und Allzeit-Bestenliste sind dann unwiderruflich weg.'}
            </p>
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setPasswordError(false)
              }}
              style={{ padding: '0.6rem', borderRadius: '10px', border: 'none', fontSize: '1rem', textAlign: 'center' }}
            />
            {passwordError && <p style={{ color: '#ff8a80', margin: 0 }}>Falsches Passwort.</p>}
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
              <button className="btn warn" onClick={confirmReset}>
                Ja, löschen
              </button>
              <button className="btn secondary" onClick={cancelReset}>
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="subtitle">
        Alle Spielerdaten verbleiben ausschließlich lokal auf diesem Gerät (LocalStorage). Es gibt keine
        Cloud-Synchronisierung und kein Login.
      </p>
      <p className="subtitle">
        Version {APP_VERSION} · <a style={{ color: 'inherit' }} href={REPO_URL} target="_blank" rel="noreferrer">GitHub-Repository</a>
      </p>
    </div>
  )
}
