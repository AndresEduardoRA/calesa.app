import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import { useFiltrosDelListado } from './contexto'
import { FilterShell } from './filter-shell'

const ESQUEMA: EsquemaDeFiltros = {
  busqueda: { clave: 'q', etiqueta: 'Buscar por título' },
  filtros: [
    {
      tipo: 'opciones',
      clave: 'fase',
      etiqueta: 'Fase',
      opciones: [
        { valor: 'a', etiqueta: 'En subasta' },
        { valor: 'b', etiqueta: 'Comprado' },
      ],
    },
    { tipo: 'booleano', clave: 'a.llave', etiqueta: 'Tiene llave' },
    {
      tipo: 'rango_numero',
      clave: 'anio',
      etiqueta: 'Año',
      minimo: 1900,
      maximo: 2100,
      entero: true,
      sinMiles: true,
    },
  ],
}

beforeAll(() => {
  // jsdom no trae matchMedia: se prueba como una pantalla angosta.
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})
afterEach(cleanup)

function Lista() {
  const filtros = useFiltrosDelListado()
  return <p>{filtros.hayFiltros ? 'filtrando' : 'todo'}</p>
}

function montar(url: string) {
  const alCambiarUrl = vi.fn<(evento: UrlUpdateEvent) => void>()
  render(
    <NuqsTestingAdapter searchParams={url} onUrlUpdate={alCambiarUrl} hasMemory>
      <FilterShell esquema={ESQUEMA}>
        <Lista />
      </FilterShell>
    </NuqsTestingAdapter>,
  )
  // nuqs escribe la URL un instante después del clic: se espera a la escritura que sigue.
  let vistas = 0
  const ultima = async () => {
    await waitFor(() => {
      expect(alCambiarUrl.mock.calls.length).toBeGreaterThan(vistas)
    })
    vistas = alCambiarUrl.mock.calls.length
    return alCambiarUrl.mock.lastCall?.[0].searchParams ?? new URLSearchParams()
  }
  return { ultima }
}

describe('FilterShell', () => {
  it('sin filtros no hay chips y la lista lo sabe', () => {
    montar('')
    expect(screen.queryByRole('list', { name: 'Filtros activos' })).toBeNull()
    expect(screen.getByText('todo')).toBeDefined()
  })

  it('muestra un chip por cada filtro de la URL, y quitarlo lo saca de la URL', async () => {
    const { ultima } = montar('?fase=a,b&anio.min=2015&cursor=abc')
    const chips = within(screen.getByRole('list', { name: 'Filtros activos' }))
    expect(chips.getByText('Fase: En subasta')).toBeDefined()
    expect(chips.getByText('Fase: Comprado')).toBeDefined()
    expect(chips.getByText('Año: desde 2015')).toBeDefined()
    expect(screen.getByText('filtrando')).toBeDefined()
    fireEvent.click(chips.getByRole('button', { name: 'Quitar el filtro Fase: En subasta' }))
    const url = await ultima()
    expect(url.get('fase')).toBe('b')
    expect(url.get('anio.min')).toBe('2015')
    // Cambiar un filtro vuelve a la primera página.
    expect(url.has('cursor')).toBe(false)
  })

  it('un valor inválido en la URL no filtra ni rompe', () => {
    montar('?fase=zzz&anio.min=abc&a.llave=quizas')
    expect(screen.queryByRole('list', { name: 'Filtros activos' })).toBeNull()
    expect(screen.getByText('todo')).toBeDefined()
  })

  it('elegir en el panel escribe la URL', async () => {
    const { ultima } = montar('?fase=a')
    const panel = within(screen.getByRole('complementary', { name: 'Filtros' }))
    fireEvent.click(panel.getByRole('checkbox', { name: 'Comprado' }))
    expect((await ultima()).get('fase')).toBe('a,b')
    fireEvent.click(panel.getByRole('radio', { name: 'Sí' }))
    const url = await ultima()
    expect(url.get('a.llave')).toBe('si')
    expect(url.get('fase')).toBe('a,b')
  })

  it('«Limpiar» quita todos los filtros y la búsqueda', async () => {
    const { ultima } = montar('?q=rav4&fase=a&a.llave=no')
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect([...(await ultima()).keys()]).toEqual([])
  })

  it('el botón dice cuántos filtros hay puestos', () => {
    montar('?fase=a&a.llave=no')
    expect(screen.getByRole('button', { name: /Filtros\s*2/ })).toBeDefined()
  })
})
