import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/lib/errores'
import { entradasIniciales, type Entradas, type IndiceDeHoja } from '../../../entities/entradas'
import { hojaDePrueba, respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import type { PedidoDeRecalculo } from '../../../entities/pedido-de-recalculo'
import { recalcular } from '../../../composicion.client'
import { useHoja } from './use-hoja'

vi.mock('../../../composicion.client', () => ({
  recalcular: vi.fn(() => Promise.resolve(ok(respuestaDePrueba()))),
}))

afterEach(cleanup)

const INICIAL = { respuesta: respuestaDePrueba(), estado: { tipo: 'al_dia' } } as const
const montar = () => {
  const hoja = hojaDePrueba()
  return renderHook(() => useHoja({ hoja, inicial: INICIAL, vehiculoId: null }))
}

describe('useHoja: los callbacks de la hoja son los mismos para todas las celdas', () => {
  it('no cambian al tipear ni al recalcular (la XCell está en memo: una función nueva por render dibujaría todas)', () => {
    const hook = montar()
    const antes = hook.result.current.acciones
    act(() => {
      hook.result.current.acciones.alConfirmar('remate', 9500)
    })
    hook.rerender()
    expect(hook.result.current.acciones).toBe(antes)
    expect(hook.result.current.acciones.alConfirmar).toBe(antes.alConfirmar)
    expect(hook.result.current.entradas.inputs.get('remate')).toBe(9500)
  })

  it('dos confirmaciones seguidas parten de la anterior sin esperar a que React dibuje', () => {
    const hook = montar()
    act(() => {
      hook.result.current.acciones.alConfirmar('remate', 1)
      hook.result.current.acciones.alAlternarBandera('cuenta', true)
      hook.result.current.acciones.alElegirVariante('moto')
    })
    const e = hook.result.current.entradas
    expect(e.inputs.get('remate')).toBe(1)
    expect(e.banderas.has('cuenta')).toBe(true)
    expect(e.variante).toBe('moto')
  })

  it('↺ quita el override de la celda', () => {
    const hook = montar()
    act(() => {
      hook.result.current.acciones.alConfirmar('fees', 1300)
    })
    expect(hook.result.current.entradas.overrides.get('fees')).toBe(1300)
    act(() => {
      hook.result.current.acciones.alRestablecer('fees')
    })
    expect(hook.result.current.entradas.overrides.size).toBe(0)
  })
})

const CON_UN_REMATE = (indice: IndiceDeHoja): Entradas => ({
  ...entradasIniciales(indice),
  inputs: new Map([['remate', 800]]),
})
const DE_UNA_GUARDADA = { tipo: 'guardada', cotizacionId: 'c' } as const

describe('useHoja: de dónde calcula y con qué abre', () => {
  it('abre con las entradas iniciales y el «Ver total Bs» que recibe (la nueva abre con las vacías y apagado)', () => {
    const hoja = hojaDePrueba({ ver_total_bs: true })
    const hook = renderHook(() =>
      useHoja({
        hoja,
        inicial: INICIAL,
        vehiculoId: null,
        iniciales: CON_UN_REMATE,
        verTotalBsInicial: true,
      }),
    )
    expect(hook.result.current.entradas.inputs.get('remate')).toBe(800)
    expect(hook.result.current.verTotalBs).toBe(true)
    const nueva = renderHook(() => useHoja({ hoja, inicial: INICIAL, vehiculoId: null }))
    expect(nueva.result.current.entradas.inputs.size).toBe(0)
    expect(nueva.result.current.verTotalBs).toBe(false)
  })

  it('por defecto calcula por su hoja abierta, y con `de` calcula por lo que le dicen (una guardada, sin origen ni abierta)', async () => {
    vi.mocked(recalcular).mockClear()
    vi.useFakeTimers()
    const hoja = hojaDePrueba()
    const nueva = renderHook(() => useHoja({ hoja, inicial: INICIAL, vehiculoId: 'v' }))
    const guardada = renderHook(() =>
      useHoja({
        hoja,
        inicial: INICIAL,
        vehiculoId: null,
        de: DE_UNA_GUARDADA,
      }),
    )
    act(() => {
      nueva.result.current.acciones.alConfirmar('remate', 1)
      guardada.result.current.acciones.alConfirmar('remate', 1)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    vi.useRealTimers()
    const pedidos = vi.mocked(recalcular).mock.calls.map(([p]) => p as PedidoDeRecalculo)
    expect(pedidos.map((p) => p.de)).toEqual([
      { tipo: 'abierta', origenId: hoja.origen.id, abierta: hoja.abierta, vehiculoId: 'v' },
      { tipo: 'guardada', cotizacionId: 'c' },
    ])
  })
})
