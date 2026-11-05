import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { Pagina } from '@/shared/lib/paginacion'
import type { VehiculoDelPanel } from '../../../entities/panel-para-cotizar'
import { useListaDelPanel } from './use-lista-del-panel'

type Respuesta = Resultado<Pagina<VehiculoDelPanel>>
type Pedido = {
  lista: string
  texto?: string
  cursor: { instante: string } | null
  resolver: (r: Respuesta) => void
}
const pedidos: Pedido[] = []
vi.mock('../../../composicion.client', () => ({
  leerListaDelPanel: (pedido: {
    lista: string
    texto?: string
    cursor: { instante: string } | null
  }) =>
    new Promise<Respuesta>((resolver) => {
      pedidos.push({ lista: pedido.lista, texto: pedido.texto, cursor: pedido.cursor, resolver })
    }),
}))

afterEach(() => {
  cleanup()
  pedidos.length = 0
})

const vehiculo = (id: string): VehiculoDelPanel => ({
  id,
  numero: 1,
  titulo: id,
  anio: null,
  lote: null,
  precio: null,
  creadoEn: '2026-10-01T08:00:00Z',
  cotizadoEn: '2026-10-29T08:00:00Z',
  cierreSubastaEn: null,
  portadaRuta: null,
})
const pagina = (...ids: string[]): Respuesta => ({
  ok: true,
  data: { filas: ids.map(vehiculo), siguiente: null, anterior: null },
})
// Un cursor válido (base64url de «s|<instante>|<id>»).
const CURSOR = btoa('s|2026-10-29T08:00:00Z|00000000-0000-4000-8000-000000000001').replaceAll(
  '=',
  '',
)

function montar(url: string, esSubasta = true) {
  const cambios: UrlUpdateEvent[] = []
  const envoltura = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter searchParams={url} onUrlUpdate={(e) => cambios.push(e)} hasMemory>
      {children}
    </NuqsTestingAdapter>
  )
  const hook = renderHook(
    () => useListaDelPanel({ origenId: 'o', esSubasta, desde: '2026-10-28T08:00:00Z' }),
    { wrapper: envoltura },
  )
  return { ...hook, cambios }
}

describe('useListaDelPanel', () => {
  it('lee la lista de la URL y cambiar de pestaña borra el cursor, sin sumar al historial', async () => {
    const { result, cambios } = montar(`?panel=vehiculo&lista=ultima&cursor=${CURSOR}`)
    expect(result.current.lista).toBe('ultima')
    expect(result.current.leida.estado).toBe('cargando')
    await waitFor(() => expect(pedidos).toHaveLength(1))
    expect(pedidos[0]?.cursor?.instante).toBe('2026-10-29T08:00:00Z')
    act(() => {
      result.current.cambiarLista('cierre')
    })
    await waitFor(() => expect(cambios.at(-1)?.queryString).toBe('?panel=vehiculo&lista=cierre'))
    expect(cambios.at(-1)?.options.history).toBe('replace')
    expect(cambios.at(-1)?.options.shallow).not.toBe(false)
    await waitFor(() => expect(pedidos.at(-1)?.lista).toBe('cierre'))
    expect(pedidos.at(-1)?.cursor).toBeNull()
  })

  it('fuera de un origen de subasta, «cierre» en la URL es «Últ. cotización»', () => {
    const { result } = montar('?lista=cierre', false)
    expect(result.current.lista).toBe('ultima')
  })

  it('la respuesta de un pedido viejo se descarta', async () => {
    const { result } = montar('?lista=ultima')
    await waitFor(() => expect(pedidos).toHaveLength(1))
    act(() => {
      result.current.irA(CURSOR)
    })
    await waitFor(() => expect(pedidos).toHaveLength(2))
    await act(async () => {
      pedidos[1]?.resolver(pagina('nueva'))
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.leida.estado).toBe('lista'))
    await act(async () => {
      pedidos[0]?.resolver(pagina('vieja'))
      await Promise.resolve()
    })
    const leida = result.current.leida
    expect(leida.estado === 'lista' ? leida.pagina.filas.map((v) => v.id) : []).toEqual(['nueva'])
  })

  it('un error se puede reintentar: vuelve a pedir', async () => {
    const { result } = montar('?lista=ultima')
    await waitFor(() => expect(pedidos).toHaveLength(1))
    await act(async () => {
      pedidos[0]?.resolver({ ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.leida.estado).toBe('error'))
    act(() => {
      result.current.reintentar()
    })
    await waitFor(() => expect(pedidos).toHaveLength(2))
    expect(result.current.leida.estado).toBe('cargando')
    await act(async () => {
      pedidos[1]?.resolver(pagina('a'))
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.leida.estado).toBe('lista'))
  })
})

describe('useListaDelPanel: la búsqueda', () => {
  it('con `?buscar=Bronco` lee la búsqueda y no la pestaña; con `?buscar=Br`, la pestaña', async () => {
    const { result } = montar('?panel=vehiculo&lista=cierre&buscar=Bronco')
    expect(result.current.lista).toBe('busqueda')
    expect(result.current.pestana).toBe('cierre')
    await waitFor(() => expect(pedidos).toHaveLength(1))
    expect(pedidos[0]?.lista).toBe('busqueda')
    expect(pedidos[0]?.texto).toBe('Bronco')
    cleanup()
    pedidos.length = 0
    const corto = montar('?panel=vehiculo&lista=cierre&buscar=Br')
    expect(corto.result.current.lista).toBe('cierre')
    expect(corto.result.current.leido.aviso).toBe('Escribe al menos 3 letras o números.')
    await waitFor(() => expect(pedidos).toHaveLength(1))
    expect(pedidos[0]?.lista).toBe('cierre')
    expect(pedidos[0]?.texto).toBeUndefined()
  })

  it('cambiar el texto borra el cursor, reemplaza la entrada y escribir vacío quita `buscar`', async () => {
    const { result, cambios } = montar(`?panel=vehiculo&buscar=Bronco&cursor=${CURSOR}`)
    await waitFor(() => expect(pedidos).toHaveLength(1))
    act(() => {
      result.current.cambiarTexto('Bronc')
    })
    await waitFor(() => expect(cambios.at(-1)?.queryString).toBe('?panel=vehiculo&buscar=Bronc'))
    expect(cambios.at(-1)?.options.history).toBe('replace')
    expect(cambios.at(-1)?.options.shallow).not.toBe(false)
    await waitFor(() => expect(pedidos.at(-1)?.texto).toBe('Bronc'))
    expect(pedidos.at(-1)?.cursor).toBeNull()
    act(() => {
      result.current.cambiarTexto('')
    })
    await waitFor(() => expect(cambios.at(-1)?.queryString).toBe('?panel=vehiculo'))
  })
})
