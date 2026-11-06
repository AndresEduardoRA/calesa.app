import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PaginaConAutores } from '../../../entities/formula/versiones'
import { ListaDeVersiones } from './lista-de-versiones'

const pedidos: unknown[] = []
// Lo que responde «Ver más»: por defecto, nunca (la prueba mira el «Cargando…»).
let respuesta: () => Promise<unknown> = () => new Promise(() => undefined)
vi.mock('../../../areas/formula/composicion.client', () => ({
  leerPaginaDeVersiones: (pedido: unknown) => {
    pedidos.push(pedido)
    return respuesta()
  },
}))

afterEach(cleanup)

const ORIGEN = '00000000-0000-4000-8000-0000000000aa'
const fila = (version: number, estado: 'publicada' | 'archivada', nota: string | null) => ({
  id: `00000000-0000-4000-8000-${String(version).padStart(12, '0')}`,
  version,
  estado,
  nota,
  publicadoPor: null,
  publicadoEn: '2026-11-06T10:00:00+00:00',
  autor: 'Ana Pérez',
})

describe('ListaDeVersiones', () => {
  it('«Publicada» sólo en la vigente, la nota o «Sin nota.» y quién la publicó', () => {
    const inicial: PaginaConAutores = {
      filas: [fila(2, 'publicada', 'Flete nuevo'), fila(1, 'archivada', null)],
      siguiente: null,
    }
    render(<ListaDeVersiones origenId={ORIGEN} inicial={inicial} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]?.textContent).toContain('Versión 2')
    expect(items[0]?.textContent).toContain('Publicada')
    expect(items[0]?.textContent).toContain('Flete nuevo')
    expect(items[1]?.textContent).not.toContain('Publicada')
    expect(items[1]?.textContent).toContain('Sin nota.')
    expect(items[1]?.textContent).toContain('Ana Pérez')
    expect(screen.queryByRole('button', { name: 'Ver más' })).toBeNull()
  })

  it('sin versiones, lo dice', () => {
    render(<ListaDeVersiones origenId={ORIGEN} inicial={{ filas: [], siguiente: null }} />)
    expect(screen.getByText('Todavía no hay versiones.')).toBeTruthy()
  })

  it('«Ver más» se apaga mientras lee', () => {
    render(
      <ListaDeVersiones
        origenId={ORIGEN}
        inicial={{ filas: [fila(30, 'publicada', null)], siguiente: 30 }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Ver más' }))
    const boton = screen.getByRole('button', { name: 'Cargando…' })
    expect(boton.hasAttribute('disabled')).toBe(true)
    expect(pedidos).toEqual([{ origenId: ORIGEN, cursor: 30 }])
  })
})

describe('ListaDeVersiones › «Revertir»', () => {
  const inicial: PaginaConAutores = {
    filas: [fila(3, 'publicada', null), fila(2, 'archivada', null), fila(1, 'archivada', null)],
    siguiente: null,
  }

  it('en cada archivada, no en la publicada; entrega su fila', () => {
    const alRevertir = vi.fn()
    render(
      <ListaDeVersiones origenId={ORIGEN} inicial={inicial} conPublicada alRevertir={alRevertir} />,
    )
    const items = screen.getAllByRole('listitem')
    expect(within(items[0] as HTMLElement).queryByRole('button')).toBeNull()
    expect(screen.getAllByRole('button', { name: /^Revertir a la versión/ })).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Revertir a la versión 1' }))
    expect(alRevertir).toHaveBeenCalledWith({ id: fila(1, 'archivada', null).id, version: 1 })
  })

  it('sin publicada, o sin quien abra, ninguno', () => {
    render(
      <ListaDeVersiones
        origenId={ORIGEN}
        inicial={inicial}
        conPublicada={false}
        alRevertir={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /^Revertir/ })).toBeNull()
    cleanup()
    render(<ListaDeVersiones origenId={ORIGEN} inicial={inicial} conPublicada />)
    expect(screen.queryByRole('button', { name: /^Revertir/ })).toBeNull()
  })

  it('una fila traída por «Ver más» también se entrega al revertir', async () => {
    respuesta = () =>
      Promise.resolve({ ok: true, data: { filas: [fila(29, 'archivada', null)], siguiente: null } })
    const alRevertir = vi.fn()
    render(
      <ListaDeVersiones
        origenId={ORIGEN}
        inicial={{ filas: [fila(30, 'publicada', null)], siguiente: 30 }}
        conPublicada
        alRevertir={alRevertir}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Ver más' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Revertir a la versión 29' }))
    expect(alRevertir).toHaveBeenCalledWith({ id: fila(29, 'archivada', null).id, version: 29 })
  })
})
