import { siteConfig } from '../siteConfig.js'
import { brandAssetUrl } from '../lib/brandAssets.js'
import './Footer.css'

export default function Footer() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const isInnerPage = path !== '/'
  const resolveHref = (href) => {
    if (href.startsWith('#') && isInnerPage) return `/${href}`
    return href
  }

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          {brandAssetUrl && <img className="footer__logo" src={brandAssetUrl} alt={`${siteConfig.serverName} logo`} />}
          <div>
            <div className="footer__brand-name">{siteConfig.serverName}</div>
            <div className="footer__brand-sub">{siteConfig.tagline}</div>
          </div>
        </div>

        <nav className="footer__links">
          {siteConfig.nav.map((item) => (
            <a key={item.href} href={resolveHref(item.href)}>
              {item.label}
            </a>
          ))}
          {siteConfig.discordUrl && (
            <a href={siteConfig.discordUrl} target="_blank" rel="noreferrer">
              Discord
            </a>
          )}
        </nav>

        <div className="footer__meta">
          <span>© {new Date().getFullYear()} {siteConfig.serverName}. Ikke tilknyttet Rockstar Games.</span>
        </div>
      </div>
    </footer>
  )
}
