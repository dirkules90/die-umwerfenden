import { useState } from 'react'
import { useGameStore } from '../../state/gameStore'

const REPO_URL = 'https://github.com/dirkules90/die-umwerfenden'
const APP_VERSION = '1.0.0'

export function SettingsScreen() {
  const settings = useGameStore((s) => s.settings)
  const updateSettings = useGameStore((s) => s.updateSettings)
  const resetStatistics = useGameStore((s) => s.resetStatistics)
  const settingsReturnTo = useGameStore((s) => s.settingsReturnTo)
  const goTo = useGameStore((s) => s.goTo)
  const setPauseMenuOpen = useGameStore((s) => s.setPauseMenuOpen)
  const [confirmReset, setConfirmReset] = useState(false)

  function close() {
    if (settingsReturnTo === 'game') setPauseMenuOpen(true)
    goTo(settingsReturnTo)
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

      <div className="panel" style={{ width: '100%', maxWidth: '28rem' }}>
        {!confirmReset ? (
          <button className="btn warn" onClick={() => setConfirmReset(true)}>
            Statistiken zurücksetzen
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <p>Wirklich alle gespeicherten Statistiken löschen?</p>
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
              <button
                className="btn warn"
                onClick={() => {
                  resetStatistics()
                  setConfirmReset(false)
                }}
              >
                Ja, löschen
              </button>
              <button className="btn secondary" onClick={() => setConfirmReset(false)}>
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
