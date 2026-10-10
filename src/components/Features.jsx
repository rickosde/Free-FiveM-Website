import { siteConfig } from '../siteConfig.js'
import './Features.css'

export default function Features() {
  return (
    <section id="features" className="section features">
      <div className="container">
        <div className="features__head">
          <h2 className="features__title">Hvad der holder byen kørende</h2>
        </div>

        <div className="features__grid">
          {siteConfig.features.map((f) => (
            <div className="feature-card" key={f.code}>
              <span className="feature-card__code">{f.code}</span>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__body">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
