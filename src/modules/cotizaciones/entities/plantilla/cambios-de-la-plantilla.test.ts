import { describe, expect, it } from 'vitest'
import {
  conColumna,
  conEtiqueta,
  conLeyenda,
  conLogo,
  conNota,
  conTonoDelGrupo,
  conTotal,
} from './cambios-de-la-plantilla'
import type { Plantilla } from './forma-de-plantilla'

const base: Plantilla = {
  grupos: [{ grupo: 'a', tono: 'verde' }, { grupo: 'b' }],
  etiquetas: { x: 'Equis' },
  total: { etiqueta: 'TOTAL', leyenda: 'ley' },
  nota: 'Nota',
  logo: false,
  columnas: { leyenda: false, plazo: false, tipo_cambio: false },
}
const copia = JSON.stringify(base)

describe('cambios de la plantilla', () => {
  it('el tono: elegir lo pone y nulo quita la clave', () => {
    expect(conTonoDelGrupo(base, 'b', 'azul').grupos).toEqual([
      { grupo: 'a', tono: 'verde' },
      { grupo: 'b', tono: 'azul' },
    ])
    const sin = conTonoDelGrupo(base, 'a', null).grupos[0]!
    expect(Object.hasOwn(sin, 'tono')).toBe(false)
  })
  it('una etiqueta vacía quita la clave y un diccionario vacío se quita', () => {
    expect(conEtiqueta(base, 'y', 'Y').etiquetas).toEqual({ x: 'Equis', y: 'Y' })
    expect(conEtiqueta(base, 'x', 'Otra').etiquetas).toEqual({ x: 'Otra' })
    const sin = conEtiqueta(base, 'x', '  ')
    expect(Object.hasOwn(sin, 'etiquetas')).toBe(false)
  })
  it('una leyenda en blanco no crea el diccionario', () => {
    expect(Object.hasOwn(conLeyenda(base, 'x', ''), 'leyendas')).toBe(false)
    expect(conLeyenda(base, 'x', 'Hola').leyendas).toEqual({ x: 'Hola' })
  })
  it('un id `__proto__` queda como clave propia', () => {
    const r = conEtiqueta(base, '__proto__', 'P')
    expect(Object.hasOwn(r.etiquetas ?? {}, '__proto__')).toBe(true)
  })
  it('el total, la nota, el logo y las columnas', () => {
    expect(conTotal(base, { etiqueta: 'NUEVO' }).total).toEqual({
      etiqueta: 'NUEVO',
      leyenda: 'ley',
    })
    expect(conTotal(base, { leyenda: '' }).total).toEqual({ etiqueta: 'TOTAL' })
    expect(Object.hasOwn(conNota(base, ''), 'nota')).toBe(false)
    expect(conNota(base, 'Otra').nota).toBe('Otra')
    expect(conLogo(base, true).logo).toBe(true)
    expect(conColumna(base, 'plazo', true).columnas).toEqual({
      leyenda: false,
      plazo: true,
      tipo_cambio: false,
    })
  })
  it('no muta su entrada', () => {
    conTonoDelGrupo(base, 'a', null)
    conEtiqueta(base, 'x', '')
    conTotal(base, { etiqueta: 'Z' })
    conColumna(base, 'leyenda', true)
    expect(JSON.stringify(base)).toBe(copia)
  })
})
