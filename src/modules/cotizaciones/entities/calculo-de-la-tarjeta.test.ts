import { describe, expect, it } from 'vitest'
import { calculoDeLaRespuesta, calculoDeLoGuardado } from './calculo-de-la-tarjeta'
import { hojaDeUnaGuardadaDesde } from './hoja-de-una-guardada-lectura'
import { crudaDeUnaGuardada } from './hoja-de-una-guardada.soporte'
import type { Estado } from './motor-contexto'
import type { RespuestaDeRecalculo } from './recalculo'

const respuesta = (
  valores: Record<string, number | string | null>,
  estados: Record<string, Estado>,
  usd: number | null,
  bs: number | null = null,
): RespuestaDeRecalculo => ({
  valores: new Map(Object.entries(valores)),
  estados: new Map(Object.entries(estados)),
  fuentes: new Map(),
  totales: { usd, bs, sumaUsd: null },
  faltantes: [],
  descartados: [],
  hayFaltantesOcultos: false,
})

function guardada(mas: Record<string, unknown> = {}) {
  const hoja = hojaDeUnaGuardadaDesde(
    crudaDeUnaGuardada({
      valores: { remate: 1000, total: 205 },
      totales: { usd: 205, bs: 1426.8, suma_usd: null },
      ...mas,
    }),
  )
  if (hoja === null) {
    throw new Error('la guardada de prueba no se lee')
  }
  return hoja
}

describe('calculoDeLoGuardado: la tarjeta de una guardada dibuja lo guardado (P5 a)', () => {
  it('toma valores y totales de lo guardado aunque el primer recálculo dé otros', () => {
    const hoy = respuesta({ remate: 2000, total: 405 }, { remate: 'activo' }, 405, 2818.8)
    const c = calculoDeLoGuardado(guardada(), hoy)
    expect(c.valores.get('remate')).toBe(1000)
    expect(c.totales).toEqual({ usd: 205, bs: 1426.8 })
  })

  it('los estados salen del primer recálculo; sin él, nulo', () => {
    const hoy = respuesta(
      { remate: 2000 },
      { remate: 'activo', garantia: 'condicion_apagada' },
      405,
    )
    expect(calculoDeLoGuardado(guardada(), hoy).estados?.get('garantia')).toBe('condicion_apagada')
    expect(calculoDeLoGuardado(guardada(), null).estados).toBeNull()
  })

  it('el modo es el de la cotización', () => {
    const c = calculoDeLoGuardado(
      guardada({ cotizacion: { ...cotizacionBase(), modo_tc: 'bcb' } }),
      null,
    )
    expect(c.modoTc).toBe('bcb')
  })

  it('«Ver total Bs» es el de la cotización y se apaga si la cabecera no lo ofrece', () => {
    const pedida = guardada({ cotizacion: { ...cotizacionBase(), ver_total_bs: true } })
    const ofrece = pedida.diseno.cabecera.verTotalBs && pedida.diseno.cabecera.monedaBs !== null
    expect(calculoDeLoGuardado(pedida, null).verTotalBs).toBe(ofrece)
    expect(calculoDeLoGuardado(guardada(), null).verTotalBs).toBe(false)
  })
})

describe('calculoDeLaRespuesta: lo que la hoja nueva calcula ahora', () => {
  it('lleva la respuesta, el modo y «Ver total Bs»', () => {
    const r = respuesta({ remate: 1000 }, { remate: 'activo' }, 1100, 7656)
    expect(calculoDeLaRespuesta(r, 'oficial', true)).toEqual({
      valores: r.valores,
      estados: r.estados,
      totales: { usd: 1100, bs: 7656 },
      modoTc: 'oficial',
      verTotalBs: true,
    })
  })

  it('sin respuesta no hay estados ni totales', () => {
    const c = calculoDeLaRespuesta(null, null, false)
    expect(c.estados).toBeNull()
    expect(c.totales).toEqual({ usd: null, bs: null })
    expect(c.valores.size).toBe(0)
  })
})

function cotizacionBase() {
  return crudaDeUnaGuardada().cotizacion
}
