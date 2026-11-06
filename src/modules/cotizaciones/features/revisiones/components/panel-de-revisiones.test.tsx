import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { PaginaDeRevisiones } from '../../../entities/revisiones'

type Respuesta = Resultado<PaginaDeRevisiones>
type Pedido = { antes: number | null; hasta: string | null; resolver: (r: Respuesta) => void }
const pedidos: Pedido[] = []
vi.mock('../../../composicion-revisiones.client', () => ({
  leerRevisiones: (pedido: { antes: number | null; hasta: string | null }) =>
    new Promise<Respuesta>((resolver) => {
      pedidos.push({ ...pedido, resolver })
    }),
}))

import { PanelDeRevisiones } from './panel-de-revisiones'

const COTIZACION = '00000000-0000-4000-8000-0000000000aa'
const USUARIO = '00000000-0000-4000-8000-0000000000bb'
const revision = (id: number, diff: Record<string, unknown> = {}) => ({
  id,
  usuarioId: USUARIO,
  creadoEn: '2026-11-04T10:00:00+00:00',
  autor: 'Ana Pérez',
  diff,
})
const pagina = (
  revisiones: ReturnType<typeof revision>[],
  siguiente: number | null = null,
): Respuesta => ({
  ok: true,
  data: {
    revisiones,
    siguiente,
    etiquetas: { nodos: new Map([['pub', 'Precio publicado']]), grupos: new Map() },
  },
})

beforeEach(() => {
  pedidos.length = 0
})
afterEach(cleanup)

const montar = () =>
  render(
    <PanelDeRevisiones
      abierto
      alCerrar={vi.fn()}
      cotizacionId={COTIZACION}
      numero={123}
      version="v1"
      botonDeRevisiones={{ current: null }}
    />,
  )
const responder = async (r: Respuesta) => {
  await waitFor(() => {
    expect(pedidos.length).toBeGreaterThan(0)
  })
  pedidos.at(-1)?.resolver(r)
}

describe('PanelDeRevisiones', () => {
  it('lleva el número en el título y lee la primera página al abrir', async () => {
    montar()
    expect(screen.getByRole('dialog', { name: 'Revisiones de la cotización n.º 123' })).toBeTruthy()
    await responder(pagina([revision(2)]))
    await screen.findByText(/Ana Pérez/)
  })

  it('sin revisiones dice que todavía no tiene cambios guardados', async () => {
    montar()
    await responder(pagina([]))
    await screen.findByText('Todavía no tiene cambios guardados.')
  })

  it('un error de la primera página ofrece «Reintentar» y vuelve a pedir', async () => {
    montar()
    await responder({ ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    await screen.findByText('No se pudieron cargar las revisiones.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => {
      expect(pedidos).toHaveLength(2)
    })
  })

  it('«Ver más» trae la siguiente página y su error deja lo leído con «Reintentar»', async () => {
    montar()
    await responder(pagina([revision(2)], 2))
    fireEvent.click(await screen.findByRole('button', { name: 'Ver más' }))
    await responder({ ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    await screen.findByText('No se pudieron cargar más.')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(pedidos[1]?.antes).toBe(2)
  })

  it('P4 · en el tope dice «Mostrando las 500 más recientes.» con el camino y no ofrece «Ver más»', async () => {
    montar()
    const filas = Array.from({ length: 500 }, (_, i) => revision(1000 - i))
    await responder(pagina(filas, 500))
    const aviso = await screen.findByText(
      'Mostrando las 500 más recientes. Para ver anteriores, ve a una fecha.',
    )
    expect(aviso.getAttribute('role')).toBe('status')
    expect(screen.queryByText('Ver más')).toBeNull()
  })

  it('cada revisión dice qué cambió y el total con <Monto>', async () => {
    montar()
    await responder(
      pagina([
        revision(2, {
          valores: { de: { pub: 1 }, a: { pub: 2 } },
          totales: { de: { usd: 105 }, a: { usd: 110 } },
        }),
        revision(1, { total_base: { de: 1, a: 2 } }),
      ]),
    )
    await screen.findByText('Cambió «Precio publicado»')
    const total = screen.getByText(/^Total:/)
    expect(total.querySelectorAll('[data-monto]')).toHaveLength(2)
    expect(screen.getByText('Sin cambios que puedas ver.')).toBeTruthy()
  })

  it('dos nodos con la misma etiqueta no repiten la clave de la fila', async () => {
    const aviso = vi.spyOn(console, 'error').mockImplementation(() => {})
    montar()
    await responder({
      ok: true,
      data: {
        revisiones: [revision(2, { valores: { de: { a: 1, b: 1 }, a: { a: 2, b: 2 } } })],
        siguiente: null,
        etiquetas: {
          nodos: new Map([
            ['a', 'Igual'],
            ['b', 'Igual'],
          ]),
          grupos: new Map(),
        },
      },
    })
    await screen.findAllByText('Cambió «Igual»')
    expect(aviso.mock.calls.some(([m]) => String(m).includes('same key'))).toBe(false)
    aviso.mockRestore()
  })
})

const irA = (dia: string) => {
  fireEvent.change(screen.getByLabelText('Ir a una fecha'), { target: { value: dia } })
  fireEvent.click(screen.getByRole('button', { name: 'Ir' }))
}
const ESPERA = { timeout: 3000 }

describe('PanelDeRevisiones: «Ir a una fecha»', () => {
  it('P1 · «Ir a una fecha» sale con más por leer; el salto lleva hasta y «Volver a las más recientes» lo quita', async () => {
    montar()
    await responder(pagina([revision(30)], 30))
    await screen.findByText('Ver más')
    irA('2026-10-13')
    await waitFor(() => {
      expect(pedidos).toHaveLength(2)
    })
    expect(pedidos[1]).toMatchObject({ antes: null, hasta: '2026-10-14T04:00:00.000Z' })
    await responder(pagina([revision(8)], null))
    await screen.findByText('Desde el 13 oct 2026', undefined, ESPERA)
    fireEvent.click(screen.getByRole('button', { name: 'Volver a las más recientes' }))
    await waitFor(() => {
      expect(pedidos).toHaveLength(3)
    })
    expect(pedidos[2]).toMatchObject({ antes: null, hasta: null })
    await responder(pagina([revision(30)], 30))
    await waitFor(() => {
      expect(screen.queryByText(/^Desde el/)).toBeNull()
    })
  })

  it('P2 · sin más por leer y desde la más nueva no hay «Ir a una fecha»', async () => {
    montar()
    await responder(pagina([revision(2)], null))
    await screen.findByText(/Ana Pérez/)
    expect(screen.queryByLabelText('Ir a una fecha')).toBeNull()
  })

  it('P3 · un salto sin ninguna antes dice que no hay revisiones hasta esa fecha', async () => {
    montar()
    await responder(pagina([revision(30)], 30))
    await screen.findByText('Ver más')
    irA('2026-10-13')
    await waitFor(() => {
      expect(pedidos).toHaveLength(2)
    })
    await responder(pagina([], null))
    await screen.findByText('No hay revisiones hasta esa fecha.', undefined, ESPERA)
    expect(screen.queryByText('Todavía no tiene cambios guardados.')).toBeNull()
    expect(screen.getByLabelText('Ir a una fecha')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Volver a las más recientes' })).toBeTruthy()
  })
})

describe('PanelDeRevisiones: el tope, el error y lo ocupado de un salto', () => {
  it('P5 · un salto que trae 500 con cursor dice «Mostrando 500 desde el …» sin «Ver más»', async () => {
    montar()
    await responder(pagina([revision(2000)], 2000))
    await screen.findByText('Ver más')
    irA('2026-10-13')
    await waitFor(() => {
      expect(pedidos).toHaveLength(2)
    })
    const filas = Array.from({ length: 500 }, (_, i) => revision(1000 - i))
    await responder(pagina(filas, 500))
    await screen.findByText(
      'Mostrando 500 desde el 13 oct 2026. Para ver anteriores, ve a una fecha.',
      undefined,
      ESPERA,
    )
    expect(screen.queryByText('Ver más')).toBeNull()
  })

  it('P6 · si el salto falla, lo leído sigue, el error dice el día y «Reintentar» repite el salto', async () => {
    montar()
    await responder(pagina([revision(30)], 30))
    await screen.findByText('Ver más')
    irA('2026-10-13')
    await waitFor(() => {
      expect(pedidos).toHaveLength(2)
    })
    await responder({ ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    await screen.findByText('No se pudieron cargar las revisiones hasta el 13 oct 2026.')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => {
      expect(pedidos).toHaveLength(3)
    })
    expect(pedidos[2]).toMatchObject({ antes: null, hasta: '2026-10-14T04:00:00.000Z' })
  })

  it('P7 · con un salto en vuelo «Ver más» sigue diciendo «Ver más» y está apagado; al llegar se enciende', async () => {
    montar()
    await responder(pagina([revision(30)], 30))
    await screen.findByText('Ver más')
    irA('2026-10-13')
    await waitFor(() => {
      expect(pedidos).toHaveLength(2)
    })
    const boton = screen.getByText('Ver más').closest('button')
    expect(boton?.disabled).toBe(true)
    expect(screen.queryByText('Cargando…')).toBeNull()
    await responder(pagina([revision(8)], 8))
    await waitFor(() => {
      expect(screen.getByText('Ver más').closest('button')?.disabled).toBe(false)
    }, ESPERA)
  })

  it('P7b · con el error de «Ver más» y un salto en vuelo, «Reintentar» está apagado', async () => {
    montar()
    await responder(pagina([revision(30)], 30))
    fireEvent.click(await screen.findByRole('button', { name: 'Ver más' }))
    await responder({ ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    await screen.findByText('No se pudieron cargar más.')
    irA('2026-10-13')
    await waitFor(() => {
      expect(pedidos).toHaveLength(3)
    })
    const reintentar = screen.getByRole('button', { name: 'Reintentar' }) as HTMLButtonElement
    expect(reintentar.disabled).toBe(true)
    await responder(pagina([revision(8)], 8))
    await waitFor(() => {
      expect(screen.queryByText('No se pudieron cargar más.')).toBeNull()
    }, ESPERA)
  })
})
