import { lazy, Suspense, useEffect } from 'react'
import { useGameStore } from './state/gameStore'
import { StartScreen } from './ui/screens/StartScreen'
import { LoginScreen } from './ui/screens/LoginScreen'
import { ModeSelectScreen } from './ui/screens/ModeSelectScreen'
import { WeeklyScreen } from './ui/screens/WeeklyScreen'
import { AllTimeScreen } from './ui/screens/AllTimeScreen'
import { SettingsScreen } from './ui/screens/SettingsScreen'
import { DuelsScreen } from './ui/screens/DuelsScreen'
import { CoinHistoryScreen } from './ui/screens/CoinHistoryScreen'
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
    case 'login':
      return <LoginScreen />
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
    case 'weekly':
      return <WeeklyScreen />
    case 'allTime':
      return <AllTimeScreen />
    case 'settings':
      return <SettingsScreen />
    case 'shop':
      return (
        <Suspense fallback={<LoadingScreen label="Lade Shop…" />}>
          <ShopScreen />
        </Suspense>
      )
    case 'duels':
      return <DuelsScreen />
    case 'coinHistory':
      return <CoinHistoryScreen />
    default:
      return <StartScreen />
  }
}

export default function App() {
  const syncWeeklyDuelBonus = useGameStore((s) => s.syncWeeklyDuelBonus)

  // Duell-Wochenbonus bei jedem App-Start nachziehen (Teil: Wochenbewertung) - deckt "man kommt
  // später wieder rein" ab, ohne dass man extra die Wochen-Bestenliste öffnen müsste (die tut es
  // beim eigenen Mount ohnehin nochmal, siehe ui/screens/WeeklyScreen.tsx).
  useEffect(() => {
    void syncWeeklyDuelBonus()
  }, [syncWeeklyDuelBonus])

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
