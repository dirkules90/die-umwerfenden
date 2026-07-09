import RAPIER from '@dimforge/rapier3d-compat'

let initialized = false

export async function ensureRapierInitialized(): Promise<typeof RAPIER> {
  if (!initialized) {
    await RAPIER.init()
    initialized = true
  }
  return RAPIER
}

export const FIXED_TIMESTEP = 1 / 60

export function createWorld(): RAPIER.World {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
  world.timestep = FIXED_TIMESTEP
  return world
}

export { RAPIER }
