import { useEffect, useRef, useState } from 'react'
import { cosmeticsFor, useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../../characters/avatarConfigs'
import { CharacterPreviewScene } from '../../characters/CharacterPreviewScene'
import {
  GLASSES_STYLES,
  GLOVES_PRICE,
  HAIRSTYLES,
  HEADBAND_PRICE,
  SHIRTS,
  WATCH_PRICE,
  glassesStylePrice,
  hairStylePrice,
  isGlassesStyleOwned,
  isHairStyleOwned,
  isShirtStyleOwned,
  shirtStylePrice,
} from '../../game/cosmetics'
import type { CosmeticLoadout, GlassesStyleId, HairStyleId, ShirtStyleId } from '../../game/types'

export function ShopScreen() {
  const shopPlayer = useGameStore((s) => s.shopPlayer)
  const cosmetics = useGameStore((s) => s.cosmetics)
  const goTo = useGameStore((s) => s.goTo)
  const setHairColor = useGameStore((s) => s.setHairColor)
  const equipOrBuyHairStyle = useGameStore((s) => s.equipOrBuyHairStyle)
  const equipOrBuyShirtStyle = useGameStore((s) => s.equipOrBuyShirtStyle)
  const equipOrBuyGloves = useGameStore((s) => s.equipOrBuyGloves)
  const equipOrBuyGlasses = useGameStore((s) => s.equipOrBuyGlasses)
  const equipOrBuyWatch = useGameStore((s) => s.equipOrBuyWatch)
  const equipOrBuyHeadband = useGameStore((s) => s.equipOrBuyHeadband)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<CharacterPreviewScene | null>(null)
  const [error, setError] = useState('')

  // Hooks müssen unabhängig davon, ob shopPlayer gesetzt ist, immer in derselben Reihenfolge
  // laufen - deshalb ein sicherer Platzhalter-Charakter, falls die Seite (z.B. per Reload) ohne
  // gültige Auswahl aufgerufen wird. Der eigentliche Redirect passiert unten in einem Effect.
  const effectiveId = shopPlayer ?? CHARACTER_ORDER[0]
  const config = AVATAR_CONFIGS[effectiveId]
  const { coins, loadout, ownership } = cosmeticsFor(cosmetics, effectiveId)
  const [draft, setDraft] = useState<CosmeticLoadout>(loadout)

  useEffect(() => {
    if (!shopPlayer) goTo('shopSelect')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopPlayer])

  // Vorschau-Szene einmalig aufbauen (Teil: Kosmetik-Shop) - eigene, leichtgewichtige Szene statt
  // der vollen LaneScene, die für eine reine Standbild-Vorschau deutlich zu schwer wäre.
  useEffect(() => {
    if (!canvasRef.current) return
    const preview = new CharacterPreviewScene(canvasRef.current)
    previewRef.current = preview
    const el = containerRef.current
    if (el) preview.resize(el.clientWidth, el.clientHeight)
    return () => {
      preview.dispose()
      previewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => previewRef.current?.resize(el.clientWidth, el.clientHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Vorschau live an die aktuelle (noch nicht zwingend gekaufte) Auswahl anpassen, damit man vor
  // dem Kauf sehen kann, wie es aussehen würde.
  useEffect(() => {
    previewRef.current?.setCharacter(config, draft)
  }, [config, draft])

  if (!shopPlayer) return null

  function confirmHairStyle(style: HairStyleId) {
    if (!equipOrBuyHairStyle(shopPlayer!, style)) {
      setError('Nicht genug Münzen für diese Frisur.')
      return
    }
    setError('')
  }

  function confirmShirtStyle(style: ShirtStyleId) {
    if (!equipOrBuyShirtStyle(shopPlayer!, style)) {
      setError('Nicht genug Münzen für dieses Shirt.')
      return
    }
    setError('')
  }

  function confirmGloves(want: boolean) {
    if (!equipOrBuyGloves(shopPlayer!, want)) {
      setError('Nicht genug Münzen für Handschuhe.')
      return
    }
    setError('')
  }

  function confirmGlasses(style: GlassesStyleId) {
    if (!equipOrBuyGlasses(shopPlayer!, style)) {
      setError('Nicht genug Münzen für diese Sonnenbrille.')
      return
    }
    setError('')
  }

  function confirmWatch(want: boolean) {
    if (!equipOrBuyWatch(shopPlayer!, want)) {
      setError('Nicht genug Münzen für die Uhr.')
      return
    }
    setError('')
  }

  function confirmHeadband(want: boolean) {
    if (!equipOrBuyHeadband(shopPlayer!, want)) {
      setError('Nicht genug Münzen für das Stirnband.')
      return
    }
    setError('')
  }

  return (
    <div className="screen shop-screen">
      <button className="btn secondary screen-nav" onClick={() => goTo('start')}>
        ← Zurück
      </button>
      <div className="shop-coins panel">🪙 {coins}</div>

      <div className="shop-title-row">
        <img className="hud-avatar" src={config.photoUrl} alt={config.name} />
        <h2 style={{ margin: 0 }}>Shop von {config.name}</h2>
      </div>
      <p className="subtitle" style={{ maxWidth: '30rem' }}>
        Münzen gibt es fürs Spielen, für Achievements und für den Wochensieg.
      </p>

      <div className="shop-layout">
        <div className="shop-preview-wrap" ref={containerRef}>
          <canvas ref={canvasRef} className="shop-preview-canvas" />
        </div>

        <div className="shop-options">
          {error && <p style={{ color: '#ff8a80', margin: 0 }}>{error}</p>}

          <section className="shop-section panel">
            <h3 style={{ marginTop: 0 }}>Frisur</h3>
            <div className="shop-option-row">
              {HAIRSTYLES.map((h) => {
                const owned = isHairStyleOwned(ownership, h.id)
                return (
                  <button
                    key={h.id}
                    className={`shop-option-btn ${draft.hairStyle === h.id ? 'active' : ''}`}
                    onClick={() => setDraft((d) => ({ ...d, hairStyle: h.id }))}
                  >
                    <span>{h.title}</span>
                    {!owned && <span className="shop-price">🪙 {h.price}</span>}
                    {owned && loadout.hairStyle === h.id && <span className="shop-owned">Ausgerüstet</span>}
                  </button>
                )
              })}
            </div>
            {draft.hairStyle !== loadout.hairStyle && (
              <button
                className="btn"
                disabled={!isHairStyleOwned(ownership, draft.hairStyle) && coins < hairStylePrice(draft.hairStyle)}
                onClick={() => confirmHairStyle(draft.hairStyle)}
              >
                {isHairStyleOwned(ownership, draft.hairStyle)
                  ? 'Ausrüsten'
                  : `Kaufen für ${hairStylePrice(draft.hairStyle)} 🪙`}
              </button>
            )}
          </section>

          <section className="shop-section panel">
            <h3 style={{ marginTop: 0 }}>Haarfarbe (kostenlos)</h3>
            <input
              type="color"
              className="shop-color-input"
              value={draft.hairColor}
              onChange={(e) => {
                const color = e.target.value
                setDraft((d) => ({ ...d, hairColor: color }))
                setHairColor(shopPlayer!, color)
              }}
            />
          </section>

          <section className="shop-section panel">
            <h3 style={{ marginTop: 0 }}>T-Shirt</h3>
            <div className="shop-option-row">
              {SHIRTS.map((s) => {
                const owned = isShirtStyleOwned(ownership, s.id)
                return (
                  <button
                    key={s.id}
                    className={`shop-option-btn ${draft.shirtStyle === s.id ? 'active' : ''}`}
                    onClick={() => setDraft((d) => ({ ...d, shirtStyle: s.id }))}
                  >
                    <span>{s.title}</span>
                    {!owned && <span className="shop-price">🪙 {s.price}</span>}
                    {owned && loadout.shirtStyle === s.id && <span className="shop-owned">Ausgerüstet</span>}
                  </button>
                )
              })}
            </div>
            {draft.shirtStyle !== loadout.shirtStyle && (
              <button
                className="btn"
                disabled={!isShirtStyleOwned(ownership, draft.shirtStyle) && coins < shirtStylePrice(draft.shirtStyle)}
                onClick={() => confirmShirtStyle(draft.shirtStyle)}
              >
                {isShirtStyleOwned(ownership, draft.shirtStyle)
                  ? 'Ausrüsten'
                  : `Kaufen für ${shirtStylePrice(draft.shirtStyle)} 🪙`}
              </button>
            )}
          </section>

          <section className="shop-section panel">
            <h3 style={{ marginTop: 0 }}>Handschuhe</h3>
            <div className="shop-option-row">
              <button
                className={`shop-option-btn ${!draft.gloves ? 'active' : ''}`}
                onClick={() => setDraft((d) => ({ ...d, gloves: false }))}
              >
                Ohne
              </button>
              <button
                className={`shop-option-btn ${draft.gloves ? 'active' : ''}`}
                onClick={() => setDraft((d) => ({ ...d, gloves: true }))}
              >
                <span>Mit Handschuhen</span>
                {!ownership.gloves && <span className="shop-price">🪙 {GLOVES_PRICE}</span>}
                {ownership.gloves && loadout.gloves && <span className="shop-owned">Ausgerüstet</span>}
              </button>
            </div>
            {draft.gloves !== loadout.gloves && (
              <button
                className="btn"
                disabled={draft.gloves && !ownership.gloves && coins < GLOVES_PRICE}
                onClick={() => confirmGloves(draft.gloves)}
              >
                {!draft.gloves || ownership.gloves ? 'Ausrüsten' : `Kaufen für ${GLOVES_PRICE} 🪙`}
              </button>
            )}
          </section>

          <section className="shop-section panel">
            <h3 style={{ marginTop: 0 }}>Sonnenbrille</h3>
            <div className="shop-option-row">
              {GLASSES_STYLES.map((g) => {
                const owned = isGlassesStyleOwned(ownership, g.id, config.hasGlasses)
                return (
                  <button
                    key={g.id}
                    className={`shop-option-btn ${draft.glassesStyle === g.id ? 'active' : ''}`}
                    onClick={() => setDraft((d) => ({ ...d, glassesStyle: g.id }))}
                  >
                    <span>{g.title}</span>
                    {!owned && <span className="shop-price">🪙 {g.price}</span>}
                    {owned && loadout.glassesStyle === g.id && <span className="shop-owned">Ausgerüstet</span>}
                  </button>
                )
              })}
            </div>
            {draft.glassesStyle !== loadout.glassesStyle && (
              <button
                className="btn"
                disabled={
                  !isGlassesStyleOwned(ownership, draft.glassesStyle, config.hasGlasses) &&
                  coins < glassesStylePrice(draft.glassesStyle, config.hasGlasses)
                }
                onClick={() => confirmGlasses(draft.glassesStyle)}
              >
                {isGlassesStyleOwned(ownership, draft.glassesStyle, config.hasGlasses)
                  ? 'Ausrüsten'
                  : `Kaufen für ${glassesStylePrice(draft.glassesStyle, config.hasGlasses)} 🪙`}
              </button>
            )}
          </section>

          <section className="shop-section panel">
            <h3 style={{ marginTop: 0 }}>Armbanduhr</h3>
            <div className="shop-option-row">
              <button
                className={`shop-option-btn ${!draft.watch ? 'active' : ''}`}
                onClick={() => setDraft((d) => ({ ...d, watch: false }))}
              >
                Ohne
              </button>
              <button
                className={`shop-option-btn ${draft.watch ? 'active' : ''}`}
                onClick={() => setDraft((d) => ({ ...d, watch: true }))}
              >
                <span>Goldene Uhr</span>
                {!ownership.watch && <span className="shop-price">🪙 {WATCH_PRICE}</span>}
                {ownership.watch && loadout.watch && <span className="shop-owned">Ausgerüstet</span>}
              </button>
            </div>
            {draft.watch !== loadout.watch && (
              <button
                className="btn"
                disabled={draft.watch && !ownership.watch && coins < WATCH_PRICE}
                onClick={() => confirmWatch(draft.watch)}
              >
                {!draft.watch || ownership.watch ? 'Ausrüsten' : `Kaufen für ${WATCH_PRICE} 🪙`}
              </button>
            )}
          </section>

          <section className="shop-section panel">
            <h3 style={{ marginTop: 0 }}>Stirnband</h3>
            <div className="shop-option-row">
              <button
                className={`shop-option-btn ${!draft.headband ? 'active' : ''}`}
                onClick={() => setDraft((d) => ({ ...d, headband: false }))}
              >
                Ohne
              </button>
              <button
                className={`shop-option-btn ${draft.headband ? 'active' : ''}`}
                onClick={() => setDraft((d) => ({ ...d, headband: true }))}
              >
                <span>Mit Stirnband</span>
                {!ownership.headband && <span className="shop-price">🪙 {HEADBAND_PRICE}</span>}
                {ownership.headband && loadout.headband && <span className="shop-owned">Ausgerüstet</span>}
              </button>
            </div>
            {draft.headband !== loadout.headband && (
              <button
                className="btn"
                disabled={draft.headband && !ownership.headband && coins < HEADBAND_PRICE}
                onClick={() => confirmHeadband(draft.headband)}
              >
                {!draft.headband || ownership.headband ? 'Ausrüsten' : `Kaufen für ${HEADBAND_PRICE} 🪙`}
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
