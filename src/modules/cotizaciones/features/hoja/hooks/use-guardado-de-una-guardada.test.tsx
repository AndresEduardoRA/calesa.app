import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResultadoDeCrear } from '../../../entities/guardado'
import { serializarPendienteDeEdicion } from '../../../entities/intento-de-guardado'
import type { ArmadoDeEdicion, PedidoDeEdicion } from '../../../entities/pedido-de-edicion'
import { useGuardadoDeUnaGuardada } from './use-guardado-de-una-guardada'

const ejecutar = vi.hoisted(() => vi.fn())
vi.mock('next-safe-action/hooks', () => ({ useAction: () => ({ executeAsync: ejecutar }) }))
vi.mock('../actions/guardar-cotizacion', () => ({ guardarCotizacion: {} }))

const COTIZACION = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const PERSONA = '3b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const CLAVE = `cotizar-guardada-pendiente:${PERSONA}:${COTIZACION}`
const armado = (valor: number): ArmadoDeEdicion => ({
  cotizacionId: COTIZACION,
  actualizadoEn: '2026-11-03T14:20:31.123456+00:00',
  entradas: { inputs: { pub: valor }, banderas: {}, overrides: {} },
  modoTc: null,
  verTotalBs: false,
  titulo: null,
  notas: null,
  vehiculoId: null,
})
const armarCon = (valor: number) => (listo: (a: ArmadoDeEdicion | null) => void) => {
  listo(armado(valor))
}
const respuesta = (r: ResultadoDeCrear) => ({ data: { ok: true, data: r } })
const GUARDADA = respuesta({
  tipo: 'guardada',
  cotizacion: { id: COTIZACION, numero: 7, totalUsd: 10, repetido: false },
})
const montar = (alGuardar = () => {}) =>
  renderHook(() =>
    useGuardadoDeUnaGuardada({ personaId: PERSONA, cotizacionId: COTIZACION, alGuardar }),
  )
const mandados = () => ejecutar.mock.calls.map((c) => c[0] as PedidoDeEdicion)

beforeEach(() => {
  window.sessionStorage.clear()
  ejecutar.mockReset()
})
afterEach(cleanup)

describe('useGuardadoDeUnaGuardada', () => {
  it('el pedido lleva un intento nuevo y lo armado; el pendiente se anota con la clave de la cotización', async () => {
    let soltar: (v: unknown) => void = () => {}
    ejecutar.mockReturnValue(new Promise((r) => (soltar = r)))
    const hook = montar()
    act(() => {
      hook.result.current.guardar(armarCon(1))
    })
    expect(mandados()).toHaveLength(1)
    expect(mandados()[0]).toMatchObject({
      cotizacionId: COTIZACION,
      entradas: { inputs: { pub: 1 } },
    })
    expect(mandados()[0]?.intento).toMatch(/^[0-9a-f-]{36}$/)
    expect(window.sessionStorage.getItem(CLAVE)).not.toBeNull()
    expect(hook.result.current.estado.tipo).toBe('guardando')
    await act(async () => {
      soltar(GUARDADA)
      await Promise.resolve()
    })
    expect(hook.result.current.estado.tipo).toBe('guardada')
    expect(window.sessionStorage.getItem(CLAVE)).toBeNull()
  })

  it('un envío a la vez', () => {
    ejecutar.mockReturnValue(new Promise(() => {}))
    const hook = montar()
    act(() => {
      hook.result.current.guardar(armarCon(1))
      hook.result.current.guardar(armarCon(2))
    })
    expect(ejecutar).toHaveBeenCalledTimes(1)
  })
})

describe('useGuardadoDeUnaGuardada: pendiente y aviso', () => {
  it('con un pendiente reenvía ése, con su intento, y no mira lo armado', async () => {
    const antes: PedidoDeEdicion = { ...armado(9), intento: 'intento-de-antes' }
    window.sessionStorage.setItem(CLAVE, serializarPendienteDeEdicion(antes))
    ejecutar.mockResolvedValue(GUARDADA)
    const hook = montar()
    expect(hook.result.current.hayPendiente).toBe(true)
    await act(async () => {
      hook.result.current.guardar(armarCon(1))
      await Promise.resolve()
    })
    expect(mandados()).toEqual([antes])
  })

  it('guardado, llama a `alGuardar` (el marco borra el borrador)', async () => {
    ejecutar.mockResolvedValue(GUARDADA)
    const alGuardar = vi.fn()
    const hook = montar(alGuardar)
    await act(async () => {
      hook.result.current.guardar(armarCon(1))
      await Promise.resolve()
    })
    expect(alGuardar).toHaveBeenCalledTimes(1)
  })

  it('«Cambios guardados.» se olvida con el próximo cambio (a diferencia de la hoja nueva, que se va)', async () => {
    ejecutar.mockResolvedValue(GUARDADA)
    const hook = montar()
    await act(async () => {
      hook.result.current.guardar(armarCon(1))
      await Promise.resolve()
    })
    expect(hook.result.current.estado.tipo).toBe('guardada')
    act(() => {
      hook.result.current.olvidarAviso()
    })
    expect(hook.result.current.estado.tipo).toBe('listo')
  })

  it('un rechazo con SQLSTATE suelta el pendiente; una respuesta perdida lo conserva', async () => {
    ejecutar.mockResolvedValueOnce(
      respuesta({
        tipo: 'rechazo',
        motivo: 'version_cambiada',
        mensaje: 'Otra persona cambió esta cotización.',
      }),
    )
    const hook = montar()
    await act(async () => {
      hook.result.current.guardar(armarCon(1))
      await Promise.resolve()
    })
    expect(hook.result.current.estado.tipo).toBe('aviso')
    expect(window.sessionStorage.getItem(CLAVE)).toBeNull()
    ejecutar.mockResolvedValueOnce(respuesta({ tipo: 'perdida' }))
    await act(async () => {
      hook.result.current.guardar(armarCon(2))
      await Promise.resolve()
    })
    expect(window.sessionStorage.getItem(CLAVE)).not.toBeNull()
  })
})
