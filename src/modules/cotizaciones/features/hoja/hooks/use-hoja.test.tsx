import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/lib/errores'
import { hojaDePrueba, respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
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
