import { afterEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()
vi.mock('./browser', () => ({ createClient: () => ({ functions: { invoke } }) }))

const { invocarFuncion } = await import('./funciones.client')

afterEach(() => {
  invoke.mockReset()
  vi.useRealTimers()
})

describe('invocarFuncion', () => {
  it('devuelve el JSON que respondió la función, también un error esperado', async () => {
    invoke.mockResolvedValue({ data: { ok: false, error: { codigo: 'cuota' } }, error: null })
    expect(await invocarFuncion('apibara', { accion: 'uso' })).toEqual({
      tipo: 'json',
      cuerpo: { ok: false, error: { codigo: 'cuota' } },
    })
    expect(invoke).toHaveBeenCalledWith('apibara', { body: { accion: 'uso' } })
  })

  it('devuelve un archivo como bytes', async () => {
    const bytes = new Blob([new Uint8Array([1, 2, 3])])
    invoke.mockResolvedValue({ data: bytes, error: null })
    expect(await invocarFuncion('apibara', {})).toEqual({ tipo: 'bytes', bytes })
  })

  it('distingue la sesión vencida de una caída', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { context: new Response('', { status: 401 }) },
    })
    expect(await invocarFuncion('apibara', {})).toEqual({ tipo: 'sin_sesion' })
    invoke.mockResolvedValue({
      data: null,
      error: { context: new Response('', { status: 500 }) },
    })
    expect(await invocarFuncion('apibara', {})).toEqual({ tipo: 'caida' })
    invoke.mockRejectedValue(new Error('sin red'))
    expect(await invocarFuncion('apibara', {})).toEqual({ tipo: 'caida' })
  })

  it('si la función no responde a tiempo, lo dice', async () => {
    vi.useFakeTimers()
    invoke.mockReturnValue(new Promise(() => undefined))
    const respuesta = invocarFuncion('apibara', {}, 1000)
    await vi.advanceTimersByTimeAsync(1001)
    expect(await respuesta).toEqual({ tipo: 'tiempo' })
  })
})
