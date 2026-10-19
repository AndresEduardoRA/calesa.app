import { describe, expect, it, vi } from 'vitest'
import { fallo, ok } from './errores'
import { memoriaDeLectura } from './memoria-de-lectura'

function conReloj() {
  let ahora = 1_000
  return { ahora: () => ahora, pasar: (ms: number) => (ahora += ms) }
}

describe('memoriaDeLectura', () => {
  it('guarda lo leído mientras vale y lo vuelve a leer cuando vence', async () => {
    const reloj = conReloj()
    const leer = vi.fn(() => Promise.resolve(ok(leer.mock.calls.length)))
    const memoria = memoriaDeLectura(leer, 60_000, reloj.ahora)
    expect(memoria.vigente()).toBeNull()
    expect(await memoria.leer()).toEqual(ok(1))
    reloj.pasar(59_999)
    expect(memoria.vigente()).toBe(1)
    expect(await memoria.leer()).toEqual(ok(1))
    expect(leer).toHaveBeenCalledTimes(1)
    reloj.pasar(1)
    expect(memoria.vigente()).toBeNull()
    expect(await memoria.leer()).toEqual(ok(2))
    expect(leer).toHaveBeenCalledTimes(2)
  })

  it('comparte la lectura en camino: dos pedidos a la vez leen una vez', async () => {
    let terminar = (_: number) => {}
    const leer = vi.fn(
      () => new Promise<ReturnType<typeof ok<number>>>((r) => (terminar = (n) => r(ok(n)))),
    )
    const memoria = memoriaDeLectura(leer, 60_000)
    const a = memoria.leer()
    const b = memoria.leer()
    terminar(7)
    expect(await a).toEqual(ok(7))
    expect(await b).toEqual(ok(7))
    expect(leer).toHaveBeenCalledTimes(1)
  })

  it('no guarda un fallo: el siguiente pedido lee de nuevo', async () => {
    const leer = vi
      .fn<() => Promise<ReturnType<typeof ok<string> | typeof fallo>>>()
      .mockResolvedValueOnce(fallo('inesperado', 'x'))
      .mockResolvedValueOnce(ok('bien'))
    const memoria = memoriaDeLectura(leer, 60_000)
    expect((await memoria.leer()).ok).toBe(false)
    expect(memoria.vigente()).toBeNull()
    expect(await memoria.leer()).toEqual(ok('bien'))
    expect(leer).toHaveBeenCalledTimes(2)
  })

  it('un rechazo tampoco se guarda ni deja la lectura colgada', async () => {
    const leer = vi
      .fn<() => Promise<ReturnType<typeof ok<string>>>>()
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValueOnce(ok('bien'))
    const memoria = memoriaDeLectura(leer, 60_000)
    await expect(memoria.leer()).rejects.toThrow('sin red')
    expect(await memoria.leer()).toEqual(ok('bien'))
  })

  it('olvidar tira lo guardado: el siguiente pedido lee de nuevo', async () => {
    const leer = vi.fn(() => Promise.resolve(ok(leer.mock.calls.length)))
    const memoria = memoriaDeLectura(leer, 60_000)
    expect(await memoria.leer()).toEqual(ok(1))
    memoria.olvidar()
    expect(memoria.vigente()).toBeNull()
    expect(await memoria.leer()).toEqual(ok(2))
  })

  it('una lectura vieja que termina después de olvidar no se guarda', async () => {
    const resolvers: ((v: string) => void)[] = []
    const leer = vi.fn(
      () => new Promise<ReturnType<typeof ok<string>>>((r) => resolvers.push((v) => r(ok(v)))),
    )
    const memoria = memoriaDeLectura(leer, 60_000)
    const vieja = memoria.leer()
    memoria.olvidar()
    resolvers[0]?.('vieja')
    expect(await vieja).toEqual(ok('vieja'))
    expect(memoria.vigente()).toBeNull()
  })
})
