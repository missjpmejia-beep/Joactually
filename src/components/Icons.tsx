import type { ItemKind } from '../lib/types'

const paths: Record<ItemKind, React.ReactNode> = {
  // three rising bars: a scale
  rating: (
    <>
      <path d="M6 18v-4" />
      <path d="M12 18V10" />
      <path d="M18 18V6" />
    </>
  ),
  // a capsule
  medication: (
    <>
      <rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-45 12 12)" />
      <path d="M9.5 9.5l5 5" />
    </>
  ),
  // a bowl
  event: (
    <>
      <path d="M4 11h16a8 8 0 0 1-16 0z" />
      <path d="M9 7c0-1 1-1.5 1-2.5M13 7c0-1 1-1.5 1-2.5" />
    </>
  ),
  // a crescent moon
  sleep: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
}

export function KindIcon({ kind }: { kind: ItemKind }) {
  return (
    <span className={`kind-icon k-${kind}`} aria-hidden="true">
      <svg viewBox="0 0 24 24">{paths[kind]}</svg>
    </span>
  )
}

export function Tick() {
  return (
    <span className="tick" aria-label="logged today">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 12.5l4 4 8-9" />
      </svg>
    </span>
  )
}
