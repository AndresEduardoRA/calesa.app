import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAXIMO_DE_EMBUDOS, type Embudo } from '../../../entities/embudo'

const ejecutar = vi.fn()
vi.mock('next-safe-action/hooks', () => ({ useAction: () => ({ executeAsync: ejecutar }) }))
vi.mock('../actions/crear-embudo', () => ({ crearEmbudo: {} }))

const { useNuevoEmbudo, CLAVE_DEL_NOMBRE_DE_EMBUDO } = await import('./use-nuevo-embudo')

const embudo = (n: number, nombre = `Embudo ${String(n)}`): Embudo =>
  ({ id: `e-${String(n)}`, nombre }) as unknown as Embudo

beforeEach(() => {
  ejecutar.mockReset()
})

describe('useNuevoEmbudo', () => {
  it('un nombre repetido no pide nada y se dice junto al campo', async () => {
    const { result } = renderHook(() =>
      useNuevoEmbudo({ embudos: [embudo(1, 'Ventas')], alCrear: vi.fn() }),
    )
    act(() => {
      result.current.escribir('ventas')
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(ejecutar).not.toHaveBeenCalled()
    expect(result.current.errores[CLAVE_DEL_NOMBRE_DE_EMBUDO]).toBe('Ya tienes un embudo «Ventas».')
  })

  it('crea con el mismo id de intento aunque se reintente, y elige el embudo que devolvió la base', async () => {
    const alCrear = vi.fn()
    ejecutar
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ data: { ok: true, data: { embudo: { id: 'creado' } } } })
    const { result } = renderHook(() => useNuevoEmbudo({ embudos: [], alCrear }))
    act(() => {
      result.current.escribir('Postventa')
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.esperandoConexion).toBe(true)
    await act(async () => {
      result.current.reintentar()
      await Promise.resolve()
    })
    const [primero, segundo] = ejecutar.mock.calls as [[{ id: string }], [{ id: string }]]
    expect(segundo[0].id).toBe(primero[0].id)
    expect(alCrear).toHaveBeenCalledWith('creado')
  })

  it('con el tope de embudos no crea otro y lo dice junto al campo', async () => {
    const llenos = Array.from({ length: MAXIMO_DE_EMBUDOS }, (_, n) => embudo(n))
    const { result } = renderHook(() => useNuevoEmbudo({ embudos: llenos, alCrear: vi.fn() }))
    expect(result.current.lleno).toBe(true)
    act(() => {
      result.current.escribir('Uno más')
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(ejecutar).not.toHaveBeenCalled()
    expect(result.current.errores[CLAVE_DEL_NOMBRE_DE_EMBUDO]).toContain(
      'Elimina uno para crear otro',
    )
  })

  it('una regla de la base (por ejemplo un nombre que ya existe en otra pestaña) va junto al campo', async () => {
    ejecutar.mockResolvedValueOnce({
      data: { ok: false, error: { codigo: 'regla', mensaje: 'Ya tienes un embudo «Nuevo».' } },
    })
    const { result } = renderHook(() => useNuevoEmbudo({ embudos: [], alCrear: vi.fn() }))
    act(() => {
      result.current.escribir('Nuevo')
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.errores[CLAVE_DEL_NOMBRE_DE_EMBUDO]).toBe('Ya tienes un embudo «Nuevo».')
  })
})
