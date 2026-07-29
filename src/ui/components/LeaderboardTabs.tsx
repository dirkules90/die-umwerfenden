import { useGameStore, type Screen } from '../../state/gameStore'

const TABS: { screen: Screen; label: string }[] = [
  { screen: 'leaderboard', label: 'Heute' },
  { screen: 'weekly', label: 'Woche' },
  { screen: 'allTime', label: 'Allzeit' },
]

/** Direkter Wechsel zwischen Tages-/Wochen-/Allzeit-Bestenliste (Teil: Wochen-Bestenliste) - vorher
 * war die Allzeit-Liste ein Unterseiten-Button nur innerhalb der Tages-Bestenliste erreichbar
 * ("im Untermenü versteckt"). Jetzt sind alle drei über Tabs gleichwertig einen Tap entfernt. */
export function LeaderboardTabs({ active }: { active: Screen }) {
  const goTo = useGameStore((s) => s.goTo)
  return (
    <div className="leaderboard-tabs">
      {TABS.map((t) => (
        <button
          key={t.screen}
          className={`leaderboard-tab-btn ${active === t.screen ? 'active' : ''}`}
          onClick={() => goTo(t.screen)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
