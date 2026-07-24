import { lazy, Suspense } from 'react'
import { useGameStore } from './state/gameStore'
import { StartScreen } from './ui/screens/StartScreen'
import { PlayerSelectScreen } from './ui/screens/PlayerSelectScreen'
import { ModeSelectScreen } from './ui/screens/ModeSelectScreen'
import { LeaderboardScreen } from './ui/screens/LeaderboardScreen'
import { AllTimeScreen } from './ui/screens/AllTimeScreen'
import { SettingsScreen } from './ui/screens/SettingsScreen'

// 3D-/Physik-Stack (Three.js + Rapier.js) erst laden, wenn tatsächlich gespielt wird (Teil 16.2).
const GameScreen = lazy(() => import('./ui/screens/GameScreen').then((m) => ({ default: m.GameScreen })))
const TannenbaumScreen = lazy(() =>
  import('./ui/screens/TannenbaumScreen').then((m) => ({ default: m.TannenbaumScreen })),
)

function ScreenRouter() {
  const screen = useGameStore((s) => s.screen)
  switch (screen) {
    case 'start':
      return <StartScreen />
    case 'playerSelect':
      return <PlayerSelectScreen />
    case 'modeSelect':
      return <ModeSelectScreen />
    case 'game':
      return (
        <Suspense fallback={<div className="screen">Lade Kegelbahn…</div>}>
          <GameScreen />
        </Suspense>
      )
    case 'tannenbaum':
      return (
        <Suspense fallback={<div className="screen">Lade Kegelbahn…</div>}>
          <TannenbaumScreen />
        </Suspense>
      )
    case 'leaderboard':
      return <LeaderboardScreen />
    case 'allTime':
      return <AllTimeScreen />
    case 'settings':
      return <SettingsScreen />
    default:
      return <StartScreen />
  }
}

export default function App() {
  return (
    <>
      <ScreenRouter />
      <div className="orientation-warning">
        <div className="rotate-icon">📱</div>
        <h2>Bitte Gerät drehen</h2>
        <p>Kegeln in Lembeck wird ausschließlich im Querformat gespielt.</p>
      </div>
    </>
  )
}
