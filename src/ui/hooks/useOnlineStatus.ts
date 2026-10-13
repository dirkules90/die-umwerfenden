import { useEffect, useState } from 'react'

/** Reagiert auf online/offline-Events des Browsers (Teil: Offline-Robustheit) - navigator.onLine
 * selbst ist nur eine grobe Netzwerkschnittstellen-Prüfung (z. B. "WLAN verbunden", nicht
 * zwingend "Supabase auch wirklich erreichbar"), reicht aber aus, um den offensichtlichsten Fall
 * ("gar keine Verbindung") früh und klar anzuzeigen, statt dass Nutzer nur auf einen endlosen
 * Ladezustand oder eine kryptische Fehlermeldung starren. */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return isOnline
}
