// Lee del disco los archivos que `extraer.ts` mira: migraciones, semilla, `config.toml` y los `.ts` de cada función edge.
import fs from 'node:fs'
import path from 'node:path'
import type { Archivo } from './extraer'

export function archivosDelRepo(raiz: string): Archivo[] {
  const leer = (ruta: string): Archivo => ({
    ruta,
    texto: fs.readFileSync(path.join(raiz, ruta), 'utf8'),
  })
  const migraciones = fs
    .readdirSync(path.join(raiz, 'supabase/migrations'))
    .filter((n) => n.endsWith('.sql'))
    .map((n) => `supabase/migrations/${n}`)
  const funciones = fs
    .readdirSync(path.join(raiz, 'supabase/functions'), { recursive: true, encoding: 'utf8' })
    .filter((n) => n.endsWith('.ts'))
    .map((n) => `supabase/functions/${n.split(path.sep).join('/')}`)
  return [...migraciones, 'supabase/seed.sql', 'supabase/config.toml', ...funciones].map(leer)
}
