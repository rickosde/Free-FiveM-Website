import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { brandAssetUrl } from '../lib/brandAssets.js'
import { siteConfig } from '../siteConfig.js'
import './Navbar.css'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState(null)
  const [isStaff, setIsStaff] = useState(false)
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  const isInnerPage = path !== '/'
  const isAdminPage = normalizedPath === 'admin'

  const resolveHref = (href) => {
    if (href.startsWith('#') && isInnerPage) return `/${href}`
    return href
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    let mounted = true

    const loadAuth = async () => {
      try {
        const me = await api('/auth/me')
        if (!mounted) return
        const nextProfile = me?.loggedIn ? me?.profile : null
        setProfile(nextProfile)
        setIsStaff(Boolean(nextProfile?.isAdmin))
      } catch {
        if (!mounted) return
        setProfile(null)
        setIsStaff(false)
      }
    }

    loadAuth()

    return () => {
      mounted = false
    }
  }, [])

  const navItems = siteConfig.nav.filter((item) => item.href !== '/ansogning')
  const profileName = profile?.globalName || profile?.username || ''
  const loginHref = profile ? '/ansogning' : '/api/auth/discord/login?next=/ansogning'
  const loginLabel = 'login med discord'

  const handleLogout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      setProfile(null)
      setIsStaff(false)
      setOpen(false)
    }
  }

  return (
    <header className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
      <div className="container nav__inner">
        <a href={isInnerPage ? '/' : '#top'} className="nav__logo">
          {brandAssetUrl && <img className="nav__logo-mark" src={brandAssetUrl} alt={`${siteConfig.serverName} logo`} />}
          <span>{siteConfig.serverName}</span>
        </a>

        <nav className={`nav__links ${open ? 'nav__links--open' : ''}`}>
          {navItems.map((item) => (
            <a key={item.href} href={resolveHref(item.href)} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
          <div className="nav__cta-mobile">
            {profile ? (
              <div className="nav__account">
                <img className="nav__account-avatar" src={profile.avatar} alt="" />
                <div className="nav__account-text">
                  <div className="nav__account-name">{profileName}</div>
                  <a className="nav__account-link" href="/ansogning" onClick={() => setOpen(false)}>
                    Åben Ansøgninger
                  </a>
                </div>
                <button className="btn btn-ghost btn-sm nav__account-logout" onClick={handleLogout}>
                  Log ud
                </button>
              </div>
            ) : (
              <a className="btn btn-ghost btn-sm" href={loginHref}>
                {loginLabel}
              </a>
            )}
            {isStaff && !isAdminPage && (
              <a className="btn btn-ghost btn-sm" href="/admin">
                Admin panel
              </a>
            )}
            {siteConfig.connectUrl && (
              <a className="btn btn-primary btn-sm" href={siteConfig.connectUrl}>
                Forbind
              </a>
            )}
          </div>
        </nav>

        <div className="nav__cta-desktop">
          {profile ? (
            <div className="nav__account">
              <img className="nav__account-avatar" src={profile.avatar} alt="" />
              <div className="nav__account-text">
                <div className="nav__account-name">{profileName}</div>
                <a className="nav__account-link" href="/ansogning">
                  Åben Ansøgninger
                </a>
              </div>
              <button className="btn btn-ghost btn-sm nav__account-logout" onClick={handleLogout}>
                Log ud
              </button>
            </div>
          ) : (
            <a className="btn btn-ghost btn-sm" href={loginHref}>
              {loginLabel}
            </a>
          )}
          {isStaff && !isAdminPage && (
            <a className="btn btn-ghost btn-sm" href="/admin">
              Admin panel
            </a>
          )}
          {siteConfig.connectUrl && (
            <a className="btn btn-primary btn-sm" href={siteConfig.connectUrl}>
              Forbind til serveren
            </a>
          )}
        </div>

        <button
          className={`nav__burger ${open ? 'nav__burger--open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="Åbn menu"
          aria-expanded={open}
        >
          <span />
          <span />
        </button>
      </div>
    </header>
  )
}
