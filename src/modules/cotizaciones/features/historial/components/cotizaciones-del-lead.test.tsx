import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import {
  codificarCursor,
  type Pagina,
  TAMANO_DE_VER_MAS,
  TOPE_DE_LO_CARGADO,
} from '@/shared/lib/paginacion'
import type { CotizacionDelHistorial } from '../../../entities/historial-del-vehiculo'
import { CotizacionesDelLead } from './cotizaciones-del-lead'

type Respuesta = Resultado<Pagina<CotizacionDelHistorial>>
type Pedido = {
  leadId: string
  cursor: { instante: string } | null
  resolver: (r: Respuesta) => void
}
const pedidos: Pedido[] = []
vi.mock('../../../composicion-historial.client', () => ({
  leerCotizacionesDelLead: (pedido: { leadId: string; cursor: { instante: string } | null }) =>
    new Promise<Respuesta>((resolver) => {
      pedidos.push({ ...pedido, resolver })
    }),
}))

const LEAD = '00000000-0000-4000-8000-0000000000bb'
const idDe = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const cotizacion = (i: number): CotizacionDelHistorial => ({
  id: idDe(i),
  numero: 1000 - i,
  clase: 'preventa',
  creadoEn: '2026-10-29T08:00:00+00:00',
  autor: 'Gala Guarda',
  aprobada: false,
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
const error: Respuesta = { ok: false, error: { codigo: 'inesperado', mensaje: 'x' } }

beforeEach(() => {
  pedidos.length = 0
})
afterEach(cleanup)

const montar = () => render(<CotizacionesDelLead leadId={LEAD} />)
// Responde al último pedido, esperando a que exista el `n`-ésimo.
const responder = async (n: number, r: Respuesta) => {
  await waitFor(() => {
    expect(pedidos.length).toBeGreaterThanOrEqual(n)
  })
  pedidos[n - 1]?.resolver(r)
}
const filas = () =>
  screen.getByRole('list', { name: 'Cotizaciones del lead' }).querySelectorAll('li')

describe('CotizacionesDelLead: se lee al montarse', () => {
  it('lee una vez, con cursor nulo y sin un clic, y dibuja las 20 en «Cotizaciones del lead»', async () => {
    montar()
    expect(pedidos).toHaveLength(1)
    expect(pedidos[0]?.leadId).toBe(LEAD)
    expect(pedidos[0]?.cursor).toBeNull()
    expect(screen.getByLabelText('Cargando el historial')).toBeTruthy()
    await responder(1, pagina(1, 20, cursorDe(20)))
    await waitFor(() => {
      expect(filas()).toHaveLength(20)
    })
    expect(filas()[0]?.textContent).toContain('N.º 999')
    expect(screen.getByRole('button', { name: 'Ver más' })).toBeTruthy()
    expect(pedidos).toHaveLength(1)
  })

  it('dentro de StrictMode llega una sola página: 20 filas, no 40, y sin «Cargando…»', async () => {
    render(
      <StrictMode>
        <CotizacionesDelLead leadId={LEAD} />
      </StrictMode>,
    )
    // El doble montaje pide dos veces; sólo cuenta la última respuesta.
    await waitFor(() => {
      expect(pedidos.length).toBeGreaterThanOrEqual(1)
    })
    for (const [i, pedido] of pedidos.entries()) {
      pedido.resolver(pagina(1, 20, cursorDe(20)))
      expect(i).toBeLessThan(3)
    }
    await waitFor(() => {
      expect(filas()).toHaveLength(20)
    })
    expect(screen.queryByLabelText('Cargando el historial')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cargando…' })).toBeNull()
  })

  it('la respuesta vacía dice que no hay cotizaciones que puedas ver', async () => {
    montar()
    await responder(1, pagina(1, 0))
    expect(await screen.findByText('Sin cotizaciones que puedas ver.')).toBeTruthy()
  })

  it('el error de la primera página ofrece «Reintentar», que vuelve a leer', async () => {
    montar()
    await responder(1, error)
    expect(await screen.findByText('No se pudo cargar el historial.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(pedidos).toHaveLength(2)
    await responder(2, pagina(1, 1))
    expect(await screen.findByRole('list', { name: 'Cotizaciones del lead' })).toBeTruthy()
  })
})

describe('CotizacionesDelLead: «Ver más» y el tope', () => {
  it('«Ver más» pasa el cursor de la última fila y agrega abajo', async () => {
    montar()
    await responder(1, pagina(1, 20, cursorDe(20)))
    await screen.findByRole('button', { name: 'Ver más' })
    fireEvent.click(screen.getByRole('button', { name: 'Ver más' }))
    expect(pedidos).toHaveLength(2)
    expect(pedidos[1]?.cursor?.instante).toBe('2026-10-29T08:00:00+00:00')
    expect(screen.getByRole('button', { name: 'Cargando…' }).hasAttribute('disabled')).toBe(true)
    await responder(2, pagina(21, 2))
    await waitFor(() => {
      expect(filas()).toHaveLength(22)
    })
    expect(screen.queryByRole('button', { name: 'Ver más' })).toBeNull()
  })

  it('un error en «Ver más» deja lo leído y ofrece «Reintentar»', async () => {
    montar()
    await responder(1, pagina(1, 20, cursorDe(20)))
    await screen.findByRole('button', { name: 'Ver más' })
    fireEvent.click(screen.getByRole('button', { name: 'Ver más' }))
    await responder(2, error)
    expect(await screen.findByText('No se pudieron cargar más.')).toBeTruthy()
    expect(filas()).toHaveLength(20)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(pedidos).toHaveLength(3)
    expect(pedidos[2]?.cursor).not.toBeNull()
  })

  it('con 500 cargadas y más por leer: sin «Ver más», con el aviso y el camino al listado', async () => {
    montar()
    // Al tope con dos respuestas y consultas por texto, no por rol: sobre 500 filas cada una cuesta cientos de ms, y el tope sale del largo de lo cargado, no de las rondas.
    const primera = TOPE_DE_LO_CARGADO - TAMANO_DE_VER_MAS
    await responder(1, pagina(1, primera, cursorDe(primera)))
    await screen.findByText('Ver más')
    expect(screen.queryByText('Ver todas en Cotizaciones')).toBeNull()
    fireEvent.click(screen.getByText('Ver más'))
    await responder(2, pagina(primera + 1, TAMANO_DE_VER_MAS, cursorDe(TOPE_DE_LO_CARGADO)))
    expect(await screen.findByText('Mostrando las 500 más recientes.')).toBeTruthy()
    expect(pedidos).toHaveLength(2)
    expect(screen.queryByText('Ver más')).toBeNull()
    expect(screen.getByText('Ver todas en Cotizaciones').closest('a')?.getAttribute('href')).toBe(
      `/cotizaciones?lead=${LEAD}`,
    )
  })

  it('cada fila es un enlace a su cotización, con la clase fuera del enlace', async () => {
    montar()
    await responder(1, pagina(1, 2))
    await waitFor(() => {
      expect(filas()).toHaveLength(2)
    })
    const enlaces = screen.getByRole('list').querySelectorAll('li a')
    expect(enlaces[0]?.getAttribute('href')).toBe(`/cotizaciones/${idDe(1)}`)
    expect(enlaces[0]?.textContent).toMatch(/^N\.º 999 · .* · Gala Guarda$/)
    expect(filas()[0]?.textContent).toContain('Preventa')
    expect(enlaces[0]?.textContent).not.toContain('Preventa')
  })
})
