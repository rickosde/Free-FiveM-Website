import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, formatDate } from '../lib/api.js'
import './AdminPanel.css'

const QUESTION_TYPES = [
  { value: 'text', label: 'Tekst (kort)' },
  { value: 'textarea', label: 'Tekst (lang)' },
  { value: 'number', label: 'Nummer' },
  { value: 'select', label: 'Dropdown (1 valg)' },
  { value: 'multiselect', label: 'Flere valg' },
]

function newQuestion() {
  return {
    id: `question_${Math.random().toString(36).slice(2, 8)}`,
    label: 'Nyt spoergsmaal',
    type: 'text',
    placeholder: '',
    required: true,
    options: [],
  }
}

function statusLabel(status) {
  if (status === 'approved') return 'Godkendt'
  if (status === 'rejected') return 'Afvist'
  return 'Afventer'
}

export default function AdminPanel() {
  const [authLoading, setAuthLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [profile, setProfile] = useState(null)
  const [applications, setApplications] = useState([])
  const [rules, setRules] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [reviewerRoles, setReviewerRoles] = useState([])
  const [reviewerRoleInput, setReviewerRoleInput] = useState('')
  const [dirtyApplications, setDirtyApplications] = useState({})
  const [activeTab, setActiveTab] = useState('applications')
  const [appQuery, setAppQuery] = useState('')
  const [appStatus, setAppStatus] = useState('all')
  const [submissionQuery, setSubmissionQuery] = useState('')
  const [submissionStatus, setSubmissionStatus] = useState('all')
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('')
  const [selectedSubmissionResponse, setSelectedSubmissionResponse] = useState('')
  const [respondingSubmissionId, setRespondingSubmissionId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [savingAppId, setSavingAppId] = useState('')
  const [savingRules, setSavingRules] = useState(false)
  const [savingReviewerRoles, setSavingReviewerRoles] = useState(false)
  const saveApplicationTimeouts = useRef({})
  const rulesSaveTimeout = useRef(null)
  const [rulesDirty, setRulesDirty] = useState(false)

  const submissionCount = submissions.length
  const pendingSubmissionCount = useMemo(
    () => submissions.filter((submission) => submission.status === 'pending').length,
    [submissions]
  )

  const markApplicationDirty = (id) => {
    setDirtyApplications((prev) => ({ ...prev, [id]: true }))
  }

  const clearApplicationDirty = (id) => {
    setDirtyApplications((prev) => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const scheduleApplicationSave = (application) => {
    if (!application?.id) return
    if (saveApplicationTimeouts.current[application.id]) {
      clearTimeout(saveApplicationTimeouts.current[application.id])
    }
    saveApplicationTimeouts.current[application.id] = window.setTimeout(() => {
      saveApplication(application)
    }, 1200)
  }

  const scheduleRulesSave = () => {
    setRulesDirty(true)
    if (rulesSaveTimeout.current) {
      clearTimeout(rulesSaveTimeout.current)
    }
    rulesSaveTimeout.current = window.setTimeout(() => {
      saveRules()
    }, 1200)
  }

  const loadDashboard = useCallback(async (withRefreshIndicator = false) => {
    if (withRefreshIndicator) setRefreshing(true)

    try {
      const me = await api('/auth/me')
      const user = me.loggedIn ? me.profile : null
      setProfile(user)

      if (user?.isAdmin || user?.isReviewer) {
        const dashboard = await api('/admin/dashboard')
        setApplications(dashboard.applications || [])
        setRules(dashboard.rules || [])
        setSubmissions(dashboard.submissions || [])
        setReviewerRoles(dashboard.reviewerRoles || [])
      } else {
        setApplications([])
        setRules([])
        setSubmissions([])
        setReviewerRoles([])
      }

      setDirtyApplications({})
    } catch (err) {
      setError(err.message)
    } finally {
      setAuthLoading(false)
      setLoading(false)
      if (withRefreshIndicator) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const tabs = useMemo(() => {
    if (!profile?.isAdmin) {
      return [{ id: 'submissions', label: 'Indsendte ansogninger', count: submissions.length }]
    }

    return [
      { id: 'applications', label: 'Ansogningsformularer', count: applications.length },
      { id: 'rules', label: 'Regler', count: rules.length },
      { id: 'submissions', label: 'Indsendte ansogninger', count: submissions.length },
    ]
  }, [applications.length, rules.length, submissions.length, profile?.isAdmin])

  const filteredApplications = useMemo(() => {
    const query = appQuery.trim().toLowerCase()

    return applications.filter((app) => {
      if (appStatus === 'saved' && dirtyApplications[app.id]) return false
      if (appStatus === 'unsaved' && !dirtyApplications[app.id]) return false

      if (!query) return true
      const bag = [app.title, app.description, app.meta, app.type].join(' ').toLowerCase()
      return bag.includes(query)
    })
  }, [applications, appQuery, appStatus, dirtyApplications])

  const filteredSubmissions = useMemo(() => {
    const query = submissionQuery.trim().toLowerCase()

    return submissions
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((submission) => {
        if (submissionStatus !== 'all' && submission.status !== submissionStatus) return false
        if (!query) return true
        const bag = [
          submission.id,
          submission.applicationTitle,
          submission.applicationId,
          submission.discordName,
          submission.discordId,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return bag.includes(query)
      })
  }, [submissions, submissionQuery, submissionStatus])

  useEffect(() => {
    if (filteredSubmissions.length === 0) {
      setSelectedSubmissionId('')
      return
    }

    if (!filteredSubmissions.some((submission) => submission.id === selectedSubmissionId)) {
      setSelectedSubmissionId(filteredSubmissions[0].id)
    }
  }, [filteredSubmissions, selectedSubmissionId])

  const selectedSubmission = useMemo(
    () => filteredSubmissions.find((submission) => submission.id === selectedSubmissionId) || null,
    [filteredSubmissions, selectedSubmissionId]
  )

  useEffect(() => {
    setReviewerRoleInput(reviewerRoles.join('\n'))
  }, [reviewerRoles])

  useEffect(() => {
    setSelectedSubmissionResponse(selectedSubmission?.reviewerComment || '')
  }, [selectedSubmission?.id])

  useEffect(() => {
    if (profile && !profile.isAdmin && profile.isReviewer) {
      setActiveTab('submissions')
    }
  }, [profile, profile?.isAdmin, profile?.isReviewer])

  const questionLabelMap = useMemo(() => {
    const map = new Map()
    for (const app of applications) {
      for (const question of app.questions || []) {
        map.set(`${app.id}:${question.id}`, question.label || question.id)
      }
    }
    return map
  }, [applications])

  const handleLogin = () => {
    window.location.href = '/api/auth/discord/login?next=/admin'
  }

  const handleRefresh = () => {
    setError('')
    setNotice('')
    loadDashboard(true)
  }

  const updateApplication = (id, key, value) => {
    markApplicationDirty(id)
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== id) return app
        const nextApp = { ...app, [key]: value }
        scheduleApplicationSave(nextApp)
        return nextApp
      })
    )
  }

  const updateQuestion = (applicationId, questionId, key, value) => {
    markApplicationDirty(applicationId)
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== applicationId) return app
        const nextApp = {
          ...app,
          questions: app.questions.map((question) =>
            question.id === questionId
              ? {
                  ...question,
                  [key]: value,
                }
              : question
          ),
        }
        scheduleApplicationSave(nextApp)
        return nextApp
      })
    )
  }

  const addQuestion = (applicationId) => {
    markApplicationDirty(applicationId)
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== applicationId) return app
        const nextApp = { ...app, questions: [...app.questions, newQuestion()] }
        scheduleApplicationSave(nextApp)
        return nextApp
      })
    )
  }

  const removeQuestion = (applicationId, questionId) => {
    markApplicationDirty(applicationId)
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== applicationId) return app
        const nextApp = {
          ...app,
          questions: app.questions.filter((question) => question.id !== questionId),
        }
        scheduleApplicationSave(nextApp)
        return nextApp
      })
    )
  }

  const addApplication = async () => {
    try {
      setNotice('')
      setError('')
      const created = await api('/applications', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      setApplications((prev) => [...prev, created])
      markApplicationDirty(created.id)
      setNotice('Ny ansogningstype oprettet.')
      setActiveTab('applications')
    } catch (err) {
      setError(err.message)
    }
  }

  const saveApplication = async (application) => {
    if (saveApplicationTimeouts.current[application.id]) {
      clearTimeout(saveApplicationTimeouts.current[application.id])
      delete saveApplicationTimeouts.current[application.id]
    }

    try {
      setError('')
      setNotice('')
      setSavingAppId(application.id)
      const updated = await api(`/applications/${application.id}`, {
        method: 'PUT',
        body: JSON.stringify(application),
      })
      setApplications((prev) => prev.map((app) => (app.id === updated.id ? updated : app)))
      clearApplicationDirty(application.id)
      setNotice(`Gemte ${updated.title}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingAppId('')
    }
  }

  const deleteApplication = async (id) => {
    try {
      setError('')
      setNotice('')
      await api(`/applications/${id}`, { method: 'DELETE' })
      setApplications((prev) => prev.filter((app) => app.id !== id))
      clearApplicationDirty(id)
      setNotice('Ansogningstype slettet.')
    } catch (err) {
      setError(err.message)
    }
  }

  const uploadApplicationImage = async (id, file) => {
    const body = new FormData()
    body.append('image', file)

    try {
      setError('')
      setNotice('')
      const updated = await api(`/applications/${id}/image`, { method: 'POST', body })
      setApplications((prev) => prev.map((app) => (app.id === updated.id ? updated : app)))
      setNotice('Billede uploadet.')
    } catch (err) {
      setError(err.message)
    }
  }

  const updateRule = (index, key, value) => {
    setRules((prev) => prev.map((rule, i) => (i === index ? { ...rule, [key]: value } : rule)))
    scheduleRulesSave()
  }

  const addRule = () => {
    setRules((prev) => [...prev, { title: 'Ny regel', body: 'Beskriv reglen her.' }])
    scheduleRulesSave()
  }

  const removeRule = (index) => {
    setRules((prev) => prev.filter((_, i) => i !== index))
    scheduleRulesSave()
  }

  useEffect(() => {
    return () => {
      Object.values(saveApplicationTimeouts.current).forEach(clearTimeout)
      if (rulesSaveTimeout.current) clearTimeout(rulesSaveTimeout.current)
    }
  }, [])

  const saveRules = async () => {
    try {
      setSavingRules(true)
      setError('')
      setNotice('')
      const saved = await api('/rules', {
        method: 'PUT',
        body: JSON.stringify({ rules }),
      })
      setRules(saved)
      setRulesDirty(false)
      setNotice('Regler opdateret live.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingRules(false)
    }
  }

  const saveReviewerRoles = async () => {
    try {
      setSavingReviewerRoles(true)
      setError('')
      setNotice('')
      const roles = reviewerRoleInput
        .split(/\r?\n|,/)           
        .map((item) => item.trim())
        .filter(Boolean)
      const saved = await api('/review-roles', {
        method: 'PUT',
        body: JSON.stringify({ roles }),
      })
      setReviewerRoles(saved)
      setNotice('Review-roller opdateret.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingReviewerRoles(false)
    }
  }

  const respondToSubmission = async (submission, action) => {
    if (!submission) return
    const message = selectedSubmissionResponse.trim()
    if (!message) {
      setError(action === 'note' ? 'Skriv en note før du gemmer den.' : 'Skriv en privat besked til ansøgeren, før du sender.')
      return
    }

    try {
      setRespondingSubmissionId(submission.id)
      setError('')
      setNotice('')
      const updated = await api(`/submissions/${submission.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action, message }),
      })
      setSubmissions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setNotice(
        action === 'approved'
          ? `Ansøgningen er godkendt og brugeren er blevet notificeret.`
          : action === 'rejected'
          ? `Ansøgningen er afvist og brugeren er blevet notificeret.`
          : `Noten er gemt internt og sendes ikke videre.`
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setRespondingSubmissionId('')
    }
  }

  if (authLoading || loading) {
    return (
      <section className="admin section">
        <div className="container admin__loading">Indlaeser admin-panel...</div>
      </section>
    )
  }

  if (!profile) {
    return (
      <section className="admin section">
        <div className="container admin__gate">
          <h1>Log ind med Discord for at åbne admin-siden</h1>
          <p>Kun brugere med administrator rolle kan komme <span className="admin__highlight">videre</span></p>
          <button className="btn btn-primary" onClick={handleLogin}>
            Log ind med Discord
          </button>
        </div>
      </section>
    )
  }

  if (!profile.isAdmin && !profile.isReviewer) {
    return (
      <section className="admin section">
        <div className="container admin__gate admin__gate--denied">
          <p className="admin__eyebrow">Ingen adgang</p>
          <h1>Du mangler den korrekte Discord-rolle</h1>
          <p>Admin-siden er laast. Bed en serveradministrator om den rigtige rolle.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="admin section">
      <div className="container admin__layout">
        <header className="admin__hero">
          <div>
            <p className="admin__eyebrow">Projekt control center</p>
            <h1>Live administration af regler og ansogninger</h1>
            <p className="admin__desc">
              Alle aendringer gemmes direkte i backend-datafilerne og slaar igennem med det samme pa frontend.
            </p>
            <div className="admin__hero-actions">
              <button className="btn btn-ghost btn-sm" onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? 'Opdaterer data...' : 'Genindlaes data'}
              </button>
            </div>
          </div>
          <div className="admin__stats">
            <div>
              <span>Ansogningstyper</span>
              <strong>{applications.length}</strong>
            </div>
            <div>
              <span>Regler</span>
              <strong>{rules.length}</strong>
            </div>
            <div>
              <span>Indsendte</span>
              <strong>{submissionCount}</strong>
            </div>
            <div>
              <span>Afventer svar</span>
              <strong>{pendingSubmissionCount}</strong>
            </div>
          </div>
        </header>

        {error && <div className="admin__alert admin__alert--error">{error}</div>}
        {notice && <div className="admin__alert admin__alert--ok">{notice}</div>}

        <div className="admin__tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`admin__tab ${activeTab === tab.id ? 'admin__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              <small>{tab.count}</small>
            </button>
          ))}
        </div>

        {activeTab === 'applications' && (
          <section className="admin__panel">
            <div className="admin__panel-head">
              <h2>Ansogningsformularer</h2>
              <button className="btn btn-primary btn-sm" onClick={addApplication}>
                Tilfoej ansogningstype
              </button>
            </div>

            <div className="admin__toolbar">
              <label className="admin__search">
                Sog i ansogninger
                <input
                  type="search"
                  placeholder="Titel, typekode eller beskrivelse"
                  value={appQuery}
                  onChange={(e) => setAppQuery(e.target.value)}
                />
              </label>

              <label className="admin__inline-field">
                Status
                <select value={appStatus} onChange={(e) => setAppStatus(e.target.value)}>
                  <option value="all">Alle</option>
                  <option value="saved">Gemt</option>
                  <option value="unsaved">Ikke gemt</option>
                </select>
              </label>

              <p className="admin__toolbar-meta">
                Viser {filteredApplications.length} af {applications.length} ansogningstyper
              </p>
            </div>

            <div className="admin__application-grid">
              {filteredApplications.map((app) => (
                <article
                  key={app.id}
                  className={`admin-card ${app.status === 'closed' ? 'admin-card--closed' : ''}`}
                  style={{ '--card-accent': app.color || '#d29a4b' }}
                >
                  {app.status === 'closed' && <div className="admin-card__status-badge">Lukket</div>}
                  <div className="admin-card__head">
                    <div>
                      <h3>{app.title || 'Uden titel'}</h3>
                      <p className="admin-card__subtitle">{app.type ? `Typekode: ${app.type}` : 'Ingen typekode'}</p>
                    </div>
                    <span className={`admin-card__state ${dirtyApplications[app.id] ? 'admin-card__state--dirty' : 'admin-card__state--saved'}`}>
                      {dirtyApplications[app.id] ? 'Ikke gemt' : 'Gemt'}
                    </span>
                  </div>

                  {app.imageUrl && <img src={app.imageUrl} alt={app.title} className="admin-card__image" />}

                  <label>
                    Titel
                    <input value={app.title} onChange={(e) => updateApplication(app.id, 'title', e.target.value)} />
                  </label>

                  <label>
                    Beskrivelse
                    <textarea
                      rows="3"
                      value={app.description}
                      onChange={(e) => updateApplication(app.id, 'description', e.target.value)}
                    />
                  </label>

                  <label>
                    Krav / meta
                    <input value={app.meta} onChange={(e) => updateApplication(app.id, 'meta', e.target.value)} />
                  </label>

                  <label>
                    Typekode
                    <input value={app.type || ''} onChange={(e) => updateApplication(app.id, 'type', e.target.value)} />
                  </label>

                  <label>
                    Status
                    <select value={app.status || 'open'} onChange={(e) => updateApplication(app.id, 'status', e.target.value)}>
                      <option value="open">Åben</option>
                      <option value="closed">Lukket</option>
                    </select>
                  </label>

                  <label>
                    Accentfarve
                    <input
                      type="color"
                      value={app.color || '#d29a4b'}
                      onChange={(e) => updateApplication(app.id, 'color', e.target.value)}
                    />
                  </label>

                  <label>
                    Upload billede
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && uploadApplicationImage(app.id, e.target.files[0])}
                    />
                  </label>

                  <div className="admin-card__questions-head">
                    <h3>Spoergsmaal</h3>
                    <button className="btn btn-ghost btn-sm" onClick={() => addQuestion(app.id)}>
                      Tilfoej spoergsmaal
                    </button>
                  </div>

                  <div className="admin-card__questions">
                    {app.questions.map((question) => (
                      <div key={question.id} className="admin-question">
                        <label>
                          Label
                          <input
                            value={question.label}
                            onChange={(e) => updateQuestion(app.id, question.id, 'label', e.target.value)}
                          />
                        </label>

                        <label>
                          Felt-type
                          <select
                            value={question.type}
                            onChange={(e) => updateQuestion(app.id, question.id, 'type', e.target.value)}
                          >
                            {QUESTION_TYPES.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Placeholder
                          <input
                            value={question.placeholder || ''}
                            onChange={(e) => updateQuestion(app.id, question.id, 'placeholder', e.target.value)}
                          />
                        </label>

                        {(question.type === 'select' || question.type === 'multiselect') && (
                          <label>
                            Valgmuligheder (komma-separeret)
                            <input
                              value={(question.options || []).join(', ')}
                              onChange={(e) =>
                                updateQuestion(
                                  app.id,
                                  question.id,
                                  'options',
                                  e.target.value
                                    .split(',')
                                    .map((item) => item.trim())
                                    .filter(Boolean)
                                )
                              }
                            />
                          </label>
                        )}

                        <label className="admin-question__check">
                          <input
                            type="checkbox"
                            checked={Boolean(question.required)}
                            onChange={(e) => updateQuestion(app.id, question.id, 'required', e.target.checked)}
                          />
                          Obligatorisk
                        </label>

                        <button className="btn btn-ghost btn-sm" onClick={() => removeQuestion(app.id, question.id)}>
                          Fjern spoergsmaal
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="admin-card__actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => saveApplication(app)}
                      disabled={savingAppId === app.id || !dirtyApplications[app.id]}
                    >
                      {savingAppId === app.id ? 'Gemmer...' : dirtyApplications[app.id] ? 'Gem ansogning' : 'Gemt'}
                    </button>
                    <button className="btn btn-ghost" onClick={() => deleteApplication(app.id)}>
                      Slet
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {filteredApplications.length === 0 && <div className="admin__empty">Ingen ansogningstyper matcher din sogning.</div>}
          </section>
        )}

        {activeTab === 'rules' && (
          <section className="admin__panel">
            <div className="admin__panel-head">
              <h2>Regler</h2>
              <div className="admin__panel-actions">
                <button className="btn btn-ghost btn-sm" onClick={addRule}>
                  Tilfoej regel
                </button>
                <button className="btn btn-primary btn-sm" onClick={saveRules} disabled={savingRules}>
                  {savingRules ? 'Gemmer...' : 'Gem regler'}
                </button>
              </div>
            </div>

            <div className="admin__rules">
              {rules.map((rule, index) => (
                <article key={`${rule.title}-${index}`} className="admin-rule">
                  <label>
                    Titel
                    <input value={rule.title} onChange={(e) => updateRule(index, 'title', e.target.value)} />
                  </label>
                  <label>
                    Beskrivelse
                    <textarea rows="3" value={rule.body} onChange={(e) => updateRule(index, 'body', e.target.value)} />
                  </label>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeRule(index)}>
                    Fjern
                  </button>
                </article>
              ))}
            </div>

            <div className="admin__reviewer-roles">
              <div className="admin__panel-head admin__panel-head--compact">
                <h3>Reviewer-roller</h3>
                <button className="btn btn-primary btn-sm" onClick={saveReviewerRoles} disabled={savingReviewerRoles}>
                  {savingReviewerRoles ? 'Gemmer...' : 'Gem roller'}
                </button>
              </div>
              <p className="admin__help-text">
                En rolle pr. linje. Brug rolle-ID'er fra Discord for at give adgang til at svare på ansøgninger.
              </p>
              <textarea
                className="admin__reviewer-roles-input"
                rows="5"
                value={reviewerRoleInput}
                onChange={(e) => setReviewerRoleInput(e.target.value)}
                placeholder="Indtast Discord rolle-ID'er, én per linje"
              />
            </div>
          </section>
        )}

        {activeTab === 'submissions' && (
          <section className="admin__panel">
            <div className="admin__panel-head">
              <h2>Indsendte ansogninger</h2>
              <div className="admin__panel-actions">
                <label className="admin__inline-field">
                  Status
                  <select value={submissionStatus} onChange={(e) => setSubmissionStatus(e.target.value)}>
                    <option value="all">Alle</option>
                    <option value="pending">Afventer</option>
                    <option value="approved">Godkendt</option>
                    <option value="rejected">Afvist</option>
                  </select>
                </label>
                <label className="admin__inline-field">
                  Sog
                  <input
                    type="search"
                    placeholder="Navn, type eller Discord ID"
                    value={submissionQuery}
                    onChange={(e) => setSubmissionQuery(e.target.value)}
                  />
                </label>
              </div>
            </div>

            {filteredSubmissions.length === 0 ? (
              <div className="admin__empty">Ingen indsendte ansogninger matcher de valgte filtre.</div>
            ) : (
              <div className="admin__submissions-layout">
                <aside className="admin__submission-list">
                  {filteredSubmissions.map((submission) => {
                    const isActive = selectedSubmissionId === submission.id
                    return (
                      <button
                        key={submission.id}
                        type="button"
                        className={`admin-submission__item ${isActive ? 'admin-submission__item--active' : ''}`}
                        onClick={() => setSelectedSubmissionId(submission.id)}
                      >
                        <div className="admin-submission__item-top">
                          <strong>{submission.applicationTitle || submission.applicationId}</strong>
                          <span className={`admin-submission__status admin-submission__status--${submission.status || 'pending'}`}>
                            {statusLabel(submission.status)}
                          </span>
                        </div>
                        <p>{submission.discordName || 'Ukendt bruger'}</p>
                        <span>{formatDate(submission.createdAt)}</span>
                      </button>
                    )
                  })}
                </aside>

                <article className="admin-submission admin-submission--detail">
                  {selectedSubmission && (
                    <>
                      <header>
                        <h3>{selectedSubmission.applicationTitle || selectedSubmission.applicationId}</h3>
                        <p>
                          {selectedSubmission.discordName || 'Ukendt bruger'} • {formatDate(selectedSubmission.createdAt)}
                        </p>
                        <div className="admin-submission__meta">
                          <span className={`admin-submission__status admin-submission__status--${selectedSubmission.status || 'pending'}`}>
                            {statusLabel(selectedSubmission.status)}
                          </span>
                          <span>ID: {selectedSubmission.discordId || 'N/A'}</span>
                        </div>
                      </header>
                      <dl>
                        {Object.entries(selectedSubmission.answers || {}).map(([key, value]) => {
                          const questionKey = `${selectedSubmission.applicationId}:${key}`
                          const label = questionLabelMap.get(questionKey) || key

                          return (
                            <div key={key}>
                              <dt>{label}</dt>
                              <dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
                            </div>
                          )
                        })}
                      </dl>

                      <div className="admin__response-panel">
                        <h4>Svar til ansøger</h4>
                        <textarea
                          className="admin__response-input"
                          rows="5"
                          value={selectedSubmissionResponse}
                          onChange={(e) => setSelectedSubmissionResponse(e.target.value)}
                          placeholder="Skriv den private besked, der skal sendes som DM via Discord"
                        />
                        <div className="admin__response-actions">
                          <button
                            className="btn btn-primary"
                            onClick={() => respondToSubmission(selectedSubmission, 'approved')}
                            disabled={respondingSubmissionId === selectedSubmission.id}
                          >
                            {respondingSubmissionId === selectedSubmission.id ? 'Sender...' : 'Accepter'}
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => respondToSubmission(selectedSubmission, 'rejected')}
                            disabled={respondingSubmissionId === selectedSubmission.id}
                          >
                            {respondingSubmissionId === selectedSubmission.id ? 'Sender...' : 'Afvis'}
                          </button>
                          <button
                            className="btn btn-ghost"
                            onClick={() => respondToSubmission(selectedSubmission, 'note')}
                            disabled={respondingSubmissionId === selectedSubmission.id}
                          >
                            {respondingSubmissionId === selectedSubmission.id ? 'Sender...' : 'Note'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </article>
              </div>
            )}
          </section>
        )}
      </div>
    </section>
  )
}
