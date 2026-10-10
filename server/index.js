import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import FileStoreFactory from 'session-file-store'
import cors from 'cors'
import multer from 'multer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

import { buildAuthorizeUrl, exchangeCode, fetchDiscordUser, fetchGuildMember, sendDiscordDm, avatarUrl } from './discord.js'
import { readData, writeData } from './store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 4000
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID
const STAFF_LIST_ROLE_ID = process.env.STAFFLISTROLE || process.env.stafflistrole || process.env.DISCORD_STAFF_ROLE_ID || ''
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI
const SESSION_REMEMBER_DAYS = Number.parseInt(process.env.SESSION_REMEMBER_DAYS || '30', 10)
const SESSION_MAX_AGE_MS = Math.max(1, SESSION_REMEMBER_DAYS) * 24 * 60 * 60 * 1000
const SESSION_TTL_SECONDS = Math.floor(SESSION_MAX_AGE_MS / 1000)

const DEFAULT_RULES = [
  { title: 'RP > alt', body: 'Rollespil kommer foer win, altid. Metagaming og powergaming accepteres ikke.' },
  { title: 'Realistisk tempo', body: 'Din karakter er et menneske. Reager derefter - ingen scener uden konsekvens.' },
  { title: 'Respekt off-server', body: 'Det du oplever i byen bliver i byen. Vaer ordentlig i Discord og i chatten.' },
  { title: 'Whitelist-ansoegning', body: 'Vi optager loebende. Ansoegningen tager typisk 2-4 dage at faa svar paa.' },
]

const DEFAULT_QUESTIONS = [
  {
    id: 'character_name',
    label: 'Karakterens navn',
    type: 'text',
    placeholder: 'Skriv dit RP-navn',
    required: true,
    options: [],
  },
  {
    id: 'experience',
    label: 'Fortael om din RP-erfaring',
    type: 'textarea',
    placeholder: 'Hvor har du spillet foer, og hvad bringer du med?',
    required: true,
    options: [],
  },
]

const ALLOWED_QUESTION_TYPES = new Set(['text', 'textarea', 'number', 'select', 'multiselect'])

function normalizeOrigin(value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim().replace(/\/$/, '')
  if (!trimmed) return ''

  try {
    return new URL(trimmed).origin
  } catch {
    return ''
  }
}

function normalizeText(value, fallback = '') {
  if (typeof value !== 'string') return fallback
  return value.trim()
}

function normalizeColor(value, fallback = '#d29a4b') {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed
  if (/^#[0-9A-Fa-f]{3}$/.test(trimmed)) return trimmed
  return fallback
}

function toQuestionId(value) {
  const input = normalizeText(value)
  const safe = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return safe || `question_${randomUUID().slice(0, 8)}`
}

function normalizeQuestion(question, fallbackIndex) {
  const type = ALLOWED_QUESTION_TYPES.has(question?.type) ? question.type : 'text'
  const options = Array.isArray(question?.options)
    ? question.options.map((item) => normalizeText(item)).filter(Boolean)
    : []

  return {
    id: toQuestionId(question?.id || question?.label || `q_${fallbackIndex + 1}`),
    label: normalizeText(question?.label, `Spoergsmaal ${fallbackIndex + 1}`),
    type,
    placeholder: normalizeText(question?.placeholder),
    required: Boolean(question?.required),
    options: type === 'select' || type === 'multiselect' ? options : [],
  }
}

function normalizeApplication(item) {
  const rawQuestions = Array.isArray(item?.questions) && item.questions.length ? item.questions : DEFAULT_QUESTIONS
  const status = normalizeText(item?.status, 'open').toLowerCase()
  return {
    id: normalizeText(item?.id, `custom-${randomUUID()}`),
    title: normalizeText(item?.title, 'Ny ansoegning'),
    description: normalizeText(item?.description, 'Skriv en beskrivelse her.'),
    meta: normalizeText(item?.meta, 'Saet de krav, der skal gaelde.'),
    imageUrl: normalizeText(item?.imageUrl) || null,
    color: normalizeColor(item?.color, '#d29a4b'),
    type: normalizeText(item?.type) || 'custom',
    status: status === 'closed' ? 'closed' : 'open',
    questions: rawQuestions.map((q, index) => normalizeQuestion(q, index)),
  }
}

async function readApplications() {
  const list = await readData('applications', [])
  const normalized = Array.isArray(list) ? list.map(normalizeApplication) : []
  return normalized
}

async function readRules() {
  const list = await readData('rules', DEFAULT_RULES)
  if (!Array.isArray(list) || list.length === 0) return DEFAULT_RULES
  return list
    .map((rule, index) => ({
      title: normalizeText(rule?.title, `Regel ${index + 1}`),
      body: normalizeText(rule?.body),
    }))
    .filter((rule) => rule.title && rule.body)
}

async function readReviewerRoles() {
  const list = await readData('reviewer-roles', [])
  return Array.isArray(list) ? list.map((role) => normalizeText(role)).filter(Boolean) : []
}

function requireReviewerOrAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Ikke logget ind' })
  if (req.session.user.isAdmin || req.session.user.isReviewer) return next()
  return res.status(403).json({ error: 'Kræver reviewer-rolle eller administrator' })
}

function resolveClientUrl(req) {
  const originHeader = normalizeOrigin(req.get('origin'))
  if (originHeader) return originHeader

  const referer = req.get('referer')
  if (referer) {
    try {
      return new URL(referer).origin
    } catch {
      // Ignorer ugyldige referer-værdier og brug fallback nedenfor.
    }
  }

  return normalizeOrigin(CLIENT_URL) || 'http://localhost:5173'
}

function resolveServerOrigin(req) {
  const forwardedProto = normalizeText(req.get('x-forwarded-proto')).split(',')[0]
  const forwardedHost = normalizeText(req.get('x-forwarded-host')).split(',')[0]
  if (forwardedProto && forwardedHost) {
    const forwardedOrigin = normalizeOrigin(`${forwardedProto}://${forwardedHost}`)
    if (forwardedOrigin) return forwardedOrigin
  }

  const host = normalizeText(req.get('host'))
  if (host) {
    const origin = normalizeOrigin(`${req.protocol}://${host}`)
    if (origin) return origin
  }

  return ''
}

function resolveDiscordRedirectUri(req) {
  const fromEnv = normalizeOrigin(DISCORD_REDIRECT_URI)
  if (fromEnv) return `${fromEnv}/api/auth/discord/callback`

  const serverOrigin = resolveServerOrigin(req)
  if (serverOrigin) return `${serverOrigin}/api/auth/discord/callback`

  return 'http://localhost:4000/api/auth/discord/callback'
}

const app = express()
const SessionFileStore = FileStoreFactory(session)
const sessionStoreDir = path.join(__dirname, 'data', 'sessions')
mkdirSync(sessionStoreDir, { recursive: true })

app.set('trust proxy', 1)
const allowedOrigins = new Set([
  normalizeOrigin(CLIENT_URL),
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean))

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true)
      const normalized = normalizeOrigin(origin)
      if (!normalized || !allowedOrigins.has(normalized)) return cb(new Error('CORS origin afvist'))
      cb(null, true)
    },
    credentials: true,
  })
)
app.use(express.json())
app.use(
  session({
    name: 'Regency.sid',
    store: new SessionFileStore({
      path: sessionStoreDir,
      ttl: SESSION_TTL_SECONDS,
      retries: 0,
    }),
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    unset: 'destroy',
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: 'auto',
      maxAge: SESSION_MAX_AGE_MS,
    },
  })
)

// --- Statiske uploads (billeder til ansøgninger + kort) ---
const uploadsDir = path.join(__dirname, 'uploads')
mkdirSync(path.join(uploadsDir, 'applications'), { recursive: true })
mkdirSync(path.join(uploadsDir, 'map'), { recursive: true })
app.use('/uploads', express.static(uploadsDir))

function makeUploader(subfolder) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, path.join(uploadsDir, subfolder)),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg'
        cb(null, `${randomUUID()}${ext}`)
      },
    }),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!/^image\//.test(file.mimetype)) return cb(new Error('Kun billedfiler er tilladt'))
      cb(null, true)
    },
  })
}

// --- Auth helpers ---
function requireAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Ikke logget ind' })
  if (!req.session.user.isAdmin) return res.status(403).json({ error: 'Kræver administratorrolle' })
  next()
}

const DISCORD_API = 'https://discord.com/api/v10'

async function fetchGuildMembersPage(after = '0') {
  const guildId = normalizeText(process.env.DISCORD_GUILD_ID)
  const botToken = normalizeText(process.env.DISCORD_BOT_TOKEN)
  if (!guildId || !botToken) {
    throw new Error('Manglende DISCORD_GUILD_ID eller DISCORD_BOT_TOKEN i miljøvariabler')
  }

  const url = `${DISCORD_API}/guilds/${guildId}/members?limit=1000&after=${after}`
  const res = await fetch(url, {
    headers: { Authorization: `Bot ${botToken}` },
  })

  if (!res.ok) {
    throw new Error(`Kunne ikke hente guild-medlemmer: ${res.status} ${await res.text()}`)
  }

  return res.json()
}

function mapGuildMemberToStaff(member) {
  const user = member?.user || {}
  const displayName = member.nick || user.global_name || user.username || 'Ukendt bruger'
  return {
    id: user.id,
    displayName,
    username: user.username || '',
    globalName: user.global_name || '',
    avatar: avatarUrl(user),
    roles: Array.isArray(member.roles) ? member.roles : [],
  }
}

async function readStaffMembers() {
  const staffRoleId = normalizeText(STAFF_LIST_ROLE_ID)
  if (!staffRoleId) {
    throw new Error('Manglende staff-rolle i miljøvariabler. Sæt STAFFLISTROLE eller DISCORD_STAFF_ROLE_ID.')
  }

  const members = []
  let after = '0'

  while (true) {
    const batch = await fetchGuildMembersPage(after)
    if (!Array.isArray(batch) || batch.length === 0) break

    members.push(...batch)

    if (batch.length < 1000) break
    const lastMember = batch[batch.length - 1]
    after = lastMember?.user?.id || after
    if (!after) break
  }

  return members
    .filter((member) => Array.isArray(member.roles) && member.roles.includes(staffRoleId))
    .map(mapGuildMemberToStaff)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'da'))
}

// --- Auth routes ---
app.get('/api/auth/discord/login', (req, res) => {
  try {
    const nextPath = typeof req.query.next === 'string' && req.query.next.startsWith('/') ? req.query.next : '/ansogning'
    req.session.oauthRedirectUri = resolveDiscordRedirectUri(req)
    req.session.postLoginRedirectUrl = `${resolveClientUrl(req)}${nextPath}`
    res.redirect(buildAuthorizeUrl(req.session.oauthRedirectUri))
  } catch (err) {
    console.error('Discord login-konfig fejl:', err.message)
    res.redirect(`${resolveClientUrl(req)}/ansogning?login=config`)
  }
})

app.get('/api/auth/discord/callback', async (req, res) => {
  try {
    const { code } = req.query
    const redirectUri = req.session.oauthRedirectUri || resolveDiscordRedirectUri(req)
    const postLoginRedirectUrl = req.session.postLoginRedirectUrl || `${resolveClientUrl(req)}/ansogning`
    if (!code) return res.redirect(`${postLoginRedirectUrl}?login=failed`)

    const token = await exchangeCode(code, redirectUri)
    const discordUser = await fetchDiscordUser(token.access_token)

    let isAdmin = false
    let isReviewer = false
    let roles = []
    try {
      const member = await fetchGuildMember(discordUser.id)
      roles = member?.roles || []
      isAdmin = Boolean(ADMIN_ROLE_ID && roles.includes(ADMIN_ROLE_ID))
      const reviewerRoleIds = await readReviewerRoles()
      isReviewer = isAdmin || reviewerRoleIds.some((roleId) => roles.includes(roleId))
    } catch (err) {
      console.error('Kunne ikke hente roller fra guild:', err.message)
    }

    req.session.user = {
      id: discordUser.id,
      username: discordUser.username,
      globalName: discordUser.global_name || discordUser.username,
      avatar: avatarUrl(discordUser),
      roles,
      isAdmin,
      isReviewer,
    }

    delete req.session.oauthRedirectUri
    delete req.session.postLoginRedirectUrl

    res.redirect(postLoginRedirectUrl)
  } catch (err) {
    console.error(err)
    const fallbackClientUrl = resolveClientUrl(req)
    delete req.session.oauthRedirectUri
    delete req.session.postLoginRedirectUrl
    res.redirect(`${fallbackClientUrl}/ansogning?login=failed`)
  }
})

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }))
})

app.get('/api/auth/me', (req, res) => {
  if (!req.session.user) return res.json({ loggedIn: false })
  res.json({ loggedIn: true, profile: req.session.user })
})

app.get('/api/staff', async (_req, res) => {
  try {
    const members = await readStaffMembers()
    res.json(members)
  } catch (err) {
    console.error('Fejl ved hentning af staff-medlemmer:', err.message)
    res.status(500).json({ error: err.message || 'Kunne ikke hente staff-medlemmer' })
  }
})

// --- Applications (ansøgningstyper) ---
app.get('/api/applications', async (_req, res) => {
  const list = await readApplications()
  await writeData('applications', list)
  res.json(list)
})

app.post('/api/applications', requireAdmin, async (req, res) => {
  const list = await readApplications()
  const draft = {
    id: `custom-${randomUUID()}`,
    title: 'Ny ansoegning',
    description: 'Skriv en beskrivelse her.',
    meta: 'Saet de krav, der skal gaelde.',
    imageUrl: null,
    color: '#d29a4b',
    type: 'custom',
    status: 'open',
    questions: DEFAULT_QUESTIONS,
    ...req.body,
  }
  const item = normalizeApplication(draft)
  list.push(item)
  await writeData('applications', list)
  res.status(201).json(item)
})

app.put('/api/applications/:id', requireAdmin, async (req, res) => {
  const list = await readApplications()
  const idx = list.findIndex((a) => a.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Ikke fundet' })
  const next = normalizeApplication({ ...list[idx], ...req.body, id: list[idx].id })
  list[idx] = next
  await writeData('applications', list)
  res.json(next)
})

app.delete('/api/applications/:id', requireAdmin, async (req, res) => {
  const list = await readApplications()
  const next = list.filter((a) => a.id !== req.params.id)
  await writeData('applications', next)
  res.json({ ok: true })
})

const uploadApplicationImage = makeUploader('applications')
app.post('/api/applications/:id/image', requireAdmin, uploadApplicationImage.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Ingen fil modtaget' })
  const list = await readApplications()
  const idx = list.findIndex((a) => a.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Ikke fundet' })
  list[idx].imageUrl = `/uploads/applications/${req.file.filename}`
  await writeData('applications', list)
  res.json(list[idx])
})

// --- Live-redigerbare regler ---
app.get('/api/rules', async (_req, res) => {
  const rules = await readRules()
  await writeData('rules', rules)
  res.json(rules)
})

app.put('/api/rules', requireAdmin, async (req, res) => {
  const payload = Array.isArray(req.body) ? req.body : req.body?.rules
  if (!Array.isArray(payload)) return res.status(400).json({ error: 'Regler skal vaere en liste' })

  const rules = payload
    .map((rule, index) => ({
      title: normalizeText(rule?.title, `Regel ${index + 1}`),
      body: normalizeText(rule?.body),
    }))
    .filter((rule) => rule.title && rule.body)

  if (rules.length === 0) return res.status(400).json({ error: 'Mindst en regel er paakraevet' })

  await writeData('rules', rules)
  res.json(rules)
})

app.get('/api/admin/dashboard', requireReviewerOrAdmin, async (_req, res) => {
  const [applications, rules, submissions, reviewerRoles] = await Promise.all([
    readApplications(),
    readRules(),
    readData('submissions', []),
    readReviewerRoles(),
  ])
  res.json({ applications, rules, submissions, reviewerRoles })
})

app.get('/api/review-roles', requireAdmin, async (_req, res) => {
  res.json(await readReviewerRoles())
})

app.put('/api/review-roles', requireAdmin, async (req, res) => {
  const roles = Array.isArray(req.body.roles)
    ? req.body.roles.map((item) => normalizeText(String(item))).filter(Boolean)
    : []
  await writeData('reviewer-roles', roles)
  res.json(roles)
})

// --- Ansøgninger (indsendte ansøgninger fra spillere) ---
app.post('/api/submissions', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Ikke logget ind' })
  const applications = await readApplications()
  const application = applications.find((item) => item.id === req.body.applicationId)
  if (!application) return res.status(400).json({ error: 'Ugyldig ansoegningstype' })

  const existingSubmissions = await readData('submissions', [])
  const existingPending = existingSubmissions.find(
    (item) =>
      item.applicationId === application.id &&
      item.discordId === req.session.user.id &&
      item.status === 'pending'
  )

  if (existingPending) {
    return res.status(409).json({
      error: 'Du har allerede en åben ansøgning for denne formular. Vent på svar før du sender en ny.',
    })
  }

  const answers = req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {}
  const missingRequired = []
  const normalizedAnswers = {}

  for (const question of application.questions) {
    const value = answers[question.id]
    if (question.type === 'multiselect') {
      const nextValue = Array.isArray(value) ? value.map((item) => normalizeText(String(item))).filter(Boolean) : []
      if (question.required && nextValue.length === 0) missingRequired.push(question.label)
      normalizedAnswers[question.id] = nextValue
      continue
    }

    const textValue = normalizeText(value == null ? '' : String(value))
    if (question.required && !textValue) missingRequired.push(question.label)
    normalizedAnswers[question.id] = textValue
  }

  if (missingRequired.length) {
    return res.status(400).json({
      error: `Manglende svar: ${missingRequired.join(', ')}`,
    })
  }

  const currentSubmissions = existingSubmissions
  const submission = {
    id: randomUUID(),
    applicationId: application.id,
    applicationTitle: application.title,
    answers: normalizedAnswers,
    discordId: req.session.user.id,
    discordName: req.session.user.globalName,
    createdAt: new Date().toISOString(),
    status: 'pending',
  }
  currentSubmissions.push(submission)
  await writeData('submissions', currentSubmissions)
  res.status(201).json(submission)
})

app.get('/api/submissions', requireReviewerOrAdmin, async (_req, res) => {
  res.json(await readData('submissions', []))
})

app.post('/api/submissions/:id/respond', requireReviewerOrAdmin, async (req, res) => {
  const action = normalizeText(req.body.action)
  const message = normalizeText(req.body.message)
  if (!message) return res.status(400).json({ error: 'Der skal skrives en besked til ansøgeren.' })
  if (!['approved', 'rejected', 'note'].includes(action)) {
    return res.status(400).json({ error: 'Ugyldig handling' })
  }

  const submissions = await readData('submissions', [])
  const idx = submissions.findIndex((item) => item.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Ansøgning ikke fundet' })

  const submission = submissions[idx]
  const updated = {
    ...submission,
    status: action === 'note' ? submission.status || 'pending' : action,
    reviewerComment: message,
    reviewedAt: new Date().toISOString(),
    reviewedBy: req.session.user.globalName || req.session.user.username,
  }
  submissions[idx] = updated
  await writeData('submissions', submissions)

  if (action !== 'note') {
    const decisionText =
      action === 'approved'
        ? 'Din ansøgning er godkendt.'
        : 'Din ansøgning er desværre afvist.'

    const dmContent = `Hej ${submission.discordName || 'ansøger'},\n\n${decisionText}\n\nBesked fra teamet:\n${message}\n\nTak for din ansøgning.`

    try {
      await sendDiscordDm(submission.discordId, dmContent)
    } catch (err) {
      console.error('Discord DM fejlede:', err.message)
      return res.status(500).json({ error: 'Kunne ikke sende Discord-besked.' })
    }
  }

  res.json(updated)
})

// --- Map: locations ---
app.get('/api/locations', async (_req, res) => {
  res.json(await readData('locations', []))
})

app.post('/api/locations', requireAdmin, async (req, res) => {
  const list = await readData('locations', [])
  const item = { id: `loc-${randomUUID()}`, label: 'Ny lokation', type: 'district', x: 50, y: 50, note: '', ...req.body }
  list.push(item)
  await writeData('locations', list)
  res.status(201).json(item)
})

app.put('/api/locations/:id', requireAdmin, async (req, res) => {
  const list = await readData('locations', [])
  const idx = list.findIndex((l) => l.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Ikke fundet' })
  list[idx] = { ...list[idx], ...req.body, id: list[idx].id }
  await writeData('locations', list)
  res.json(list[idx])
})

app.delete('/api/locations/:id', requireAdmin, async (req, res) => {
  const list = await readData('locations', [])
  const next = list.filter((l) => l.id !== req.params.id)
  await writeData('locations', next)
  res.json({ ok: true })
})

// --- Map: baggrundsbillede (upload jeres eget in-game/satellit kort) ---
app.get('/api/map', async (_req, res) => {
  res.json(await readData('map', { imageUrl: null }))
})

const uploadMapImage = makeUploader('map')
app.post('/api/map/image', requireAdmin, uploadMapImage.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Ingen fil modtaget' })
  const map = { imageUrl: `/uploads/map/${req.file.filename}`, updatedAt: new Date().toISOString() }
  await writeData('map', map)
  res.json(map)
})

app.use((err, _req, res, _next) => {
  console.error('API-fejl:', err)
  const message = err?.message || 'Intern serverfejl'
  res.status(500).json({ error: message })
})

app.listen(PORT, () => {
  console.log(`Projekt API kører på http://localhost:${PORT}`)
})
