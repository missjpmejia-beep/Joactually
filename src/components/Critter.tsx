import type { ReactNode } from 'react'

/**
 * Riso Critters: little blob characters whose faces mirror a logged score.
 * Everything that decides how a critter looks lives in CRITTERS and FACES below.
 * Gentle on purpose: low scores look sad or worried, never grotesque. A mirror, not a judgement.
 */

export type CritterType = 'mood' | 'anxiety' | 'energy' | 'food' | 'sleep' | 'meds'

export const RISO = {
  paper: '#F7F1E5',
  ink: '#1F2A5C',
  pink: '#FF48B0',
  blue: '#0078BF',
  yellow: '#FFE800',
  green: '#00A95C',
  orange: '#FF6C2F',
  orangeText: '#C24A00',
  lilac: '#B49CFF',
}

// ── Faces ────────────────────────────────────────────────────

type Eyes = 'dot' | 'happy' | 'closed' | 'sad' | 'heavy' | 'half' | 'wide' | 'worried' | 'wink'
type Mouth = 'frown' | 'slightFrown' | 'flat' | 'softSmile' | 'smallSmile' | 'smile' | 'grin' | 'wobbly' | 'wavy'
type Extra = 'cheeks' | 'sparkle' | 'sweat'

export interface Face {
  eyes: Eyes
  mouth: Mouth
  extras?: Extra[]
}

const NEUTRAL: Face = { eyes: 'dot', mouth: 'flat' }

/** Expression for each type at each score (index 1–5). Tweak here. */
export const FACES: Record<'mood' | 'anxiety' | 'energy' | 'sleep', Record<1 | 2 | 3 | 4 | 5, Face>> = {
  // Higher = happier
  mood: {
    1: { eyes: 'sad', mouth: 'frown' },
    2: { eyes: 'dot', mouth: 'slightFrown' },
    3: { eyes: 'dot', mouth: 'smallSmile' },
    4: { eyes: 'dot', mouth: 'smile', extras: ['cheeks'] },
    5: { eyes: 'happy', mouth: 'grin', extras: ['cheeks', 'sparkle'] },
  },
  // Inverted: higher = more anxious
  anxiety: {
    1: { eyes: 'happy', mouth: 'smile' },
    2: { eyes: 'happy', mouth: 'softSmile' },
    3: { eyes: 'dot', mouth: 'flat' },
    4: { eyes: 'worried', mouth: 'wobbly' },
    5: { eyes: 'worried', mouth: 'wavy', extras: ['sweat'] },
  },
  // Higher = more awake (battery level follows the score)
  energy: {
    1: { eyes: 'closed', mouth: 'flat' },
    2: { eyes: 'heavy', mouth: 'flat' },
    3: { eyes: 'half', mouth: 'flat' },
    4: { eyes: 'dot', mouth: 'smallSmile' },
    5: { eyes: 'wide', mouth: 'smile', extras: ['sparkle'] },
  },
  // Sleep quality: eyes open more as the rating goes up
  sleep: {
    1: { eyes: 'closed', mouth: 'slightFrown' },
    2: { eyes: 'heavy', mouth: 'flat' },
    3: { eyes: 'half', mouth: 'softSmile' },
    4: { eyes: 'dot', mouth: 'smallSmile' },
    5: { eyes: 'dot', mouth: 'smile', extras: ['cheeks'] },
  },
}

const LOGGED_HAPPY: Face = { eyes: 'dot', mouth: 'smile', extras: ['cheeks'] }
const SLEEP_WAITING: Face = { eyes: 'wink', mouth: 'flat' }

export function faceFor(type: CritterType, score: number | null, logged: boolean): Face {
  if (type === 'food' || type === 'meds') return logged ? LOGGED_HAPPY : NEUTRAL
  if (type === 'sleep' && !logged) return SLEEP_WAITING
  if (!logged || score === null || score < 1) return NEUTRAL
  return FACES[type][Math.min(5, Math.round(score)) as 1 | 2 | 3 | 4 | 5]
}

// ── Bodies ───────────────────────────────────────────────────

interface Body {
  /** main ink and the second, misregistered ink */
  ink1: string
  ink2: string
  ink2Opacity: number
  offset: [number, number]
  shape: (fill: string) => ReactNode
  /** colour of the face features */
  faceInk: string
  /** where the face sits */
  cx: number
  cy: number
  blend?: 'multiply' | 'screen'
}

const blob = 'M60 8 C88 6 106 26 104 52 C102 80 82 94 58 94 C30 94 14 78 16 50 C18 24 34 10 60 8 Z'
const lump = 'M24 78 C16 58 24 26 50 16 C74 8 104 18 108 44 C112 66 102 90 74 92 C54 94 32 94 24 78 Z'
const cloud = 'M14 58 C12 36 32 22 60 22 C88 22 108 36 106 58 C104 80 86 88 60 88 C32 88 16 80 14 58 Z'

export const CRITTERS: Record<CritterType, Body> = {
  mood: {
    ink1: RISO.pink, ink2: RISO.yellow, ink2Opacity: 0.3, offset: [5, 4],
    shape: (f) => <path d={blob} fill={f} />, faceInk: RISO.ink, cx: 60, cy: 50,
  },
  anxiety: {
    ink1: RISO.blue, ink2: RISO.green, ink2Opacity: 0.4, offset: [-4, 3],
    shape: (f) => <path d={lump} fill={f} opacity={0.85} />, faceInk: RISO.paper, cx: 64, cy: 50,
  },
  energy: {
    ink1: RISO.yellow, ink2: RISO.orange, ink2Opacity: 0.35, offset: [4, 3],
    shape: (f) => <rect x={26} y={22} width={68} height={70} rx={26} fill={f} />, faceInk: RISO.ink, cx: 60, cy: 56,
  },
  food: {
    ink1: RISO.orange, ink2: RISO.yellow, ink2Opacity: 0.6, offset: [4, -3],
    shape: (f) => <path d="M16 46 h88 a44 44 0 0 1 -88 0 z" fill={f} />, faceInk: RISO.ink, cx: 60, cy: 62,
  },
  sleep: {
    ink1: RISO.lilac, ink2: RISO.lilac, ink2Opacity: 0, offset: [0, 0], blend: 'screen',
    shape: (f) => <path d={cloud} fill={f} />, faceInk: RISO.ink, cx: 60, cy: 56,
  },
  meds: {
    ink1: RISO.green, ink2: RISO.pink, ink2Opacity: 0.4, offset: [0, 0],
    shape: (f) => <rect x={8} y={30} width={104} height={50} rx={25} fill={f} />, faceInk: RISO.ink, cx: 60, cy: 54,
  },
}

// ── Drawing ──────────────────────────────────────────────────

function eyes(kind: Eyes, cx: number, cy: number, c: string, highlight: string): ReactNode {
  const L = cx - 15
  const R = cx + 15
  const y = cy - 4
  const stroke = { fill: 'none', stroke: c, strokeWidth: 3.5, strokeLinecap: 'round' as const }
  const dot = (x: number, r = 5.5) => (
    <g key={x}>
      <circle cx={x} cy={y} r={r} fill={c} />
      <circle cx={x + 1.8} cy={y - 1.8} r={r * 0.33} fill={highlight} />
    </g>
  )
  switch (kind) {
    case 'dot':
      return [dot(L), dot(R)]
    case 'happy': // closed, smiling arches
      return [L, R].map((x) => <path key={x} d={`M${x - 6} ${y + 2} Q${x} ${y - 6} ${x + 6} ${y + 2}`} {...stroke} />)
    case 'closed': // asleep
      return [L, R].map((x) => <path key={x} d={`M${x - 6} ${y} Q${x} ${y + 5} ${x + 6} ${y}`} {...stroke} />)
    case 'wink': // one eye open
      return [
        <path key="l" d={`M${L - 6} ${y} Q${L} ${y + 5} ${L + 6} ${y}`} {...stroke} />,
        <circle key="r" cx={R} cy={y} r={5} fill={c} />,
      ]
    case 'sad': // soft dots under gently sloping brows
      return [
        dot(L, 4.5),
        dot(R, 4.5),
        <path key="bl" d={`M${L - 7} ${y - 7} L${L + 5} ${y - 11}`} {...stroke} strokeWidth={3} />,
        <path key="br" d={`M${R + 7} ${y - 7} L${R - 5} ${y - 11}`} {...stroke} strokeWidth={3} />,
      ]
    case 'worried': // raised brows
      return [
        dot(L, 5),
        dot(R, 5),
        <path key="bl" d={`M${L - 6} ${y - 9} Q${L} ${y - 14} ${L + 6} ${y - 11}`} {...stroke} strokeWidth={3} />,
        <path key="br" d={`M${R + 6} ${y - 9} Q${R} ${y - 14} ${R - 6} ${y - 11}`} {...stroke} strokeWidth={3} />,
      ]
    case 'heavy': // mostly closed lids
      return [L, R].flatMap((x) => [
        <path key={'lid' + x} d={`M${x - 7} ${y + 1} h14`} {...stroke} />,
        <path key={'p' + x} d={`M${x - 4} ${y + 2} Q${x} ${y + 6} ${x + 4} ${y + 2} Z`} fill={c} />,
      ])
    case 'half': // half-lidded
      return [L, R].flatMap((x) => [
        <path key={'lid' + x} d={`M${x - 7} ${y - 2} h14`} {...stroke} />,
        <circle key={'p' + x} cx={x} cy={y + 2} r={4} fill={c} />,
      ])
    case 'wide':
      return [L, R].flatMap((x) => [
        <circle key={'w' + x} cx={x} cy={y} r={8} fill={RISO.paper} stroke={c} strokeWidth={2.5} />,
        <circle key={'p' + x} cx={x} cy={y} r={4} fill={c} />,
      ])
  }
}

function mouth(kind: Mouth, cx: number, cy: number, c: string): ReactNode {
  const y = cy + 14
  const s = { fill: 'none', stroke: c, strokeWidth: 3.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (kind) {
    case 'frown':
      return <path d={`M${cx - 11} ${y + 4} Q${cx} ${y - 5} ${cx + 11} ${y + 4}`} {...s} />
    case 'slightFrown':
      return <path d={`M${cx - 9} ${y + 2} Q${cx} ${y - 2} ${cx + 9} ${y + 2}`} {...s} />
    case 'flat':
      return <path d={`M${cx - 7} ${y} h14`} {...s} />
    case 'softSmile':
      return <path d={`M${cx - 8} ${y - 1} Q${cx} ${y + 4} ${cx + 8} ${y - 1}`} {...s} />
    case 'smallSmile':
      return <path d={`M${cx - 10} ${y - 2} Q${cx} ${y + 5} ${cx + 10} ${y - 2}`} {...s} />
    case 'smile':
      return <path d={`M${cx - 13} ${y - 3} Q${cx} ${y + 9} ${cx + 13} ${y - 3}`} {...s} />
    case 'grin':
      return <path d={`M${cx - 14} ${y - 4} Q${cx} ${y + 14} ${cx + 14} ${y - 4} Z`} fill={c} stroke={c} strokeWidth={2} strokeLinejoin="round" />
    case 'wobbly':
      return <path d={`M${cx - 12} ${y} q3 -3 6 0 q3 3 6 0 q3 -3 6 0 q3 3 6 0`} {...s} strokeWidth={3} />
    case 'wavy':
      return <path d={`M${cx - 14} ${y} q3.5 -5 7 0 q3.5 5 7 0 q3.5 -5 7 0 q3.5 5 7 0`} {...s} strokeWidth={3} />
  }
}

function extras(list: Extra[] | undefined, cx: number, cy: number): ReactNode {
  return (list ?? []).map((e) => {
    if (e === 'cheeks')
      return (
        <g key={e}>
          <ellipse cx={cx - 25} cy={cy + 10} rx={7} ry={4} fill={RISO.orange} opacity={0.6} />
          <ellipse cx={cx + 25} cy={cy + 10} rx={7} ry={4} fill={RISO.orange} opacity={0.6} />
        </g>
      )
    if (e === 'sparkle')
      return (
        <path
          key={e}
          d="M104 10 L107 18 L115 21 L107 24 L104 32 L101 24 L93 21 L101 18 Z"
          fill={RISO.yellow}
          stroke={RISO.ink}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      )
    // sweat drop
    return (
      <path key={e} d={`M${cx + 34} ${cy - 22} q6 9 0 12 q-6 -3 0 -12 Z`} fill={RISO.paper} stroke={RISO.ink} strokeWidth={1.8} />
    )
  })
}

function battery(score: number | null, logged: boolean): ReactNode {
  const level = logged && score ? Math.max(1, Math.min(5, Math.round(score))) : 0
  return (
    <g>
      <rect x={46} y={8} width={28} height={13} rx={3} fill={RISO.paper} stroke={RISO.ink} strokeWidth={2.5} />
      {level > 0 && <rect x={49} y={11} width={(22 * level) / 5} height={7} rx={1} fill={RISO.green} />}
    </g>
  )
}

export function Critter({
  type,
  score,
  logged = score !== null,
  size = 100,
  label,
}: {
  type: CritterType
  score: number | null
  logged?: boolean
  size?: number
  /** Give a label only for a critter that should be announced (the hero). */
  label?: string
}) {
  const body = CRITTERS[type]
  const face = faceFor(type, score, logged)
  const faded = !logged && type !== 'sleep' && type !== 'food' && type !== 'meds'
  // Light mode overprints like real riso (multiply); dark mode sets --critter-blend to screen
  const blend = { mixBlendMode: (body.blend ?? 'var(--critter-blend, multiply)') as 'multiply' }
  return (
    <svg
      className={'critter' + (faded ? ' faded' : '')}
      viewBox="0 0 120 100"
      width={size}
      height={(size * 100) / 120}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      style={{ overflow: 'visible' }}
    >
      {/* Second ink prints underneath, offset, so it shows as a misregistered edge */}
      {body.ink2Opacity > 0 && type !== 'meds' && (
        <g className="ink2" style={blend} opacity={body.ink2Opacity} transform={`translate(${body.offset[0]} ${body.offset[1]})`}>
          {body.shape(body.ink2)}
        </g>
      )}
      <g style={blend}>{body.shape(body.ink1)}</g>
      {/* The capsule's second colour is its other half, printed on top */}
      {type === 'meds' && (
        <g className="ink2 meds-half" style={blend} opacity={body.ink2Opacity}>
          <path d="M60 30 h27 a25 25 0 0 1 0 50 h-27 z" fill={body.ink2} />
        </g>
      )}
      {type === 'energy' && battery(score, logged)}
      {type === 'food' && (
        <path d="M46 34 q-4 -8 0 -16 M60 34 q-4 -8 0 -16 M74 34 q-4 -8 0 -16" fill="none" stroke={RISO.pink} strokeWidth={2.5} strokeLinecap="round" />
      )}
      {type === 'sleep' && !logged && (
        <path d="M16 20 q6 -8 12 -2" fill="none" stroke={RISO.yellow} strokeWidth={3} strokeLinecap="round" />
      )}
      {extras(face.extras, body.cx, body.cy)}
      {eyes(face.eyes, body.cx, body.cy, body.faceInk, type === 'anxiety' ? RISO.blue : RISO.paper)}
      {mouth(face.mouth, body.cx, body.cy, body.faceInk)}
    </svg>
  )
}
