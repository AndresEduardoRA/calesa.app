import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE, type LeadDeFicha } from '../../../entities/ficha'
import { useCambiarTelefono } from './use-cambiar-telefono'

// Las actions son de servidor: acá contestan lo que el test diga.
const cambiar = vi.fn<(entrada: unknown) => Promise<unknown>>()
const verificar = vi.fn<(entrada: unknown) => Promise<unknown>>()
const refrescar = vi.fn()

vi.mock('next-safe-action/hooks', () => ({
  useAction: (accion: string) => ({
    executeAsync: accion === 'cambiar' ? cambiar : verificar,
    isPending: false,
  }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refrescar }) }))
vi.mock('../actions/cambiar-telefono', () => ({ cambiarTelefono: 'cambiar' }))
vi.mock('../actions/verificar-telefono-de-lead', () => ({ verificarTelefonoDeLead: 'verificar' }))

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'

const FICHA = {
  id: ID,
  numero: 12,
  nombre: 'Ana Quispe',
  telefonoCc: '+591',
  telefono: '59170011002',
  enCartera: true,
  actualizadoEn: '2026-10-14T12:00:00.000Z',
  telefonos: [],
} as unknown as LeadDeFicha

const alTerminar = vi.fn()
const alPerderElLead = vi.fn()

const montar = (ficha: LeadDeFicha = FICHA) =>
  renderHook(
    (f: LeadDeFicha) => useCambiarTelefono({ ficha: f, activo: true, alTerminar, alPerderElLead }),
    {
      initialProps: ficha,
    },
  )

const ok = (data: unknown) => ({ data: { ok: true, data } })
const error = (codigo: string, mensaje: string, porCampo?: Record<string, string>) => ({
  data: { ok: false, error: { codigo, mensaje }, ...(porCampo ? { porCampo } : {}) },
})
const escribir = (hook: ReturnType<typeof montar>, valor: string) =>
  act(() => {
    hook.result.current.cambiar(valor)
  })
const enviar = (hook: ReturnType<typeof montar>) =>
  act(async () => {
    await hook.result.current.enviar()
  })

const CAMBIADO = {
  resultado: 'cambiado',
  actualizadoEn: '2026-10-14T12:05:00.000Z',
  telefonoCc: '+591',
  telefono: '59171234567',
  telefonos: [],
}

beforeEach(() => {
  vi.useFakeTimers()
  cambiar.mockReset()
  verificar.mockReset().mockResolvedValue(ok({ estado: 'libre' }))
  refrescar.mockReset()
  alTerminar.mockReset()
  alPerderElLead.mockReset()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useCambiarTelefono: lo que se valida antes de enviar', () => {
  it('el mismo número no se envía ni se verifica: se dice sin ir al servidor', async () => {
    const hook = montar()
    escribir(hook, '70011002')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(verificar).not.toHaveBeenCalled()
    expect(hook.result.current.telefono.verificacion).toEqual({ estado: 'mismo' })
    expect(hook.result.current.puedeEnviar).toBe(false)
    await enviar(hook)
    expect(cambiar).not.toHaveBeenCalled()
    expect(hook.result.current.errores['telefono']).toBe(
      'Ese es el teléfono principal de este lead.',
    )
  })

  it('lo que no es un teléfono no se envía y dice el motivo junto al campo', async () => {
    const hook = montar()
    escribir(hook, '71abc')
    await enviar(hook)
    expect(cambiar).not.toHaveBeenCalled()
    expect(hook.result.current.errores['telefono']).toMatch(/sólo lleva números/)
  })

  it('un lead sin código de país no adivina uno: pide el «+»', async () => {
    const hook = montar({ ...FICHA, telefonoCc: null })
    escribir(hook, '71234567')
    await enviar(hook)
    expect(cambiar).not.toHaveBeenCalled()
    expect(hook.result.current.errores['telefono']).toMatch(/código de país/)
    escribir(hook, '+54 9 11 5555 1234')
    expect(hook.result.current.puedeEnviar).toBe(true)
  })
})

describe('useCambiarTelefono: lo que contesta la base', () => {
  it('cambia, avisa y manda la versión que tenía en pantalla', async () => {
    cambiar.mockResolvedValue(ok(CAMBIADO))
    const hook = montar()
    escribir(hook, '71234567')
    await enviar(hook)
    expect(cambiar).toHaveBeenCalledWith({
      id: ID,
      actualizadoEnEsperado: '2026-10-14T12:00:00.000Z',
      codigoDePais: '+591',
      telefono: '71234567',
    })
    expect(alTerminar).toHaveBeenCalledWith('cambiado')
  })

  it('«sin cambios» (un reintento tras una caída) también termina', async () => {
    cambiar.mockResolvedValue(ok({ ...CAMBIADO, resultado: 'sin_cambios' }))
    const hook = montar()
    escribir(hook, '71234567')
    await enviar(hook)
    expect(alTerminar).toHaveBeenCalledWith('sin_cambios')
  })

  it('un número que ya existe se dice junto al campo y no termina', async () => {
    cambiar.mockResolvedValue(
      ok({ resultado: 'de_otro', verificacion: { estado: 'de_otro', dueno: 'Diego' } }),
    )
    const hook = montar()
    escribir(hook, '71234567')
    await enviar(hook)
    expect(alTerminar).not.toHaveBeenCalled()
    expect(hook.result.current.telefono.verificacion).toEqual({ estado: 'de_otro', dueno: 'Diego' })
    expect(hook.result.current.telefono.aviso?.texto).toBe('Lo tiene Diego.')
    expect(hook.result.current.puedeEnviar).toBe(false)
  })
})

describe('useCambiarTelefono: conflicto, versión y conexión', () => {
  it('un conflicto conserva lo tipeado y «Recargar» sólo vuelve a leer', async () => {
    cambiar.mockResolvedValue(error('conflicto', 'Rosa cambió este lead hace 3 min.'))
    const hook = montar()
    escribir(hook, '71234567')
    await enviar(hook)
    expect(hook.result.current.conflicto).toBe('Rosa cambió este lead hace 3 min.')
    expect(hook.result.current.valor).toBe('71234567')
    act(() => {
      hook.result.current.recargar()
    })
    expect(refrescar).toHaveBeenCalledOnce()
    expect(hook.result.current.conflicto).toBeNull()
    expect(hook.result.current.valor).toBe('71234567')
  })

  it('con otra versión del lead el número se vuelve a verificar', async () => {
    const hook = montar()
    escribir(hook, '71234567')
    await act(() => vi.advanceTimersByTimeAsync(500))
    expect(verificar).toHaveBeenCalledTimes(1)
    hook.rerender({ ...FICHA, actualizadoEn: '2026-10-14T12:10:00.000Z' })
    await act(() => vi.advanceTimersByTimeAsync(500))
    expect(verificar).toHaveBeenCalledTimes(2)
    expect(hook.result.current.valor).toBe('71234567')
  })

  it('si se cae la conexión queda esperando y no pierde lo escrito', async () => {
    cambiar.mockRejectedValue(new Error('sin red'))
    const hook = montar()
    escribir(hook, '71234567')
    await enviar(hook)
    expect(hook.result.current.esperandoConexion).toBe(true)
    expect(hook.result.current.valor).toBe('71234567')
    expect(alTerminar).not.toHaveBeenCalled()
  })

  it('si el lead dejó de verse, vuelve a leer el servidor', async () => {
    cambiar.mockResolvedValue(error('sin_permiso', MENSAJE_DE_LEAD_NO_DISPONIBLE))
    const hook = montar()
    escribir(hook, '71234567')
    await enviar(hook)
    expect(alPerderElLead).toHaveBeenCalledOnce()
  })

  it('el motivo de un campo llega junto al campo, no arriba', async () => {
    cambiar.mockResolvedValue(
      error('regla', 'El teléfono sólo lleva números.', {
        telefono: 'El teléfono sólo lleva números.',
      }),
    )
    const hook = montar()
    escribir(hook, '71234567')
    await enviar(hook)
    expect(hook.result.current.errores['telefono']).toBe('El teléfono sólo lleva números.')
    expect(hook.result.current.avisoGeneral).toBeNull()
  })
})
