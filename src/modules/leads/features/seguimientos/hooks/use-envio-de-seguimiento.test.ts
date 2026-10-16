import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE } from '../../../entities/ficha'
import type { Seguimiento, ValoresDelSeguimiento } from '../../../entities/seguimiento'
import { SIN_VEHICULO } from '../../../entities/vehiculo-de-nota'
import { useEnvioDeSeguimiento } from './use-envio-de-seguimiento'

// Las actions son de servidor: acá contestan lo que el test diga.
const crear = vi.fn<(entrada: unknown) => Promise<unknown>>()
const guardar = vi.fn<(entrada: unknown) => Promise<unknown>>()

vi.mock('next-safe-action/hooks', () => ({
  useAction: (accion: string) => ({ executeAsync: accion === 'crear' ? crear : guardar }),
}))
vi.mock('../actions/crear-seguimiento', () => ({ crearSeguimiento: 'crear' }))
vi.mock('../actions/guardar-seguimiento', () => ({ guardarSeguimiento: 'guardar' }))

const LEAD = '0b9c2f3e-1d4a-4c5b-8e6f-7a8b9c0d1e2f'
const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const TIPO = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f'
const ZONA = 'America/La_Paz'
const TIPOS = [{ id: TIPO, clave: 'llamada', nombre: 'Llamada', icono: null }]

const ORIGINAL: Seguimiento = {
  id: ID,
  leadId: LEAD,
  tipoId: TIPO,
  tipoNombre: 'Llamada',
  tipoIcono: null,
  titulo: 'Llamó',
  detalleDoc: null,
  detalleTexto: null,
  visibilidad: 'privado',
  ocurridoEn: '2026-10-15T14:00:00+00:00',
  actualizadoEn: '2026-10-15T14:00:00.123456+00:00',
  eliminado: false,
  autorId: 'yo',
  autorNombre: null,
  esMio: true,
  ...SIN_VEHICULO,
}

const VALORES: ValoresDelSeguimiento = {
  tipoId: TIPO,
  titulo: 'Llamó',
  detalle: null,
  visible: false,
  ocurridoEn: '',
  recordatorio: '',
  vehiculo: '',
}

const ok = { data: { ok: true, data: { resultado: 'creado', seguimiento: ORIGINAL } } }
const rechazo = (codigo: string, mensaje: string) => ({
  data: { ok: false, error: { codigo, mensaje } },
})

type Props = { original: Seguimiento | null; valores: ValoresDelSeguimiento; abierto?: boolean }

const montar = (inicial: Props, alGuardar = vi.fn()) => {
  const hook = renderHook(
    ({ original, valores, abierto = true }: Props) =>
      useEnvioDeSeguimiento({
        abierto,
        leadId: LEAD,
        tipos: TIPOS,
        zona: ZONA,
        original,
        valores,
        alGuardar,
      }),
    { initialProps: inicial },
  )
  return { ...hook, alGuardar }
}

const nuevo: Props = { original: null, valores: VALORES }
const editado: Props = {
  original: ORIGINAL,
  valores: { ...VALORES, titulo: 'Escribió', ocurridoEn: '2026-10-15T10:00' },
}

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  crear.mockReset()
  guardar.mockReset()
})

describe('useEnvioDeSeguimiento', () => {
  it('anota con su id de intento y avisa lo guardado', async () => {
    crear.mockResolvedValue(ok)
    const { result, alGuardar } = montar(nuevo)
    await act(() => result.current.enviar())
    expect(crear).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: LEAD, titulo: 'Llamó', recordatorio: null }),
    )
    expect(alGuardar).toHaveBeenCalledWith(ORIGINAL, null)
  })

  it('un conflicto no deja enviar hasta que llega la versión nueva, que lleva el envío', async () => {
    guardar.mockResolvedValue(rechazo('conflicto', 'Cambiaste este seguimiento hace 1 min.'))
    const { result, rerender, alGuardar } = montar(editado)
    await act(() => result.current.enviar())
    expect(result.current.conflicto).toBe('Cambiaste este seguimiento hace 1 min.')
    await act(() => result.current.enviar())
    expect(guardar).toHaveBeenCalledOnce()

    const nueva = { ...ORIGINAL, actualizadoEn: '2026-10-15T14:05:00+00:00' }
    rerender({ ...editado, original: nueva })
    expect(result.current.conflicto).toBeNull()
    guardar.mockResolvedValue(ok)
    await act(() => result.current.enviar())
    expect(guardar).toHaveBeenLastCalledWith({
      id: ID,
      actualizadoEnEsperado: nueva.actualizadoEn,
      cambios: { titulo: 'Escribió' },
    })
    expect(alGuardar).toHaveBeenCalledOnce()
  })

  it('el lead que dejó de verse se dice en el modal y no deja guardar; lo escrito queda', async () => {
    crear.mockResolvedValue(rechazo('sin_permiso', MENSAJE_DE_LEAD_NO_DISPONIBLE))
    const { result, alGuardar } = montar(nuevo)
    await act(() => result.current.enviar())
    expect(result.current.noDisponible).toBe(MENSAJE_DE_LEAD_NO_DISPONIBLE)
    expect(result.current.aviso).toBeNull()
    await act(() => result.current.enviar())
    expect(crear).toHaveBeenCalledOnce()
    expect(alGuardar).not.toHaveBeenCalled()
  })

  it('editar sin cambios no manda nada y cierra', async () => {
    const { result, alGuardar } = montar({
      original: ORIGINAL,
      valores: { ...VALORES, ocurridoEn: '2026-10-15T10:00' },
    })
    await act(() => result.current.enviar())
    expect(guardar).not.toHaveBeenCalled()
    expect(alGuardar).toHaveBeenCalledWith(ORIGINAL, null)
  })
})

describe('useEnvioDeSeguimiento: sin red, doble envío y motivos', () => {
  it('sin red queda esperando y el reintento manda el mismo intento', async () => {
    crear.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    crear.mockResolvedValueOnce(ok)
    const { result, alGuardar } = montar(nuevo)
    await act(() => result.current.enviar())
    expect(result.current.esperandoConexion).toBe(true)
    await act(() => result.current.enviar())
    expect(result.current.esperandoConexion).toBe(false)
    const [primero, segundo] = crear.mock.calls
    expect((primero?.[0] as { id: string }).id).toBe((segundo?.[0] as { id: string }).id)
    expect(alGuardar).toHaveBeenCalledOnce()
  })

  it('cerrado, lo que esperaba la red no sale al volver', async () => {
    let conectado = true
    vi.spyOn(window.navigator, 'onLine', 'get').mockImplementation(() => conectado)
    const conexion = (valor: boolean) => {
      conectado = valor
      act(() => {
        window.dispatchEvent(new Event(valor ? 'online' : 'offline'))
      })
    }
    crear.mockRejectedValue(new TypeError('Failed to fetch'))
    const { result, rerender } = montar(nuevo)
    conexion(false)
    await act(() => result.current.enviar())
    rerender({ ...nuevo, abierto: false })
    conexion(true)
    await act(async () => {
      await Promise.resolve()
    })
    expect(crear).toHaveBeenCalledOnce()
    vi.restoreAllMocks()
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

  it('lo que no pasa se dice junto a su campo; escribir en él lo resuelve', async () => {
    const { result } = montar({ original: null, valores: { ...VALORES, titulo: '' } })
    await act(() => result.current.enviar())
    expect(result.current.errores.titulo).toBeDefined()
    expect(crear).not.toHaveBeenCalled()
    act(() => {
      result.current.resolver('titulo')
    })
    expect(result.current.errores.titulo).toBeUndefined()
  })

  it('sin red, cerrar y reabrir manda el mismo id de intento; guardar lo olvida', async () => {
    crear.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const primero = montar(nuevo)
    await act(() => primero.result.current.enviar())
    primero.unmount()

    crear.mockResolvedValueOnce(ok)
    const segundo = montar(nuevo)
    await act(() => segundo.result.current.enviar())
    const [antes, despues] = crear.mock.calls
    expect((despues?.[0] as { id: string }).id).toBe((antes?.[0] as { id: string }).id)
    segundo.unmount()

    crear.mockResolvedValueOnce(ok)
    const tercero = montar(nuevo)
    await act(() => tercero.result.current.enviar())
    expect((crear.mock.calls[2]?.[0] as { id: string }).id).not.toBe(
      (antes?.[0] as { id: string }).id,
    )
  })
})
