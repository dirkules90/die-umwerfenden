import { useGameStore, type Screen } from '../../state/gameStore'

const TABS: { screen: Screen; label: string }[] = [
  { screen: 'weekly', label: 'Woche' },
  { screen: 'allTime', label: 'Allzeit' },
]

/** Direkter Wechsel zwischen Wochen-/Allzeit-Bestenliste (Teil: Bestenliste-Vereinfachung) - eine
 * frühere dritte "Heute"-Ansicht wurde entfernt, weil sie inhaltlich sowieso nur ein Zwischenstand
 * war, der automatisch in die Wochensumme einfließt (Nutzer-Feedback: eine eigene Unterteilung
 * dafür brachte keinen Mehrwert). */
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
