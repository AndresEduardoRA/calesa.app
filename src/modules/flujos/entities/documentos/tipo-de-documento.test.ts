// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { definicionSql } from '../../../../../scripts/lib/definicion-sql'
import {
  FORMATOS_DE_DOCUMENTO,
  TOPE_DE_TIPOS_POR_GRUPO,
  destinoDeTipo,
  textoDelUso,
  tipoEnUso,
  usoDeTipoDesde,
  type TipoDeDocumento,
} from './tipo-de-documento'

// La base es la fuente: lo que la app espeja no se copia a ojo.
describe('contra la base', () => {
  let db: PGlite

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(definicionSql('_tipos_documento_formatos').texto)
    await db.exec(definicionSql('_tipos_documento_tope').texto)
  })

  afterAll(async () => {
    await db.close()
  })

  it('FORMATOS_DE_DOCUMENTO es la lista de _tipos_documento_formatos(), en el mismo orden', async () => {
    const { rows } = await db.query<{ f: string[] }>(
      'select public._tipos_documento_formatos() as f',
    )
    expect(rows[0]?.f).toEqual([...FORMATOS_DE_DOCUMENTO])
  })

  it('el tope por grupo es el de _tipos_documento_tope()', async () => {
    const { rows } = await db.query<{ t: number }>('select public._tipos_documento_tope() as t')
    expect(rows[0]?.t).toBe(TOPE_DE_TIPOS_POR_GRUPO)
  })
})

function tipo(id: string): TipoDeDocumento {
  return {
    id,
    flujoId: null,
    nombre: id,
    descripcion: null,
    formatos: ['application/pdf'],
    modo: 'ninguno',
    vigenciaDias: null,
    avisoDias: null,
    visiblePortal: false,
    activo: true,
    orden: 10,
    actualizadoEn: '2026-11-11T19:52:59.123456+00:00',
  }
}

describe('destinoDeTipo', () => {
  const tipos = ['a', 'b', 'c'].map(tipo)

  it('sube un lugar: después del que estaba dos antes, o primero', () => {
    expect(destinoDeTipo(tipos, 'c', 'subir')).toEqual({ despuesDe: 'a' })
    expect(destinoDeTipo(tipos, 'b', 'subir')).toEqual({ despuesDe: null })
  })

  it('baja un lugar: después del siguiente', () => {
    expect(destinoDeTipo(tipos, 'a', 'bajar')).toEqual({ despuesDe: 'b' })
    expect(destinoDeTipo(tipos, 'b', 'bajar')).toEqual({ despuesDe: 'c' })
  })

  it('no mueve en los extremos ni lo que no está', () => {
    expect(destinoDeTipo(tipos, 'a', 'subir')).toBeNull()
    expect(destinoDeTipo(tipos, 'c', 'bajar')).toBeNull()
    expect(destinoDeTipo(tipos, 'x', 'subir')).toBeNull()
  })
})

describe('el uso', () => {
  it('sin uso', () => {
    expect(textoDelUso(usoDeTipoDesde(0, 0))).toBe('Sin uso')
    expect(tipoEnUso(usoDeTipoDesde(0, 0))).toBe(false)
    expect(tipoEnUso(null)).toBe(false)
  })

  it('dice lo que lo usa, en singular y plural', () => {
    expect(textoDelUso(usoDeTipoDesde(3, 2))).toBe('Lo usan 3 documentos y 2 requisitos')
    expect(textoDelUso(usoDeTipoDesde(0, 1))).toBe('Lo usa 1 requisito')
    expect(textoDelUso(usoDeTipoDesde(1, 1))).toBe('Lo usan 1 documento y 1 requisito')
    expect(tipoEnUso(usoDeTipoDesde(0, 1))).toBe(true)
  })

  it('un conteo que llega al tope + 1 es «más de 50»', () => {
    expect(textoDelUso(usoDeTipoDesde(51, 0))).toBe('Lo usan más de 50 documentos')
    expect(textoDelUso(usoDeTipoDesde(50, 51))).toBe('Lo usan 50 documentos y más de 50 requisitos')
  })
})
