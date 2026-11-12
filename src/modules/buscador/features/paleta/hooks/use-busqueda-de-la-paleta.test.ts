import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MENSAJE_INESPERADO,
  MENSAJE_SIN_CONEXION,
  MENSAJE_SIN_RESPUESTA,
  fallo,
  ok,
  type Resultado,
} from '@/shared/lib/errores'
import type { TipoDelBuscador } from '../../../entities/ranking'
import type { FilaPorTipo } from '../../../entities/resultados'
import {
  ESPERA_DE_LA_PALETA_MS,
  useBusquedaDeLaPaleta,
  type LecturasDeLaPaleta,
} from './use-busqueda-de-la-paleta'

// `leads/client` reexporta una Server Action cuya composición importa `server-only`: en Vitest el import llega entero y cae. Aquí sólo se usa `interpretarBusqueda`.
vi.mock('server-only', () => ({}))

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const lead = (n: number, nombre: string): FilaPorTipo['lead'] => ({
  id: id(n),
  nombre,
  numero_visible: n,
})
const vehiculo = (n: number, titulo: string): FilaPorTipo['vehiculo'] => ({
  id: id(100 + n),
  origen_id: id(900),
  titulo,
  vin: null,
  lote: null,
  creado_en: '2026-11-01T00:00:00Z',
})

type Pedido = {
  tipo: TipoDelBuscador
  texto: string
  signal: AbortSignal
  responder: (r: Resultado<never[]>) => void
}

// Lecturas manuales: cada pedido queda esperando hasta que el test responde.
function lecturasManuales() {
  const pedidos: Pedido[] = []
  const de = (tipo: TipoDelBuscador) => (pedido: { texto: string; signal: AbortSignal }) =>
    new Promise<Resultado<never[]>>((responder) => {
      pedidos.push({ tipo, texto: pedido.texto, signal: pedido.signal, responder })
    })
  const lecturas = {
    lead: de('lead'),
    vehiculo: de('vehiculo'),
    cotizacion: de('cotizacion'),
  } as unknown as LecturasDeLaPaleta
  return { pedidos, lecturas }
}

const pasar = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
const tipos = (pedidos: readonly Pedido[]) => pedidos.map((p) => p.tipo).sort()

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

async function responder(
  texto: string,
  respuestas: Partial<Record<TipoDelBuscador, Resultado<unknown[]>>>,
) {
  const { pedidos, lecturas } = lecturasManuales()
  const hook = renderHook(() => useBusquedaDeLaPaleta({ texto, abierta: true, lecturas }))
  await pasar(ESPERA_DE_LA_PALETA_MS)
  await act(async () => {
    pedidos.forEach((p) => {
      p.responder((respuestas[p.tipo] ?? ok([])) as Resultado<never[]>)
    })
    await Promise.resolve()
  })
  return { ...hook, pedidos }
}

describe('useBusquedaDeLaPaleta: carrera y mínimo', () => {
  it('la respuesta de una búsqueda vieja no pisa a la nueva', async () => {
    const { pedidos, lecturas } = lecturasManuales()
    const { result, rerender } = renderHook(
      ({ texto }: { texto: string }) => useBusquedaDeLaPaleta({ texto, abierta: true, lecturas }),
      { initialProps: { texto: 'cam' } },
    )
    await pasar(ESPERA_DE_LA_PALETA_MS)
    expect(pedidos).toHaveLength(3)
    rerender({ texto: 'camion' })
    expect(pedidos.every((p) => p.signal.aborted)).toBe(true)
    await pasar(ESPERA_DE_LA_PALETA_MS)
    expect(pedidos).toHaveLength(6)
    const nuevos = pedidos.slice(3)
    const viejos = pedidos.slice(0, 3)
    await act(async () => {
      nuevos
        .find((p) => p.tipo === 'vehiculo')
        ?.responder(ok([vehiculo(1, 'Camión nuevo')] as never[]))
      nuevos
        .filter((p) => p.tipo !== 'vehiculo')
        .forEach((p) => {
          p.responder(ok([]))
        })
      viejos.find((p) => p.tipo === 'lead')?.responder(ok([lead(1, 'Cam vieja')] as never[]))
      viejos
        .filter((p) => p.tipo !== 'lead')
        .forEach((p) => {
          p.responder(ok([]))
        })
      await Promise.resolve()
    })
    const estado = result.current.estado
    expect(estado.tipo).toBe('listo')
    if (estado.tipo === 'listo') {
      expect(estado.secciones.map((s) => s.tipo)).toEqual(['vehiculo'])
      expect(estado.parcial).toBe(false)
    }
  })

  it('bajo el mínimo no espera ni pide nada', async () => {
    const { pedidos, lecturas } = lecturasManuales()
    for (const texto of ['', 'ca', '  ']) {
      const { result } = renderHook(() => useBusquedaDeLaPaleta({ texto, abierta: true, lecturas }))
      await pasar(10_000)
      expect(result.current.estado).toEqual({ tipo: 'reposo' })
    }
    expect(pedidos).toHaveLength(0)
  })
})

describe('useBusquedaDeLaPaleta: espera', () => {
  it('con 3 letras espera 250 ms y escribir antes reinicia la espera', async () => {
    const { pedidos, lecturas } = lecturasManuales()
    const { result, rerender } = renderHook(
      ({ texto }: { texto: string }) => useBusquedaDeLaPaleta({ texto, abierta: true, lecturas }),
      { initialProps: { texto: 'cam' } },
    )
    expect(result.current.estado).toEqual({ tipo: 'esperando' })
    await pasar(ESPERA_DE_LA_PALETA_MS - 1)
    expect(pedidos).toHaveLength(0)
    expect(result.current.estado).toEqual({ tipo: 'esperando' })
    rerender({ texto: 'cami' })
    await pasar(ESPERA_DE_LA_PALETA_MS - 1)
    expect(pedidos).toHaveLength(0)
    await pasar(1)
    expect(tipos(pedidos)).toEqual(['cotizacion', 'lead', 'vehiculo'])
    expect(pedidos.every((p) => p.texto === 'cami')).toBe(true)
    expect(result.current.estado).toEqual({ tipo: 'buscando' })
  })

  it('espacios de más no repiten la búsqueda', async () => {
    const { pedidos, lecturas } = lecturasManuales()
    const { rerender } = renderHook(
      ({ texto }: { texto: string }) => useBusquedaDeLaPaleta({ texto, abierta: true, lecturas }),
      { initialProps: { texto: 'cami' } },
    )
    await pasar(ESPERA_DE_LA_PALETA_MS)
    rerender({ texto: 'cami ' })
    await pasar(ESPERA_DE_LA_PALETA_MS * 2)
    expect(pedidos).toHaveLength(3)
    expect(pedidos.some((p) => p.signal.aborted)).toBe(false)
  })
})

describe('useBusquedaDeLaPaleta: qué pide', () => {
  it('pide las secciones que dice el texto', async () => {
    const peticiones = async (texto: string) => {
      const { pedidos, lecturas } = lecturasManuales()
      renderHook(() => useBusquedaDeLaPaleta({ texto, abierta: true, lecturas }))
      await pasar(ESPERA_DE_LA_PALETA_MS)
      return tipos(pedidos)
    }
    expect(await peticiones('cam')).toEqual(['cotizacion', 'lead', 'vehiculo'])
    expect(await peticiones('#12')).toEqual(['cotizacion', 'lead'])
    // Un teléfono no pide la sección de leads (D4); con `#` es un número de lead.
    expect(await peticiones('+591 70012345')).toEqual(['cotizacion', 'vehiculo'])
    expect(await peticiones('#7001234')).toEqual(['cotizacion', 'lead'])
  })

  it('un teléfono sin resultados lo dice en el estado', async () => {
    const { pedidos, lecturas } = lecturasManuales()
    const { result } = renderHook(() =>
      useBusquedaDeLaPaleta({ texto: '+591 70012345', abierta: true, lecturas }),
    )
    await pasar(ESPERA_DE_LA_PALETA_MS)
    await act(async () => {
      pedidos.forEach((p) => {
        p.responder(ok([]))
      })
      await Promise.resolve()
    })
    expect(result.current.estado).toEqual({
      tipo: 'listo',
      secciones: [],
      parcial: false,
      porTelefono: true,
    })
  })
})

describe('useBusquedaDeLaPaleta: estados', () => {
  it('si todas fallan sin red, «sin conexión»', async () => {
    const f = fallo('inesperado', MENSAJE_SIN_CONEXION)
    const { result } = await responder('cam', { lead: f, vehiculo: f, cotizacion: f })
    expect(result.current.estado).toEqual({ tipo: 'sin_conexion', mensaje: MENSAJE_SIN_CONEXION })
  })

  it('si todas fallan con red, «error»', async () => {
    const f = fallo('inesperado', MENSAJE_SIN_RESPUESTA)
    const { result } = await responder('cam', { lead: f, vehiculo: f, cotizacion: f })
    expect(result.current.estado).toEqual({ tipo: 'error', mensaje: MENSAJE_SIN_RESPUESTA })
  })

  it('si una falla y otra trae filas, «listo» parcial', async () => {
    const { result } = await responder('cam', {
      lead: fallo('inesperado', MENSAJE_SIN_RESPUESTA),
      vehiculo: ok([vehiculo(1, 'Camión')]),
    })
    const estado = result.current.estado
    expect(estado.tipo).toBe('listo')
    if (estado.tipo === 'listo') {
      expect(estado.parcial).toBe(true)
      expect(estado.secciones.map((s) => s.tipo)).toEqual(['vehiculo'])
    }
  })

  it('sin filas y sin fallos, «sin resultados»', async () => {
    const { result } = await responder('cam', {})
    expect(result.current.estado).toEqual({
      tipo: 'listo',
      secciones: [],
      parcial: false,
      porTelefono: false,
    })
  })

  it('una lectura que lanza no revienta la paleta', async () => {
    const lecturas = {
      lead: () => Promise.reject(new Error('boom')),
      vehiculo: () => Promise.resolve(ok([])),
      cotizacion: () => Promise.resolve(ok([])),
    } as unknown as LecturasDeLaPaleta
    const { result } = renderHook(() =>
      useBusquedaDeLaPaleta({ texto: 'cam', abierta: true, lecturas }),
    )
    await pasar(ESPERA_DE_LA_PALETA_MS)
    expect(result.current.estado).toEqual({ tipo: 'error', mensaje: MENSAJE_INESPERADO })
  })
})

describe('useBusquedaDeLaPaleta: reintentar y cerrar', () => {
  it('reintentar vuelve a pedir el mismo texto', async () => {
    const f = fallo('inesperado', MENSAJE_SIN_RESPUESTA)
    const { result, pedidos } = await responder('cam', { lead: f, vehiculo: f, cotizacion: f })
    expect(pedidos).toHaveLength(3)
    act(() => {
      result.current.reintentar()
    })
    await pasar(ESPERA_DE_LA_PALETA_MS)
    expect(pedidos).toHaveLength(6)
    expect(pedidos.slice(3).every((p) => p.texto === 'cam')).toBe(true)
  })

  it('cerrar la paleta aborta lo que haya y vuelve a reposo', async () => {
    const { pedidos, lecturas } = lecturasManuales()
    const { result, rerender } = renderHook(
      ({ abierta }: { abierta: boolean }) =>
        useBusquedaDeLaPaleta({ texto: 'cam', abierta, lecturas }),
      { initialProps: { abierta: true } },
    )
    await pasar(ESPERA_DE_LA_PALETA_MS)
    expect(result.current.estado).toEqual({ tipo: 'buscando' })
    rerender({ abierta: false })
    expect(pedidos.every((p) => p.signal.aborted)).toBe(true)
    expect(result.current.estado).toEqual({ tipo: 'reposo' })
    await act(async () => {
      pedidos.forEach((p) => {
        p.responder(ok([]))
      })
      await Promise.resolve()
    })
    expect(result.current.estado).toEqual({ tipo: 'reposo' })
  })
})
