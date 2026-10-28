// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { definicionSql } from '../../../../scripts/lib/definicion-sql'
import { CASOS_DE_TELEFONO } from './telefono.casos'
import { normalizarTelefono, telefonoParaMostrar } from './telefono'

describe('normalizarTelefono', () => {
  it.each(CASOS_DE_TELEFONO)('«$escrito» con «$cc»', ({ cc, escrito, numero }) => {
    const resultado = normalizarTelefono(cc, escrito)
    if (numero === undefined) {
      expect(resultado.ok).toBe(false)
    } else {
      expect(resultado).toMatchObject({ ok: true, numero })
    }
  })

  it('dice si el número trajo su propio código de país', () => {
    expect(normalizarTelefono('+591', '+54 11 5555-0000')).toMatchObject({ internacional: true })
    expect(normalizarTelefono('+591', '70011002')).toMatchObject({ internacional: false })
  })
})

describe('telefonoParaMostrar', () => {
  it('separa el código de la empresa y deja el de otro país tal cual', () => {
    expect(telefonoParaMostrar('59170011002', '+591')).toBe('+591 70011002')
    expect(telefonoParaMostrar('5491155550000', '+591')).toBe('+5491155550000')
    expect(telefonoParaMostrar('59170011002', null)).toBe('+59170011002')
    expect(telefonoParaMostrar('591', '+591')).toBe('+591')
  })
})

// La base es la fuente: la misma función SQL, la misma tabla de casos, el mismo resultado.
describe('contra normalizar_telefono() de la base', () => {
  let db: PGlite

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(definicionSql('normalizar_telefono').texto)
  })

  afterAll(async () => {
    await db.close()
  })

  async function enLaBase(cc: string | null, escrito: string) {
    try {
      const { rows } = await db.query<{ n: string }>(
        'select public.normalizar_telefono($1, $2) as n',
        [cc, escrito],
      )
      return { ok: true as const, numero: rows[0]?.n ?? '' }
    } catch (error) {
      return { ok: false as const, motivo: (error as Error).message }
    }
  }

  it.each(CASOS_DE_TELEFONO)('«$escrito» con «$cc»', async ({ cc, escrito }) => {
    const base = await enLaBase(cc, escrito)
    const espejo = normalizarTelefono(cc, escrito)
    expect(espejo.ok).toBe(base.ok)
    if (base.ok && espejo.ok) {
      expect(espejo.numero).toBe(base.numero)
    }
    if (!base.ok && !espejo.ok) {
      expect(espejo.motivo).toBe(base.motivo)
    }
  })
})
