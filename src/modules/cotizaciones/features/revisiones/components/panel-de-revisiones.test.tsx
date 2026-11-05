import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { PaginaDeRevisiones } from '../../../entities/revisiones'

type Respuesta = Resultado<PaginaDeRevisiones>
type Pedido = { antes: number | null; resolver: (r: Respuesta) => void }
const pedidos: Pedido[] = []
vi.mock('../../../composicion-revisiones.client', () => ({
  leerRevisiones: (pedido: { antes: number | null }) =>
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

  it('en el tope dice «Mostrando las 500 más recientes.» y no ofrece «Ver más»', async () => {
    montar()
    const filas = Array.from({ length: 500 }, (_, i) => revision(1000 - i))
    await responder(pagina(filas, 500))
    await screen.findByText('Mostrando las 500 más recientes.')
    expect(screen.queryByRole('button', { name: 'Ver más' })).toBeNull()
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
