import { describe, expect, it } from 'vitest'
import { ENTRADAS_VACIAS, entradasDelPedido } from './entradas'
import { argumentosDeEvaluar, resultadoDeEvaluar } from './pedido-de-recalculo'

const VACIAS = entradasDelPedido(ENTRADAS_VACIAS)

const NUEVA = (vehiculoId: string | null) =>
  ({ tipo: 'abierta', origenId: 'o', abierta: 'ab', vehiculoId }) as const
const GUARDADA = { tipo: 'guardada', cotizacionId: 'c' } as const

describe('argumentosDeEvaluar', () => {
  it('la hoja nueva manda el origen, la hoja abierta y las entradas; el vehículo y el modo sólo si los hay (nunca nulos)', () => {
    expect(argumentosDeEvaluar({ de: NUEVA(null), entradas: VACIAS, modoTc: null })).toEqual({
      p_entradas: VACIAS,
      p_origen: 'o',
      p_abierta: 'ab',
    })
    expect(argumentosDeEvaluar({ de: NUEVA('v'), entradas: VACIAS, modoTc: 'unificado' })).toEqual({
      p_entradas: VACIAS,
      p_origen: 'o',
      p_abierta: 'ab',
      p_vehiculo: 'v',
      p_modo_tc: 'unificado',
    })
  })

  it('una guardada manda exactamente sus entradas y su cotización, y el modo sólo si lo hay; nunca el origen, la hoja abierta ni el vehículo', () => {
    expect(argumentosDeEvaluar({ de: GUARDADA, entradas: VACIAS, modoTc: null })).toStrictEqual({
      p_entradas: VACIAS,
      p_cotizacion: 'c',
    })
    expect(
      argumentosDeEvaluar({ de: GUARDADA, entradas: VACIAS, modoTc: 'unificado' }),
    ).toStrictEqual({
      p_entradas: VACIAS,
      p_cotizacion: 'c',
      p_modo_tc: 'unificado',
    })
  })
})

describe('resultadoDeEvaluar', () => {
  it('un error de la base es un valor con su código, y nunca arrastra su mensaje a la pantalla', () => {
    const r = resultadoDeEvaluar({
      data: null,
      error: { code: '22023', message: 'nodo secreto_x' },
    })
    expect(r.ok).toBe(false)
    expect(!r.ok && r.error.codigo).toBe('regla')
  })

  it('un pedido que no llegó es un error de conexión, no «de nuestro lado»', () => {
    const r = resultadoDeEvaluar({ data: null, error: { message: 'TypeError: Failed to fetch' } })
    expect(!r.ok && r.error.codigo).toBe('inesperado')
  })

  it('una respuesta que no es lo prometido es un error, no una hoja vacía', () => {
    expect(resultadoDeEvaluar({ data: { x: 1 }, error: null }).ok).toBe(false)
  })
})
