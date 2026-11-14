import { Critter } from '../components/Critter'

export function Patterns() {
  return (
    <div className="page">
      <h1>
        <span className="marker">Patterns</span>
      </h1>
      <div className="patterns-empty">
        <Critter type="sleep" score={null} logged={false} size={120} />
        <p className="r-bubble">Patterns will appear here once there’s enough data.</p>
      </div>
    </div>
  )
}
