import { useGameStore } from '../../state/gameStore'
import { FullscreenButton } from '../components/FullscreenButton'
import { AmbientBackground } from '../components/AmbientBackground'
import { useFullscreen } from '../hooks/useFullscreen'
import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../../characters/avatarConfigs'
import {
  achievementCoinReward,
  hasAchievementThisWeek,
  weeklyChallengeDef,
  WEEKLY_CHALLENGE_BONUS_COINS,
} from '../../game/achievements'
import { currentWeekKey } from '../../game/dateKey'

export function StartScreen() {
  const goTo = useGameStore((s) => s.goTo)
  const openSettings = useGameStore((s) => s.openSettings)
  const statistics = useGameStore((s) => s.statistics)
  const { isFullscreen, supported, isStandalone, isIOS } = useFullscreen()

  const weekKey = currentWeekKey()
  const challenge = weeklyChallengeDef(weekKey)
  const totalReward = achievementCoinReward(challenge.id) + WEEKLY_CHALLENGE_BONUS_COINS
  const completedBy = CHARACTER_ORDER.filter((id) => {
    const stats = statistics[id]
    return stats && hasAchievementThisWeek(stats, challenge.id, weekKey)
  })

  return (
    <div className="screen">
      <AmbientBackground />
      <img className="title-logo-img" src={`${import.meta.env.BASE_URL}icons/logo.png`} alt="Die Umwerfenden" />
      <p className="subtitle">Die originalgetreue Outdoor-Kegelbahn aus Lembeck.</p>
      <div className="panel daily-challenge-panel">
        <div className="daily-challenge-title">🎯 Wochenaufgabe: {challenge.title}</div>
        <p className="subtitle" style={{ margin: 0, fontSize: '0.9rem' }}>
          {challenge.description}
        </p>
        <div className="daily-challenge-reward">
          +{totalReward} 🪙 diese Woche (statt sonst {achievementCoinReward(challenge.id)} 🪙)
        </div>
        {completedBy.length > 0 && (
          <div className="daily-challenge-completed">
            Diese Woche schon geschafft: {completedBy.map((id) => AVATAR_CONFIGS[id].name).join(', ')}
          </div>
        )}
      </div>
      <button className="btn" onClick={() => goTo('playerSelect')}>
        Neues Spiel
      </button>
      <div style={{ display: 'flex', gap: '0.8rem' }}>
        <button className="btn secondary" onClick={() => goTo('weekly')}>
          Bestenliste
        </button>
        <button className="btn secondary" onClick={() => goTo('shopSelect')}>
          Shop
        </button>
        <button className="btn secondary" onClick={() => goTo('duelsSelect')}>
          ⚔️ Duelle
        </button>
        <button className="btn secondary" onClick={() => openSettings('start')}>
          Einstellungen
        </button>
        <FullscreenButton />
      </div>
      {!isStandalone && isIOS && (
        <p className="subtitle" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
          📲 iPhone/iPad-Tipp: Safari kann hier leider kein echtes Vollbild anzeigen. Für die beste Ansicht ohne
          Browserleiste unten auf „Teilen” tippen und „Zum Home-Bildschirm” wählen.
        </p>
      )}
      {!isStandalone && !isIOS && supported && !isFullscreen && (
        <p className="subtitle" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
          Tipp: Für die beste Ansicht ohne Browserleiste „Vollbild” antippen oder die Seite über
          „Zum Home-Bildschirm” installieren.
        </p>
      )}
    </div>
  )
}
