import { useCallback, useEffect, useRef, useState } from 'react'
import { cosmeticsFor, useGameStore } from '../../state/gameStore'
import { LaneScene } from '../../scene/LaneScene'
import { AVATAR_CONFIGS } from '../../characters/avatarConfigs'
import { useDragShoot } from '../hooks/useDragShoot'
import { useLeverDrag } from '../hooks/useLeverDrag'
import { useSteerDrag } from '../hooks/useSteerDrag'
import { AchievementBanner } from '../components/AchievementBanner'
import { ConfettiOverlay } from '../components/ConfettiOverlay'
import { ControlsHelp } from '../components/ControlsHelp'
import { FullscreenButton } from '../components/FullscreenButton'
import { TannenbaumTree } from '../components/TannenbaumTree'

export function TannenbaumScreen() {
  const session = useGameStore((s) => s.tannenbaumSession)
  const submitTannenbaumThrow = useGameStore((s) => s.submitTannenbaumThrow)
  const pullTannenbaumLever = useGameStore((s) => s.pullTannenbaumLever)
  const tannenbaumLeverAnimationComplete = useGameStore((s) => s.tannenbaumLeverAnimationComplete)
  const tannenbaumBallReturnComplete = useGameStore((s) => s.tannenbaumBallReturnComplete)
  const tannenbaumResult = useGameStore((s) => s.tannenbaumResult)
  const statistics = useGameStore((s) => s.statistics)
  const cosmetics = useGameStore((s) => s.cosmetics)
  const lastGameCoins = useGameStore((s) => s.lastGameCoins)
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

  useEffect(() => {
    if (!canvasRef.current || !session) return
    const scene = new LaneScene(canvasRef.current)
    sceneRef.current = scene
    let cancelled = false
    scene.init().then(() => {
      if (cancelled) return
      const el = containerRef.current
      if (el) scene.resize(el.clientWidth, el.clientHeight)
      scene.setActiveCharacter(AVATAR_CONFIGS[session.playerId], cosmeticsFor(cosmetics, session.playerId).loadout)
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
      submitTannenbaumThrow(result.pinsDown)
    },
    [submitTannenbaumThrow],
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

  const steerDrag = useSteerDrag({
    disabled: !inFlight,
    onSteer: (direction) => sceneRef.current?.setSteerInput(direction),
  })

  const leverDrag = useLeverDrag({
    onProgress: (p) => {
      setLeverProgress(p)
      sceneRef.current?.setLeverProgress(p)
    },
    onComplete: () => {
      pullTannenbaumLever()
      sceneRef.current?.runLeverSequence(
        () => tannenbaumLeverAnimationComplete(),
        () => tannenbaumBallReturnComplete(),
      )
    },
    onSnapBack: () => sceneRef.current?.snapBackLever(),
  })

  useEffect(() => {
    if (session?.phase === 'leverWaiting' && !leverPhaseTriggered.current) {
      leverPhaseTriggered.current = true
      sceneRef.current?.showLeverPhase()
    }
    if (session?.phase !== 'leverWaiting') {
      leverPhaseTriggered.current = false
    }
  }, [session?.phase])

  if (!session) return null

  const playerConfig = AVATAR_CONFIGS[session.playerId]
  const playerStats = statistics[session.playerId]
  const playerCoins = cosmeticsFor(cosmetics, session.playerId).coins

  return (
    <div className="game-root" ref={containerRef}>
      <canvas ref={canvasRef} className="game-canvas" />

      <div className="hud-layer">
        <div className="hud-top-left panel">
          <img className="hud-avatar" src={playerConfig.photoUrl} alt={playerConfig.name} />
          <strong>{playerConfig.name}</strong>
          <span className="hud-coins">🪙 {playerCoins}</span>
        </div>

        <div className="hud-top-mid panel">Wurf {session.throwCount + 1} · Tannenbaum</div>

        <button className="hud-menu-btn" onClick={() => setPauseMenuOpen(true)} aria-label="Menü">
          ☰
        </button>

        <div className="hud-tannenbaum panel">
          <div className="hud-tannenbaum-title">Noch offen</div>
          <TannenbaumTree remaining={session.remaining} compact />
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

        {session.phase === 'idle' && inFlight && (
          <div
            className="steer-touch-zone"
            onPointerDown={steerDrag.onPointerDown}
            onPointerMove={steerDrag.onPointerMove}
            onPointerUp={steerDrag.onPointerUp}
            onPointerLeave={steerDrag.onPointerUp}
          />
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

        {session.phase === 'gameOver' && tannenbaumResult && (
          <div className="game-over-overlay">
            <ConfettiOverlay />
            <h2>Tannenbaum geschafft!</h2>
            <div className="panel" style={{ minWidth: '14rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '2.6rem', fontWeight: 800 }}>{tannenbaumResult.throwCount} Würfe</div>
              {tannenbaumResult.isBest && <div style={{ opacity: 0.9 }}>Neuer Bestwert!</div>}
              {!tannenbaumResult.isBest && playerStats?.bestTannenbaum !== null && playerStats?.bestTannenbaum !== undefined && (
                <div style={{ opacity: 0.8 }}>Bestwert: {playerStats.bestTannenbaum} Würfe</div>
              )}
              {lastGameCoins !== null && (
                <div style={{ color: '#ffd75e' }}>
                  +{lastGameCoins} 🪙 verdient · {playerCoins} 🪙 gesamt
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button className="btn" onClick={() => goTo('modeSelect')}>
                Nochmal
              </button>
              <button className="btn secondary" onClick={() => goTo('leaderboard')}>
                Bestenliste
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
              <button className="btn secondary" onClick={() => openSettings('tannenbaum')}>
                Einstellungen
              </button>
              <ControlsHelp />
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
