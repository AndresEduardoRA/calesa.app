import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  puedeAbrirLaPapeleraDeCotizaciones,
  puedePurgarLaPapeleraDeCotizaciones,
  puedeRestaurarElLote,
} from './acceso'

const con = (...claves: string[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const })) as Permisos

describe('puedeAbrirLaPapeleraDeCotizaciones', () => {
  it('la abre quien puede enviar a la papelera, clave por clave', () => {
    expect(puedeAbrirLaPapeleraDeCotizaciones(con('cotizaciones.editar'))).toBe(true)
    expect(puedeAbrirLaPapeleraDeCotizaciones(con('cotizaciones.moderar'))).toBe(true)
    expect(puedeAbrirLaPapeleraDeCotizaciones(con('cotizaciones.final.gestionar'))).toBe(true)
  })

  it('la abre quien puede vaciarla', () => {
    expect(puedeAbrirLaPapeleraDeCotizaciones(con('cotizaciones.papelera.purgar'))).toBe(true)
  })

  it('no la abre quien sólo ve, crea o configura', () => {
    expect(puedeAbrirLaPapeleraDeCotizaciones(con('cotizaciones.ver'))).toBe(false)
    expect(puedeAbrirLaPapeleraDeCotizaciones(con('cotizaciones.ver', 'cotizaciones.crear'))).toBe(
      false,
    )
    expect(puedeAbrirLaPapeleraDeCotizaciones(con('cotizaciones.configurar'))).toBe(false)
    expect(puedeAbrirLaPapeleraDeCotizaciones([])).toBe(false)
  })

  it('una clave de otro módulo con el mismo final no cuenta', () => {
    expect(
      puedeAbrirLaPapeleraDeCotizaciones(con('leads.papelera.purgar', 'vehiculos.editar')),
    ).toBe(false)
  })
})

describe('puedePurgarLaPapeleraDeCotizaciones', () => {
  it('es la clave de vaciarla y ninguna otra', () => {
    expect(puedePurgarLaPapeleraDeCotizaciones(con('cotizaciones.papelera.purgar'))).toBe(true)
    expect(
      puedePurgarLaPapeleraDeCotizaciones(con('cotizaciones.editar', 'cotizaciones.moderar')),
    ).toBe(false)
  })
})

describe('puedeRestaurarElLote', () => {
  it('restaura quien lo envió o quien puede vaciar la papelera', () => {
    expect(puedeRestaurarElLote({ esMio: true }, false)).toBe(true)
    expect(puedeRestaurarElLote({ esMio: false }, true)).toBe(true)
    expect(puedeRestaurarElLote({ esMio: true }, true)).toBe(true)
  })

  it('no restaura quien ni lo envió ni puede vaciar', () => {
    expect(puedeRestaurarElLote({ esMio: false }, false)).toBe(false)
  })
})
