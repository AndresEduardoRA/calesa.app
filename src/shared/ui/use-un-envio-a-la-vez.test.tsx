import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useUnEnvioALaVez } from './use-un-envio-a-la-vez'

describe('useUnEnvioALaVez', () => {
  it('un segundo envío con el primero en vuelo no sale: devuelve nulo', async () => {
    const { result } = renderHook(() => useUnEnvioALaVez())
    let soltar: (valor: string) => void = () => undefined
    let veces = 0
    const envio = () => {
      veces += 1
      return new Promise<string>((resolver) => {
        soltar = resolver
      })
    }
    let primero: Promise<string | null> = Promise.resolve(null)
    let segundo: string | null = 'sin llamar'
    await act(async () => {
      primero = result.current.mandar(envio)
      segundo = await result.current.mandar(envio)
    })
    expect(segundo).toBeNull()
    expect(veces).toBe(1)
    expect(result.current.enCurso).toBe(true)
    await act(async () => {
      soltar('listo')
      expect(await primero).toBe('listo')
    })
    expect(result.current.enCurso).toBe(false)
  })

  it('un envío que falla suelta la marca: el siguiente sale', async () => {
    const { result } = renderHook(() => useUnEnvioALaVez())
    await act(async () => {
      await expect(result.current.mandar(() => Promise.reject(new Error('red')))).rejects.toThrow()
    })
    let segundo: number | null = null
    await act(async () => {
      segundo = await result.current.mandar(() => Promise.resolve(2))
    })
    expect(segundo).toBe(2)
    expect(result.current.enCurso).toBe(false)
  })
})
