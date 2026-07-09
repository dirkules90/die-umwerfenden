import type { CharacterId, DigitSlot, GameMode, GameSession, RoundResult } from './types'
import { digitForThrow, freeSlots, houseNumberFromDigits } from './houseNumberRules'

export type GameEffect =
  | { type: 'ALL_NINE' }
  | { type: 'GUTTER' }
  | { type: 'ROUND_COMPLETE'; result: RoundResult }
  | { type: 'GAME_COMPLETE' }
  | { type: 'AUTO_SLOT'; slot: DigitSlot }

export function createSession(mode: GameMode, totalRounds: number, activePlayers: CharacterId[]): GameSession {
  return {
    mode,
    totalRounds,
    activePlayers,
    currentRoundIndex: 0,
    currentThrowIndex: 0,
    currentPlayerIndex: 0,
    results: [],
    currentDigits: {},
    pendingDigit: null,
    phase: 'idle',
  }
}

export function currentPlayer(session: GameSession): CharacterId {
  return session.activePlayers[session.currentPlayerIndex]
}

/** Wurfergebnis eintreffen lassen: Ziffer wird berechnet, Spielphase wechselt zur Ziffernwahl. */
export function resolveThrow(
  session: GameSession,
  pinsDown: number,
  isGutter: boolean,
): { session: GameSession; effects: GameEffect[] } {
  const digit = digitForThrow(pinsDown, isGutter, session.mode)
  const effects: GameEffect[] = []
  if (pinsDown === 9 && !isGutter) effects.push({ type: 'ALL_NINE' })
  if (isGutter) effects.push({ type: 'GUTTER' })

  const open = freeSlots(session.currentDigits)
  let next: GameSession = { ...session, pendingDigit: digit, phase: 'digitChoice' }

  if (open.length === 1) {
    // Letzte offene Stelle wird automatisch belegt (Teil 10.4 / Testfall T09).
    const slot = open[0]
    next = applyDigitToSlot(next, slot, digit)
    effects.push({ type: 'AUTO_SLOT', slot })
    next = { ...next, pendingDigit: null, phase: 'leverWaiting' }
  }

  return { session: next, effects }
}

export function chooseDigitSlot(session: GameSession, slot: DigitSlot): GameSession {
  if (session.pendingDigit === null) return session
  const withDigit = applyDigitToSlot(session, slot, session.pendingDigit)
  return { ...withDigit, pendingDigit: null, phase: 'leverWaiting' }
}

function applyDigitToSlot(session: GameSession, slot: DigitSlot, digit: number): GameSession {
  return { ...session, currentDigits: { ...session.currentDigits, [slot]: digit } }
}

export function leverPulled(session: GameSession): GameSession {
  return { ...session, phase: 'leverAnimating' }
}

export function leverAnimationDone(session: GameSession): GameSession {
  return { ...session, phase: 'ballReturning' }
}

/**
 * Ball ist zurückgekehrt: nächster Wurf, oder Rundenabschluss/Spielerwechsel,
 * gemäß Teil 10.2 (drei Würfe je Spieler und Runde).
 */
export function ballReturned(session: GameSession): { session: GameSession; effects: GameEffect[] } {
  const effects: GameEffect[] = []
  const throwIndex = session.currentThrowIndex + 1

  if (throwIndex >= 3) {
    const houseNumber = houseNumberFromDigits(session.currentDigits)
    const result: RoundResult = {
      playerId: currentPlayer(session),
      roundNumber: session.currentRoundIndex,
      houseNumber,
      digits: session.currentDigits,
    }
    effects.push({ type: 'ROUND_COMPLETE', result })

    const results = [...session.results, result]
    const nextPlayerIndex = session.currentPlayerIndex + 1
    const roundFinishedForAll = nextPlayerIndex >= session.activePlayers.length

    if (roundFinishedForAll) {
      const nextRoundIndex = session.currentRoundIndex + 1
      if (nextRoundIndex >= session.totalRounds) {
        effects.push({ type: 'GAME_COMPLETE' })
        return {
          session: { ...session, results, phase: 'gameOver' },
          effects,
        }
      }
      return {
        session: {
          ...session,
          results,
          currentRoundIndex: nextRoundIndex,
          currentPlayerIndex: 0,
          currentThrowIndex: 0,
          currentDigits: {},
          phase: 'playerSwitch',
        },
        effects,
      }
    }

    return {
      session: {
        ...session,
        results,
        currentPlayerIndex: nextPlayerIndex,
        currentThrowIndex: 0,
        currentDigits: {},
        phase: 'playerSwitch',
      },
      effects,
    }
  }

  return { session: { ...session, currentThrowIndex: throwIndex, phase: 'idle' }, effects }
}

export function beginNextTurn(session: GameSession): GameSession {
  return { ...session, phase: 'idle' }
}
