// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CASOS_DE_DOCUMENTO } from './documento.casos'
import { hrefSeguro, validarDocumento } from './documento'

describe('validarDocumento', () => {
  it.each(CASOS_DE_DOCUMENTO)('$nombre', ({ documento, texto, motivo }) => {
    const resultado = validarDocumento(documento)
    if (motivo === undefined) {
      expect(resultado).toMatchObject({ ok: true, texto })
      if (resultado.ok) {
        expect(resultado.documento).toBe(texto === null ? null : documento)
      }
    } else {
      expect(resultado).toEqual({ ok: false, motivo })
    }
  })
})

describe('hrefSeguro', () => {
  it('deja pasar http, https, mailto y tel, y nada más', () => {
    expect(hrefSeguro('https://a.com')).toBe('https://a.com')
    expect(hrefSeguro('HTTP://a.com')).toBe('HTTP://a.com')
    expect(hrefSeguro('mailto:a@b.co')).toBe('mailto:a@b.co')
    expect(hrefSeguro('tel:+591700')).toBe('tel:+591700')
    expect(hrefSeguro('javascript:alert(1)')).toBeNull()
    expect(hrefSeguro(' https://a.com')).toBeNull()
    expect(hrefSeguro('https://a.com\n')).toBeNull()
    expect(hrefSeguro('vbscript:x')).toBeNull()
    expect(hrefSeguro(42)).toBeNull()
    expect(hrefSeguro(`https://${'a'.repeat(2000)}`)).toBeNull()
  })
})

// La base es la fuente: las mismas funciones SQL, la misma tabla de casos, el mismo resultado.
describe('contra _seguimiento_detalle() de la base', () => {
  let db: PGlite
  const FUNCIONES = [
    '_seguimiento_href_valido',
    '_seguimiento_marcas',
    '_seguimiento_nodo',
    '_seguimiento_detalle',
  ]

  beforeAll(async () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/20261015000100_seguimientos_recordatorios.sql'),
      'utf8',
    )
    db = new PGlite()
    for (const nombre of FUNCIONES) {
      const inicio = sql.indexOf(`create or replace function public.${nombre}(`)
      expect(inicio).toBeGreaterThan(-1)
      const cuerpo = sql.indexOf('$$', inicio)
      const fin = sql.indexOf('$$;', cuerpo + 2) + 3
      await db.exec(sql.slice(inicio, fin))
    }
  })

  afterAll(async () => {
    await db.close()
  })

  async function enLaBase(documento: unknown) {
    try {
      const { rows } = await db.query<{ t: string | null }>(
        'select public._seguimiento_detalle($1::jsonb) as t',
        [documento === null ? null : JSON.stringify(documento)],
      )
      return { ok: true as const, texto: rows[0]?.t ?? null }
    } catch (error) {
      return { ok: false as const, motivo: (error as Error).message }
    }
  }

  it.each(CASOS_DE_DOCUMENTO)('$nombre', async ({ documento, texto, motivo }) => {
    const resultado = await enLaBase(documento)
    expect(resultado).toEqual(motivo === undefined ? { ok: true, texto } : { ok: false, motivo })
  })
})
