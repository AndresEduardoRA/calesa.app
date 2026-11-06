import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { PaginaDeRevisiones } from '../../../entities/revisiones'

type Respuesta = Resultado<PaginaDeRevisiones>
type Pedido = {
  cotizacionId: string
  antes: number | null
  hasta: string | null
  resolver: (r: Respuesta) => void
}
const pedidos: Pedido[] = []
vi.mock('../../../composicion-revisiones.client', () => ({
  leerRevisiones: (pedido: { cotizacionId: string; antes: number | null; hasta: string | null }) =>
    new Promise<Respuesta>((resolver) => {
      pedidos.push({ ...pedido, resolver })
    }),
}))

import { useRevisiones } from './use-revisiones'

const COTIZACION = '00000000-0000-4000-8000-0000000000aa'
const revision = (id: number) => ({
  id,
  usuarioId: null,
  creadoEn: '2026-11-04T10:00:00+00:00',
  autor: null,
  diff: {},
})
const pagina = (desde: number, cuantas: number, siguiente: number | null): Respuesta => ({
  ok: true,
  data: {
    revisiones: Array.from({ length: cuantas }, (_, i) => revision(desde - i)),
    siguiente,
    etiquetas: { nodos: new Map([[`n${String(desde)}`, 'Etiqueta']]), grupos: new Map() },
  },
})

beforeEach(() => {
  pedidos.length = 0
})

const montar = (inicial: { abierto: boolean; version: string }) =>
  renderHook(
    (props: { abierto: boolean; version: string }) =>
      useRevisiones({ cotizacionId: COTIZACION, ...props }),
    { initialProps: inicial },
  )

const abrirCon = async (primera: Respuesta) => {
  const hook = montar({ abierto: true, version: 'v1' })
  await waitFor(() => {
    expect(pedidos).toHaveLength(1)
  })
  await act(async () => {
    pedidos[0]?.resolver(primera)
    await Promise.resolve()
  })
  return hook
}
const llegar = async (n: number, r: Respuesta) => {
  await act(async () => {
    pedidos[n]?.resolver(r)
    await Promise.resolve()
  })
}
const BORDE = '2026-10-14T04:00:00.000Z'
const FALLO: Respuesta = { ok: false, error: { codigo: 'inesperado', mensaje: 'x' } }

describe('useRevisiones: «Ir a una fecha»', () => {
  it('H1 · el salto pide con p_hasta y sin cursor, deja lo leído a la vista y, al llegar, lo reemplaza', async () => {
    const { result } = await abrirCon(pagina(30, 20, 11))
    act(() => {
      result.current.irAUnaFecha('2026-10-13', 'America/La_Paz')
    })
    expect(pedidos).toHaveLength(2)
    expect(pedidos[1]).toMatchObject({ antes: null, hasta: BORDE })
    expect(result.current.ocupado).toBe(true)
    expect(result.current.revisiones).toHaveLength(20)
    expect(result.current.desde).toBeNull()
    await llegar(1, pagina(8, 3, null))
    expect(result.current.revisiones.map((r) => r.id)).toEqual([8, 7, 6])
    expect(result.current.etiquetas.nodos.has('n30')).toBe(false)
    expect(result.current.etiquetas.nodos.get('n8')).toBe('Etiqueta')
    expect(result.current.siguiente).toBeNull()
    expect(result.current.desde).toBe('2026-10-13')
    expect(result.current.ocupado).toBe(false)
  })

  it('H2 · desde una fecha, «Ver más» pide desde el cursor sin p_hasta, junta y conserva desde', async () => {
    const { result } = await abrirCon(pagina(30, 20, 11))
    act(() => {
      result.current.irAUnaFecha('2026-10-13', 'America/La_Paz')
    })
    await llegar(1, pagina(8, 5, 4))
    act(() => {
      result.current.verMas()
    })
    expect(pedidos[2]).toMatchObject({ antes: 4, hasta: null })
    await llegar(2, pagina(3, 3, null))
    expect(result.current.revisiones.map((r) => r.id)).toEqual([8, 7, 6, 5, 4, 3, 2, 1])
    expect(result.current.desde).toBe('2026-10-13')
  })

  it('H3 · volver pide sin p_hasta ni cursor y deja desde nulo con sólo la página nueva', async () => {
    const { result } = await abrirCon(pagina(30, 20, 11))
    act(() => {
      result.current.irAUnaFecha('2026-10-13', 'America/La_Paz')
    })
    await llegar(1, pagina(8, 3, null))
    act(() => {
      result.current.volverALasMasRecientes()
    })
    expect(pedidos[2]).toMatchObject({ antes: null, hasta: null })
    await llegar(2, pagina(30, 20, 11))
    expect(result.current.desde).toBeNull()
    expect(result.current.revisiones).toHaveLength(20)
    expect(result.current.revisiones[0]?.id).toBe(30)
  })

  it('H6 · otra versión olvida desde; un día que no es un día no pide', async () => {
    const { result, rerender } = await abrirCon(pagina(30, 20, 11))
    act(() => {
      result.current.irAUnaFecha('no-es-un-dia', 'America/La_Paz')
    })
    expect(pedidos).toHaveLength(1)
    act(() => {
      result.current.irAUnaFecha('2026-10-13', 'America/La_Paz')
    })
    await llegar(1, pagina(8, 3, null))
    expect(result.current.desde).toBe('2026-10-13')
    rerender({ abierto: false, version: 'v2' })
    expect(result.current.desde).toBeNull()
    rerender({ abierto: true, version: 'v2' })
    await waitFor(() => {
      expect(pedidos).toHaveLength(3)
    })
    expect(pedidos[2]).toMatchObject({ antes: null, hasta: null })
  })
})

describe('useRevisiones: un pedido a la vez y lo que falla', () => {
  it('H4 · un pedido nunca se adelanta a otro en vuelo; la respuesta de otra versión se descarta', async () => {
    const { result, rerender } = await abrirCon(pagina(30, 20, 11))
    act(() => {
      result.current.verMas()
    })
    expect(pedidos).toHaveLength(2)
    expect(result.current.ocupado).toBe(true)
    act(() => {
      result.current.irAUnaFecha('2026-10-13', 'America/La_Paz')
      result.current.volverALasMasRecientes()
      result.current.verMas()
      result.current.reintentar()
    })
    expect(pedidos).toHaveLength(2)
    expect(result.current.desde).toBeNull()
    await llegar(1, pagina(10, 5, null))
    expect(result.current.revisiones).toHaveLength(25)
    expect(result.current.ocupado).toBe(false)
    act(() => {
      result.current.irAUnaFecha('2026-10-13', 'America/La_Paz')
    })
    expect(pedidos).toHaveLength(3)
    act(() => {
      result.current.verMas()
      result.current.volverALasMasRecientes()
    })
    expect(pedidos).toHaveLength(3)
    rerender({ abierto: true, version: 'v2' })
    await waitFor(() => {
      expect(pedidos).toHaveLength(4)
    })
    await llegar(2, pagina(99, 2, null))
    expect(result.current.revisiones).toEqual([])
    expect(result.current.desde).toBeNull()
    await llegar(3, pagina(50, 2, null))
    expect(result.current.revisiones.map((r) => r.id)).toEqual([50, 49])
    expect(result.current.ocupado).toBe(false)
  })

  it('H5 · si el salto falla, lo leído y desde quedan, el error dice el día y «reintentar» repite ese salto', async () => {
    const { result } = await abrirCon(pagina(30, 20, 11))
    act(() => {
      result.current.irAUnaFecha('2026-10-13', 'America/La_Paz')
    })
    await llegar(1, FALLO)
    expect(result.current.revisiones).toHaveLength(20)
    expect(result.current.desde).toBeNull()
    expect(result.current.error).not.toBeNull()
    expect(result.current.fallido).toMatchObject({ clase: 'salto', dia: '2026-10-13' })
    expect(result.current.ocupado).toBe(false)
    act(() => {
      result.current.reintentar()
    })
    expect(pedidos[2]).toMatchObject({ antes: null, hasta: BORDE })
    await llegar(2, pagina(8, 3, null))
    expect(result.current.desde).toBe('2026-10-13')
    expect(result.current.error).toBeNull()
    expect(result.current.fallido).toBeNull()
  })

  it('H5b · si volver falla, deja lo leído y su desde, y «reintentar» vuelve a pedir volver', async () => {
    const { result } = await abrirCon(pagina(30, 20, 11))
    act(() => {
      result.current.irAUnaFecha('2026-10-13', 'America/La_Paz')
    })
    await llegar(1, pagina(8, 3, null))
    act(() => {
      result.current.volverALasMasRecientes()
    })
    await llegar(2, FALLO)
    expect(result.current.desde).toBe('2026-10-13')
    expect(result.current.fallido).toEqual({ clase: 'volver' })
    act(() => {
      result.current.reintentar()
    })
    expect(pedidos[3]).toMatchObject({ antes: null, hasta: null })
  })
})
