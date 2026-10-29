import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import { stackLocal, variablesDelCarril } from './stack-local.mjs'

const CONFIG = `project_id = "importadora"

[api]
enabled = true
port = 54621

[db]
port = 54622
shadow_port = 54620

[local_smtp]
enabled = true
port = 54624
`

describe('stack-local', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'stack-local-'))
  afterAll(() => rmSync(raiz, { recursive: true, force: true }))
  mkdirSync(join(raiz, 'supabase'))
  writeFileSync(join(raiz, 'supabase/config.toml'), CONFIG)

  it('sin carril es la principal: el project_id y los puertos de config.toml', () => {
    expect(stackLocal(raiz, {})).toEqual({
      proyecto: 'importadora',
      contenedorDb: 'supabase_db_importadora',
      puertoApi: 54621,
      puertoDb: 54622,
      urlApi: 'http://127.0.0.1:54621',
      urlDb: 'postgresql://postgres:postgres@127.0.0.1:54622/postgres',
      urlMailpit: 'http://127.0.0.1:54624',
    })
  })

  it('el carril b corre 200 más arriba en todo, con su project_id', () => {
    const v = variablesDelCarril('b')
    expect(v).toMatchObject({
      SUPABASE_PROJECT_ID: 'importadora-b',
      SUPABASE_API_PORT: 54821,
      SUPABASE_DB_PORT: 54822,
      SUPABASE_DB_SHADOW_PORT: 54820,
      SUPABASE_STUDIO_PORT: 54823,
      SUPABASE_LOCAL_SMTP_PORT: 54824,
      SUPABASE_EDGE_RUNTIME_INSPECTOR_PORT: 8283,
      PUERTO_APP: 3200,
      E2E_PORT: 3410,
      SUPABASE_AUTH_SITE_URL: 'http://localhost:3200',
      E2E_MAILPIT_URL: 'http://127.0.0.1:54824',
      PILOTO_SUPABASE_URL: 'http://127.0.0.1:54821',
    })
  })

  it('ningún puerto de un carril choca con los de otro ni con la principal', () => {
    const usados = [variablesDelCarril('a'), variablesDelCarril('b')]
      .flatMap((v) => Object.values(v))
      .filter((x): x is number => typeof x === 'number')
    const principal = [54620, 54621, 54622, 54623, 54624, 54627, 8083, 3000, 3210]
    expect(usados).toHaveLength(18)
    expect(new Set(usados).size).toBe(usados.length)
    expect(usados.filter((p) => principal.includes(p))).toEqual([])
  })

  it('.env.carril manda sobre config.toml, y una variable del entorno sobre los dos', () => {
    const v = variablesDelCarril('a')
    writeFileSync(
      join(raiz, '.env.carril'),
      Object.entries(v)
        .map(([k, x]) => `${k}=${String(x)}`)
        .join('\n'),
    )
    expect(stackLocal(raiz, {})).toMatchObject({
      contenedorDb: 'supabase_db_importadora-a',
      puertoApi: 54721,
      puertoDb: 54722,
    })
    expect(stackLocal(raiz, { SUPABASE_DB_PORT: '60000' }).puertoDb).toBe(60000)
    rmSync(join(raiz, '.env.carril'))
  })

  it('un carril que no existe es un error claro', () => {
    expect(() => variablesDelCarril('z')).toThrow('carril desconocido: «z»')
  })
})
