import { siteConfig } from '../siteConfig.js'
import './About.css'

export default function About() {
  return (
    <section id="om" className="section about">
      <div className="container about__grid">
        <div className="about__copy">
          <h2 className="about__title">Bygget som en by, ikke en server</h2>
          <p>
            {siteConfig.serverName} er lavet med et mål om at skabe en seriøs og gennemført
            FiveM-server. Vi bruger tid på at udvikle vores egne løsninger og sørger for,
            at serverens systemer fungerer godt sammen.
          </p>
          <p>
            Ingen pay-to-win. Ingen genveje. Bare et community der tager rp seriøst, og et team
            der bygger nyt indhold hver måned.
          </p>
        </div>

        <div className="about__stats">
          {siteConfig.stats.map((s) => (
            <div className="about__stat" key={s.label}>
              <span className="about__stat-value">{s.value}</span>
              <span className="about__stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
