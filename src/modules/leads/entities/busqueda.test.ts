// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { patronContiene } from '@/shared/lib/supabase/consultas'
import { CASOS_DE_BUSQUEDA } from './busqueda.casos'

// La base es la fuente de los candidatos y la consulta de siempre arma la página: si no arman el mismo patrón, una búsqueda
// encuentra en un paso lo que el otro no (5a-fix-1b). Misma tabla de casos, la misma función SQL de la migración.
describe('_lead_busqueda_patron() de la base contra patronContiene()', () => {
  let db: PGlite

  beforeAll(async () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/20261019003300_busqueda_por_candidatos.sql'),
      'utf8',
    )
    const inicio = sql.indexOf('create or replace function public._lead_busqueda_patron')
    const fin = sql.indexOf('$$;', inicio) + 3
    expect(inicio).toBeGreaterThan(-1)
    db = new PGlite()
    await db.exec(sql.slice(inicio, fin))
  })

  afterAll(async () => {
    await db.close()
  })

  // PostgREST escribe `*` donde el SQL escribe `%` en los dos extremos del patrón.
  const comoLoEscribeLaBase = (patron: string) => `%${patron.slice(1, -1)}%`

  it.each(CASOS_DE_BUSQUEDA.map((texto) => ({ texto })))('«$texto»', async ({ texto }) => {
    const { rows } = await db.query<{ p: string }>('select public._lead_busqueda_patron($1) as p', [
      texto,
    ])
    expect(rows[0]?.p).toBe(comoLoEscribeLaBase(patronContiene(texto)))
  })

  it('lo escrito es literal: ni %, ni _ ni \\ son comodines; * es «un carácter»', async () => {
    const pregunta = async (nombre: string, texto: string) =>
      (
        await db.query<{ coincide: boolean }>(
          'select $1 ilike public._lead_busqueda_patron($2) as coincide',
          [nombre, texto],
        )
      ).rows[0]?.coincide
    expect(await pregunta('Oferta 50% hoy', '50%')).toBe(true)
    expect(await pregunta('Oferta 500 hoy', '50%')).toBe(false)
    expect(await pregunta('a_b', 'a_b')).toBe(true)
    expect(await pregunta('axb', 'a_b')).toBe(false)
    expect(await pregunta('a\\b', 'a\\b')).toBe(true)
    expect(await pregunta('axb', 'a*b')).toBe(true)
    expect(await pregunta('ab', 'a*b')).toBe(false)
    expect(await pregunta('Pérez Gómez', 'gómez')).toBe(true)
  })
})
