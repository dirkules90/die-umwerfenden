import { useEffect } from 'react'
import { useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS } from '../../characters/avatarConfigs'

export function AchievementBanner() {
  const banner = useGameStore((s) => s.achievementBanner)
  const dismiss = useGameStore((s) => s.dismissAchievementBanner)

  useEffect(() => {
    if (!banner) return
    const t = window.setTimeout(dismiss, 3200)
    return () => window.clearTimeout(t)
  }, [banner, dismiss])

  if (!banner) return null

  return (
    <div className="achievement-banner">
      {banner.kind === 'login' ? (
        <>👋 {AVATAR_CONFIGS[banner.playerId].name}: Schön, dass du da bist! (+{banner.coins} 🪙)</>
      ) : banner.kind === 'surprise' ? (
        <>✨ {AVATAR_CONFIGS[banner.playerId].name}: Überraschungsbonus! (+{banner.coins} 🪙)</>
      ) : (
        <>
          🏆 {AVATAR_CONFIGS[banner.playerId].name}: „{banner.title}” freigeschaltet! (+{banner.coins} 🪙)
        </>
      )}
    </div>
  )
}
