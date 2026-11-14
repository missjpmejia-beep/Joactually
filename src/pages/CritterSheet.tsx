import '@fontsource/bagel-fat-one/latin-400.css'
import '@fontsource-variable/rubik/wght.css'
import '../riso.css'
import { Critter, type CritterType } from '../components/Critter'

const ROWS: { type: CritterType; title: string; note: string; scored: boolean; shadow: string }[] = [
  { type: 'mood', title: 'Mood', note: 'Higher = happier', scored: true, shadow: 'var(--riso-pink)' },
  { type: 'anxiety', title: 'Anxiety', note: 'Inverted: higher = more anxious', scored: true, shadow: 'var(--riso-blue)' },
  { type: 'energy', title: 'Energy', note: 'Higher = more awake · battery follows the score', scored: true, shadow: 'var(--riso-yellow)' },
  { type: 'sleep', title: 'Sleep', note: 'Sleep quality · eyes open more as it goes up', scored: true, shadow: 'var(--riso-pink)' },
  { type: 'food', title: 'Food', note: 'Not logged / logged', scored: false, shadow: 'var(--riso-green)' },
  { type: 'meds', title: 'Meds', note: 'Not logged / logged', scored: false, shadow: 'var(--riso-green)' },
]

/** A test sheet showing every critter at every score, for Jo to approve. */
export function CritterSheet() {
  return (
    <div className="riso">
      <div className="critter-sheet">
        <span className="logo">Jo, Actually.</span>
        <h1>Critter test sheet</h1>
        <p className="intro">Every critter at every score. Faded = not logged today.</p>
        {ROWS.map((r) => (
          <section
            key={r.type}
            className={'r-card critter-row' + (r.type === 'sleep' ? ' dark' : '')}
            style={{ ['--shadow' as string]: r.shadow }}
          >
            <h2>{r.title}</h2>
            <p>{r.note}</p>
            <div className="critter-cells">
              <div className="critter-cell">
                <Critter type={r.type} score={null} logged={false} />
                <span>not logged</span>
              </div>
              {r.scored
                ? [1, 2, 3, 4, 5].map((s) => (
                    <div key={s} className="critter-cell">
                      <Critter type={r.type} score={s} />
                      <span className="display">{s}/5</span>
                    </div>
                  ))
                : (
                    <div className="critter-cell">
                      <Critter type={r.type} score={null} logged />
                      <span>logged</span>
                    </div>
                  )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
