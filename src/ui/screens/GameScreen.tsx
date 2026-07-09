import { useCallback, useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../state/gameStore'
import { LaneScene } from '../../scene/LaneScene'
import { AVATAR_CONFIGS } from '../../characters/avatarConfigs'
import { currentPlayer } from '../../game/gameStateMachine'
import { DIGIT_SLOTS, freeSlots } from '../../game/houseNumberRules'
import { computeRanking } from '../../game/scoring'
import { useDragShoot } from '../hooks/useDragShoot'
import { useLeverDrag } from '../hooks/useLeverDrag'
import { AchievementBanner } from '../components/AchievementBanner'
import { ConfettiOverlay } from '../components/ConfettiOverlay'
import { FullscreenButton } from '../components/FullscreenButton'
import type { DigitSlot } from '../../game/types'

const SLOT_LABELS: Record<DigitSlot, string> = { hundert: 'Hunderter', zehn: 'Zehner', einer: 'Einer' }

export function GameScreen() {
  const session = useGameStore((s) => s.session)
  const submitThrowResult = useGameStore((s) => s.submitThrowResult)
  const chooseDigit = useGameStore((s) => s.chooseDigit)
  const pullLever = useGameStore((s) => s.pullLever)
  const leverAnimationComplete = useGameStore((s) => s.leverAnimationComplete)
  const ballReturnComplete = useGameStore((s) => s.ballReturnComplete)
  const advanceAfterSwitch = useGameStore((s) => s.advanceAfterSwitch)
  const finalRanking = useGameStore((s) => s.finalRanking)
  const lastRoundResult = useGameStore((s) => s.lastRoundResult)
  const goTo = useGameStore((s) => s.goTo)
  const backToStartFromGameOver = useGameStore((s) => s.backToStartFromGameOver)
  const pauseMenuOpen = useGameStore((s) => s.pauseMenuOpen)
  const setPauseMenuOpen = useGameStore((s) => s.setPauseMenuOpen)
  const openSettings = useGameStore((s) => s.openSettings)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<LaneScene | null>(null)
  const [sceneReady, setSceneReady] = useState(false)
  const [inFlight, setInFlight] = useState(false)
  const [leverProgress, setLeverProgress] = useState(0)
  const leverPhaseTriggered = useRef(false)

  // Szenen-Lebenszyklus, entkoppelt vom React-Renderzyklus (Teil 17.2).
  useEffect(() => {
    if (!canvasRef.current || !session) return
    const scene = new LaneScene(canvasRef.current)
    sceneRef.current = scene
    let cancelled = false
    scene.init().then(() => {
      if (cancelled) return
      const el = containerRef.current
      if (el) scene.resize(el.clientWidth, el.clientHeight)
      scene.setActiveCharacter(AVATAR_CONFIGS[currentPlayer(session)])
      setSceneReady(true)
    })
    return () => {
      cancelled = true
      scene.dispose()
      sceneRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      sceneRef.current?.resize(el.clientWidth, el.clientHeight)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Testfall T11: bei Hochformat pausiert das Spiel, bis wieder gedreht wird.
  useEffect(() => {
    const mql = window.matchMedia('(orientation: portrait)')
    const apply = () => {
      if (mql.matches) sceneRef.current?.pause()
      else sceneRef.current?.resume()
    }
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [])

  const handleThrowSettled = useCallback(
    (result: { pinsDown: number; isGutter: boolean }) => {
      setInFlight(false)
      submitThrowResult(result.pinsDown, result.isGutter)
    },
    [submitThrowResult],
  )

  const dragShoot = useDragShoot({
    disabled: !sceneReady || !session || session.phase !== 'idle' || inFlight,
    onAimStart: () => {
      if (!sceneRef.current || !session) return
      sceneRef.current.resetBall()
      sceneRef.current.beginAimPhase()
    },
    onAimUpdate: (pull, angle) => sceneRef.current?.updateAim(pull, angle),
    onRelease: (power, angle, spin) => {
      if (!sceneRef.current) return
      setInFlight(true)
      sceneRef.current.releaseThrow(power, angle, spin, handleThrowSettled)
    },
    onCancel: () => {
      sceneRef.current?.beginAimPhase()
      sceneRef.current?.updateAim(0, 0)
    },
  })

  const leverDrag = useLeverDrag({
    onProgress: (p) => {
      setLeverProgress(p)
      sceneRef.current?.setLeverProgress(p)
    },
    onComplete: () => {
      pullLever()
      sceneRef.current?.runLeverSequence(
        () => leverAnimationComplete(),
        () => ballReturnComplete(),
      )
    },
    onSnapBack: () => sceneRef.current?.snapBackLever(),
  })

  // Kamera zur Hebel-Station schwenken, sobald die Phase erreicht wird.
  useEffect(() => {
    if (session?.phase === 'leverWaiting' && !leverPhaseTriggered.current) {
      leverPhaseTriggered.current = true
      sceneRef.current?.showLeverPhase()
    }
    if (session?.phase !== 'leverWaiting') {
      leverPhaseTriggered.current = false
    }
  }, [session?.phase])

  // Spielerwechsel: nächsten Avatar einsetzen und nach kurzer Pause fortfahren.
  useEffect(() => {
    if (session?.phase !== 'playerSwitch') return
    const nextConfig = AVATAR_CONFIGS[currentPlayer(session)]
    sceneRef.current?.setActiveCharacter(nextConfig)
    const t = window.setTimeout(() => advanceAfterSwitch(), 900)
    return () => window.clearTimeout(t)
  }, [session, advanceAfterSwitch])

  if (!session) return null

  const player = currentPlayer(session)
  const playerConfig = AVATAR_CONFIGS[player]
  const openSlots = freeSlots(session.currentDigits)
  const liveRanking = computeRanking(session.results, session.mode).slice(0, 4)

  return (
    <div className="game-root" ref={containerRef}>
      <canvas ref={canvasRef} className="game-canvas" />

      <div className="hud-layer">
        <div className="hud-top-left panel">
          <strong>{playerConfig.name}</strong>
          <span style={{ opacity: 0.8 }}>
            · Runde {session.currentRoundIndex + 1}/{session.totalRounds}
          </span>
        </div>

        <div className="hud-top-mid panel">Wurf {session.currentThrowIndex + 1} von 3</div>

        <div className="hud-top-right panel">
          {DIGIT_SLOTS.map((slot) => (
            <span key={slot} style={{ marginLeft: 6, fontWeight: 700 }}>
              {session.currentDigits[slot] ?? '–'}
            </span>
          ))}
        </div>

        <button className="hud-menu-btn" onClick={() => setPauseMenuOpen(true)} aria-label="Menü">
          ☰
        </button>

        <div className="hud-ranking panel">
          {liveRanking.length === 0 && <div style={{ opacity: 0.7 }}>Noch keine Ergebnisse</div>}
          {liveRanking.map((r, i) => (
            <div className="hud-ranking-row" key={r.playerId}>
              <span>
                {i + 1}. {AVATAR_CONFIGS[r.playerId].name}
              </span>
              <span>{r.total}</span>
            </div>
          ))}
        </div>

        {session.phase === 'idle' && !inFlight && (
          <>
            <div
              className="throw-touch-zone"
              onPointerDown={(e) => dragShoot.onPointerDown(e, containerRef.current!)}
              onPointerMove={dragShoot.onPointerMove}
              onPointerUp={dragShoot.onPointerUp}
            />
            <div className="power-meter-wrap">
              <div className="power-meter-fill" style={{ height: `${dragShoot.aim.pullFraction * 100}%` }} />
            </div>
          </>
        )}

        {session.phase === 'digitChoice' && session.pendingDigit !== null && (
          <div className="digit-choice-overlay">
            <div className="panel">
              <p>Geworfene Ziffer</p>
              <div style={{ fontSize: '3rem', fontWeight: 800 }}>{session.pendingDigit}</div>
            </div>
            <div className="digit-slots">
              {DIGIT_SLOTS.map((slot) => (
                <button
                  key={slot}
                  className="digit-slot-btn"
                  disabled={!openSlots.includes(slot)}
                  onClick={() => chooseDigit(slot)}
                >
                  <span>{session.currentDigits[slot] ?? session.pendingDigit}</span>
                  <span className="digit-slot-label">{SLOT_LABELS[slot]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {session.phase === 'leverWaiting' && (
          <div className="lever-overlay">
            <p className="panel">Hebel ziehen, um die Kegel aufzustellen</p>
            <div
              className="lever-drag-zone"
              onPointerDown={(e) => leverDrag.onPointerDown(e, e.currentTarget)}
              onPointerMove={leverDrag.onPointerMove}
              onPointerUp={leverDrag.onPointerUp}
            >
              <div className="lever-grip" style={{ transform: `translateY(${leverProgress * 180}px)` }} />
            </div>
          </div>
        )}

        {session.phase === 'playerSwitch' && (
          <div className="round-result-overlay">
            {lastRoundResult && (
              <div className="panel">
                {AVATAR_CONFIGS[lastRoundResult.playerId].name} erzielt die Hausnummer{' '}
                <strong>{String(lastRoundResult.houseNumber).padStart(3, '0')}</strong>
              </div>
            )}
            <div className="panel">
              Am Zug: <strong>{playerConfig.name}</strong>
            </div>
          </div>
        )}

        {session.phase === 'gameOver' && finalRanking && (
          <div className="game-over-overlay">
            <ConfettiOverlay />
            <h2>Partie beendet!</h2>
            <div className="panel" style={{ minWidth: '18rem' }}>
              {finalRanking.map((r, i) => (
                <div key={r.playerId} className="hud-ranking-row" style={{ fontSize: '1.1rem' }}>
                  <span>
                    {i + 1}. {AVATAR_CONFIGS[r.playerId].name}
                  </span>
                  <span>{r.total}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button className="btn" onClick={() => goTo('playerSelect')}>
                Neue Partie
              </button>
              <button className="btn secondary" onClick={() => goTo('statistics')}>
                Statistik
              </button>
              <button className="btn secondary" onClick={backToStartFromGameOver}>
                Zum Start
              </button>
            </div>
          </div>
        )}

        {pauseMenuOpen && (
          <div className="round-result-overlay">
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <h3 style={{ margin: 0 }}>Pause</h3>
              <button className="btn" onClick={() => setPauseMenuOpen(false)}>
                Fortsetzen
              </button>
              <button className="btn secondary" onClick={() => openSettings('game')}>
                Einstellungen
              </button>
              <FullscreenButton />
              <button
                className="btn warn"
                onClick={() => {
                  setPauseMenuOpen(false)
                  backToStartFromGameOver()
                }}
              >
                Partie beenden
              </button>
            </div>
          </div>
        )}

        <AchievementBanner />
      </div>
    </div>
  )
}
