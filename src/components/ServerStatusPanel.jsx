import { siteConfig } from '../siteConfig.js'
import { useServerStatus } from '../hooks/useServerStatus.js'
import './ServerStatusPanel.css'

export default function ServerStatusPanel() {
  const status = useServerStatus(siteConfig.cfxCode)
  const pct = status.maxPlayers ? Math.min(100, Math.round((status.players / status.maxPlayers) * 100)) : 0

  if (!siteConfig.showServerStatus) return null

  return (
    <section id="status" className="section server-status">
      <div className="container">
        <span className="eyebrow">Live</span>

        <div className="terminal">
          <div className="terminal__bar">
            <span className="terminal__dot terminal__dot--red" />
            <span className="terminal__dot terminal__dot--yellow" />
            <span className="terminal__dot terminal__dot--green" />
            <span className="terminal__bar-label">Projekt@status ~ live-check</span>
          </div>

          <div className="terminal__body">
            <div className="terminal__row">
              <span className="terminal__key">status</span>
              <span className={`terminal__value terminal__value--${status.state}`}>
                {status.state === 'online' && 'ONLINE'}
                {status.state === 'offline' && 'OFFLINE'}
                {status.state === 'loading' && 'HENTER…'}
              </span>
            </div>
            <div className="terminal__row">
              <span className="terminal__key">spillere</span>
              <span className="terminal__value">
                {status.state === 'online' ? `${status.players} / ${status.maxPlayers || '—'}` : '—'}
              </span>
            </div>
            <div className="terminal__row">
              <span className="terminal__key">belægning</span>
              <div className="terminal__bar-track">
                <div className="terminal__bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {siteConfig.connectUrl && (
              <a className="btn btn-primary terminal__connect" href={siteConfig.connectUrl}>
                Forbind nu →
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
