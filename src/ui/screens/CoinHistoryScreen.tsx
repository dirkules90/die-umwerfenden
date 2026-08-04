import { useEffect } from 'react'
import { achievementTitle, useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS } from '../../characters/avatarConfigs'
import { AmbientBackground } from '../components/AmbientBackground'
import type { CoinTransactionRow } from '../../backend/wallet'

function describeTransaction(row: CoinTransactionRow): string {
  const meta = row.meta ?? {}
  switch (row.reason) {
    case 'game_hausnummer':
      return `🎯 Hausnummer-Spiel (${meta.mode === 'hoch' ? 'hoch' : 'niedrig'})`
    case 'game_tannenbaum':
      return '🎄 Tannenbaum-Spiel'
    case 'achievement':
      return `🏆 Achievement: ${achievementTitle(String(meta.achievementId ?? ''))}`
    case 'shop_purchase':
      return `🛍️ Shop-Kauf: ${meta.item ?? ''}`
    case 'duel_stake':
      return '⚔️ Duell-Einsatz'
    case 'duel_win':
      return '🏆 Duell gewonnen'
    case 'duel_refund':
      return '↩️ Duell-Einsatz erstattet'
    case 'login_bonus':
      return '📲 Login-Bonus'
    case 'surprise_bonus':
      return '🎁 Überraschungsbonus'
    case 'weekly_winner':
      return '👑 Wochensieger-Bonus'
    default:
      return row.reason
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Münz-Historie (Teil: Online-Duelle / Münz-Historie) - nutzt bewusst shopPlayer statt eines
 * eigenen PIN-Flows, weil der Zugang bislang nur aus dem Shop heraus verlinkt ist, wo der
 * Charakter schon per PIN feststeht. */
export function CoinHistoryScreen() {
  const shopPlayer = useGameStore((s) => s.shopPlayer)
  const coinHistory = useGameStore((s) => s.coinHistory)
  const coinHistoryLoading = useGameStore((s) => s.coinHistoryLoading)
  const loadCoinHistory = useGameStore((s) => s.loadCoinHistory)
  const goTo = useGameStore((s) => s.goTo)
  const requireLogin = useGameStore((s) => s.requireLogin)

  useEffect(() => {
    if (shopPlayer) void loadCoinHistory(shopPlayer)
    else requireLogin('shop')
  }, [shopPlayer, loadCoinHistory, requireLogin])

  if (!shopPlayer) return null

  return (
    <div className="screen">
      <AmbientBackground />
      <button className="btn secondary screen-nav" onClick={() => goTo('shop')}>
        ← Zurück zum Shop
      </button>
      <div className="shop-title-row">
        <img className="hud-avatar" src={AVATAR_CONFIGS[shopPlayer].photoUrl} alt={AVATAR_CONFIGS[shopPlayer].name} />
        <h2 style={{ margin: 0 }}>Münz-Historie von {AVATAR_CONFIGS[shopPlayer].name}</h2>
      </div>

      {coinHistoryLoading && <p className="subtitle">Lade Historie…</p>}
      {!coinHistoryLoading && coinHistory.length === 0 && <p className="subtitle">Noch keine Münz-Bewegungen.</p>}

      <div className="panel" style={{ maxWidth: '32rem', width: '100%' }}>
        <table className="leaderboard-table">
          <tbody>
            {coinHistory.map((row) => (
              <tr key={row.id}>
                <td style={{ textAlign: 'left' }}>{describeTransaction(row)}</td>
                <td style={{ fontSize: '0.7rem', opacity: 0.6 }}>{formatDateTime(row.created_at)}</td>
                <td>
                  <strong style={{ color: row.amount >= 0 ? '#7cffb0' : '#ff8a80' }}>
                    {row.amount >= 0 ? '+' : ''}
                    {row.amount} 🪙
                  </strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
