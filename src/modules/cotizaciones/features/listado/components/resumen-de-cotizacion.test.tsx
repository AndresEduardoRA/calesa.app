import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type * as ReactTipos from 'react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CotizacionDelListado } from '../../../entities/filas-del-listado'
import type { LecturaDelServidor } from '../../../entities/resumen-del-listado'

const refresh = vi.fn()
// Un pedido que no termina: `useTransition` queda pendiente mientras `enCamino` sea true (el `refresh` de verdad devuelve el control y el pedido sigue).
const estado = { enCamino: false }
vi.mock('react', async (importar) => {
  const react = await importar<typeof ReactTipos>()
  return {
    ...react,
    useTransition: () => {
      const [pendiente, empezar] = react.useTransition()
      return [pendiente || estado.enCamino, empezar] as const
    },
  }
})
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh }),
  usePathname: () => '/cotizaciones',
  useSearchParams: () => new URLSearchParams(),
}))

import { ResumenDeCotizacion } from './resumen-de-cotizacion'

afterEach(() => {
  cleanup()
  estado.enCamino = false
  refresh.mockClear()
})

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const ORIGEN = '00000000-0000-4000-8000-0000000000aa'
const origenes = [{ id: ORIGEN, nombre: 'Subastas' }]

const cotizacion = (extra: Partial<CotizacionDelListado> = {}): CotizacionDelListado => ({
  id: ID,
  numero: 1234,
  origenId: ORIGEN,
  leadId: null,
  vehiculoId: null,
  creadoPor: '00000000-0000-4000-8000-0000000000bb',
  clase: 'preventa',
  estado: 'activa',
  titulo: 'Título de prueba',
  totalBase: 100,
  monedaMostrar: null,
  creadoEn: '2026-03-01T12:00:00.123456+00:00',
  venceEl: '2026-04-01',
  vencida: false,
  cliente: null,
  vehiculo: null,
  autor: 'Ana',
  ...extra,
})

function dibujar(opciones: {
  busqueda: string
  filas?: CotizacionDelListado[]
  delServidor?: LecturaDelServidor | null
}) {
  return render(
    <NuqsTestingAdapter searchParams={opciones.busqueda} hasMemory>
      <ResumenDeCotizacion
        filas={opciones.filas ?? []}
        origenes={origenes}
        delServidor={opciones.delServidor ?? null}
      />
    </NuqsTestingAdapter>,
  )
}

describe('ResumenDeCotizacion', () => {
  it('con la fila en la página: título con el número, origen, «—» sin cliente y «Abrir cotización» a su página', () => {
    dibujar({ busqueda: `?cotizacion=${ID}`, filas: [cotizacion()] })
    expect(screen.getByRole('dialog', { name: 'Cotización n.º 1234' })).toBeTruthy()
    expect(screen.getByText('Subastas')).toBeTruthy()
    expect(screen.getByText('Título de prueba')).toBeTruthy()
    expect(screen.getByText('Cliente').nextElementSibling?.textContent).toBe('—')
    expect(screen.getByText('Vehículo').nextElementSibling?.textContent).toBe('—')
    expect(screen.getByRole('link', { name: 'Abrir cotización' }).getAttribute('href')).toBe(
      `/cotizaciones/${ID}`,
    )
    expect(refresh).not.toHaveBeenCalled()
  })

  it('con el cliente y el vehículo leídos, los dibuja; vencida lo dice', () => {
    dibujar({
      busqueda: `?cotizacion=${ID}`,
      filas: [cotizacion({ cliente: 'Gala Guarda', vehiculo: 'Hilux', vencida: true })],
    })
    expect(screen.getByText('Gala Guarda')).toBeTruthy()
    expect(screen.getByText('Hilux')).toBeTruthy()
    expect(screen.getByText('Vencida')).toBeTruthy()
  })

  it('la que leyó el servidor se dibuja igual que una de la página, sin pedir nada', () => {
    dibujar({
      busqueda: `?cotizacion=${ID.toUpperCase()}`,
      delServidor: { id: ID, estado: 'listo', cotizacion: cotizacion({ numero: 77 }) },
    })
    expect(screen.getByRole('dialog', { name: 'Cotización n.º 77' })).toBeTruthy()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('no disponible dice el texto de UX con role="status" y no ofrece abrirla', () => {
    dibujar({ busqueda: `?cotizacion=${ID}`, delServidor: { id: ID, estado: 'no_disponible' } })
    expect(screen.getByRole('dialog', { name: 'Cotización no disponible' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe(
      'Esta cotización ya no está disponible: no existe o ya no tienes acceso.',
    )
    expect(screen.queryByRole('link', { name: 'Abrir cotización' })).toBeNull()
  })

  it('un id que no es guid dice «no disponible» sin pedir nada', () => {
    dibujar({ busqueda: '?cotizacion=abc' })
    expect(screen.getByRole('status')).toBeTruthy()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('cargando: si no está en la página ni la leyó el servidor, esqueleto con aria-busy mientras el pedido está en camino y se pide una vez', () => {
    estado.enCamino = true
    dibujar({ busqueda: `?cotizacion=${ID}` })
    expect(screen.getByLabelText('Cargando la cotización').getAttribute('aria-busy')).toBe('true')
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('«Reintentar» en camino vuelve al esqueleto, no al error', () => {
    dibujar({ busqueda: `?cotizacion=${ID}`, delServidor: { id: ID, estado: 'error' } })
    estado.enCamino = true
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(screen.getByLabelText('Cargando la cotización')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('el error de lo que leyó el servidor ofrece «Reintentar», que pide la página otra vez', () => {
    dibujar({ busqueda: `?cotizacion=${ID}`, delServidor: { id: ID, estado: 'error' } })
    expect(screen.getByRole('alert').textContent).toContain('No se pudo cargar la cotización.')
    expect(refresh).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('pedido ya y sin lectura de ese id, el esqueleto no se queda para siempre: dice error con «Reintentar»', () => {
    // El mock de `refresh` termina al instante y la página no trae nada: la vista pasa de «cargando» a «error».
    dibujar({ busqueda: `?cotizacion=${ID}` })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
  })

  it('sin la clave, cerrado: no hay diálogo', () => {
    dibujar({ busqueda: '', filas: [cotizacion()] })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
