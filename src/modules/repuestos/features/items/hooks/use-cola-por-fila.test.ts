import { describe, expect, it } from 'vitest'
import { colaPorClave } from './use-cola-por-fila'

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

describe('colaPorClave', () => {
  it('dos trabajos de la misma fila van en orden y el segundo ve lo que dejó el primero', async () => {
    const encolar = colaPorClave()
    let version = 1
    const visto: number[] = []
    const a = encolar('fila-1', async () => {
      visto.push(version)
      await esperar(20)
      version = 2
    })
    const b = encolar('fila-1', () => {
      visto.push(version)
      version = 3
      return Promise.resolve()
    })
    await Promise.all([a, b])
    expect(visto).toEqual([1, 2])
    expect(version).toBe(3)
  })

  it('un trabajo que falla no frena al siguiente de su fila', async () => {
    const encolar = colaPorClave()
    const a = encolar('f', () => Promise.reject(new Error('sin red')))
    const b = encolar('f', () => Promise.resolve('ok'))
    await expect(a).rejects.toThrow('sin red')
    await expect(b).resolves.toBe('ok')
  })

  it('filas distintas no se esperan', async () => {
    const encolar = colaPorClave()
    const orden: string[] = []
    const lenta = encolar('a', async () => {
      await esperar(30)
      orden.push('a')
    })
    const rapida = encolar('b', () => {
      orden.push('b')
      return Promise.resolve()
    })
    await Promise.all([lenta, rapida])
    expect(orden).toEqual(['b', 'a'])
  })
})
