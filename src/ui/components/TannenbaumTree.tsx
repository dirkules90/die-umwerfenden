import { TANNENBAUM_ROWS } from '../../game/tannenbaumRules'

interface TannenbaumTreeProps {
  remaining: Record<number, number>
  compact?: boolean
}

/** Einfacher gezeichneter Tannenbaum: brauner Stamm (Zahlen 2, 3), grüne Krone (4-7).
 * Bereits geworfene Zahlen werden durchgestrichen, sobald sie abgehakt sind. */
export function TannenbaumTree({ remaining, compact = false }: TannenbaumTreeProps) {
  // Von oben nach unten gerendert: Baumspitze (7) zuerst, Stammfuß (2) zuletzt.
  const trunkRows = TANNENBAUM_ROWS.filter((r) => r.trunk).reverse()
  const crownRows = TANNENBAUM_ROWS.filter((r) => !r.trunk).reverse()

  const renderRow = (value: number, count: number) => {
    const open = remaining[value] ?? 0
    const checkedCount = count - open
    return (
      <div className="tannenbaum-row" key={value}>
        {Array.from({ length: count }).map((_, i) => (
          <span
            key={i}
            className={`tannenbaum-cell ${i < checkedCount ? 'checked' : ''} ${value === 7 ? 'star' : ''}`}
          >
            {value}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className={`tannenbaum-tree ${compact ? 'compact' : ''}`}>
      <div className="tannenbaum-crown">{crownRows.map((r) => renderRow(r.value, r.count))}</div>
      <div className="tannenbaum-trunk">{trunkRows.map((r) => renderRow(r.value, r.count))}</div>
    </div>
  )
}
