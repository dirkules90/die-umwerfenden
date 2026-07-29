import { useEffect, useRef, useState } from 'react'
import { cosmeticsFor, useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../../characters/avatarConfigs'
import { CharacterPreviewScene } from '../../characters/CharacterPreviewScene'
import {
  BEARD_STYLES,
  CAP_STYLES,
  CAPES,
  GLASSES_STYLES,
  GLOVES_PRICE,
  HAIRSTYLES,
  HEADBAND_PRICE,
  NECKLACES,
  PANTS_COLORS,
  SHIRTS,
  SHOE_COLORS,
  WATCH_PRICE,
  WRISTBANDS,
  beardStylePrice,
  capePrice,
  capStylePrice,
  glassesStylePrice,
  hairStylePrice,
  isBeardStyleOwned,
  isCapeOwned,
  isCapStyleOwned,
  isGlassesStyleOwned,
  isHairStyleOwned,
  isNecklaceOwned,
  isPantsColorOwned,
  isShirtStyleOwned,
  isShoeColorOwned,
  isWristbandOwned,
  necklacePrice,
  pantsColorPrice,
  shirtStylePrice,
  shoeColorPrice,
  wristbandPrice,
} from '../../game/cosmetics'
import type {
  BeardStyleId,
  CapeId,
  CapStyleId,
  CosmeticLoadout,
  GlassesStyleId,
  HairStyleId,
  NecklaceId,
  PantsColorId,
  ShirtStyleId,
  ShoeColorId,
  WristbandId,
} from '../../game/types'

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
  const equipOrBuyCap = useGameStore((s) => s.equipOrBuyCap)
  const equipOrBuyBeard = useGameStore((s) => s.equipOrBuyBeard)
  const equipOrBuyPantsColor = useGameStore((s) => s.equipOrBuyPantsColor)
  const equipOrBuyShoeColor = useGameStore((s) => s.equipOrBuyShoeColor)
  const equipOrBuyNecklace = useGameStore((s) => s.equipOrBuyNecklace)
  const equipOrBuyWristband = useGameStore((s) => s.equipOrBuyWristband)
  const equipOrBuyCape = useGameStore((s) => s.equipOrBuyCape)
  const equipCrown = useGameStore((s) => s.equipCrown)

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

  function confirmCap(style: CapStyleId) {
    if (!equipOrBuyCap(shopPlayer!, style)) {
      setError('Nicht genug Münzen für diese Kopfbedeckung.')
      return
    }
    setError('')
  }

  function confirmBeard(style: BeardStyleId) {
    if (!equipOrBuyBeard(shopPlayer!, style)) {
      setError('Nicht genug Münzen für diesen Bart.')
      return
    }
    setError('')
  }

  function confirmPantsColor(color: PantsColorId) {
    if (!equipOrBuyPantsColor(shopPlayer!, color)) {
      setError('Nicht genug Münzen für diese Hosenfarbe.')
      return
    }
    setError('')
  }

  function confirmShoeColor(color: ShoeColorId) {
    if (!equipOrBuyShoeColor(shopPlayer!, color)) {
      setError('Nicht genug Münzen für diese Schuhfarbe.')
      return
    }
    setError('')
  }

  function confirmNecklace(style: NecklaceId) {
    if (!equipOrBuyNecklace(shopPlayer!, style)) {
      setError('Nicht genug Münzen für diese Kette.')
      return
    }
    setError('')
  }

  function confirmWristband(style: WristbandId) {
    if (!equipOrBuyWristband(shopPlayer!, style)) {
      setError('Nicht genug Münzen für dieses Armband.')
      return
    }
    setError('')
  }

  function confirmCape(style: CapeId) {
    if (!equipOrBuyCape(shopPlayer!, style)) {
      setError('Nicht genug Münzen für dieses Cape.')
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

          <section className="shop-section panel">
            <h3 style={{ marginTop: 0 }}>Kopfbedeckung</h3>
            <div className="shop-option-row">
              {CAP_STYLES.map((c) => {
                const owned = isCapStyleOwned(ownership, c.id)
                return (
                  <button
                    key={c.id}
                    className={`shop-option-btn ${draft.capStyle === c.id ? 'active' : ''}`}
                    onClick={() => setDraft((d) => ({ ...d, capStyle: c.id }))}
                  >
                    <span>{c.title}</span>
                    {!owned && <span className="shop-price">🪙 {c.price}</span>}
                    {owned && loadout.capStyle === c.id && <span className="shop-owned">Ausgerüstet</span>}
                  </button>
                )
              })}
            </div>
            {draft.capStyle !== loadout.capStyle && (
              <button
                className="btn"
                disabled={!isCapStyleOwned(ownership, draft.capStyle) && coins < capStylePrice(draft.capStyle)}
                onClick={() => confirmCap(draft.capStyle)}
              >
                {isCapStyleOwned(ownership, draft.capStyle) ? 'Ausrüsten' : `Kaufen für ${capStylePrice(draft.capStyle)} 🪙`}
              </button>
            )}
          </section>

          <section className="shop-section panel">
            <h3 style={{ marginTop: 0 }}>Bart</h3>
            <div className="shop-option-row">
              {BEARD_STYLES.map((b) => {
                const owned = isBeardStyleOwned(ownership, b.id, config.hasBeard)
                return (
                  <button
                    key={b.id}
                    className={`shop-option-btn ${draft.beardStyle === b.id ? 'active' : ''}`}
                    onClick={() => setDraft((d) => ({ ...d, beardStyle: b.id }))}
                  >
                    <span>{b.title}</span>
                    {!owned && <span className="shop-price">🪙 {b.price}</span>}
                    {owned && loadout.beardStyle === b.id && <span className="shop-owned">Ausgerüstet</span>}
                  </button>
                )
              })}
            </div>
            {draft.beardStyle !== loadout.beardStyle && (
              <button
                className="btn"
                disabled={
                  !isBeardStyleOwned(ownership, draft.beardStyle, config.hasBeard) &&
                  coins < beardStylePrice(draft.beardStyle, config.hasBeard)
                }
                onClick={() => confirmBeard(draft.beardStyle)}
              >
                {isBeardStyleOwned(ownership, draft.beardStyle, config.hasBeard)
                  ? 'Ausrüsten'
                  : `Kaufen für ${beardStylePrice(draft.beardStyle, config.hasBeard)} 🪙`}
              </button>
            )}
          </section>

          <section className="shop-section panel">
            <h3 style={{ marginTop: 0 }}>Hosenfarbe</h3>
            <div className="shop-option-row">
              {PANTS_COLORS.map((p) => {
                const owned = isPantsColorOwned(ownership, p.id)
                return (
                  <button
                    key={p.id}
                    className={`shop-option-btn ${draft.pantsColor === p.id ? 'active' : ''}`}
                    onClick={() => setDraft((d) => ({ ...d, pantsColor: p.id }))}
                  >
                    <span>{p.title}</span>
                    {!owned && <span className="shop-price">🪙 {p.price}</span>}
                    {owned && loadout.pantsColor === p.id && <span className="shop-owned">Ausgerüstet</span>}
                  </button>
                )
              })}
            </div>
            {draft.pantsColor !== loadout.pantsColor && (
              <button
                className="btn"
                disabled={!isPantsColorOwned(ownership, draft.pantsColor) && coins < pantsColorPrice(draft.pantsColor)}
                onClick={() => confirmPantsColor(draft.pantsColor)}
              >
                {isPantsColorOwned(ownership, draft.pantsColor)
                  ? 'Ausrüsten'
                  : `Kaufen für ${pantsColorPrice(draft.pantsColor)} 🪙`}
              </button>
            )}
          </section>

          <section className="shop-section panel">
            <h3 style={{ marginTop: 0 }}>Schuhfarbe</h3>
            <div className="shop-option-row">
              {SHOE_COLORS.map((s) => {
                const owned = isShoeColorOwned(ownership, s.id)
                return (
                  <button
                    key={s.id}
                    className={`shop-option-btn ${draft.shoeColor === s.id ? 'active' : ''}`}
                    onClick={() => setDraft((d) => ({ ...d, shoeColor: s.id }))}
                  >
                    <span>{s.title}</span>
                    {!owned && <span className="shop-price">🪙 {s.price}</span>}
                    {owned && loadout.shoeColor === s.id && <span className="shop-owned">Ausgerüstet</span>}
                  </button>
                )
              })}
            </div>
            {draft.shoeColor !== loadout.shoeColor && (
              <button
                className="btn"
                disabled={!isShoeColorOwned(ownership, draft.shoeColor) && coins < shoeColorPrice(draft.shoeColor)}
                onClick={() => confirmShoeColor(draft.shoeColor)}
              >
                {isShoeColorOwned(ownership, draft.shoeColor)
                  ? 'Ausrüsten'
                  : `Kaufen für ${shoeColorPrice(draft.shoeColor)} 🪙`}
              </button>
            )}
          </section>

          <section className="shop-section panel">
            <h3 style={{ marginTop: 0 }}>Kette</h3>
            <div className="shop-option-row">
              {NECKLACES.map((n) => {
                const owned = isNecklaceOwned(ownership, n.id)
                return (
                  <button
                    key={n.id}
                    className={`shop-option-btn ${draft.necklace === n.id ? 'active' : ''}`}
                    onClick={() => setDraft((d) => ({ ...d, necklace: n.id }))}
                  >
                    <span>{n.title}</span>
                    {!owned && <span className="shop-price">🪙 {n.price}</span>}
                    {owned && loadout.necklace === n.id && <span className="shop-owned">Ausgerüstet</span>}
                  </button>
                )
              })}
            </div>
            {draft.necklace !== loadout.necklace && (
              <button
                className="btn"
                disabled={!isNecklaceOwned(ownership, draft.necklace) && coins < necklacePrice(draft.necklace)}
                onClick={() => confirmNecklace(draft.necklace)}
              >
                {isNecklaceOwned(ownership, draft.necklace) ? 'Ausrüsten' : `Kaufen für ${necklacePrice(draft.necklace)} 🪙`}
              </button>
            )}
          </section>

          <section className="shop-section panel">
            <h3 style={{ marginTop: 0 }}>Armband</h3>
            <div className="shop-option-row">
              {WRISTBANDS.map((w) => {
                const owned = isWristbandOwned(ownership, w.id)
                return (
                  <button
                    key={w.id}
                    className={`shop-option-btn ${draft.wristband === w.id ? 'active' : ''}`}
                    onClick={() => setDraft((d) => ({ ...d, wristband: w.id }))}
                  >
                    <span>{w.title}</span>
                    {!owned && <span className="shop-price">🪙 {w.price}</span>}
                    {owned && loadout.wristband === w.id && <span className="shop-owned">Ausgerüstet</span>}
                  </button>
                )
              })}
            </div>
            {draft.wristband !== loadout.wristband && (
              <button
                className="btn"
                disabled={!isWristbandOwned(ownership, draft.wristband) && coins < wristbandPrice(draft.wristband)}
                onClick={() => confirmWristband(draft.wristband)}
              >
                {isWristbandOwned(ownership, draft.wristband)
                  ? 'Ausrüsten'
                  : `Kaufen für ${wristbandPrice(draft.wristband)} 🪙`}
              </button>
            )}
          </section>

          <section className="shop-section panel">
            <h3 style={{ marginTop: 0 }}>Cape</h3>
            <div className="shop-option-row">
              {CAPES.map((c) => {
                const owned = isCapeOwned(ownership, c.id)
                return (
                  <button
                    key={c.id}
                    className={`shop-option-btn ${draft.cape === c.id ? 'active' : ''}`}
                    onClick={() => setDraft((d) => ({ ...d, cape: c.id }))}
                  >
                    <span>{c.title}</span>
                    {!owned && <span className="shop-price">🪙 {c.price}</span>}
                    {owned && loadout.cape === c.id && <span className="shop-owned">Ausgerüstet</span>}
                  </button>
                )
              })}
            </div>
            {draft.cape !== loadout.cape && (
              <button
                className="btn"
                disabled={!isCapeOwned(ownership, draft.cape) && coins < capePrice(draft.cape)}
                onClick={() => confirmCape(draft.cape)}
              >
                {isCapeOwned(ownership, draft.cape) ? 'Ausrüsten' : `Kaufen für ${capePrice(draft.cape)} 🪙`}
              </button>
            )}
          </section>

          {ownership.crown && (
            <section className="shop-section panel">
              <h3 style={{ marginTop: 0 }}>👑 Krone (Wochensieger-Bonus)</h3>
              <p className="subtitle" style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}>
                Nicht käuflich - wird automatisch vergeben, wenn dieser Charakter eine Woche gewinnt.
              </p>
              <div className="shop-option-row">
                <button
                  className={`shop-option-btn ${!draft.crown ? 'active' : ''}`}
                  onClick={() => setDraft((d) => ({ ...d, crown: false }))}
                >
                  Ohne
                </button>
                <button
                  className={`shop-option-btn ${draft.crown ? 'active' : ''}`}
                  onClick={() => setDraft((d) => ({ ...d, crown: true }))}
                >
                  <span>Mit Krone</span>
                  {loadout.crown && draft.crown && <span className="shop-owned">Ausgerüstet</span>}
                </button>
              </div>
              {draft.crown !== loadout.crown && (
                <button className="btn" onClick={() => equipCrown(shopPlayer!, draft.crown)}>
                  Ausrüsten
                </button>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
