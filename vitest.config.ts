import { defineConfig } from 'vitest/config'

// Separate, bewusst schlanke Config statt vite.config.ts mitzubenutzen (Teil: Unit-Tests für die
// Punkte-/Duell-Logik) - die reinen Berechnungsfunktionen (game/dailyWinner.ts, backend/duels.ts)
// brauchen weder DOM noch den PWA-Plugin-Build, ein 'node'-Testlauf reicht und bleibt schnell.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
