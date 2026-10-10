import { useEffect, useRef, useState } from 'react'

// Henter live status for en FiveM-server via cfx.re's public API.
// Kaldet går til "/fivem-api/..." som Caddy (prod) eller Vite (dev) sender
// videre til https://servers-frontend.fivem.net — det undgår CORS-fejl,
// fordi requesten i browseren altid går til dit eget domæne.
//
// Se README for hvordan du sætter din cfxCode i src/siteConfig.js.

const POLL_INTERVAL_MS = 30_000

export function useServerStatus(cfxCode) {
  const [status, setStatus] = useState({
    state: 'loading', // 'loading' | 'online' | 'offline' | 'error'
    players: 0,
    maxPlayers: 0,
    hostname: '',
  })
  const timerRef = useRef(null)

  useEffect(() => {
    if (!cfxCode || cfxCode === 'REPLACE_ME') {
      setStatus((s) => ({ ...s, state: 'offline' }))
      return
    }

    let cancelled = false

    async function poll() {
      try {
        const res = await fetch(`/fivem-api/api/servers/single/${cfxCode}`, {
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        const data = json?.Data
        if (!data) throw new Error('Tomt svar fra FiveM API')

        if (!cancelled) {
          setStatus({
            state: 'online',
            players: Array.isArray(data.players) ? data.players.length : (data.clients ?? 0),
            maxPlayers: data.sv_maxclients ?? data.svMaxclients ?? 0,
            hostname: data.hostname ?? '',
          })
        }
      } catch {
        if (!cancelled) {
          setStatus((s) => ({ ...s, state: 'offline' }))
        }
      }
    }

    poll()
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(timerRef.current)
    }
  }, [cfxCode])

  return status
}
