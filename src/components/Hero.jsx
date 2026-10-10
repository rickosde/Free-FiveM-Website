import { siteConfig } from '../siteConfig.js'
import { useServerStatus } from '../hooks/useServerStatus.js'
import './Hero.css'

export default function Hero() {
  const status = useServerStatus(siteConfig.cfxCode)

  return (
    <section id="top" className="hero">
      <div className="hero__glow" aria-hidden="true" />
      <div className="container hero__inner">
        <div className="hero__copy">
          <h1
            className="hero__title"
            style={{
              background: 'linear-gradient(90deg, #6d28d9, #3b82f6, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {siteConfig.serverName}
          </h1>
          <p className="hero__tagline">{siteConfig.tagline}</p>
          <p className="hero__desc">{siteConfig.description}</p>

          <div className="hero__actions">
            {siteConfig.connectUrl && (
              <a className="btn btn-primary" href={siteConfig.connectUrl}>
                Forbind til serveren
              </a>
            )}
            {siteConfig.discordUrl && (
              <a className="btn btn-ghost" href={siteConfig.discordUrl} target="_blank" rel="noreferrer">
                Join Discord
              </a>
            )}
          </div>

          <div className="hero__status">
            <span className={`hero__status-dot hero__status-dot--${status.state}`} />
            {status.state === 'online' && (
              <span>
                Online — <strong>{status.players}</strong>
                {status.maxPlayers ? ` / ${status.maxPlayers}` : ''} spillere i byen
              </span>
            )}
            {status.state === 'offline' && <span>Serveren er offline lige nu — prøv igen senere</span>}
            {status.state === 'loading' && <span>Henter live status …</span>}
          </div>
        </div>
      </div>
    </section>
  )
}
