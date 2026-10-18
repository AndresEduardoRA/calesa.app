import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Envio } from '@/shared/lib/enviar-accion'
import { useEnvioDeModal } from './use-envio-de-modal'

let enLinea = true

function cambiarConexion(conectado: boolean) {
  enLinea = conectado
  act(() => {
    window.dispatchEvent(new Event(conectado ? 'online' : 'offline'))
  })
}

const guardada: Envio<{ id: string }> = { ok: true, data: { id: 'nuevo' } }
const sinRed: Envio<{ id: string }> = {
  ok: false,
  sinRed: true,
  error: { codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' },
}

function montar(
  opciones: {
    pedir?: () => Promise<Envio<{ id: string }>>
    validar?: () => Record<string, string> | null
    campoDelRechazo?: Parameters<typeof useEnvioDeModal<{ id: string }>>[0]['campoDelRechazo']
  } = {},
) {
  const alGuardar = vi.fn()
  const pedir = opciones.pedir ?? vi.fn(() => Promise.resolve(guardada))
  const hook = renderHook(() =>
    useEnvioDeModal<{ id: string }>({
      abierto: true,
      hayCambios: true,
      validar: opciones.validar ?? (() => null),
      pedir,
      alGuardar,
      campoDelRechazo: opciones.campoDelRechazo,
    }),
  )
  return { ...hook, alGuardar, pedir }
}

beforeEach(() => {
  enLinea = true
  vi.spyOn(window.navigator, 'onLine', 'get').mockImplementation(() => enLinea)
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('useEnvioDeModal: validar y guardar', () => {
  it('guarda: pide una vez, avisa a quien lo usa y devuelve true', async () => {
    const { result, alGuardar, pedir } = montar()
    let resultado = false
    await act(async () => {
      resultado = await result.current.enviar()
    })
    expect(resultado).toBe(true)
    expect(pedir).toHaveBeenCalledTimes(1)
    expect(alGuardar).toHaveBeenCalledWith({ id: 'nuevo' })
  })

  it('si no pasa la validación, dice el motivo junto al campo y no pide nada', async () => {
    const { result, alGuardar, pedir } = montar({
      validar: () => ({ nombre: 'Escribe el nombre.' }),
    })
    let resultado = true
    await act(async () => {
      resultado = await result.current.enviar()
    })
    expect(resultado).toBe(false)
    expect(result.current.errores).toEqual({ nombre: 'Escribe el nombre.' })
    expect(pedir).not.toHaveBeenCalled()
    expect(alGuardar).not.toHaveBeenCalled()
  })

  it('quitar el motivo de un campo deja los demás', async () => {
    const { result } = montar({ validar: () => ({ a: 'uno', b: 'dos' }) })
    await act(async () => {
      await result.current.enviar()
    })
    act(() => {
      result.current.quitarMotivo('a')
    })
    expect(result.current.errores).toEqual({ b: 'dos' })
  })
})

describe('useEnvioDeModal: lo que rechaza el servidor', () => {
  it('un rechazo de un campo se dice junto a ese campo; otro, arriba del formulario', async () => {
    const rechazo: Envio<{ id: string }> = {
      ok: false,
      error: { codigo: 'duplicado', mensaje: 'Ya existe un rol con ese nombre.' },
    }
    const { result } = montar({
      pedir: () => Promise.resolve(rechazo),
      campoDelRechazo: (error) => (error.codigo === 'duplicado' ? 'nombre' : null),
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.errores).toEqual({ nombre: 'Ya existe un rol con ese nombre.' })
    expect(result.current.aviso).toBeNull()

    const otro = montar({
      pedir: () =>
        Promise.resolve({
          ok: false,
          error: { codigo: 'sin_permiso', mensaje: 'No tienes permiso.' },
        } satisfies Envio<{ id: string }>),
      campoDelRechazo: () => null,
    })
    await act(async () => {
      await otro.result.current.enviar()
    })
    expect(otro.result.current.errores).toEqual({})
    expect(otro.result.current.aviso).toBe('No tienes permiso.')
  })

  it('un rechazo con los campos que no pasaron los dice uno por uno, sin aviso', async () => {
    const { result } = montar({
      pedir: () =>
        Promise.resolve({
          ok: false,
          error: { codigo: 'validacion', mensaje: 'Revisa los campos marcados.' },
          porCampo: { email: 'Escribe un correo válido.' },
        } satisfies Envio<{ id: string }>),
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.errores).toEqual({ email: 'Escribe un correo válido.' })
    expect(result.current.aviso).toBeNull()
  })
})

describe('useEnvioDeModal: un pedido a la vez y sin red', () => {
  it('un doble envío manda un solo pedido', async () => {
    let soltar: (envio: Envio<{ id: string }>) => void = () => undefined
    const pedir = vi.fn(
      () =>
        new Promise<Envio<{ id: string }>>((resolver) => {
          soltar = resolver
        }),
    )
    const { result, alGuardar } = montar({ pedir })
    let primero: Promise<boolean> = Promise.resolve(false)
    let segundo = true
    await act(async () => {
      primero = result.current.enviar()
      segundo = await result.current.enviar()
    })
    expect(segundo).toBe(false)
    expect(pedir).toHaveBeenCalledTimes(1)
    await act(async () => {
      soltar(guardada)
      await primero
    })
    expect(alGuardar).toHaveBeenCalledTimes(1)
  })

  it('sin red deja lo escrito, espera, y al volver la conexión lo manda solo, una vez', async () => {
    const pedir = vi
      .fn<() => Promise<Envio<{ id: string }>>>()
      .mockResolvedValueOnce(sinRed)
      .mockResolvedValue(guardada)
    const { result, alGuardar } = montar({ pedir })
    cambiarConexion(false)
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.esperandoConexion).toBe(true)
    expect(result.current.enLinea).toBe(false)
    expect(alGuardar).not.toHaveBeenCalled()
    await act(async () => {
      cambiarConexion(true)
      await Promise.resolve()
    })
    expect(pedir).toHaveBeenCalledTimes(2)
    expect(alGuardar).toHaveBeenCalledTimes(1)
    expect(result.current.esperandoConexion).toBe(false)
  })

  it('con red presente un pedido que no llegó espera «Reintentar»: no se manda solo', async () => {
    const pedir = vi
      .fn<() => Promise<Envio<{ id: string }>>>()
      .mockResolvedValueOnce(sinRed)
      .mockResolvedValue(guardada)
    const { result, alGuardar } = montar({ pedir })
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.esperandoConexion).toBe(true)
    expect(pedir).toHaveBeenCalledTimes(1)
    await act(async () => {
      result.current.reintentar()
      await Promise.resolve()
    })
    expect(pedir).toHaveBeenCalledTimes(2)
    expect(alGuardar).toHaveBeenCalledTimes(1)
  })
})
