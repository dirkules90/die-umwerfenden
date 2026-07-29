import { lazy, Suspense } from 'react'
import { useGameStore } from './state/gameStore'
import { StartScreen } from './ui/screens/StartScreen'
import { PlayerSelectScreen } from './ui/screens/PlayerSelectScreen'
import { ModeSelectScreen } from './ui/screens/ModeSelectScreen'
import { LeaderboardScreen } from './ui/screens/LeaderboardScreen'
import { WeeklyScreen } from './ui/screens/WeeklyScreen'
import { AllTimeScreen } from './ui/screens/AllTimeScreen'
import { SettingsScreen } from './ui/screens/SettingsScreen'
import { ShopSelectScreen } from './ui/screens/ShopSelectScreen'
import { AchievementBanner } from './ui/components/AchievementBanner'
import { LoadingScreen } from './ui/components/LoadingScreen'

// 3D-/Physik-Stack (Three.js + Rapier.js) erst laden, wenn tatsächlich gespielt wird (Teil 16.2).
const GameScreen = lazy(() => import('./ui/screens/GameScreen').then((m) => ({ default: m.GameScreen })))
const TannenbaumScreen = lazy(() =>
  import('./ui/screens/TannenbaumScreen').then((m) => ({ default: m.TannenbaumScreen })),
)
const ShopScreen = lazy(() => import('./ui/screens/ShopScreen').then((m) => ({ default: m.ShopScreen })))

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
        <Suspense fallback={<LoadingScreen label="Lade Kegelbahn…" />}>
          <GameScreen />
        </Suspense>
      )
    case 'tannenbaum':
      return (
        <Suspense fallback={<LoadingScreen label="Lade Kegelbahn…" />}>
          <TannenbaumScreen />
        </Suspense>
      )
    case 'leaderboard':
      return <LeaderboardScreen />
    case 'weekly':
      return <WeeklyScreen />
    case 'allTime':
      return <AllTimeScreen />
    case 'settings':
      return <SettingsScreen />
    case 'shopSelect':
      return <ShopSelectScreen />
    case 'shop':
      return (
        <Suspense fallback={<LoadingScreen label="Lade Shop…" />}>
          <ShopScreen />
        </Suspense>
      )
    default:
      return <StartScreen />
  }
}

export default function App() {
  return (
    <>
      <ScreenRouter />
      <AchievementBanner />
      <div className="orientation-warning">
        <div className="rotate-icon">📱</div>
        <h2>Bitte Gerät drehen</h2>
        <p>Die Umwerfenden wird ausschließlich im Querformat gespielt.</p>
      </div>
    </>
  )
}
