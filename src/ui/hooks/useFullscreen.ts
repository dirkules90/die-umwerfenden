import { useCallback, useEffect, useState } from 'react'

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element
  webkitExitFullscreen?: () => Promise<void>
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches
}

/** iPhone/iPad Safari im Browser-Tab unterstützen die Fullscreen API grundsätzlich nicht - der
 * einzige Weg, die Safari-Werkzeugleiste loszuwerden, ist "Zum Home-Bildschirm hinzufügen"
 * (Teil 16.1). Erkennung inkl. iPadOS 13+, das sich als Desktop-Safari/MacIntel ausgibt. */
function isIOS(): boolean {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/**
 * Vollbildmodus für mobile Browser (Teil 16.1): iOS Safari blendet die Werkzeugleiste im
 * Querformat nicht automatisch aus. Die Fullscreen API bzw. das Installieren als Homescreen-App
 * (PWA, standalone) sind die einzigen Wege, den Browser-Chrome loszuwerden.
 */
export function useFullscreen() {
  const doc = document as FullscreenDocument
  const [isFullscreen, setIsFullscreen] = useState(!!doc.fullscreenElement || !!doc.webkitFullscreenElement)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!doc.fullscreenElement || !!doc.webkitFullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    document.addEventListener('webkitfullscreenchange', handler)
    return () => {
      document.removeEventListener('fullscreenchange', handler)
      document.removeEventListener('webkitfullscreenchange', handler)
    }
  }, [doc])

  const toggle = useCallback(async () => {
    const el = document.documentElement as FullscreenElement
    try {
      if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
        if (el.requestFullscreen) await el.requestFullscreen()
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
      } else if (doc.exitFullscreen) {
        await doc.exitFullscreen()
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen()
      }
    } catch {
      // Fullscreen API nicht verfügbar/verweigert (z. B. ältere iOS-Versionen) - ignorieren,
      // der Button bleibt sichtbar und der Hinweis auf "Zum Home-Bildschirm" greift weiterhin.
    }
  }, [doc])

  const el = document.documentElement as FullscreenElement
  const supported = typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function'

  return { isFullscreen, toggle, supported, isStandalone: isStandalone(), isIOS: isIOS() }
}
