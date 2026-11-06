import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS, TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import type { PaginaConAutores } from '../../../entities/formula/versiones'
import { usePaginasDeVersiones } from './use-paginas-de-versiones'

type Respuesta = Resultado<PaginaConAutores>
type Pedido = { origenId: string; cursor: number | null; resolver: (r: Respuesta) => void }
const pedidos: Pedido[] = []
vi.mock('../../../areas/formula/composicion.client', () => ({
  leerPaginaDeVersiones: (pedido: { origenId: string; cursor: number | null }) =>
    new Promise<Respuesta>((resolver) => {
      pedidos.push({ ...pedido, resolver })
    }),
}))

const ORIGEN = '00000000-0000-4000-8000-0000000000aa'
const idDe = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
// `cuantas` versiones desde la `desde` hacia atrás; `siguiente` si hay más.
const pagina = (desde: number, cuantas: number, hayMas = true): PaginaConAutores => ({
  filas: Array.from({ length: cuantas }, (_, i) => ({
    id: idDe(desde - i),
    version: desde - i,
    estado: 'archivada' as const,
    nota: null,
    publicadoPor: null,
    publicadoEn: null,
    autor: 'Alguien',
  })),
  siguiente: hayMas ? desde - cuantas + 1 : null,
})
const ok = (p: PaginaConAutores): Respuesta => ({ ok: true, data: p })
const error: Respuesta = { ok: false, error: { codigo: 'inesperado', mensaje: 'x' } }

const responder = async (n: number, r: Respuesta) => {
  await waitFor(() => {
    expect(pedidos.length).toBeGreaterThanOrEqual(n)
  })
  await act(async () => {
    pedidos[n - 1]?.resolver(r)
    await Promise.resolve()
  })
}

beforeEach(() => {
  pedidos.length = 0
})

describe('usePaginasDeVersiones', () => {
  it('empieza con la página del servidor y «Ver más» suma la siguiente por cursor', async () => {
    const { result } = renderHook(() => usePaginasDeVersiones(ORIGEN, pagina(100, 20)))
    expect(result.current.filas).toHaveLength(20)
    act(() => {
      result.current.verMas()
    })
    expect(result.current.cargando).toBe(true)
    // Un pedido a la vez.
    act(() => {
      result.current.verMas()
    })
    await responder(1, ok(pagina(80, 20)))
    expect(pedidos).toHaveLength(1)
    expect(pedidos[0]).toMatchObject({ origenId: ORIGEN, cursor: 81 })
    expect(result.current.filas).toHaveLength(40)
    expect(result.current.filas.at(-1)?.version).toBe(61)
  })

  it('para en el tope y lo avisa', async () => {
    const { result } = renderHook(() => usePaginasDeVersiones(ORIGEN, pagina(1000, 20)))
    for (let n = 1; n < TOPE_DE_LO_CARGADO / TAMANO_DE_VER_MAS; n += 1) {
      act(() => {
        result.current.verMas()
      })
      await responder(n, ok(pagina(1000 - n * 20, 20)))
    }
    expect(result.current.filas).toHaveLength(TOPE_DE_LO_CARGADO)
    expect(result.current.enElTope).toBe(true)
    expect(result.current.hayMasParaPedir).toBe(false)
    act(() => {
      result.current.verMas()
    })
    expect(pedidos).toHaveLength(TOPE_DE_LO_CARGADO / TAMANO_DE_VER_MAS - 1)
  })

  it('el error deja lo cargado y «Reintentar» repite el pedido', async () => {
    const { result } = renderHook(() => usePaginasDeVersiones(ORIGEN, pagina(100, 20)))
    act(() => {
      result.current.verMas()
    })
    await responder(1, error)
    expect(result.current.filas).toHaveLength(20)
    expect(result.current.error).not.toBeNull()
    act(() => {
      result.current.reintentar()
    })
    await responder(2, ok(pagina(80, 20)))
    expect(pedidos[1]?.cursor).toBe(81)
    expect(result.current.filas).toHaveLength(40)
    expect(result.current.error).toBeNull()
  })

  it('«Ir a la versión» reemplaza lo leído y descarta la respuesta vieja', async () => {
    const { result } = renderHook(() => usePaginasDeVersiones(ORIGEN, pagina(100, 20)))
    act(() => {
      result.current.verMas()
    })
    act(() => {
      result.current.irA(11)
    })
    await responder(2, ok(pagina(10, 10, false)))
    // La de «Ver más» llega tarde: se descarta.
    await responder(1, ok(pagina(80, 20)))
    expect(pedidos[1]?.cursor).toBe(11)
    expect(result.current.desde).toBe(10)
    expect(result.current.filas.map((fila) => fila.version)).toEqual([
      10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
    ])
  })

  it('«Volver a la más nueva» vuelve a la primera página sin pedirla', async () => {
    const inicial = pagina(100, 20)
    const { result } = renderHook(() => usePaginasDeVersiones(ORIGEN, inicial))
    act(() => {
      result.current.irA(11)
    })
    await responder(1, ok(pagina(10, 10, false)))
    act(() => {
      result.current.volverALaMasNueva()
    })
    expect(result.current.desde).toBeNull()
    expect(result.current.filas).toEqual(inicial.filas)
    expect(pedidos).toHaveLength(1)
  })
})
