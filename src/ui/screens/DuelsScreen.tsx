import { useEffect, useMemo, useState } from 'react'
import { useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../../characters/avatarConfigs'
import { AmbientBackground } from '../components/AmbientBackground'
import { formatPoints } from '../formatPoints'
import type { Duel, DuelMode, DuelSplitMode } from '../../backend/duels'
import type { CharacterId } from '../../game/types'

const MODE_LABELS: Record<DuelMode, string> = {
  hausnummer_hoch: 'Hohe Hausnummer',
  hausnummer_niedrig: 'Niedrige Hausnummer',
  tannenbaum: 'Tannenbaum',
}

const SPLIT_LABELS: Record<DuelSplitMode, string> = {
  winner_takes_all: 'Gewinner bekommt alles',
  top2: 'Top 2 teilen sich den Pott',
  top3: 'Top 3 teilen sich den Pott',
}

function formatScore(mode: DuelMode, score: number | null): string {
  if (score === null) return '–'
  return mode === 'tannenbaum' ? `${score} Würfe` : String(score).padStart(3, '0')
}

/** Zeigt fremde Ergebnisse erst, wenn das ganze Duell abgeschlossen ist (Teil: Online-Duelle) -
 * sonst hätte, wer als Letztes dran ist, einen Taktik-Vorteil (z. B. bei "Niedrige Hausnummer"
 * gezielt knapp unter den schon bekannten Bestwert zielen). Der eigene Score ist davon ausgenommen,
 * der war ja ohnehin schon bekannt. */
function participantScoreLabel(duel: Duel, p: Duel['participants'][number], viewerId: CharacterId): string {
  if (p.response === 'declined') return 'abgelehnt'
  if (p.response === 'pending') return 'wartet…'
  if (p.score === null) return '–'
  const isOwnRow = p.character_id === viewerId
  if (!isOwnRow && duel.status !== 'completed') return '🔒 verdeckt'
  return formatScore(duel.mode, p.score)
}

/** Zentraler Duelle-Bildschirm (Teil: Online-Duelle) - eine flache Liste statt getrennter Tabs für
 * "offen/aktiv/fertig", weil bei einer 6er-Gruppe ohnehin nur wenige Duelle gleichzeitig laufen und
 * eine Liste mit klarer pro-Zeile-Handlung übersichtlicher ist als mehrere fast leere Tabs. */
export function DuelsScreen() {
  const duelsPlayer = useGameStore((s) => s.duelsPlayer)
  const duels = useGameStore((s) => s.duels)
  const duelsLoading = useGameStore((s) => s.duelsLoading)
  const duelError = useGameStore((s) => s.duelError)
  const walletBalances = useGameStore((s) => s.walletBalances)
  const walletBalancesLoading = useGameStore((s) => s.walletBalancesLoading)
  const goTo = useGameStore((s) => s.goTo)
  const requireLogin = useGameStore((s) => s.requireLogin)
  const loadDuels = useGameStore((s) => s.loadDuels)
  const loadWalletBalances = useGameStore((s) => s.loadWalletBalances)
  const createDuelRequest = useGameStore((s) => s.createDuelRequest)
  const respondToDuelRequest = useGameStore((s) => s.respondToDuelRequest)
  const cancelDuelRequest = useGameStore((s) => s.cancelDuelRequest)
  const dismissDuelNotification = useGameStore((s) => s.dismissDuelNotification)
  const startDuelGame = useGameStore((s) => s.startDuelGame)

  const [showCreate, setShowCreate] = useState(false)
  const [opponents, setOpponents] = useState<CharacterId[]>([])
  const [mode, setMode] = useState<DuelMode>('hausnummer_hoch')
  const [splitMode, setSplitMode] = useState<DuelSplitMode>('winner_takes_all')
  const [stake, setStake] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (duelsPlayer) {
      void loadDuels()
      void loadWalletBalances()
    } else {
      requireLogin('duels')
    }
  }, [duelsPlayer, loadDuels, loadWalletBalances, requireLogin])

  const sorted = useMemo(() => {
    function rank(d: Duel): number {
      const mine = d.participants.find((p) => p.character_id === duelsPlayer)
      if (d.status === 'pending' && mine?.response === 'pending') return 0
      if (d.status === 'accepted' && mine?.score === null) return 1
      if (d.status === 'pending') return 2
      if (d.status === 'accepted') return 3
      return 4
    }
    return [...duels].sort((a, b) => rank(a) - rank(b))
  }, [duels, duelsPlayer])

  // Echte (Backend-)Kontostände statt lokaler cosmetics.coins (Teil: Online-Duelle) - ein Gegner
  // kennt diesen Browser/dieses Gerät vielleicht gar nicht, lokale Daten für ihn wären also
  // schlicht falsch. walletBalances === null heißt "noch nicht geladen", nicht "0 Münzen".
  const walletsReady = walletBalances !== null
  const coins = duelsPlayer && walletBalances ? (walletBalances[duelsPlayer] ?? 0) : 0
  // Höchster Einsatz, den JEDER Teilnehmer sich leisten kann (Teil: Duell-Formular) - ohne
  // ausgewählte Gegner nur durch den eigenen Kontostand begrenzt, mit Gegnern zusätzlich durch
  // deren echten Kontostand, siehe Nutzer-Feedback "Schieberegler soll sich auf das Minimum aller
  // Beteiligten anpassen".
  const maxStake = opponents.reduce((max, id) => Math.min(max, walletBalances?.[id] ?? 0), coins)

  // Beim Öffnen des Formulars (oder sobald die echten Kontostände nachträglich eintreffen) startet
  // der Regler auf dem vollen aktuellen Maximum (Teil: Duell-Formular) - der zweite Fall ist
  // wichtig, falls das Formular schon offen war, BEVOR loadWalletBalances fertig war: sonst bliebe
  // stake für immer bei seinem Platzhalter-Wert von 0 hängen, weil der separate Clamp-Effekt unten
  // nur nach UNTEN kappt, nie von selbst wieder hochsetzt. Danach nur noch nach unten gekappt, wenn
  // das Maximum durch eine Gegner-Auswahl sinkt, nie automatisch wieder hochgesetzt.
  useEffect(() => {
    if (showCreate && walletsReady) setStake(maxStake)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreate, walletsReady])

  useEffect(() => {
    setStake((s) => Math.min(s, maxStake))
  }, [maxStake])

  if (!duelsPlayer) return null

  const totalParticipants = opponents.length + 1
  const splitOptions: DuelSplitMode[] = ['winner_takes_all']
  if (totalParticipants >= 4) splitOptions.push('top2')
  if (totalParticipants >= 5) splitOptions.push('top3')

  const notifications = duels.filter(
    (d) => d.status === 'completed' && d.participants.some((p) => p.character_id === duelsPlayer && !p.seen),
  )

  const otherCharacters = CHARACTER_ORDER.filter((id) => id !== duelsPlayer)

  async function handleCreate() {
    if (opponents.length === 0 || stake <= 0) return
    setBusy(true)
    const ok = await createDuelRequest({ opponentIds: opponents, mode, stake, splitMode })
    setBusy(false)
    if (ok) {
      setShowCreate(false)
      setOpponents([])
      setSplitMode('winner_takes_all')
    }
  }

  return (
    <div className="screen">
      <AmbientBackground />
      <button className="btn secondary screen-nav" onClick={() => goTo('start')}>
        ← Zurück
      </button>
      <div className="shop-coins panel">🪙 {walletsReady ? coins : '…'}</div>
      <div className="shop-title-row">
        <img className="hud-avatar" src={AVATAR_CONFIGS[duelsPlayer].photoUrl} alt={AVATAR_CONFIGS[duelsPlayer].name} />
        <h2 style={{ margin: 0 }}>Duelle von {AVATAR_CONFIGS[duelsPlayer].name}</h2>
      </div>

      {notifications.map((d) => {
        const mine = d.participants.find((p) => p.character_id === duelsPlayer)!
        const won = (mine.payout ?? 0) > 0
        return (
          <div key={d.id} className="panel duel-notification">
            <div>
              {won ? '🎉' : '😬'} <strong>Duell entschieden:</strong> {MODE_LABELS[d.mode]} –{' '}
              {won ? `+${mine.payout} 🪙 gewonnen!` : `${mine.payout} 🪙 verloren.`}
            </div>
            <button className="btn secondary" onClick={() => void dismissDuelNotification(d.id)}>
              Ok
            </button>
          </div>
        )
      })}

      {duelError && <p style={{ color: '#ff8a80' }}>{duelError}</p>}

      {!showCreate && (
        <button className="btn" onClick={() => setShowCreate(true)}>
          ⚔️ Neues Duell
        </button>
      )}

      {showCreate && (
        <div className="panel duel-create-panel">
          <h3 style={{ marginTop: 0 }}>Neues Duell</h3>

          {!walletsReady ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <p className="subtitle" style={{ margin: 0 }}>
                {walletBalancesLoading ? 'Lade Kontostände…' : 'Kontostände konnten nicht geladen werden.'}
              </p>
              <button className="btn secondary" onClick={() => void loadWalletBalances()}>
                Erneut versuchen
              </button>
              <button className="btn secondary" onClick={() => setShowCreate(false)}>
                Abbrechen
              </button>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '0.8rem', opacity: 0.75, margin: '0 0 0.6rem' }}>
                Gegner auswählen (mehrere möglich):
              </p>
              <div className="duel-opponent-row">
                {otherCharacters.map((id) => {
                  const opponentCoins = walletBalances[id] ?? 0
                  const disabled = opponentCoins <= 0
                  return (
                    <button
                      key={id}
                      className={`char-tile ${opponents.includes(id) ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                      disabled={disabled}
                      title={disabled ? `${AVATAR_CONFIGS[id].name} hat keine Münzen` : undefined}
                      onClick={() =>
                        setOpponents((prev) => (prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]))
                      }
                    >
                      <img src={AVATAR_CONFIGS[id].photoUrl} alt={AVATAR_CONFIGS[id].name} />
                      <span className="name">{AVATAR_CONFIGS[id].name}</span>
                      {disabled && <span className="duel-opponent-zero">0 🪙</span>}
                    </button>
                  )
                })}
              </div>

              <div className="duel-form-row">
            <label>Spielmodus</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as DuelMode)}>
              {(Object.keys(MODE_LABELS) as DuelMode[]).map((m) => (
                <option key={m} value={m}>
                  {MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </div>

          <div className="duel-form-row duel-form-row--stake">
            <label>Einsatz je Teilnehmer</label>
            <div className="duel-stake-slider">
              <input
                type="range"
                min={0}
                max={Math.max(maxStake, 1)}
                value={Math.min(stake, maxStake)}
                disabled={maxStake <= 0}
                onChange={(e) => setStake(Number(e.target.value))}
              />
              <strong>{stake} 🪙</strong>
            </div>
          </div>
          {maxStake <= 0 && (
            <p style={{ fontSize: '0.75rem', color: '#ff8a80', margin: 0 }}>
              Kein Einsatz möglich - {opponents.length > 0 ? 'ein ausgewählter Gegner hat' : 'du hast'} 0 Münzen.
            </p>
          )}
          {opponents.length === 0 && maxStake > 0 && (
            <p style={{ fontSize: '0.75rem', color: '#ffd75e', margin: 0 }}>
              Bitte mindestens einen Gegner oben antippen, um ihn auszuwählen.
            </p>
          )}

          {splitOptions.length > 1 && (
            <div className="duel-form-row">
              <label>Pott-Aufteilung</label>
              <select
                value={splitMode}
                onChange={(e) => setSplitMode(e.target.value as DuelSplitMode)}
              >
                {splitOptions.map((s) => (
                  <option key={s} value={s}>
                    {SPLIT_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>
            Pott bei Annahme aller: {stake * totalParticipants} 🪙 ({totalParticipants} Teilnehmer × {stake})
          </p>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="btn" disabled={busy || opponents.length === 0 || stake <= 0} onClick={handleCreate}>
              Herausfordern
            </button>
            <button className="btn secondary" onClick={() => setShowCreate(false)}>
              Abbrechen
            </button>
          </div>
            </>
          )}
        </div>
      )}

      {duelsLoading && <p className="subtitle">Lade Duelle…</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%', maxWidth: '32rem' }}>
        {sorted.length === 0 && !duelsLoading && <p className="subtitle">Noch keine Duelle. Fordere jemanden heraus!</p>}
        {sorted.map((d) => {
          const mine = d.participants.find((p) => p.character_id === duelsPlayer)
          if (!mine) return null
          const others = d.participants.filter((p) => p.character_id !== duelsPlayer)

          return (
            <div key={d.id} className="panel duel-card">
              <div className="duel-card-header">
                <strong>{MODE_LABELS[d.mode]}</strong>
                <span>
                  {d.stake} 🪙 · {SPLIT_LABELS[d.split_mode]}
                </span>
              </div>
              <div className="duel-card-participants">
                {d.participants.map((p) => (
                  <div key={p.character_id} className="duel-participant-row">
                    <img src={AVATAR_CONFIGS[p.character_id].photoUrl} alt="" />
                    <span>{AVATAR_CONFIGS[p.character_id].name}</span>
                    <span style={{ opacity: 0.7 }}>{participantScoreLabel(d, p, duelsPlayer)}</span>
                    {p.payout !== null && (
                      <strong style={{ color: p.payout >= 0 ? '#7cffb0' : '#ff8a80' }}>
                        {p.payout >= 0 ? '+' : ''}
                        {formatPoints(p.payout)} 🪙
                      </strong>
                    )}
                  </div>
                ))}
              </div>

              {d.status === 'pending' && mine.response === 'pending' && (
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button className="btn" onClick={() => void respondToDuelRequest(d.id, true)}>
                    Annehmen ({d.stake} 🪙)
                  </button>
                  <button className="btn secondary" onClick={() => void respondToDuelRequest(d.id, false)}>
                    Ablehnen
                  </button>
                </div>
              )}
              {d.status === 'pending' && mine.is_challenger && (
                <button className="btn secondary" onClick={() => void cancelDuelRequest(d.id)}>
                  Duell abbrechen
                </button>
              )}
              {d.status === 'pending' && !mine.is_challenger && mine.response === 'accepted' && (
                <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: 0 }}>
                  Warte auf Zusage von {others.filter((o) => o.response === 'pending').map((o) => AVATAR_CONFIGS[o.character_id].name).join(', ')}
                </p>
              )}
              {d.status === 'accepted' && mine.score === null && (
                <button className="btn" onClick={() => startDuelGame(d)}>
                  Jetzt spielen
                </button>
              )}
              {d.status === 'accepted' && mine.score !== null && (
                <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: 0 }}>Gespielt, warte auf Gegner…</p>
              )}
              {d.status === 'declined' && <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: 0 }}>Abgelehnt.</p>}
              {d.status === 'cancelled' && <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: 0 }}>Abgebrochen.</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
