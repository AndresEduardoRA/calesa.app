import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { ajustesDeCotizacionDesde, puedeCambiarAjustesDeCotizacion } from './ajustes-de-cotizacion'

const USA = '11111111-1111-4111-8111-111111111111'
const COREA = '22222222-2222-4222-8222-222222222222'

describe('ajustesDeCotizacionDesde', () => {
  it('pasa la fila a camelCase con la versión intacta, microsegundos incluidos', () => {
    expect(
      ajustesDeCotizacionDesde({
        vigencia_dias: 30,
        vehiculo_obligatorio_al_cotizar: false,
        actualizado_en: '2026-11-08T05:35:30.123456+00:00',
      }),
    ).toStrictEqual({
      vigenciaDias: 30,
      vehiculoObligatorioAlCotizar: false,
      actualizadoEn: '2026-11-08T05:35:30.123456+00:00',
    })
  })
})

describe('puedeCambiarAjustesDeCotizacion', () => {
  it('con cotizaciones.configurar sin origen, sí', () => {
    const permisos: Permisos = [
      { clave: 'cotizaciones.configurar', origenId: USA, alcance: 'todos' },
      { clave: 'cotizaciones.configurar', origenId: null, alcance: 'todos' },
    ]
    expect(puedeCambiarAjustesDeCotizacion(permisos)).toBe(true)
  })

  it('con la clave en uno o en dos orígenes, no: valen para todos', () => {
    expect(
      puedeCambiarAjustesDeCotizacion([
        { clave: 'cotizaciones.configurar', origenId: USA, alcance: 'todos' },
      ]),
    ).toBe(false)
    expect(
      puedeCambiarAjustesDeCotizacion([
        { clave: 'cotizaciones.configurar', origenId: USA, alcance: 'todos' },
        { clave: 'cotizaciones.configurar', origenId: COREA, alcance: 'todos' },
      ]),
    ).toBe(false)
  })

  it('sin la clave, no, aunque gestione los ajustes de la empresa', () => {
    expect(
      puedeCambiarAjustesDeCotizacion([
        { clave: 'empresa.ajustes.gestionar', origenId: null, alcance: 'todos' },
        { clave: 'cotizaciones.ver', origenId: null, alcance: 'todos' },
      ]),
    ).toBe(false)
  })
})
