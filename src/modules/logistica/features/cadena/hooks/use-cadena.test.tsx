import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import type {
  CadenaLeida,
  ColumnaDeLaCadena,
  TarjetaDeLaCadena,
} from '../../../entities/cadena/leer'

const llamadas = vi.hoisted(() => ({ verMas: vi.fn(), avisarError: vi.fn() }))

// La Server Action trae `server-only` por su composición: aquí se simula.
vi.mock('../actions/ver-mas-de-la-columna', () => ({ verMasDeLaColumna: llamadas.verMas }))
vi.mock('@/shared/ui/toasts', () => ({ avisarError: llamadas.avisarError }))

import { useCadena } from './use-cadena'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const FASE = '22222222-2222-4222-8222-222222222222'

function id(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

function tarjeta(
  n: number,
  faseDesde: string | null = '2026-11-01T10:00:00+00:00',
): TarjetaDeLaCadena {
  return {
    id: id(n),
    nombre: `Auto ${String(n)}`,
    titulo: `Auto ${String(n)}`,
    vin: null,
    lote: null,
    faseDesde,
    demorada: false,
    contenedor: null,
    booking: null,
    etaEl: null,
  }
}

function columna(
  faseId: string | null,
  tarjetas: TarjetaDeLaCadena[],
  hayMas: boolean,
): ColumnaDeLaCadena {
  return {
    faseId,
    nombre: faseId === null ? null : 'En puerto',
    color: null,
    activa: faseId === null ? null : true,
    esFinal: false,
    demoraDias: null,
    tarjetas,
    hayMas,
  }
}

const contexto = { origenId: ORIGEN, filtros: {} }

beforeEach(() => {
  llamadas.verMas.mockReset()
  llamadas.avisarError.mockReset()
})
afterEach(cleanup)

describe('useCadena', () => {
  it('«Ver más» suma las tarjetas nuevas sin repetir las que ya estaban', async () => {
    llamadas.verMas.mockResolvedValue({
      data: { ok: true, data: { tarjetas: [tarjeta(2), tarjeta(3)], hayMas: false } },
    })
    const inicial: CadenaLeida = { columnas: [columna(FASE, [tarjeta(1), tarjeta(2)], true)] }
    const { result } = renderHook(() => useCadena(inicial, contexto))
    await act(async () => {
      await result.current.verMas(result.current.columnas[0]!)
    })
    expect(result.current.columnas[0]!.tarjetas.map((t) => t.id)).toEqual([id(1), id(2), id(3)])
    expect(result.current.columnas[0]!.hayMas).toBe(false)
    expect(result.current.anuncio).toBe('Se cargó 1 más.')
    expect(llamadas.verMas).toHaveBeenCalledWith({
      origenId: ORIGEN,
      faseId: FASE,
      cursor: { desde: '2026-11-01T10:00:00+00:00', id: id(2) },
      filtros: {},
    })
  })

  it('no pasa del tope de lo cargado', async () => {
    const llenas = Array.from({ length: TOPE_DE_LO_CARGADO - 1 }, (_, i) => tarjeta(i + 1))
    llamadas.verMas.mockResolvedValue({
      data: { ok: true, data: { tarjetas: [tarjeta(9001), tarjeta(9002)], hayMas: true } },
    })
    const { result } = renderHook(() =>
      useCadena({ columnas: [columna(FASE, llenas, true)] }, contexto),
    )
    await act(async () => {
      await result.current.verMas(result.current.columnas[0]!)
    })
    expect(result.current.columnas[0]!.tarjetas).toHaveLength(TOPE_DE_LO_CARGADO)
  })

  it('en «Sin fase» pide con faseId nulo y el cursor sólo por id', async () => {
    llamadas.verMas.mockResolvedValue({
      data: { ok: true, data: { tarjetas: [], hayMas: false } },
    })
    const sinFase = columna(null, [tarjeta(1, null), tarjeta(2, null)], true)
    const { result } = renderHook(() => useCadena({ columnas: [sinFase] }, contexto))
    await act(async () => {
      await result.current.verMas(result.current.columnas[0]!)
    })
    expect(llamadas.verMas).toHaveBeenCalledWith({
      origenId: ORIGEN,
      faseId: null,
      cursor: { desde: null, id: id(2) },
      filtros: {},
    })
  })

  it('una falla conserva la columna y avisa', async () => {
    llamadas.verMas.mockResolvedValue({
      data: {
        ok: false,
        error: { codigo: 'inesperado', mensaje: 'No se pudo cargar más. Intenta de nuevo.' },
      },
    })
    const inicial: CadenaLeida = { columnas: [columna(FASE, [tarjeta(1)], true)] }
    const { result } = renderHook(() => useCadena(inicial, contexto))
    await act(async () => {
      await result.current.verMas(result.current.columnas[0]!)
    })
    expect(result.current.columnas[0]!.tarjetas).toHaveLength(1)
    expect(result.current.columnas[0]!.hayMas).toBe(true)
    expect(llamadas.avisarError).toHaveBeenCalledTimes(1)
    expect(result.current.cargando).toBeNull()
  })
})

describe('useCadena: la firma y los pedidos', () => {
  it('con otra firma (otro origen o filtros) se vuelve a sembrar', () => {
    const a: CadenaLeida = { columnas: [columna(FASE, [tarjeta(1)], false)] }
    const b: CadenaLeida = { columnas: [columna(FASE, [tarjeta(7), tarjeta(8)], false)] }
    const { result, rerender } = renderHook(({ cadena, ctx }) => useCadena(cadena, ctx), {
      initialProps: { cadena: a, ctx: contexto },
    })
    expect(result.current.columnas[0]!.tarjetas).toHaveLength(1)
    rerender({ cadena: b, ctx: { origenId: ORIGEN, filtros: { demoradas: true } } })
    expect(result.current.columnas[0]!.tarjetas.map((t) => t.id)).toEqual([id(7), id(8)])
  })

  it('no hace un segundo pedido de la misma columna mientras espera', async () => {
    let resolver: (valor: unknown) => void = () => undefined
    llamadas.verMas.mockReturnValue(new Promise((r) => (resolver = r)))
    const inicial: CadenaLeida = { columnas: [columna(FASE, [tarjeta(1)], true)] }
    const { result } = renderHook(() => useCadena(inicial, contexto))
    let primera: Promise<void> = Promise.resolve()
    await act(async () => {
      primera = result.current.verMas(result.current.columnas[0]!)
      await result.current.verMas(result.current.columnas[0]!)
    })
    expect(llamadas.verMas).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolver({ data: { ok: true, data: { tarjetas: [], hayMas: false } } })
      await primera
    })
  })
})
