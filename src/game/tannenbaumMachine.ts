import type { CharacterId, TannenbaumSession } from './types'
import { applyTannenbaumThrow, initialTannenbaumRemaining, isTannenbaumComplete } from './tannenbaumRules'

export function createTannenbaumSession(playerId: CharacterId): TannenbaumSession {
  return { playerId, remaining: initialTannenbaumRemaining(), throwCount: 0, phase: 'idle' }
}

/** Wurfergebnis eintreffen lassen: passende Zahl wird abgehakt, danach entweder Hebelphase
 * oder - falls der Baum fertig ist - direkt Spielende (kein erneutes Aufstellen nötig). */
export function resolveTannenbaumThrow(
  session: TannenbaumSession,
  pinsDown: number,
): { session: TannenbaumSession; completed: boolean } {
  const remaining = applyTannenbaumThrow(session.remaining, pinsDown)
  const throwCount = session.throwCount + 1
  const completed = isTannenbaumComplete(remaining)
  return {
    session: { ...session, remaining, throwCount, phase: completed ? 'gameOver' : 'leverWaiting' },
    completed,
  }
}

export function tannenbaumLeverPulled(session: TannenbaumSession): TannenbaumSession {
  return { ...session, phase: 'leverAnimating' }
}

export function tannenbaumLeverAnimationDone(session: TannenbaumSession): TannenbaumSession {
  return { ...session, phase: 'ballReturning' }
}

export function tannenbaumBallReturned(session: TannenbaumSession): TannenbaumSession {
  return { ...session, phase: 'idle' }
}
