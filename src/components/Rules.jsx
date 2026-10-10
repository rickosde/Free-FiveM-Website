import { useEffect, useState } from 'react'
import { siteConfig } from '../siteConfig.js'
import { api } from '../lib/api.js'
import './Rules.css'

export default function Rules() {
  const [rules, setRules] = useState(siteConfig.rules)

  useEffect(() => {
    ;(async () => {
      try {
        const liveRules = await api('/rules')
        if (Array.isArray(liveRules) && liveRules.length > 0) {
          setRules(liveRules)
        }
      } catch {
        // Fallback til statisk indhold, hvis API ikke er tilgængeligt.
      }
    })()
  }, [])

  return (
    <section id="regler" className="section rules">
      <div className="container rules__grid">
        <div className="rules__head">
          <h2 className="rules__title">Fire ting vi tager alvorligt</h2>
          <p className="rules__desc">
            Vi er ikke det største server på listen, og det er med vilje. Læs det her, før du ansøger —
            det sparer os begge for tid.
          </p>
        </div>

        <ol className="rules__list">
          {rules.map((r, i) => (
            <li className="rules__item" key={r.title}>
              <span className="rules__index">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{r.title}</h3>
                <p>{r.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
