import { labelFor, type TrackedItem } from '../lib/types'

/** The five (or six, with "None") big labelled buttons for a rating item. */
export function RatingOptions({
  item,
  selected,
  disabled,
  onPick,
}: {
  item: TrackedItem
  selected?: number | null
  disabled?: boolean
  onPick: (value: number) => void
}) {
  const values = item.allows_none ? [0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5]
  return (
    <div className="rating-options">
      {values.map((v) => {
        const words = labelFor(item, v)
        return (
          <button
            key={v}
            type="button"
            className={'rating-option' + (selected === v ? ' selected' : '')}
            disabled={disabled}
            onClick={() => onPick(v)}
          >
            <span className="rating-num">{v}</span>
            <span className="rating-words">{words ?? (v === 0 ? 'None' : '')}</span>
          </button>
        )
      })}
    </div>
  )
}

export function directionHint(item: TrackedItem): string {
  if (item.direction === 'higher_is_worse') return 'Higher means worse.'
  if (item.direction === 'higher_is_better') return 'Higher means better.'
  return ''
}
