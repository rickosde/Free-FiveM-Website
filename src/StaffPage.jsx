import { useEffect, useState } from 'react'
import { api } from './lib/api.js'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import './components/DiscordLogin.css'

export default function StaffPage() {
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState([])
  const [error, setError] = useState('')
  const [loadedAvatars, setLoadedAvatars] = useState({})

  useEffect(() => {
    let mounted = true

    const fetchStaff = async () => {
      try {
        const members = await api('/staff')
        if (!mounted) return
        setStaff(members)
      } catch (err) {
        if (!mounted) return
        setError(err.message)
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    fetchStaff()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <>
      <Navbar />
      <main>
        <section className="steam-login">
          <div className="container steam-login__inner">
            <div className="steam-login__topbar staff-page__hero">
              <div className="steam-login__guest staff-page__hero-card">
                <div className="steam-login__guest-copy">
                  <h2 className="steam-login__guest-title">Projekt Staff Teamet</h2>
                  <p className="steam-login__guest-text">
                  </p>
                </div>
                <div className="staff-page__hero-meta">
                  <span>{staff.length} medlem{staff.length === 1 ? '' : 'mer'}</span>
                  <span>Officiel Staff Medlemer</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="steam-login__loading">Henter staff-medlemmer …</div>
            ) : error ? (
              <div className="steam-login__error">{error}</div>
            ) : (
              <div className="staff-page__grid">
                {staff.map((member) => (
                  <article key={member.id} className="staff-card">
                    <div className="staff-card__top">
                      <div className="staff-card__avatar-wrap">
                        <img
                          className={`staff-card__avatar ${loadedAvatars[member.id] ? 'is-loaded' : ''}`}
                          src={member.avatar}
                          alt={`${member.displayName} avatar`}
                          loading="lazy"
                          decoding="async"
                          onLoad={() => setLoadedAvatars((prev) => ({ ...prev, [member.id]: true }))}
                          onError={(event) => {
                            event.currentTarget.classList.remove('is-loaded')
                            event.currentTarget.style.opacity = '0'
                          }}
                        />
                      </div>
                      <div className="staff-card__intro">
                        <div className="staff-card__badge">STAFF</div>
                        <h3 className="staff-card__name">{member.displayName}</h3>
                        <p className="staff-card__username">@{member.username || 'Ukendt'}</p>
                      </div>
                    </div>
                    <div className="staff-card__footer">
                      <p className="staff-card__role">Discord staffmedlem</p>
                      <div className="staff-card__details">
                        <span>ID:</span>
                        <code>{member.id}</code>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
