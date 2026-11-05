import { cleanup, render, screen } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OrigenResumen } from '@/modules/origenes/client'
import type { Vehiculo } from '../../../entities/vehiculo'
import { CabeceraDelResumen } from './cabecera-del-resumen'

vi.mock('server-only', () => ({}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/vehiculos',
  useSearchParams: () => new URLSearchParams(),
}))

afterEach(cleanup)

const ID = '00000000-0000-4000-8000-000000000007'
const origen: OrigenResumen = {
  id: 'o1',
  nombre: 'Subastas',
  color: '#336699',
  activo: true,
  sustantivo: 'vehículo',
  genero: 'm',
  tipo: 'subasta',
}
const vehiculo = {
  id: ID,
  numero: 7,
  origenId: 'o1',
  titulo: 'Toyota Corolla',
  vin: null,
  lote: null,
  faseId: null,
  atributos: {},
  portadaRuta: null,
  limpiezaEl: null,
  publicadoWeb: false,
} as unknown as Vehiculo

function montar(paraCotizar: { ruta: string; claveDelVehiculo: string } | null) {
  render(
    <NuqsTestingAdapter>
      <CabeceraDelResumen
        origen={origen}
        campos={[]}
        fases={[]}
        categorias={[]}
        vitrina={{
          webActiva: false,
          origenActivo: true,
          origenVisible: true,
          fasesQuePublican: [],
        }}
        limpiezaHoy={null}
        vehiculo={vehiculo}
        editable={false}
        eliminable={false}
        publicar={{ estado: 'deshabilitado', motivo: 'x' }}
        alEnviado={vi.fn()}
        paraCotizar={paraCotizar}
      />
    </NuqsTestingAdapter>,
  )
}

describe('CabeceraDelResumen: «Cotizar»', () => {
  it('con permiso para cotizar en el origen, el enlace «Cotizar» lleva a la hoja con el vehículo y va antes de «Abrir ficha»', () => {
    montar({ ruta: '/cotizaciones/nuevo?origen=o1', claveDelVehiculo: 'vehiculo' })
    const cotizar = screen.getByRole('link', { name: 'Cotizar' })
    expect(cotizar.getAttribute('href')).toBe(`/cotizaciones/nuevo?origen=o1&vehiculo=${ID}`)
    const ficha = screen.getByRole('link', { name: 'Abrir ficha' })
    expect(cotizar.compareDocumentPosition(ficha) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sin permiso para cotizar no hay «Cotizar»', () => {
    montar(null)
    expect(screen.queryByRole('link', { name: 'Cotizar' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Abrir ficha' })).toBeTruthy()
  })
})
