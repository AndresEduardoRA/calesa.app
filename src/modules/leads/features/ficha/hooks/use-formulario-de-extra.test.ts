import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LeadDeTelefonos } from '../../../entities/telefonos'
import type { TelefonosExtra } from './use-telefonos-extra'
import { useFormularioDeExtra } from './use-formulario-de-extra'

vi.mock('@/shared/ui/toasts', () => ({ avisarExito: vi.fn() }))

// La verificación contra los demás leads: lo que diga cada prueba.
const verificar = vi.fn<(entrada: Record<string, unknown>) => Promise<unknown>>()
vi.mock('next-safe-action/hooks', () => ({ useAction: () => ({ executeAsync: verificar }) }))
vi.mock('../actions/verificar-telefono-extra', () => ({ verificarTelefonoExtra: 'verificar' }))

const LEAD = {
  id: 'x',
  telefonoCc: '+591',
  telefono: '59170011002',
  telefonosMaximo: 6,
} as unknown as LeadDeTelefonos

const guardar = vi.fn<TelefonosExtra['guardar']>()
const alCerrar = vi.fn()

const montar = (extras: { id: string; telefono: string; etiqueta: string | null }[] = []) =>
  renderHook(() => useFormularioDeExtra({ lead: LEAD, extras, guardar, alCerrar, abierto: true }))

const envioOk = { ok: true, data: {} } as unknown as Awaited<ReturnType<TelefonosExtra['guardar']>>

beforeEach(() => {
  verificar.mockReset()
  verificar.mockResolvedValue({ data: { ok: true, data: { estado: 'libre' } } })
  guardar.mockReset()
  alCerrar.mockReset()
})

afterEach(cleanup)

describe('useFormularioDeExtra', () => {
  it('dice cómo va a quedar guardado y no envía nada', () => {
    const { result } = montar()
    act(() => {
      result.current.escribirTelefono('71234567')
    })
    expect(result.current.comoSeGuarda).toBe('+591 71234567')
    expect(guardar).not.toHaveBeenCalled()
  })

  it('un número repetido o un teléfono que no lo es se dice junto al campo y no se envía', async () => {
    const { result } = montar([{ id: 'a', telefono: '59171234567', etiqueta: null }])
    act(() => {
      result.current.escribirTelefono('71234567')
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.errores['telefono']).toBe('Ese número ya está en este lead.')
    act(() => {
      result.current.escribirTelefono('7')
    })
    expect(result.current.errores['telefono']).toBeUndefined()
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.errores['telefono']).toMatch(/faltan dígitos/)
    expect(guardar).not.toHaveBeenCalled()
  })
})

describe('useFormularioDeExtra: cerrar con algo escrito', () => {
  it('vacío no tiene cambios; un número o una etiqueta sí', () => {
    const { result } = montar()
    expect(result.current.hayCambios).toBe(false)
    act(() => {
      result.current.escribirEtiqueta('Casa')
    })
    expect(result.current.hayCambios).toBe(true)
  })
})

describe('useFormularioDeExtra: el envío', () => {
  it('envía con una etiqueta nula si queda vacía y cierra al guardar', async () => {
    guardar.mockResolvedValue(envioOk)
    const { result } = montar()
    act(() => {
      result.current.escribirTelefono('71234567')
      result.current.escribirEtiqueta('   ')
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(guardar).toHaveBeenCalledWith(
      expect.objectContaining({ telefono: '71234567', etiqueta: null }),
    )
    expect(alCerrar).toHaveBeenCalledOnce()
  })

  it('un reintento manda el mismo id: guardar dos veces lo mismo no lo duplica', async () => {
    guardar.mockResolvedValueOnce({
      ok: false,
      sinRed: true,
      error: { codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' },
    })
    guardar.mockResolvedValueOnce(envioOk)
    const { result } = montar()
    act(() => {
      result.current.escribirTelefono('71234567')
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.esperandoConexion).toBe(true)
    expect(result.current.telefono).toBe('71234567')
    expect(alCerrar).not.toHaveBeenCalled()
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.esperandoConexion).toBe(false)
    const [primero, segundo] = guardar.mock.calls
    expect(primero?.[0].id).toBe(segundo?.[0].id)
    expect(alCerrar).toHaveBeenCalledOnce()
  })

  it('un doble envío manda una sola vez', async () => {
    let soltar: (envio: typeof envioOk) => void = () => undefined
    guardar.mockReturnValue(
      new Promise((resolver) => {
        soltar = resolver
      }),
    )
    const { result } = montar()
    act(() => {
      result.current.escribirTelefono('71234567')
    })
    await act(async () => {
      const primero = result.current.enviar()
      const segundo = result.current.enviar()
      soltar(envioOk)
      await Promise.all([primero, segundo])
    })
    expect(guardar).toHaveBeenCalledOnce()
    expect(alCerrar).toHaveBeenCalledOnce()
  })

  it('el motivo que da la base llega junto a su campo', async () => {
    guardar.mockResolvedValue({
      ok: false,
      error: { codigo: 'regla', mensaje: 'La etiqueta admite hasta 40 caracteres.' },
      porCampo: { etiqueta: 'La etiqueta admite hasta 40 caracteres.' },
    })
    const { result } = montar()
    act(() => {
      result.current.escribirTelefono('71234567')
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.errores['etiqueta']).toBe('La etiqueta admite hasta 40 caracteres.')
    expect(result.current.aviso).toBeNull()
  })
})

describe('useFormularioDeExtra: el máximo de la empresa', () => {
  it('con el máximo escrito en el lead no entra otro, con el texto de la base', async () => {
    const seis = Array.from({ length: 6 }, (_, i) => ({
      id: `id-${String(i)}`,
      telefono: `5917100000${String(i)}`,
      etiqueta: null,
    }))
    const { result } = montar(seis)
    act(() => {
      result.current.escribirTelefono('71234567')
    })
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.errores['telefono']).toBe(
      'Un lead admite hasta 6 teléfonos extra. Quita uno para agregar otro.',
    )
    expect(guardar).not.toHaveBeenCalled()
  })
})

describe('useFormularioDeExtra: el número frente a los demás leads', () => {
  const choque = {
    data: {
      ok: true,
      data: { estado: 'de_otro', dueno: 'Diego', como: 'extra' },
    },
  }

  it('al terminar de tipear pregunta a la base; un número que choca bloquea el envío', async () => {
    verificar.mockResolvedValue(choque)
    const { result } = montar()
    act(() => {
      result.current.escribirTelefono('71234567')
    })
    await waitFor(() => {
      expect(result.current.avisoDelNumero?.bloquea).toBe(true)
    })
    expect(verificar).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: 'x', codigoDePais: '+591', telefono: '71234567' }),
    )
    expect(result.current.sinPoderEnviar).toBe(true)
    await act(async () => {
      expect(await result.current.enviar()).toBe(false)
    })
    expect(result.current.errores['telefono']).toBe('Lo tiene Diego.')
    expect(guardar).not.toHaveBeenCalled()
  })

  it('sin la regla el número de otro lead sólo avisa y se envía', async () => {
    verificar.mockResolvedValue({
      data: {
        ok: true,
        data: {
          estado: 'libre',
          alterno: { estado: 'de_otro', dueno: 'Diego', como: 'principal' },
        },
      },
    })
    guardar.mockResolvedValue(envioOk)
    const { result } = montar()
    act(() => {
      result.current.escribirTelefono('71234567')
    })
    await waitFor(() => {
      expect(result.current.avisoDelNumero?.texto).toBe(
        'Es el teléfono principal de un lead de Diego.',
      )
    })
    expect(result.current.sinPoderEnviar).toBe(false)
    await act(async () => {
      await result.current.enviar()
    })
    expect(guardar).toHaveBeenCalledOnce()
  })

  it('si otra persona lo tomó entre tipear y enviar, la respuesta se fija y «Agregar» se apaga', async () => {
    guardar.mockResolvedValue({
      ok: true,
      data: { resultado: 'de_otro', verificacion: { estado: 'de_otro', dueno: 'Diego' } },
    } as unknown as Awaited<ReturnType<TelefonosExtra['guardar']>>)
    const { result } = montar()
    act(() => {
      result.current.escribirTelefono('71234567')
    })
    await waitFor(() => {
      expect(result.current.verificacion).not.toBeNull()
    })
    await act(async () => {
      expect(await result.current.enviar()).toBe(false)
    })
    expect(alCerrar).not.toHaveBeenCalled()
    expect(result.current.sinPoderEnviar).toBe(true)
    expect(result.current.avisoDelNumero?.texto).toBe('Lo tiene Diego.')
  })
})
