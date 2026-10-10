// Meget simpel JSON-fil-baseret datalagring — ingen database nødvendig.
// Fint til denne skala (ansøgningstyper + map-locations). Kan senere
// erstattes med MySQL/SQLite hvis I får brug for det.

import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')

export async function readData(name, fallback) {
  const file = path.join(DATA_DIR, `${name}.json`)
  if (!existsSync(file)) {
    await writeFile(file, JSON.stringify(fallback, null, 2))
    return fallback
  }
  const raw = await readFile(file, 'utf-8')
  return JSON.parse(raw)
}

export async function writeData(name, value) {
  const file = path.join(DATA_DIR, `${name}.json`)
  await writeFile(file, JSON.stringify(value, null, 2))
  return value
}
