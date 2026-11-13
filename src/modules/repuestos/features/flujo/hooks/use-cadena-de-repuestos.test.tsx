import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import type {
  CadenaDeRepuestos,
  ColumnaDeRepuestos,
  TarjetaDeRepuesto,
} from '../../../entities/flujo/cadena'

const llamadas = vi.hoisted(() => ({ verMas: vi.fn(), avisarError: vi.fn() }))

// La Server Action trae `server-only` por su composición: aquí se simula.
vi.mock('../actions/ver-mas-de-la-columna', () => ({
  verMasDeLaColumnaDeRepuestos: llamadas.verMas,
}))
vi.mock('@/shared/ui/toasts', () => ({ avisarError: llamadas.avisarError }))

import { useCadenaDeRepuestos } from './use-cadena-de-repuestos'

const FASE = '22222222-2222-4222-8222-222222222222'
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function tarjeta(
  n: number,
  faseDesde: string | null = '2026-11-01T10:00:00+00:00',
): TarjetaDeRepuesto {
  return {
    id: id(n),
    descripcion: `Pieza ${String(n)}`,
    cantidad: 1,
    faseDesde,
    proyecto: { id: id(900), numero: 3, etiqueta: null },
  }
}

function columna(
  faseId: string | null,
  tarjetas: TarjetaDeRepuesto[],
  hayMas: boolean,
  esFinal = false,
): ColumnaDeRepuestos {
  return {
    faseId,
    nombre: faseId === null ? null : 'En tránsito',
    color: null,
    activa: true,
    esFinal,
    tarjetas,
    hayMas,
  }
}

const filtros = { q: null, proyecto: null }

beforeEach(() => {
  llamadas.verMas.mockReset()
  llamadas.avisarError.mockReset()
})
afterEach(cleanup)

describe('useCadenaDeRepuestos', () => {
  it('«Ver más» suma lo nuevo sin repetir y pide con el cursor de la última tarjeta', async () => {
    llamadas.verMas.mockResolvedValue({
      data: { ok: true, data: { tarjetas: [tarjeta(2), tarjeta(3)], hayMas: false } },
    })
    const inicial: CadenaDeRepuestos = { columnas: [columna(FASE, [tarjeta(1), tarjeta(2)], true)] }
    const { result } = renderHook(() => useCadenaDeRepuestos(inicial, filtros))
    await act(async () => {
      await result.current.verMas(result.current.columnas[0]!)
    })
    expect(result.current.columnas[0]!.tarjetas.map((t) => t.id)).toEqual([id(1), id(2), id(3)])
    expect(result.current.anuncio).toBe('Se cargó 1 más.')
    expect(llamadas.verMas).toHaveBeenCalledWith({
      faseId: FASE,
      orden: 'antiguos',
      cursor: { desde: '2026-11-01T10:00:00+00:00', id: id(2) },
      filtros,
    })
  })

  it('una fase final pide de lo más reciente y «Sin fase» va con cursor sólo por id', async () => {
    llamadas.verMas.mockResolvedValue({ data: { ok: true, data: { tarjetas: [], hayMas: false } } })
    const final = columna(FASE, [tarjeta(1)], true, true)
    const sin = columna(null, [tarjeta(2, null)], true)
    const { result } = renderHook(() => useCadenaDeRepuestos({ columnas: [final, sin] }, filtros))
    await act(async () => {
      await result.current.verMas(result.current.columnas[0]!)
      await result.current.verMas(result.current.columnas[1]!)
    })
    expect(llamadas.verMas).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ orden: 'recientes' }),
    )
    expect(llamadas.verMas).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ faseId: null, cursor: { desde: null, id: id(2) } }),
    )
  })

  it('no pasa del tope de lo cargado', async () => {
    const llenas = Array.from({ length: TOPE_DE_LO_CARGADO - 1 }, (_, i) => tarjeta(i + 1))
    llamadas.verMas.mockResolvedValue({
      data: { ok: true, data: { tarjetas: [tarjeta(9001), tarjeta(9002)], hayMas: true } },
    })
    const { result } = renderHook(() =>
      useCadenaDeRepuestos({ columnas: [columna(FASE, llenas, true)] }, filtros),
    )
    await act(async () => {
      await result.current.verMas(result.current.columnas[0]!)
    })
    expect(result.current.columnas[0]!.tarjetas).toHaveLength(TOPE_DE_LO_CARGADO)
  })

  it('una falla conserva la columna y avisa', async () => {
    llamadas.verMas.mockResolvedValue({
      data: { ok: false, error: { codigo: 'inesperado', mensaje: 'No se pudo cargar más.' } },
    })
    const inicial: CadenaDeRepuestos = { columnas: [columna(FASE, [tarjeta(1)], true)] }
    const { result } = renderHook(() => useCadenaDeRepuestos(inicial, filtros))
    await act(async () => {
      await result.current.verMas(result.current.columnas[0]!)
    })
    expect(result.current.columnas[0]!.tarjetas).toHaveLength(1)
    expect(result.current.columnas[0]!.hayMas).toBe(true)
    expect(llamadas.avisarError).toHaveBeenCalledTimes(1)
    expect(result.current.cargando).toBeNull()
  })
})

describe('useCadenaDeRepuestos: la firma y los pedidos', () => {
  it('con otra firma (otros filtros o lo que trae el servidor tras mover) se vuelve a sembrar', () => {
    const a: CadenaDeRepuestos = { columnas: [columna(FASE, [tarjeta(1)], false)] }
    const b: CadenaDeRepuestos = { columnas: [columna(FASE, [], false)] }
    const { result, rerender } = renderHook(({ cadena }) => useCadenaDeRepuestos(cadena, filtros), {
      initialProps: { cadena: a },
    })
    expect(result.current.columnas[0]!.tarjetas).toHaveLength(1)
    rerender({ cadena: b })
    expect(result.current.columnas[0]!.tarjetas).toHaveLength(0)
  })

  it('no hace un segundo pedido de la misma columna mientras espera', async () => {
    let resolver: (valor: unknown) => void = () => undefined
    llamadas.verMas.mockReturnValue(new Promise((r) => (resolver = r)))
    const inicial: CadenaDeRepuestos = { columnas: [columna(FASE, [tarjeta(1)], true)] }
    const { result } = renderHook(() => useCadenaDeRepuestos(inicial, filtros))
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
