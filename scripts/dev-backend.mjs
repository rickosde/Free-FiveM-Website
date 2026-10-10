import { spawn } from 'node:child_process'
import net from 'node:net'

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port })

    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })

    socket.once('error', (error) => {
      if (error && typeof error === 'object' && 'code' in error && (error.code === 'ECONNREFUSED' || error.code === 'EHOSTUNREACH')) {
        resolve(false)
      } else {
        resolve(false)
      }
    })
  })
}

async function main() {
  const portInUse = await isPortInUse(4000)

  if (portInUse) {
    console.log('Backend port 4000 already in use; reusing the existing server.')
    setInterval(() => {}, 60_000)
    return
  }

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const child = spawn(npmCommand, ['--prefix', 'server', 'run', 'dev'], {
    stdio: 'inherit',
    shell: true,
  })

  child.on('error', (err) => {
    console.error('Failed to start backend process:', err)
    process.exit(1)
  })

  child.on('exit', (code) => {
    process.exit(code ?? 0)
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
