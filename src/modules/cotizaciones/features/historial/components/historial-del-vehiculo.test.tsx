import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import { codificarCursor, type Pagina } from '@/shared/lib/paginacion'
import type { CotizacionDelHistorial } from '../../../entities/historial-del-vehiculo'
import { HistorialDelVehiculo } from './historial-del-vehiculo'

type Respuesta = Resultado<Pagina<CotizacionDelHistorial>>
type Pedido = {
  vehiculoId: string
  cursor: { instante: string } | null
  resolver: (r: Respuesta) => void
}
const pedidos: Pedido[] = []
vi.mock('../../../composicion-historial.client', () => ({
  leerHistorialDelVehiculo: (pedido: { vehiculoId: string; cursor: { instante: string } | null }) =>
    new Promise<Respuesta>((resolver) => {
      pedidos.push({ ...pedido, resolver })
    }),
}))

const VEHICULO = '00000000-0000-4000-8000-0000000000aa'
const idDe = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const cotizacion = (
  i: number,
  clase: 'preventa' | 'final' = 'preventa',
): CotizacionDelHistorial => ({
  id: idDe(i),
  numero: 100 - i,
  clase,
  creadoEn: '2026-10-29T08:00:00+00:00',
  autor: 'Gala Guarda',
})
const cursorDe = (i: number) =>
  codificarCursor({ instante: '2026-10-29T08:00:00+00:00', id: idDe(i), sentido: 'siguiente' })
const pagina = (desde: number, cuantas: number, siguiente: string | null = null): Respuesta => ({
  ok: true,
  data: {
    filas: Array.from({ length: cuantas }, (_, i) => cotizacion(desde + i)),
    siguiente,
    anterior: null,
  },
})

beforeEach(() => {
  pedidos.length = 0
})
afterEach(cleanup)

const montar = (conteo: { n: number; hayMas: boolean } | null) =>
  render(<HistorialDelVehiculo vehiculoId={VEHICULO} conteo={conteo} />)
const abrir = () => {
  fireEvent.click(screen.getByRole('button', { name: /^Historial de cotizaciones/ }))
}
const responder = async (r: Respuesta) => {
  await waitFor(() => {
    expect(pedidos.length).toBeGreaterThan(0)
  })
  pedidos.at(-1)?.resolver(r)
}

describe('HistorialDelVehiculo: plegado y desplegado', () => {
  it('nace plegado y no lee nada hasta desplegarlo', () => {
    montar({ n: 2, hayMas: false })
    const boton = screen.getByRole('button', { name: 'Historial de cotizaciones (2)' })
    expect(boton.getAttribute('aria-expanded')).toBe('false')
    expect(pedidos).toHaveLength(0)
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('el conteo sólo pone la etiqueta: «(20+)» con más, sin «(n)» con 0 o sin conteo, y el botón siempre está', () => {
    montar({ n: 20, hayMas: true })
    expect(screen.getByRole('button', { name: 'Historial de cotizaciones (20+)' })).toBeTruthy()
    cleanup()
    montar({ n: 0, hayMas: false })
    expect(screen.getByRole('button', { name: 'Historial de cotizaciones' })).toBeTruthy()
    cleanup()
    montar(null)
    expect(screen.getByRole('button', { name: 'Historial de cotizaciones' })).toBeTruthy()
  })

  it('desplegar lee la primera página y dibuja una fila por cotización con su número, autor y clase', async () => {
    montar({ n: 2, hayMas: false })
    abrir()
    expect(pedidos).toHaveLength(1)
    expect(pedidos[0]?.vehiculoId).toBe(VEHICULO)
    expect(pedidos[0]?.cursor).toBeNull()
    expect(screen.getByLabelText('Cargando el historial')).toBeTruthy()
    await responder({
      ok: true,
      data: { filas: [cotizacion(1, 'final'), cotizacion(2)], siguiente: null, anterior: null },
    })
    const lista = await screen.findByRole('list', { name: 'Historial de cotizaciones' })
    const filas = lista.querySelectorAll('li')
    expect(filas).toHaveLength(2)
    expect(filas[0]?.textContent).toContain('N.º 99')
    expect(filas[0]?.textContent).toContain('Gala Guarda')
    expect(filas[0]?.textContent).toContain('Final')
    expect(filas[1]?.textContent).toContain('Preventa')
    expect(screen.queryByRole('button', { name: 'Ver más' })).toBeNull()
  })

  it('con n = 0 el botón está, y si la lectura vuelve vacía dice que no hay cotizaciones que puedas ver', async () => {
    montar({ n: 0, hayMas: false })
    abrir()
    await responder(pagina(1, 0))
    expect(await screen.findByText('Sin cotizaciones que puedas ver.')).toBeTruthy()
  })

  it('plegar y volver a desplegar no vuelve a leer', async () => {
    montar({ n: 1, hayMas: false })
    abrir()
    await responder(pagina(1, 1))
    await screen.findByRole('list')
    abrir()
    expect(screen.queryByRole('list')).toBeNull()
    abrir()
    expect(screen.getByRole('list')).toBeTruthy()
    expect(pedidos).toHaveLength(1)
  })
})

describe('HistorialDelVehiculo: «Ver más», el tope y los errores', () => {
  it('«Ver más» pasa el cursor de la última fila y agrega abajo', async () => {
    montar({ n: 20, hayMas: true })
    abrir()
    await responder(pagina(1, 20, cursorDe(20)))
    await screen.findByRole('list')
    fireEvent.click(screen.getByRole('button', { name: 'Ver más' }))
    expect(pedidos).toHaveLength(2)
    expect(pedidos[1]?.cursor?.instante).toBe('2026-10-29T08:00:00+00:00')
    expect(screen.getByRole('button', { name: 'Cargando…' }).hasAttribute('disabled')).toBe(true)
    await responder(pagina(21, 2))
    await waitFor(() => {
      expect(screen.getByRole('list').querySelectorAll('li')).toHaveLength(22)
    })
    expect(screen.queryByRole('button', { name: 'Ver más' })).toBeNull()
  })

  it('en el tope de lo cargado, en lugar de «Ver más» dice cuántas se muestran', async () => {
    montar({ n: 20, hayMas: true })
    abrir()
    await responder(pagina(1, 20, cursorDe(20)))
    for (let ronda = 1; ronda < 25; ronda += 1) {
      await screen.findByRole('button', { name: 'Ver más' })
      fireEvent.click(screen.getByRole('button', { name: 'Ver más' }))
      await responder(pagina(1 + ronda * 20, 20, cursorDe(20 + ronda * 20)))
      await waitFor(() => {
        expect(screen.getByRole('list').querySelectorAll('li')).toHaveLength(20 * (ronda + 1))
      })
      if (screen.queryByRole('button', { name: 'Ver más' }) === null) {
        break
      }
    }
    expect(screen.getByText('Mostrando las 500 más recientes.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ver más' })).toBeNull()
  })

  it('un error en la primera página ofrece «Reintentar», que vuelve a leer', async () => {
    montar({ n: 1, hayMas: false })
    abrir()
    await responder({ ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    expect(await screen.findByText('No se pudo cargar el historial.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(pedidos).toHaveLength(2)
    await responder(pagina(1, 1))
    expect(await screen.findByRole('list')).toBeTruthy()
  })

  it('un error en «Ver más» deja lo leído y ofrece «Reintentar»', async () => {
    montar({ n: 20, hayMas: true })
    abrir()
    await responder(pagina(1, 20, cursorDe(20)))
    await screen.findByRole('list')
    fireEvent.click(screen.getByRole('button', { name: 'Ver más' }))
    await responder({ ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    expect(await screen.findByText('No se pudieron cargar más.')).toBeTruthy()
    expect(screen.getByRole('list').querySelectorAll('li')).toHaveLength(20)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(pedidos).toHaveLength(3)
    expect(pedidos[2]?.cursor).not.toBeNull()
  })

  it('una respuesta que llega después de desmontar no se dibuja ni falla', async () => {
    const { unmount } = montar({ n: 1, hayMas: false })
    abrir()
    unmount()
    pedidos[0]?.resolver(pagina(1, 1))
    await Promise.resolve()
    expect(screen.queryByRole('list')).toBeNull()
  })
})
