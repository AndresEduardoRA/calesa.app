import { describe, expect, it } from 'vitest'
import { hojaDesde } from './hoja'
import { hojaDeUnaGuardadaDesde } from './hoja-de-una-guardada-lectura'
import {
  ACTUALIZADO_EN,
  crudaDeUnaGuardada,
  ID_DE_LA_COTIZACION,
} from './hoja-de-una-guardada.soporte'

describe('hojaDeUnaGuardadaDesde: lo que lee la página de una cotización guardada', () => {
  it('lee la respuesta de la base, que no trae la hoja abierta', () => {
    const h = hojaDeUnaGuardadaDesde(crudaDeUnaGuardada())
    expect(h).not.toBeNull()
    expect(h?.cotizacion).toMatchObject({
      id: ID_DE_LA_COTIZACION,
      numero: 41,
      clase: 'preventa',
      version: 1,
      leadId: null,
      vehiculoId: null,
      modoTc: null,
      verTotalBs: false,
      titulo: null,
      notas: null,
    })
    expect(h?.puedeGuardar).toBe(true)
    expect(h?.venceEl).toBe('2026-12-03')
    expect(h?.vencida).toBe(false)
    expect(h?.diseno.origen).toEqual({
      id: '00000000-0000-0000-0000-000000000001',
      nombre: 'Subasta',
    })
    expect(h?.diseno.formula.version).toBe(3)
    expect(h?.diseno.tarjetaTotal.etiqueta).toBe('TOTAL')
  })

  it('actualizadoEn sale idéntico al texto de la base, con sus microsegundos', () => {
    const h = hojaDeUnaGuardadaDesde(crudaDeUnaGuardada())
    expect(h?.cotizacion.actualizadoEn).toBe(ACTUALIZADO_EN)
    expect(h?.cotizacion.actualizadoEn).toContain('.123456')
  })

  it('lo guardado: los valores y las fuentes en Map y el total en dólares (nulo si no hay)', () => {
    const h = hojaDeUnaGuardadaDesde(crudaDeUnaGuardada())
    expect(h?.guardado.valores.get('remate')).toBe(1000)
    expect(h?.guardado.fuentes.get('remate')).toBe('input')
    expect(h?.guardado.totalUsd).toBe(2350)
    const sinTotal = hojaDeUnaGuardadaDesde(
      crudaDeUnaGuardada({ totales: { usd: null, bs: null, suma_usd: null } }),
    )
    expect(sinTotal?.guardado.totalUsd).toBeNull()
    const sinTotales = hojaDeUnaGuardadaDesde(crudaDeUnaGuardada({ totales: {} }))
    expect(sinTotales?.guardado.totalUsd).toBeNull()
  })

  it('un nodo con un id como «constructor» no se confunde con el prototipo', () => {
    const h = hojaDeUnaGuardadaDesde(crudaDeUnaGuardada({ valores: { constructor: 4 } }))
    expect(h?.guardado.valores.get('constructor')).toBe(4)
    expect(h?.guardado.valores.get('toString')).toBeUndefined()
  })

  it('quien sólo ve: puede_guardar falso y vencida verdadera pasan tal cual', () => {
    const h = hojaDeUnaGuardadaDesde(crudaDeUnaGuardada({ puede_guardar: false, vencida: true }))
    expect(h?.puedeGuardar).toBe(false)
    expect(h?.vencida).toBe(true)
  })

  it('hojaDesde() no la lee: la de cotizar exige la hoja abierta (V2)', () => {
    expect(hojaDesde(crudaDeUnaGuardada())).toBeNull()
  })

  it('una respuesta que no es lo que promete la base es nula', () => {
    expect(hojaDeUnaGuardadaDesde(null)).toBeNull()
    expect(hojaDeUnaGuardadaDesde({})).toBeNull()
    const { valores: _v, ...sinValores } = crudaDeUnaGuardada()
    expect(hojaDeUnaGuardadaDesde(sinValores)).toBeNull()
    expect(hojaDeUnaGuardadaDesde(crudaDeUnaGuardada({ cotizacion: { id: 'x' } }))).toBeNull()
  })
})

describe('hojaDeUnaGuardadaDesde: la cadena y la publicada (4.15-3b)', () => {
  it('lee la cadena y la publicada de hoy', () => {
    const ANTERIOR = '00000000-0000-4000-8000-0000000000bb'
    const NUEVA = '00000000-0000-4000-8000-0000000000cc'
    const h = hojaDeUnaGuardadaDesde(
      crudaDeUnaGuardada({
        anterior: { id: ANTERIOR, numero: 40, version: 1 },
        encima: { id: NUEVA, numero: 42, version: 3 },
        puede_cotizar_encima: true,
      }),
    )
    expect(h?.cadena).toEqual({
      anterior: { id: ANTERIOR, numero: 40, version: 1 },
      encima: { id: NUEVA, numero: 42, version: 3 },
      puedeCotizarEncima: true,
    })
    expect(h?.publicada).toEqual({ id: '00000000-0000-0000-0000-000000000001', version: 3 })
    const oculta = hojaDeUnaGuardadaDesde(crudaDeUnaGuardada({ encima: { oculta: true } }))
    expect(oculta?.cadena.encima).toEqual({ oculta: true })
    expect(hojaDeUnaGuardadaDesde(crudaDeUnaGuardada({ publicada: null }))?.publicada).toBeNull()
  })

  it('una respuesta sin puede_cotizar_encima no es lo que la base promete', () => {
    const { puede_cotizar_encima: _quitada, ...sin } = crudaDeUnaGuardada()
    expect(hojaDeUnaGuardadaDesde(sin)).toBeNull()
    expect(hojaDeUnaGuardadaDesde(crudaDeUnaGuardada({ encima: { raro: 1 } }))).toBeNull()
  })
})
