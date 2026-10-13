import { useOnlineStatus } from '../hooks/useOnlineStatus'

/** Fester Hinweis-Balken, wenn der Browser gar keine Netzwerkverbindung hat (Teil:
 * Offline-Robustheit) - Duelle, Shop-Sync und Münz-Historie brauchen zwingend eine Verbindung zu
 * Supabase; ohne diesen Hinweis sieht man nur einen hängenden Ladezustand oder eine technische
 * Fehlermeldung, ohne zu wissen woran es liegt. */
export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null

  return (
    <div className="offline-banner">
      📡 Keine Internetverbindung – Duelle, Shop und Münz-Historie synchronisieren erst wieder, sobald du online bist.
    </div>
  )
}
