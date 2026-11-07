import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  puedeAbrirLaPapeleraDeCotizaciones,
  puedeEnviarCotizacionesALaPapelera,
  puedeEnviarLaCotizacion,
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

describe('puedeEnviarCotizacionesALaPapelera', () => {
  it('envía quien edita, modera o gestiona finales en algún origen', () => {
    expect(puedeEnviarCotizacionesALaPapelera(con('cotizaciones.editar'))).toBe(true)
    expect(puedeEnviarCotizacionesALaPapelera(con('cotizaciones.moderar'))).toBe(true)
    expect(puedeEnviarCotizacionesALaPapelera(con('cotizaciones.final.gestionar'))).toBe(true)
  })

  it('la clave de vaciarla sola no alcanza para enviar', () => {
    expect(puedeEnviarCotizacionesALaPapelera(con('cotizaciones.papelera.purgar'))).toBe(false)
    expect(puedeEnviarCotizacionesALaPapelera(con('cotizaciones.ver'))).toBe(false)
    expect(puedeEnviarCotizacionesALaPapelera([])).toBe(false)
  })
})

describe('puedeEnviarLaCotizacion', () => {
  const preventa = { clase: 'preventa' as const }
  const final = { clase: 'final' as const }

  it('quien puede guardarla la envía, sea preventa o final', () => {
    expect(puedeEnviarLaCotizacion(preventa, true, con('cotizaciones.ver'))).toBe(true)
    expect(puedeEnviarLaCotizacion(final, true, con('cotizaciones.ver'))).toBe(true)
  })

  it('una preventa que no puede guardar la envía con moderar', () => {
    expect(puedeEnviarLaCotizacion(preventa, false, con('cotizaciones.moderar'))).toBe(true)
  })

  it('una final que no puede guardar no la envía ni con moderar', () => {
    expect(puedeEnviarLaCotizacion(final, false, con('cotizaciones.moderar'))).toBe(false)
  })

  it('quien sólo la ve no la envía', () => {
    expect(puedeEnviarLaCotizacion(preventa, false, con('cotizaciones.ver'))).toBe(false)
    expect(puedeEnviarLaCotizacion(preventa, false, con('cotizaciones.papelera.purgar'))).toBe(
      false,
    )
  })
})
