import { useCallback, useEffect, useMemo, useState } from 'react'
import './DiscordLogin.css'
import { api } from '../lib/api.js'

export default function DiscordLogin() {
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const getApplicationPathId = () => {
    const path = window.location.pathname.replace(/\/+$/, '')
    const parts = path.split('/')
    return parts[1] === 'ansogning' && parts[2] ? parts[2] : ''
  }

  const initialSelectedApplicationId = getApplicationPathId()
  const [applications, setApplications] = useState([])
  const [selectedApplicationId, setSelectedApplicationId] = useState(initialSelectedApplicationId)
  const [view, setView] = useState(initialSelectedApplicationId ? 'form' : 'list')
  const [answerCache, setAnswerCache] = useState({})
  const [submitted, setSubmitted] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isAdmin = Boolean(profile?.isAdmin)
  const selectedApplication = useMemo(
    () => applications.find((item) => item.id === selectedApplicationId) || null,
    [applications, selectedApplicationId]
  )

  const openApplications = useMemo(
    () => applications.filter((item) => item.status !== 'closed'),
    [applications]
  )

  const refreshMe = useCallback(async () => {
    try {
      const me = await api('/auth/me')
      setProfile(me.loggedIn ? me.profile : null)
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const refreshApplications = useCallback(async () => {
    try {
      const list = await api('/applications')
      setApplications(list)
      // If the URL contains an application id, keep it selected; otherwise clear selection
      const idFromPath = getApplicationPathId()
      const hasIdInList = idFromPath && list.some((it) => it.id === idFromPath)
      if (hasIdInList) {
        setSelectedApplicationId(idFromPath)
        setView('form')
      } else {
        setSelectedApplicationId('')
        setView('list')
      }
    } catch {
      setError('Kunne ikke hente ansøgningstyper — er backend-serveren startet? (se server/README.md)')
    }
  }, [selectedApplicationId])

  useEffect(() => {
    refreshMe()
    refreshApplications()
    const loginState = new URLSearchParams(window.location.search).get('login')
    if (loginState === 'failed') {
      setError('Discord-login mislykkedes. Prøv igen.')
    } else if (loginState === 'config') {
      setError('Discord-login er ikke sat korrekt op på serveren (client id/secret/redirect URI).')
    }
  }, [refreshApplications, refreshMe])

  const handleLogin = () => {
    const nextPath = encodeURIComponent(window.location.pathname)
    window.location.href = `/api/auth/discord/login?next=${nextPath}`
  }

  const handleLogout = async () => {
    await api('/auth/logout', { method: 'POST' })
    setProfile(null)
  }

  const navigateToApplication = (applicationId) => {
    const targetPath = applicationId ? `/ansogning/${applicationId}` : '/ansogning'
    window.history.pushState(null, '', targetPath)
  }

  const handleChooseApplication = (applicationId) => {
    const application = applications.find((item) => item.id === applicationId)
    if (!application || application.status === 'closed') return
    setSelectedApplicationId(applicationId)
    setView('form')
    navigateToApplication(applicationId)
  }

  const handleBackToApplications = () => {
    setView('list')
    navigateToApplication('')
  }

  useEffect(() => {
    const onPopState = () => {
      const applicationId = getApplicationPathId()
      setSelectedApplicationId(applicationId)
      setView(applicationId ? 'form' : 'list')
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const handleAnswerChange = (questionId, value) => {
    if (!selectedApplicationId) return
    setAnswerCache((prev) => ({
      ...prev,
      [selectedApplicationId]: {
        ...(prev[selectedApplicationId] || {}),
        [questionId]: value,
      },
    }))
  }

  const handleApply = async () => {
    if (!selectedApplication || submitted.includes(selectedApplication.id)) return
    if (selectedApplication.status === 'closed') {
      setError('Denne ansøgning er lukket og kan ikke sendes.')
      return
    }
    try {
      setSubmitting(true)
      setError('')
      setSuccess('')
      const answers = answerCache[selectedApplication.id] || {}
      await api('/submissions', {
        method: 'POST',
        body: JSON.stringify({
          applicationId: selectedApplication.id,
          answers,
        }),
      })
      setSubmitted((prev) => [...prev, selectedApplication.id])
      setSuccess('Din ansøgning er sendt. Vi svarer i Discord, når den er gennemgået.')
    } catch (err) {
      if (err.message.includes('åben ansøgning')) {
        setError(err.message)
      } else {
        setError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const selectedAnswers = selectedApplication ? answerCache[selectedApplication.id] || {} : {}

  return (
    <section id="ansogninger" className="steam-login">
      <div className="container steam-login__inner">
        <div className="steam-login__topbar">
          {error && <div className="steam-login__error">{error}</div>}

          {authLoading ? (
            <div className="steam-login__loading">Tjekker login-status …</div>
          ) : !profile ? (
            <div className="steam-login__guest">
              <div className="steam-login__guest-copy">
                <span className="steam-login__guest-label">Ansøgning</span>
                <h2 className="steam-login__guest-title">Få din ansøgning gennemset hurtigt og professionelt</h2>
                <p className="steam-login__guest-text">
                  Log ind med Discord, vælg den ønskede ansøgningstype og udfyld spørgsmålene klart og præcist. Din ansøgning sendes direkte til vores team.
                </p>
              </div>
              <button className="btn btn-primary steam-login__button" onClick={handleLogin}>
                Log ind med Discord
              </button>
            </div>
          ) : (
            <div className="steam-login__status-banner">
              Du er logget ind som <strong>{profile?.globalName || profile?.username}</strong>
            </div>
          )}
        </div>

        {profile && view === 'list' && (
          <div className="steam-login__applications">
            <div className="steam-login__applications-head">
              <h3>Vælg ansøgningstype</h3>
              <p>Hver afdeling har sin egen formular. Vælg kortet og udfyld spørgsmålene professionelt.</p>
            </div>
            {applications.length === 0 ? (
              <div className="steam-login__error">Der er i øjeblikket ingen ansøgninger.</div>
            ) : (
              <div className="steam-login__applications-grid">
                {applications.map((item) => {
                  const isApplied = submitted.includes(item.id)
                  const isSelected = selectedApplicationId === item.id
                  const isClosed = item.status === 'closed'
                  return (
                    <article
                      key={item.id}
                      className={`application-card ${isSelected ? 'application-card--selected' : ''} ${isClosed ? 'application-card--closed' : ''}`}
                      style={{
                        '--application-accent': item.color || '#3fd1dc',
                        '--application-accent-soft': item.color ? `${item.color}25` : 'rgba(63, 209, 220, 0.15)',
                      }}
                      onClick={() => handleChooseApplication(item.id)}
                    >
                      {isClosed && <div className="application-card__status-overlay">Lukket</div>}
                      <div
                        className="application-card__media"
                        style={item.imageUrl ? { backgroundImage: `url(${item.imageUrl})` } : undefined}
                      />
                      <div className="application-card__content">
                        <div className="application-card__label">ANSØGNING</div>
                        <h4 className="application-card__title">{item.title}</h4>
                        <p className="application-card__description">{item.description}</p>
                        <p className="application-card__meta">{item.meta}</p>
                      </div>
                      <div className="application-card__footer">
                        <span className="application-card__cta">{isApplied ? 'Ansøgt' : isClosed ? 'Lukket' : 'Klar til formular'}</span>
                        <span className="application-card__pick">{isSelected ? 'Valgt' : isClosed ? 'Lukket' : 'Vælg'}</span>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {profile && view === 'form' && selectedApplication && (
          <div
            className="steam-login__form-panel"
            style={{
              '--application-accent': selectedApplication.color || '#3fd1dc',
              '--application-accent-soft': selectedApplication.color ? `${selectedApplication.color}25` : 'rgba(63, 209, 220, 0.12)',
            }}
          >
            <div className="steam-login__form-head">
              <div>
                <p className="steam-login__form-badge">Ansøgningsformular</p>
                <h4>{selectedApplication.title}</h4>
              </div>
              <div>
                <p>{selectedApplication.meta}</p>
                <button className="btn btn-ghost btn-sm" onClick={handleBackToApplications}>
                  Tilbage til ansøgninger
                </button>
              </div>
            </div>

            <div className="steam-login__form-grid">
              {selectedApplication.questions.map((question) => {
                const value = selectedAnswers[question.id]

                if (question.type === 'textarea') {
                  return (
                    <label key={question.id} className="steam-login__field">
                      <span>{question.label}</span>
                      <textarea
                        rows="4"
                        placeholder={question.placeholder}
                        value={typeof value === 'string' ? value : ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      />
                    </label>
                  )
                }

                if (question.type === 'select') {
                  return (
                    <label key={question.id} className="steam-login__field">
                      <span>{question.label}</span>
                      <select
                        value={typeof value === 'string' ? value : ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      >
                        <option value="">Vaelg...</option>
                        {question.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  )
                }

                if (question.type === 'multiselect') {
                  const selectedValues = Array.isArray(value) ? value : []
                  return (
                    <fieldset key={question.id} className="steam-login__field steam-login__field--chips">
                      <legend>{question.label}</legend>
                      <div className="steam-login__chips">
                        {question.options.map((option) => {
                          const checked = selectedValues.includes(option)
                          return (
                            <label key={option} className={`steam-login__chip ${checked ? 'steam-login__chip--active' : ''}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleAnswerChange(question.id, [...selectedValues, option])
                                  } else {
                                    handleAnswerChange(
                                      question.id,
                                      selectedValues.filter((item) => item !== option)
                                    )
                                  }
                                }}
                              />
                              {option}
                            </label>
                          )
                        })}
                      </div>
                    </fieldset>
                  )
                }

                return (
                  <label key={question.id} className="steam-login__field">
                    <span>{question.label}</span>
                    <input
                      type={question.type === 'number' ? 'number' : 'text'}
                      placeholder={question.placeholder}
                      value={typeof value === 'string' ? value : ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    />
                  </label>
                )
              })}
            </div>

            {success && <div className="steam-login__success">{success}</div>}

            <div className="steam-login__form-actions">
              <button
                className="btn btn-primary"
                onClick={handleApply}
                disabled={submitting || submitted.includes(selectedApplication.id)}
              >
                {submitted.includes(selectedApplication.id)
                  ? 'Ansøgning sendt'
                  : submitting
                    ? 'Sender...'
                    : 'Send ansøgning'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
