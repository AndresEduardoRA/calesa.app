import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Plantilla } from '../../../entities/plantilla/forma-de-plantilla'
import { useGuardarLaPlantilla } from './use-guardar-la-plantilla'

const refrescar = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refrescar }) }))
const guardarBorrador = vi.fn()
vi.mock('../actions/guardar-borrador', () => ({
  guardarBorrador: (entrada: unknown) => guardarBorrador(entrada) as Promise<unknown>,
}))
const avisarExito = vi.fn()
vi.mock('@/shared/ui/toasts', () => ({ avisarExito: (m: string) => avisarExito(m) }))

const ORIGEN = '00000000-0000-4000-8000-000000000001'
const HORA = '2026-11-07T15:00:00.123456+00:00'
const OTRA = '2026-11-07T15:05:00.654321+00:00'
const plantilla: Plantilla = {
  grupos: [{ grupo: 'compra' }],
  total: { etiqueta: 'T' },
  logo: true,
  columnas: { leyenda: false, plazo: false, tipo_cambio: false },
}
const limpiarBorrador = vi.fn()

function montar(esperada: string | null = HORA, puedeGuardar = true) {
  return renderHook(
    ({ esperada }: { esperada: string | null }) =>
      useGuardarLaPlantilla({
        origenId: ORIGEN,
        esperada,
        plantilla,
        puedeGuardar,
        limpiarBorrador,
      }),
    { initialProps: { esperada } },
  )
}
const enviar = async (r: { current: { enviar: () => Promise<boolean> } }) => {
  let hecho = false
  await act(async () => {
    hecho = await r.current.enviar()
  })
  return hecho
}

beforeEach(() => {
  for (const f of [refrescar, guardarBorrador, avisarExito, limpiarBorrador]) f.mockReset()
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('useGuardarLaPlantilla', () => {
  it('manda la esperada como texto exacto y, sin borrador, nula', async () => {
    guardarBorrador.mockResolvedValue({ data: { ok: true, data: OTRA } })
    const { result } = montar(HORA)
    await enviar(result)
    expect(guardarBorrador).toHaveBeenLastCalledWith({
      origenId: ORIGEN,
      esperada: HORA,
      definicion: plantilla,
    })
    expect(typeof (guardarBorrador.mock.lastCall?.[0] as { esperada: unknown }).esperada).toBe(
      'string',
    )
    const sin = montar(null)
    await enviar(sin.result)
    expect((guardarBorrador.mock.lastCall?.[0] as { esperada: unknown }).esperada).toBeNull()
  })

  it('al entrar: toast, borrador de estado limpio, la pestaña se vuelve a leer y los campos se apagan', async () => {
    guardarBorrador.mockResolvedValue({ data: { ok: true, data: OTRA } })
    const { result } = montar()
    expect(await enviar(result)).toBe(true)
    expect(avisarExito).toHaveBeenCalledWith('Se guardó el borrador.')
    expect(limpiarBorrador).toHaveBeenCalledTimes(1)
    expect(refrescar).toHaveBeenCalledTimes(1)
    expect(result.current.entro).toBe(true)
  })

  it('no envía sin poder guardar', async () => {
    const { result } = montar(HORA, false)
    expect(await enviar(result)).toBe(false)
    expect(guardarBorrador).not.toHaveBeenCalled()
  })

  it('un envío a la vez', async () => {
    let soltar: (v: unknown) => void = () => undefined
    guardarBorrador.mockReturnValue(new Promise((r) => (soltar = r)))
    const { result } = montar()
    let primero: Promise<boolean> = Promise.resolve(false)
    await act(async () => {
      primero = result.current.enviar()
      await result.current.enviar()
    })
    expect(guardarBorrador).toHaveBeenCalledTimes(1)
    await act(async () => {
      soltar({ data: { ok: true, data: OTRA } })
      await primero
    })
  })

  it('un conflicto se queda con el mensaje de la base hasta que llega otra esperada, y mientras tanto no envía', async () => {
    guardarBorrador.mockResolvedValue({
      data: {
        ok: false,
        error: {
          codigo: 'conflicto',
          mensaje: 'El borrador de esta plantilla cambió hace 2 min, mientras lo editabas.',
        },
      },
    })
    const { result, rerender } = montar()
    await enviar(result)
    expect(result.current.conflicto).toBe(
      'El borrador de esta plantilla cambió hace 2 min, mientras lo editabas.',
    )
    // «Recargar» refresca y limpia lo escrito, pero el conflicto sigue hasta que llegue la versión.
    act(() => {
      result.current.recargar()
    })
    expect(limpiarBorrador).toHaveBeenCalled()
    expect(refrescar).toHaveBeenCalled()
    expect(result.current.conflicto).not.toBeNull()
    guardarBorrador.mockClear()
    expect(await enviar(result)).toBe(false)
    expect(guardarBorrador).not.toHaveBeenCalled()
    rerender({ esperada: OTRA })
    expect(result.current.conflicto).toBeNull()
  })
})

describe('useGuardarLaPlantilla: rechazos y red', () => {
  it('un rechazo con porCampo lo deja por campo y olvidarCampo lo quita', async () => {
    guardarBorrador.mockResolvedValue({
      data: {
        ok: false,
        error: { codigo: 'validacion', mensaje: 'No se pudo.' },
        porCampo: { nota: 'Hay un carácter que no se puede guardar.' },
      },
    })
    const { result } = montar()
    await enviar(result)
    expect(result.current.aviso).toBe('No se pudo.')
    expect(result.current.porCampo).toEqual({ nota: 'Hay un carácter que no se puede guardar.' })
    act(() => {
      result.current.olvidarCampo('nota')
    })
    expect(result.current.porCampo).toEqual({})
  })

  it('sin conexión: lo escrito queda pendiente y sale solo al volver', async () => {
    const onLine = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true)
    guardarBorrador.mockRejectedValueOnce(new Error('red'))
    const { result } = montar()
    await enviar(result)
    expect(result.current.esperandoConexion).toBe(true)
    expect(refrescar).not.toHaveBeenCalled()
    onLine.mockReturnValue(false)
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    guardarBorrador.mockResolvedValue({ data: { ok: true, data: OTRA } })
    onLine.mockReturnValue(true)
    await act(async () => {
      window.dispatchEvent(new Event('online'))
      await Promise.resolve()
    })
    expect(guardarBorrador).toHaveBeenCalledTimes(2)
    expect(result.current.entro).toBe(true)
  })
})
