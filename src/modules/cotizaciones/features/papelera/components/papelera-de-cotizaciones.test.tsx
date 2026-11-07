import { cleanup, render, screen, within } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LoteDeCotizaciones } from '../../../entities/papelera/lotes'

const { busqueda } = vi.hoisted(() => ({ busqueda: { actual: '' } }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(busqueda.actual),
  usePathname: () => '/cotizaciones/papelera',
}))
vi.mock('next-safe-action/hooks', () => ({
  useAction: () => ({ executeAsync: vi.fn(), isPending: false }),
}))
vi.mock('../actions/restaurar-de-papelera', () => ({ restaurarCotizacionesDePapelera: {} }))
vi.mock('../actions/purgar-de-papelera', () => ({ purgarCotizacionesDePapelera: {} }))
vi.mock('../../../areas/papelera/composicion.client', () => ({
  leerLoteDePapeleraDeCotizaciones: vi.fn(),
}))

import { PapeleraDeCotizaciones } from './papelera-de-cotizaciones'

// La pantalla lee `?panel=purgar` con nuqs.
const dibujar = (ui: ReactElement) =>
  render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <NuqsTestingAdapter searchParams={busqueda.actual}>{children}</NuqsTestingAdapter>
    ),
  })

afterEach(() => {
  cleanup()
  busqueda.actual = ''
})

const AHORA = '2026-11-06T12:00:00.000Z'
const O = '55555555-5555-4555-8555-555555555555'

const lote = (id: string, esMio: boolean, titulos: string[]): LoteDeCotizaciones => ({
  id,
  actualizadoEn: '2026-11-06T11:00:00.000001+00:00',
  creadoEn: '2026-11-06T10:00:00.000001+00:00',
  creadoPorNombre: esMio ? 'Ana' : 'Beto',
  esMio,
  purgaEl: '2026-11-11T10:00:00.000001+00:00',
  enviados: titulos.length,
  enPapelera: titulos.length,
  cotizaciones: titulos.map((titulo, i) => ({
    id: `${id.slice(0, 30)}${String(i).padStart(6, '0')}`,
    numero: i + 1,
    titulo,
    clase: i === 0 ? ('preventa' as const) : ('final' as const),
    origenId: O,
    creadoEn: '2026-11-05T10:00:00.000001+00:00',
  })),
})

const propias = lote('11111111-1111-4111-8111-111111111111', true, ['Sedán de Ana'])
const ajena = lote('22222222-2222-4222-8222-222222222222', false, [
  'Camioneta de Beto',
  'Otra de Beto',
])

const base = {
  pagina: { filas: [], siguiente: null, anterior: null },
  puedePurgar: false,
  origenes: [{ id: O, nombre: 'Miami' }],
  ahora: AHORA,
  papeleraDeVehiculos: false,
}

const LINEA_DE_VEHICULOS =
  'Las cotizaciones que se fueron con su vehículo no están aquí: vuelven al restaurar el vehículo, en su papelera.'

describe('<PapeleraDeCotizaciones>', () => {
  it('sin lotes y sin cursor: «La papelera está vacía» y la línea de las que se fueron con su vehículo', () => {
    dibujar(<PapeleraDeCotizaciones {...base} />)
    expect(screen.getByRole('heading', { name: 'Papelera de cotizaciones' })).toBeTruthy()
    expect(screen.getByText('La papelera está vacía')).toBeTruthy()
    expect(screen.getByText(LINEA_DE_VEHICULOS)).toBeTruthy()
  })

  it('el enlace a la papelera de vehículos sólo para quien puede abrirla', () => {
    const { rerender } = dibujar(<PapeleraDeCotizaciones {...base} />)
    expect(screen.queryByRole('link', { name: 'Ir a la papelera de vehículos' })).toBeNull()
    rerender(<PapeleraDeCotizaciones {...base} papeleraDeVehiculos />)
    expect(
      screen.getByRole('link', { name: 'Ir a la papelera de vehículos' }).getAttribute('href'),
    ).toBe('/vehiculos/papelera')
  })

  it('una página sin filas con cursor no dice que la papelera está vacía', () => {
    busqueda.actual = 'cursor=abc'
    dibujar(<PapeleraDeCotizaciones {...base} />)
    expect(screen.queryByText('La papelera está vacía')).toBeNull()
  })

  it('el texto de arriba cambia con la clave de vaciar', () => {
    const { rerender } = dibujar(<PapeleraDeCotizaciones {...base} />)
    expect(
      screen.getByText('Lo que enviaste a la papelera. Puedes restaurarlo hasta que se purgue.'),
    ).toBeTruthy()
    rerender(<PapeleraDeCotizaciones {...base} puedePurgar />)
    expect(
      screen.getByText(
        'Todo lo que se envió a la papelera. Se purga solo cuando vence, o antes si lo purgas.',
      ),
    ).toBeTruthy()
  })
})

describe('<PapeleraDeCotizaciones>: restaurar y lo que dibuja cada cotización', () => {
  it('sin la clave, «Restaurar» sólo en lo suyo', () => {
    dibujar(
      <PapeleraDeCotizaciones {...base} pagina={{ ...base.pagina, filas: [propias, ajena] }} />,
    )
    const suyo = screen.getByRole('region', { name: 'Lote enviado por ti' })
    expect(within(suyo).getByRole('button', { name: 'Restaurar Sedán de Ana' })).toBeTruthy()
    const delOtro = screen.getByRole('region', { name: 'Lote enviado por Beto' })
    expect(within(delOtro).queryByRole('button', { name: /Restaurar/ })).toBeNull()
  })

  it('con la clave, «Restaurar» en todo y «Restaurar el lote» donde hay más de una', () => {
    dibujar(
      <PapeleraDeCotizaciones
        {...base}
        puedePurgar
        pagina={{ ...base.pagina, filas: [propias, ajena] }}
      />,
    )
    const delOtro = screen.getByRole('region', { name: 'Lote enviado por Beto' })
    expect(within(delOtro).getByRole('button', { name: 'Restaurar el lote' })).toBeTruthy()
    expect(
      within(delOtro).getByRole('button', { name: 'Restaurar Camioneta de Beto' }),
    ).toBeTruthy()
    const suyo = screen.getByRole('region', { name: 'Lote enviado por ti' })
    expect(within(suyo).queryByRole('button', { name: 'Restaurar el lote' })).toBeNull()
  })

  it('cada cotización dice su número, su clase, su origen y su fecha, sin montos', () => {
    dibujar(<PapeleraDeCotizaciones {...base} pagina={{ ...base.pagina, filas: [ajena] }} />)
    expect(screen.getAllByText('Miami')).toHaveLength(2)
    expect(screen.getByText('N.º 1')).toBeTruthy()
    expect(screen.getByText('Preventa')).toBeTruthy()
    expect(screen.getByText('Final')).toBeTruthy()
    expect(screen.getAllByText(/Creada el /)).toHaveLength(2)
    expect(screen.getByText(/Lote de 2/)).toBeTruthy()
    expect(screen.getByText(/Enviado por Beto el .* · Se purga en 5 días/)).toBeTruthy()
  })

  it('un origen que no llegó se dibuja «—»', () => {
    dibujar(
      <PapeleraDeCotizaciones
        {...base}
        origenes={[]}
        pagina={{ ...base.pagina, filas: [propias] }}
      />,
    )
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('con la clave, «Purgar» en cada cotización y «Purgar el lote» donde hay más de una', () => {
    dibujar(
      <PapeleraDeCotizaciones
        {...base}
        puedePurgar
        pagina={{ ...base.pagina, filas: [propias, ajena] }}
      />,
    )
    const delOtro = screen.getByRole('region', { name: 'Lote enviado por Beto' })
    expect(within(delOtro).getByRole('button', { name: 'Purgar el lote' })).toBeTruthy()
    expect(within(delOtro).getByRole('button', { name: 'Purgar Camioneta de Beto' })).toBeTruthy()
    expect(within(delOtro).getByRole('button', { name: 'Purgar Otra de Beto' })).toBeTruthy()
    const suyo = screen.getByRole('region', { name: 'Lote enviado por ti' })
    expect(within(suyo).getByRole('button', { name: 'Purgar Sedán de Ana' })).toBeTruthy()
    expect(within(suyo).queryByRole('button', { name: 'Purgar el lote' })).toBeNull()
  })

  it('sin la clave, ningún «Purgar», ni en lo suyo', () => {
    dibujar(
      <PapeleraDeCotizaciones {...base} pagina={{ ...base.pagina, filas: [propias, ajena] }} />,
    )
    expect(screen.queryByRole('button', { name: /Purgar/ })).toBeNull()
  })
})
