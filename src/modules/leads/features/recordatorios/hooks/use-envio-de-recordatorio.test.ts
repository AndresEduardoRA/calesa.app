import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Recordatorio, ValoresDelRecordatorio } from '../../../entities/recordatorios'
import { useEnvioDeRecordatorio } from './use-envio-de-recordatorio'

// Las actions son de servidor: acá contestan lo que el test diga.
const crear = vi.fn<(entrada: unknown) => Promise<unknown>>()
const guardar = vi.fn<(entrada: unknown) => Promise<unknown>>()
const refresh = vi.fn()

vi.mock('next-safe-action/hooks', () => ({
  useAction: (accion: string) => ({ executeAsync: accion === 'crear' ? crear : guardar }),
}))
vi.mock('../actions/crear-recordatorio', () => ({ crearRecordatorio: 'crear' }))
vi.mock('../actions/guardar-recordatorio', () => ({ guardarRecordatorio: 'guardar' }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const LEAD = '0b9c2f3e-1d4a-4c5b-8e6f-7a8b9c0d1e2f'
const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const ZONA = 'America/La_Paz'
const FUTURO = '2099-01-15T09:00'

const ORIGINAL: Recordatorio = {
  id: ID,
  titulo: 'Llamar',
  recordarEn: '2099-01-15T13:00:00+00:00',
  notificadoEn: null,
  completadoEn: null,
  actualizadoEn: '2026-10-15T14:00:00.123456+00:00',
  leadId: LEAD,
  leadNombre: 'Ana',
  leadNumero: 12,
  vehiculo: null,
  vehiculoOculto: false,
}

const DEVUELTO = { ...ORIGINAL, eliminado: false }
const ok = { data: { ok: true, data: { recordatorio: DEVUELTO } } }
const rechazo = (codigo: string, mensaje: string) => ({
  data: { ok: false, error: { codigo, mensaje } },
})

type Props = { original: Recordatorio | null; valores: ValoresDelRecordatorio }

const montar = (inicial: Props, alGuardar = vi.fn()) => {
  const hook = renderHook(
    ({ original, valores }: Props) =>
      useEnvioDeRecordatorio({
        leadId: LEAD,
        zona: ZONA,
        original,
        cuandoOriginal: original ? '2099-01-15T09:00' : '',
        valores,
        alGuardar,
      }),
    { initialProps: inicial },
  )
  return { ...hook, alGuardar }
}

const nuevo: Props = { original: null, valores: { titulo: 'Llamar', cuando: FUTURO, vehiculo: '' } }
const editado: Props = {
  original: ORIGINAL,
  valores: { titulo: 'Escribirle', cuando: '2099-01-15T09:00', vehiculo: '' },
}

afterEach(() => {
  cleanup()
  crear.mockReset()
  guardar.mockReset()
  refresh.mockReset()
})

describe('useEnvioDeRecordatorio', () => {
  it('agenda con su id de intento y avisa lo guardado', async () => {
    crear.mockResolvedValue(ok)
    const { result, alGuardar } = montar(nuevo)
    await act(() => result.current.enviar())
    expect(crear).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: LEAD, titulo: 'Llamar', vehiculoId: null }),
    )
    expect(alGuardar).toHaveBeenCalledWith(DEVUELTO)
  })

  it('un conflicto no deja enviar hasta que llega la versión nueva, y lo escrito no se toca', async () => {
    guardar.mockResolvedValue(rechazo('conflicto', 'Cambiaste este recordatorio hace 1 min.'))
    const { result, rerender, alGuardar } = montar(editado)
    await act(() => result.current.enviar())
    expect(result.current.conflicto).toBe('Cambiaste este recordatorio hace 1 min.')
    await act(() => result.current.enviar())
    expect(guardar).toHaveBeenCalledOnce()

    // «Recargar» trae la versión nueva: el conflicto se va y el envío lleva esa versión.
    const nueva = { ...ORIGINAL, actualizadoEn: '2026-10-15T14:05:00+00:00' }
    rerender({ ...editado, original: nueva })
    expect(result.current.conflicto).toBeNull()
    guardar.mockResolvedValue(ok)
    await act(() => result.current.enviar())
    expect(guardar).toHaveBeenLastCalledWith({
      id: ID,
      actualizadoEnEsperado: nueva.actualizadoEn,
      cambios: { titulo: 'Escribirle' },
    })
    expect(alGuardar).toHaveBeenCalledOnce()
  })

  it('sin red queda esperando y el reintento manda el mismo intento', async () => {
    crear.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    crear.mockResolvedValueOnce(ok)
    const { result, alGuardar } = montar(nuevo)
    await act(() => result.current.enviar())
    expect(result.current.esperandoConexion).toBe(true)
    expect(alGuardar).not.toHaveBeenCalled()
    await act(() => result.current.enviar())
    expect(result.current.esperandoConexion).toBe(false)
    const [primero, segundo] = crear.mock.calls
    expect((primero?.[0] as { id: string }).id).toBe((segundo?.[0] as { id: string }).id)
    expect(alGuardar).toHaveBeenCalledOnce()
  })

  it('uno que otra pestaña eliminó lo dice y vuelve a leer la página', async () => {
    guardar.mockResolvedValue(rechazo('sin_permiso', 'No encontramos este recordatorio.'))
    const { result, alGuardar } = montar(editado)
    await act(() => result.current.enviar())
    expect(result.current.aviso).toBe('No encontramos este recordatorio.')
    expect(refresh).toHaveBeenCalledOnce()
    expect(alGuardar).not.toHaveBeenCalled()
  })

  it('un doble envío manda una sola vez', async () => {
    let soltar: (valor: unknown) => void = () => undefined
    crear.mockReturnValue(
      new Promise((resolver) => {
        soltar = resolver
      }),
    )
    const { result } = montar(nuevo)
    await act(async () => {
      const primero = result.current.enviar()
      const segundo = result.current.enviar()
      soltar(ok)
      await Promise.all([primero, segundo])
    })
    expect(crear).toHaveBeenCalledOnce()
  })

  it('lo que no pasa se dice junto a su campo y no se envía', async () => {
    const { result } = montar({ original: null, valores: { titulo: '', cuando: '', vehiculo: '' } })
    await act(() => result.current.enviar())
    expect(result.current.errores.titulo).toBeDefined()
    expect(result.current.errores.recordarEn).toBeDefined()
    expect(crear).not.toHaveBeenCalled()
  })
})
