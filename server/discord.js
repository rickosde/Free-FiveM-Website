// Al kommunikation med Discords API samlet ét sted.

const API = 'https://discord.com/api/v10'

function readEnv(name) {
  const raw = process.env[name]
  if (typeof raw !== 'string') return ''
  // Allow values wrapped in quotes in .env files.
  return raw.trim().replace(/^['"]|['"]$/g, '')
}

function requireEnv(name) {
  const value = readEnv(name)
  if (!value) {
    throw new Error(`Manglende miljøvariabel: ${name}`)
  }
  return value
}

function requireRedirectUri(redirectUri = requireEnv('DISCORD_REDIRECT_URI')) {
  try {
    new URL(redirectUri)
  } catch {
    throw new Error('DISCORD_REDIRECT_URI er ikke en gyldig URL')
  }
  return redirectUri
}

export function buildAuthorizeUrl(redirectUriOverride) {
  const clientId = requireEnv('DISCORD_CLIENT_ID')
  const redirectUri = requireRedirectUri(redirectUriOverride)
  const loginPrompt = readEnv('DISCORD_LOGIN_PROMPT')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify',
  })

  if (loginPrompt) params.set('prompt', loginPrompt)

  return `https://discord.com/oauth2/authorize?${params.toString()}`
}

// Bytter en "code" fra redirect-flowet til et access token.
export async function exchangeCode(code, redirectUriOverride) {
  const clientId = requireEnv('DISCORD_CLIENT_ID')
  const clientSecret = requireEnv('DISCORD_CLIENT_SECRET')
  const redirectUri = requireRedirectUri(redirectUriOverride)

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  })

  const res = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`Discord token exchange fejlede: ${res.status} ${await res.text()}`)
  return res.json()
}

// Henter brugerens egen profil med deres access token.
export async function fetchDiscordUser(accessToken) {
  const res = await fetch(`${API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Kunne ikke hente Discord-profil: ${res.status}`)
  return res.json()
}

// Bruger BOTTENS token (ikke brugerens) til at slå medlemmet op i jeres
// guild og læse deres roller. Kræver at botten er inviteret til serveren
// med "View Server Members" — ingen privileged intents nødvendige.
export async function fetchGuildMember(discordUserId) {
  const guildId = process.env.DISCORD_GUILD_ID
  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!guildId || !botToken) return null

  const res = await fetch(`${API}/guilds/${guildId}/members/${discordUserId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  })
  if (res.status === 404) return null // brugeren er ikke medlem af serveren
  if (!res.ok) throw new Error(`Kunne ikke hente guild-medlem: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function sendDiscordDm(discordUserId, content) {
  const botToken = requireEnv('DISCORD_BOT_TOKEN')
  const createChannel = await fetch(`${API}/users/@me/channels`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipient_id: discordUserId }),
  })

  if (!createChannel.ok) {
    throw new Error(`Discord DM kanal fejlede: ${createChannel.status} ${await createChannel.text()}`)
  }

  const channel = await createChannel.json()
  const sendMessage = await fetch(`${API}/channels/${channel.id}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  })

  if (!sendMessage.ok) {
    throw new Error(`Discord DM send fejlede: ${sendMessage.status} ${await sendMessage.text()}`)
  }

  return sendMessage.json()
}

export function avatarUrl(user) {
  if (!user.avatar) {
    const fallback = Number(BigInt(user.id) >> 22n) % 6
    return `https://cdn.discordapp.com/embed/avatars/${fallback}.png`
  }
  const ext = user.avatar.startsWith('a_') ? 'gif' : 'png'
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}`
}
