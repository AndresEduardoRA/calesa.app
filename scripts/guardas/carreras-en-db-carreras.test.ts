import { readdirSync, readFileSync } from 'node:fs'
import { posix } from 'node:path'
import { describe, expect, it } from 'vitest'

import { ENTRADA, carrerasSinCorrer, esModuloDeCarreras } from './carreras-en-db-carreras'

// Una carrera que sólo corre a mano no corre: todo módulo de carreras se alcanza desde `scripts/carreras.mjs` (`pnpm db:carreras`).
const modulosDe = (dir: string) =>
  readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((n) => n.endsWith('.mjs'))
    .map((n) => posix.join(dir, n.split('\\').join('/')))

const archivosDelRepo = () =>
  new Map(
    [ENTRADA, ...modulosDe('scripts/carreras'), ...modulosDe('supabase/tests/areas')].map((r) => [
      r,
      readFileSync(r, 'utf8'),
    ]),
  )

describe('las carreras del repo corren en db:carreras', () => {
  it('hay módulos de carreras en scripts/carreras/ y en supabase/tests/areas/', () => {
    const rutas = [...archivosDelRepo().keys()].filter(esModuloDeCarreras)
    expect(rutas.some((r) => r.startsWith('scripts/carreras/'))).toBe(true)
    expect(rutas.some((r) => r.startsWith('supabase/tests/areas/'))).toBe(true)
  })

  it('ninguna queda fuera de scripts/carreras.mjs', () => {
    expect(carrerasSinCorrer(archivosDelRepo())).toEqual([])
  })

  it('quitar el import de una carrera la deja fuera, con lo que sólo ella importa', () => {
    const archivos = archivosDelRepo()
    const entrada = archivos.get(ENTRADA) ?? ''
    const sinFinal = entrada.replace(
      /^import [^']*'\.\.\/supabase\/tests\/areas\/final\/carreras\.mjs'\n/m,
      '',
    )
    expect(sinFinal).not.toBe(entrada)
    archivos.set(ENTRADA, sinFinal)
    expect(carrerasSinCorrer(archivos)).toEqual([
      'supabase/tests/areas/final/carreras-comun.mjs',
      'supabase/tests/areas/final/carreras-crear-candados.mjs',
      'supabase/tests/areas/final/carreras-crear.mjs',
      'supabase/tests/areas/final/carreras-de-candados.mjs',
      'supabase/tests/areas/final/carreras.mjs',
    ])
  })
})

describe('carrerasSinCorrer', () => {
  it('sigue los imports relativos, también los transitivos y los que suben de carpeta', () => {
    const archivos = new Map([
      [
        ENTRADA,
        "import { a } from './carreras/a.mjs'\nimport { b } from '../supabase/tests/areas/x/carreras.mjs'",
      ],
      ['scripts/carreras/a.mjs', "import pg from 'pg'\nimport { t } from './terreno.mjs'"],
      ['scripts/carreras/terreno.mjs', ''],
      ['supabase/tests/areas/x/carreras.mjs', "import { c } from './carreras-comun.mjs'"],
      ['supabase/tests/areas/x/carreras-comun.mjs', ''],
    ])
    expect(carrerasSinCorrer(archivos)).toEqual([])
  })

  it('nombra lo que nadie importa, y no cuenta lo que no es una carrera', () => {
    const archivos = new Map([
      [ENTRADA, ''],
      ['scripts/carreras/suelta.mjs', ''],
      ['supabase/tests/areas/y/carreras-sola.mjs', ''],
      ['supabase/tests/areas/y/correr.mjs', ''],
    ])
    expect(carrerasSinCorrer(archivos)).toEqual([
      'scripts/carreras/suelta.mjs',
      'supabase/tests/areas/y/carreras-sola.mjs',
    ])
  })
})
