import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { Pagina } from '@/shared/lib/paginacion'
import type { CatalogosDeLead } from '../../../entities/catalogos'
import type { ClienteDelPanel } from '../../../entities/panel-para-cotizar'
import { useClientesDelPanel } from './use-clientes-del-panel'

type Respuesta = Resultado<Pagina<ClienteDelPanel>>
type Pedido = {
  lista: string
  tiposDeLaClase: string[]
  todos: boolean
  texto?: string
  cursor: { instante: string } | null
  resolver: (r: Respuesta) => void
}
const pedidos: Pedido[] = []
const catalogos: { resolver: (r: Resultado<CatalogosDeLead>) => void }[] = []
vi.mock('../../../composicion.client', () => ({
  leerClientesDelPanel: (pedido: {
    lista: string
    tiposDeLaClase: string[]
    todos: boolean
    busqueda: { texto: string } | null
    cursor: { instante: string } | null
  }) =>
    new Promise<Respuesta>((resolver) => {
      pedidos.push({
        lista: pedido.lista,
        tiposDeLaClase: pedido.tiposDeLaClase,
        todos: pedido.todos,
        texto: pedido.busqueda?.texto,
        cursor: pedido.cursor,
        resolver,
      })
    }),
  leerCatalogoDelPanel: () =>
    new Promise<Resultado<CatalogosDeLead>>((resolver) => {
      catalogos.push({ resolver })
    }),
}))

afterEach(() => {
  cleanup()
  pedidos.length = 0
  catalogos.length = 0
})

const cliente = (id: string): ClienteDelPanel => ({
  id,
  nombre: id,
  tipoId: 't1',
  numeros: { numero: 1, numeroPropio: null, creadorDelPropio: null },
  recienteEn: '2026-10-29T08:00:00Z',
  creadoEn: null,
})
const pagina = (...ids: string[]): Respuesta => ({
  ok: true,
  data: { filas: ids.map(cliente), siguiente: null, anterior: null },
})
const CATALOGO: Resultado<CatalogosDeLead> = {
  ok: true,
  data: {
    origenes: [],
    tipos: [
      { id: 't1', clave: 'p', nombre: 'Prospecto', clase: 'prospecto', activo: true },
      { id: 't2', clave: 'c', nombre: 'Cliente', clase: 'cliente', activo: true },
      { id: 't3', clave: 'c2', nombre: 'Antiguo', clase: 'cliente', activo: false },
    ],
    tiposDeSeguimiento: [],
  },
}
const CURSOR = btoa('s|2026-10-29T08:00:00Z|00000000-0000-4000-8000-000000000001').replaceAll(
  '=',
  '',
)

function montar(url: string) {
  const cambios: UrlUpdateEvent[] = []
  const envoltura = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter searchParams={url} onUrlUpdate={(e) => cambios.push(e)} hasMemory>
      {children}
    </NuqsTestingAdapter>
  )
  const hook = renderHook(() => useClientesDelPanel({ numeroGlobal: true }), { wrapper: envoltura })
  return { ...hook, cambios }
}

async function resolver(que: () => void) {
  await act(async () => {
    que()
    await Promise.resolve()
  })
}

describe('useClientesDelPanel', () => {
  it('abre en «Todos»: pide la primera página y el catálogo a la vez, y muestra la lista cuando llegan los dos', async () => {
    const { result } = montar('?panel=cliente')
    expect(result.current.lista).toBe('todos')
    expect(result.current.leida.estado).toBe('cargando')
    await waitFor(() => expect(pedidos).toHaveLength(1))
    expect(catalogos).toHaveLength(1)
    expect(pedidos[0]?.lista).toBe('todos')
    expect(pedidos[0]?.todos).toBe(true)
    await resolver(() => pedidos[0]?.resolver(pagina('a')))
    expect(result.current.leida.estado).toBe('cargando')
    await resolver(() => catalogos[0]?.resolver(CATALOGO))
    await waitFor(() => expect(result.current.leida.estado).toBe('lista'))
  })

  it('la pestaña de una clase espera el catálogo y pide los tipos de esa clase, también los apagados', async () => {
    const { result } = montar('?panel=cliente&clase=cliente')
    expect(result.current.lista).toBe('cliente')
    await waitFor(() => expect(catalogos).toHaveLength(1))
    expect(pedidos).toHaveLength(0)
    await resolver(() => catalogos[0]?.resolver(CATALOGO))
    await waitFor(() => expect(pedidos).toHaveLength(1))
    expect(pedidos[0]?.lista).toBe('cliente')
    expect(pedidos[0]?.tiposDeLaClase).toEqual(['t2', 't3'])
  })

  it('cambiar de pestaña o de página reemplaza la entrada y no va al servidor; borra el cursor', async () => {
    const { result, cambios } = montar(`?panel=cliente&cursor=${CURSOR}`)
    await waitFor(() => expect(pedidos).toHaveLength(1))
    expect(pedidos[0]?.cursor?.instante).toBe('2026-10-29T08:00:00Z')
    await resolver(() => catalogos[0]?.resolver(CATALOGO))
    act(() => {
      result.current.cambiarPestana('prospecto')
    })
    await waitFor(() => expect(cambios.at(-1)?.queryString).toBe('?panel=cliente&clase=prospecto'))
    expect(cambios.at(-1)?.options.history).toBe('replace')
    expect(cambios.at(-1)?.options.shallow).not.toBe(false)
    await waitFor(() => expect(pedidos.at(-1)?.lista).toBe('prospecto'))
    expect(pedidos.at(-1)?.cursor).toBeNull()
    act(() => {
      result.current.irA(CURSOR)
    })
    await waitFor(() => expect(cambios.at(-1)?.queryString).toContain('cursor='))
    expect(cambios.at(-1)?.options.history).toBe('replace')
  })

  it('la respuesta de un pedido viejo no se muestra', async () => {
    const { result } = montar('?panel=cliente')
    await waitFor(() => expect(pedidos).toHaveLength(1))
    await resolver(() => catalogos[0]?.resolver(CATALOGO))
    act(() => {
      result.current.irA(CURSOR)
    })
    await waitFor(() => expect(pedidos).toHaveLength(2))
    await resolver(() => pedidos[1]?.resolver(pagina('nueva')))
    await waitFor(() => expect(result.current.leida.estado).toBe('lista'))
    await resolver(() => pedidos[0]?.resolver(pagina('vieja')))
    const leida = result.current.leida
    expect(leida.estado === 'lista' ? leida.pagina.filas.map((c) => c.id) : []).toEqual(['nueva'])
  })
})

describe('useClientesDelPanel: la búsqueda y los errores', () => {
  it('un texto corto no busca: sigue la pestaña y el aviso lo dice; con 3 letras manda la búsqueda y las pestañas se esconden', async () => {
    const corto = montar('?panel=cliente&clase=cliente&buscar=An')
    expect(corto.result.current.lista).toBe('cliente')
    expect(corto.result.current.leido.aviso).toBe('Escribe al menos 3 letras')
    cleanup()
    pedidos.length = 0
    catalogos.length = 0
    const { result } = montar('?panel=cliente&buscar=Ana')
    expect(result.current.lista).toBe('busqueda')
    await waitFor(() => expect(pedidos).toHaveLength(1))
    expect(pedidos[0]?.texto).toBe('Ana')
  })

  it('cambiar el texto borra el cursor, reemplaza la entrada y vacío quita `buscar`', async () => {
    const { result, cambios } = montar(`?panel=cliente&buscar=Ana&cursor=${CURSOR}`)
    await waitFor(() => expect(pedidos).toHaveLength(1))
    act(() => {
      result.current.cambiarTexto('Anab')
    })
    await waitFor(() => expect(cambios.at(-1)?.queryString).toBe('?panel=cliente&buscar=Anab'))
    expect(cambios.at(-1)?.options.history).toBe('replace')
    act(() => {
      result.current.cambiarTexto('')
    })
    await waitFor(() => expect(cambios.at(-1)?.queryString).toBe('?panel=cliente'))
  })

  it('si el catálogo no llega, toda la lista es el error, y «Reintentar» vuelve a pedir los dos', async () => {
    const { result } = montar('?panel=cliente')
    await waitFor(() => expect(pedidos).toHaveLength(1))
    await resolver(() => pedidos[0]?.resolver(pagina('a')))
    await resolver(() =>
      catalogos[0]?.resolver({ ok: false, error: { codigo: 'inesperado', mensaje: 'x' } }),
    )
    await waitFor(() => expect(result.current.leida.estado).toBe('error'))
    act(() => {
      result.current.reintentar()
    })
    await waitFor(() => expect(pedidos).toHaveLength(2))
    await waitFor(() => expect(catalogos).toHaveLength(2))
    expect(result.current.leida.estado).toBe('cargando')
  })

  it('un error de la página se puede reintentar', async () => {
    const { result } = montar('?panel=cliente')
    await waitFor(() => expect(pedidos).toHaveLength(1))
    await resolver(() => catalogos[0]?.resolver(CATALOGO))
    await resolver(() =>
      pedidos[0]?.resolver({ ok: false, error: { codigo: 'inesperado', mensaje: 'x' } }),
    )
    await waitFor(() => expect(result.current.leida.estado).toBe('error'))
    act(() => {
      result.current.reintentar()
    })
    await waitFor(() => expect(pedidos).toHaveLength(2))
    expect(result.current.leida.estado).toBe('cargando')
  })
})
