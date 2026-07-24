// Geometrische Grundmaße der Bahn (Teil 4.3), in Metern, als gemeinsame
// Referenz für Physik- und Szenenaufbau.
export const LANE_LENGTH = 22
export const LANE_HALF_WIDTH = 0.55
export const GUTTER_WIDTH = 0.4
export const GUTTER_HALF_OUTER = LANE_HALF_WIDTH + GUTTER_WIDTH
export const RUNUP_LENGTH = 2.5
export const START_Z = LANE_LENGTH / 2 + RUNUP_LENGTH / 2
export const PIN_STAND_Z = -LANE_LENGTH / 2 + 1.2
export const PIN_FALLEN_ANGLE_DEG = 65
export const SETTLE_LINVEL_THRESHOLD = 0.05
export const SETTLE_ANGVEL_THRESHOLD = 0.08
export const SETTLE_DURATION_MS = 500

export const BALL_RADIUS = 0.14
export const BALL_MASS = 1.3

/** X-Position der sichtbaren Rückführungsrinne, direkt neben dem Hebel-Gestänge zum
 * Kegelstand: die Kugel rollt dort nach dem Hebelzug sichtbar zurück statt zu teleportieren. */
export const RETURN_CHANNEL_X = GUTTER_HALF_OUTER + 0.75

export const PIN_RADIUS = 0.06
export const PIN_HEIGHT = 0.38

/** Kranz-Aufbau 1-2-3-2-1 (Teil 4.4), relative Positionen (x, z-Versatz) zur Kegelstand-Basis. */
export const PIN_LAYOUT: { x: number; zOffset: number }[] = [
  { x: 0, zOffset: 0.9 },
  { x: -0.22, zOffset: 0.68 },
  { x: 0.22, zOffset: 0.68 },
  { x: -0.44, zOffset: 0.46 },
  { x: 0, zOffset: 0.46 },
  { x: 0.44, zOffset: 0.46 },
  { x: -0.22, zOffset: 0.24 },
  { x: 0.22, zOffset: 0.24 },
  { x: 0, zOffset: 0 },
]
