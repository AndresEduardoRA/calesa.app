import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { claveDelPendiente } from '../../../entities/claves-de-la-hoja'
import type { ResultadoDeCrear } from '../../../entities/guardado'
import type { PedidoDeGuardado } from '../../../entities/pedido-de-guardado'
import { useGuardado, type Armar, type PedidoArmado } from './use-guardado'

const ejecutar = vi.hoisted(() => vi.fn())
vi.mock('next-safe-action/hooks', () => ({ useAction: () => ({ executeAsync: ejecutar }) }))
vi.mock('../actions/crear-cotizacion', () => ({ crearCotizacion: {} }))

const ORIGEN = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const LEAD = '1b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const PERSONA = '3b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const armado = (valor: number): PedidoArmado => ({
  origenId: ORIGEN,
  leadId: LEAD,
  vehiculoId: null,
  abierta: 'f.1.ab',
  entradas: { inputs: { pub: valor }, banderas: {}, overrides: {} },
  modoTc: null,
})
const armarCon =
  (valor: number): Armar =>
  (listo) => {
    listo(armado(valor))
  }
const respuesta = (r: ResultadoDeCrear) => ({ data: { ok: true, data: r } })
const GUARDADA = respuesta({
  tipo: 'guardada',
  cotizacion: { id: ORIGEN, numero: 7, totalUsd: 10, repetido: false },
})
const mandados = () => ejecutar.mock.calls.map((c) => c[0] as PedidoDeGuardado)

const montar = (vehiculoId: string | null = null) =>
  renderHook(() =>
    useGuardado({
      hoja: { personaId: PERSONA, origenId: ORIGEN, leadId: LEAD, vehiculoId },
      alGuardar: () => {},
    }),
  )

// Guarda y deja correr la respuesta de la action (una promesa ya resuelta).
const guardar = (hook: ReturnType<typeof montar>, armar: Armar) =>
  act(async () => {
    hook.result.current.guardar(armar)
    await Promise.resolve()
  })

beforeEach(() => {
  window.sessionStorage.clear()
  ejecutar.mockReset()
})
afterEach(cleanup)

describe('useGuardado: un envío a la vez y el intento pendiente', () => {
  it('dos guardados seguidos sacan un solo envío', async () => {
    let soltar: (v: unknown) => void = () => {}
    ejecutar.mockReturnValue(new Promise((r) => (soltar = r)))
    const hook = montar()
    act(() => {
      hook.result.current.guardar(armarCon(1))
      hook.result.current.guardar(armarCon(2))
    })
    expect(ejecutar).toHaveBeenCalledTimes(1)
    await act(async () => {
      soltar(GUARDADA)
      await Promise.resolve()
    })
    expect(hook.result.current.estado.tipo).toBe('guardada')
  })

  it('con la respuesta perdida, el próximo guardado reenvía el pedido viejo con su intento, sin armar otro (4-21)', async () => {
    ejecutar.mockResolvedValueOnce(respuesta({ tipo: 'perdida' }))
    const hook = montar()
    await guardar(hook, armarCon(1))
    expect(hook.result.current.hayPendiente).toBe(true)
    expect(hook.result.current.estado.tipo).toBe('aviso')
    ejecutar.mockResolvedValueOnce(GUARDADA)
    const armar = vi.fn(armarCon(2))
    await guardar(hook, armar)
    expect(armar).not.toHaveBeenCalled()
    const [primero, segundo] = mandados()
    expect(segundo).toEqual(primero)
    expect(segundo?.entradas.inputs).toEqual({ pub: 1 })
    expect(hook.result.current.hayPendiente).toBe(false)
    expect(hook.result.current.estado).toMatchObject({ tipo: 'guardada', fueReenvio: true })
  })

  it('el pendiente vive en la pestaña con la clave de su hoja: otra hoja no lo reenvía', async () => {
    ejecutar.mockResolvedValueOnce(undefined)
    const hook = montar()
    await guardar(hook, armarCon(1))
    const guardado = window.sessionStorage.getItem(
      claveDelPendiente({ personaId: PERSONA, origenId: ORIGEN, leadId: LEAD, vehiculoId: null }),
    )
    expect(JSON.parse(guardado ?? '{}')).toEqual(mandados()[0])
    hook.unmount()
    ejecutar.mockResolvedValueOnce(GUARDADA)
    const otra = montar('2b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b')
    await guardar(otra, armarCon(5))
    expect(mandados()[1]?.intento).not.toBe(mandados()[0]?.intento)
    expect(mandados()[1]?.entradas.inputs).toEqual({ pub: 5 })
  })

  it('un error con código suelta el pendiente; la sesión vencida antes de correr lo conserva y ofrece «Ingresar»', async () => {
    ejecutar.mockResolvedValueOnce(respuesta({ tipo: 'rechazo', motivo: 'transitorio' }))
    const hook = montar()
    await guardar(hook, armarCon(1))
    expect(hook.result.current.hayPendiente).toBe(false)
    expect(hook.result.current.estado).toMatchObject({ aviso: { salida: 'reintentar' } })
    ejecutar.mockResolvedValueOnce({ serverError: { codigo: 'no_autenticado', mensaje: 'x' } })
    await guardar(hook, armarCon(2))
    expect(mandados()[1]?.intento).not.toBe(mandados()[0]?.intento)
    expect(hook.result.current.hayPendiente).toBe(true)
    expect(hook.result.current.estado).toMatchObject({ aviso: { salida: 'ingresar' } })
  })
})

describe('useGuardado: los rechazos y la hoja que no arma', () => {
  it('D2 guarda el pedido que lo recibió y suelta el pendiente', async () => {
    ejecutar.mockResolvedValueOnce(respuesta({ tipo: 'rechazo', motivo: 'desactualizada_formula' }))
    const hook = montar()
    await guardar(hook, armarCon(1))
    expect(hook.result.current.estado).toMatchObject({
      tipo: 'aviso',
      d2: { pedido: mandados()[0], por: 'formula' },
    })
    expect(hook.result.current.hayPendiente).toBe(false)
  })

  it('«Guardar con la N» manda lo que recibió el D2, con otro intento y con la abierta', async () => {
    ejecutar.mockResolvedValueOnce(
      respuesta({ tipo: 'rechazo', motivo: 'desactualizada_tipo_cambio' }),
    )
    const hook = montar()
    await guardar(hook, armarCon(1))
    expect(hook.result.current.estado).toMatchObject({ d2: { por: 'tipo_cambio' } })
    ejecutar.mockResolvedValueOnce(GUARDADA)
    await act(async () => {
      hook.result.current.guardarConLaAbierta()
      await Promise.resolve()
    })
    const [d2, conLaN] = mandados()
    expect(conLaN?.entradas.inputs).toEqual({ pub: 1 })
    expect(conLaN).toEqual({ ...d2, intento: conLaN?.intento, conLaAbierta: true })
    expect(conLaN?.intento).not.toBe(d2?.intento)
  })

  it('si la hoja no arma (falló, el total quedó nulo o se fue), vuelve a «Guardar» sin mandar nada', () => {
    const hook = montar()
    let soltar: (p: PedidoArmado | null) => void = () => {}
    act(() => {
      hook.result.current.guardar((listo) => (soltar = listo))
    })
    expect(hook.result.current.estado.tipo).toBe('esperando_total')
    expect(hook.result.current.ocupado).toBe(true)
    act(() => {
      soltar(null)
    })
    expect(hook.result.current.estado.tipo).toBe('listo')
    expect(ejecutar).not.toHaveBeenCalled()
  })
})
