import { describe, expect, it } from 'vitest'
import { CAMPOS_DE_NUMEROS, SIN_NUMEROS, escribirNumeros, numerosDesde } from './numeros-de-lead'

const formatear = (n: number) => n.toLocaleString('es-BO')

describe('numerosDesde', () => {
  it('lee lo que trae una fila de la vista o una RPC', () => {
    expect(
      numerosDesde({ numero: 1234, numero_propio: 12, numero_propio_creador: 'Berta' }),
    ).toEqual({
      numero: 1234,
      numeroPropio: 12,
      creadorDelPropio: 'Berta',
    })
  })
  it('lo que no llega es nulo, no cero', () => {
    expect(numerosDesde({})).toEqual(SIN_NUMEROS)
    expect(numerosDesde({ numero: null, numero_propio: null })).toEqual(SIN_NUMEROS)
  })
  it('tiene un campo por cada dato que se lee', () => {
    expect(Object.keys(CAMPOS_DE_NUMEROS).sort()).toEqual([
      'numero',
      'numero_propio',
      'numero_propio_creador',
    ])
  })
})

describe('escribirNumeros', () => {
  it('sin ningún número, no escribe nada', () => {
    expect(escribirNumeros(SIN_NUMEROS, formatear)).toEqual({ principal: null, secundario: null })
  })
  it('el global se escribe «N.º» con el separador de miles de la empresa', () => {
    const e = escribirNumeros(
      { numero: 1234, numeroPropio: null, creadorDelPropio: null },
      formatear,
    )
    expect(e.principal).toBe(`N.º ${(1234).toLocaleString('es-BO')}`)
    expect(e.secundario).toBeNull()
  })
  it('sin el permiso, el propio de quien mira es «Tu n.º»', () => {
    expect(
      escribirNumeros({ numero: null, numeroPropio: 12, creadorDelPropio: null }, formatear),
    ).toEqual({
      principal: 'Tu n.º 12',
      secundario: null,
    })
  })
  it('con el permiso se ven los dos: el global primero y el propio como dato secundario', () => {
    expect(
      escribirNumeros({ numero: 40, numeroPropio: 12, creadorDelPropio: null }, formatear),
    ).toEqual({
      principal: 'N.º 40',
      secundario: 'Tu n.º 12',
    })
  })
  it('un propio sin nombre del creador es de quien mira: la base nunca lo manda nulo para el de otra persona', () => {
    // Contrato con `leads_vista` y `lead_ficha` (…001200): nulo = «es mío». Un creador sin nombre o sin perfil llega
    // con el nombre de respaldo, así que nunca se lee como «Tu n.º».
    expect(
      escribirNumeros({ numero: 40, numeroPropio: 12, creadorDelPropio: 'Otra persona' }, formatear)
        .secundario,
    ).toBe('N.º 12 · Otra persona')
  })
  it('el propio de otra persona lleva su nombre', () => {
    expect(
      escribirNumeros({ numero: 40, numeroPropio: 12, creadorDelPropio: 'Berta' }, formatear),
    ).toEqual({
      principal: 'N.º 40',
      secundario: 'N.º 12 · Berta',
    })
  })
})
