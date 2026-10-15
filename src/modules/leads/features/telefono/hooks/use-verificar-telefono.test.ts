import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Verificacion } from '../../../entities/verificacion'
import { ESPERA_DE_VERIFICACION_MS, useVerificarTelefono } from './use-verificar-telefono'

// La consulta es de cada pantalla (una action de servidor): acá contesta lo que el test diga.
const preguntar = vi.fn<(telefono: string) => Promise<Verificacion | null>>()

const respuesta = (verificacion: Verificacion) => verificacion

function diferida() {
  let resolver: (valor: Verificacion | null) => void = () => {}
  const promesa = new Promise<Verificacion | null>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

beforeEach(() => {
  vi.useFakeTimers()
  preguntar.mockReset()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

type Args = { telefono: string; codigoDePais: string | null; activo: boolean; validez?: string }
const montar = (inicial: Args) =>
  renderHook((args: Args) => useVerificarTelefono({ ...args, consultar: preguntar }), {
    initialProps: inicial,
  })

const esperar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

describe('useVerificarTelefono: cuándo pregunta', () => {
  it('pregunta una sola vez, cuando la persona dejó de tipear 400 ms', async () => {
    preguntar.mockResolvedValue(respuesta({ estado: 'libre' }))
    const { result, rerender } = montar({ telefono: '7001', codigoDePais: '+591', activo: true })
    rerender({ telefono: '70011', codigoDePais: '+591', activo: true })
    rerender({ telefono: '700110', codigoDePais: '+591', activo: true })
    rerender({ telefono: '70011002', codigoDePais: '+591', activo: true })
    await esperar(ESPERA_DE_VERIFICACION_MS - 1)
    expect(preguntar).not.toHaveBeenCalled()
    expect(result.current.verificando).toBe(true)
    await esperar(1)
    expect(preguntar).toHaveBeenCalledTimes(1)
    expect(preguntar).toHaveBeenCalledWith('70011002')
    expect(result.current.verificacion).toEqual({ estado: 'libre' })
    expect(result.current.verificando).toBe(false)
    expect(result.current.numero).toBe('59170011002')
  })

  it('un número que todavía no es un teléfono no pregunta nada', async () => {
    const { result } = montar({ telefono: '70abc', codigoDePais: '+591', activo: true })
    await esperar(2000)
    expect(preguntar).not.toHaveBeenCalled()
    expect(result.current.numero).toBeNull()
    expect(result.current.verificando).toBe(false)
  })

  it('no pregunta con el drawer cerrado ni en el paso del seguimiento', async () => {
    montar({ telefono: '70011002', codigoDePais: '+591', activo: false })
    await esperar(2000)
    expect(preguntar).not.toHaveBeenCalled()
  })
})

describe('useVerificarTelefono: qué conserva', () => {
  it('la última pregunta gana: una respuesta tardía de otro número no se muestra', async () => {
    const primera = diferida()
    preguntar
      .mockReturnValueOnce(primera.promesa)
      .mockResolvedValueOnce(respuesta({ estado: 'de_otro', dueno: 'Diego' }))
    const { result, rerender } = montar({
      telefono: '70011001',
      codigoDePais: '+591',
      activo: true,
    })
    await esperar(ESPERA_DE_VERIFICACION_MS)
    rerender({ telefono: '70011002', codigoDePais: '+591', activo: true })
    await esperar(ESPERA_DE_VERIFICACION_MS)
    expect(result.current.verificacion).toEqual({ estado: 'de_otro', dueno: 'Diego' })
    // Llega, tarde, lo del número anterior.
    await act(async () => {
      primera.resolver(respuesta({ estado: 'libre' }))
      await Promise.resolve()
    })
    expect(result.current.verificacion).toEqual({ estado: 'de_otro', dueno: 'Diego' })
    expect(result.current.numero).toBe('59170011002')
  })

  it('sin red no hay veredicto: sigue sin saberse y no rompe', async () => {
    preguntar.mockRejectedValue(new Error('sin red'))
    const { result } = montar({ telefono: '70011002', codigoDePais: '+591', activo: true })
    await esperar(ESPERA_DE_VERIFICACION_MS)
    expect(result.current.verificacion).toBeNull()
  })

  it('lo que dijo la base al guardar se fija para ese número', () => {
    const { result } = montar({ telefono: '70011002', codigoDePais: '+591', activo: false })
    act(() => {
      result.current.fijar('59170011002', { estado: 'limbo' })
    })
    expect(result.current.verificacion).toEqual({ estado: 'limbo' })
  })

  it('una consulta sin veredicto (null) deja todo como estaba', async () => {
    preguntar.mockResolvedValue(null)
    const { result } = montar({ telefono: '70011002', codigoDePais: '+591', activo: true })
    await esperar(ESPERA_DE_VERIFICACION_MS)
    expect(result.current.verificacion).toBeNull()
  })

  it('al cambiar la validez el veredicto se descarta y se vuelve a preguntar', async () => {
    preguntar
      .mockResolvedValueOnce(respuesta({ estado: 'libre' }))
      .mockResolvedValueOnce(respuesta({ estado: 'mismo' }))
    const { result, rerender } = montar({
      telefono: '70011002',
      codigoDePais: '+591',
      activo: true,
      validez: 'v1',
    })
    await esperar(ESPERA_DE_VERIFICACION_MS)
    expect(result.current.verificacion).toEqual({ estado: 'libre' })
    rerender({ telefono: '70011002', codigoDePais: '+591', activo: true, validez: 'v2' })
    expect(result.current.verificacion).toBeNull()
    await esperar(ESPERA_DE_VERIFICACION_MS)
    expect(preguntar).toHaveBeenCalledTimes(2)
    expect(result.current.verificacion).toEqual({ estado: 'mismo' })
  })
})
