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
    {
      tipo: 'booleano',
      clave: 'a.llave',
      etiqueta: 'Tiene llave',
      ayuda: 'Solo busca en tus leads',
    },
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

const CON_SECCIONES: EsquemaDeFiltros = {
  busqueda: null,
  secciones: [{ clave: 'marcas', titulo: 'Tus marcas', descripcion: 'Solo las ves tú.' }],
  filtros: [
    {
      tipo: 'eleccion',
      clave: 'tachados',
      etiqueta: 'Tachados',
      seccion: 'marcas',
      porDefecto: 'ocultar',
      opciones: [
        { valor: 'ocultar', etiqueta: 'Ocultarlos' },
        { valor: 'incluir', etiqueta: 'Mostrarlos también' },
      ],
    },
    { tipo: 'booleano', clave: 'a.llave', etiqueta: 'Tiene llave' },
  ],
}

describe('FilterShell con secciones y una elección', () => {
  function montarConSecciones(url: string) {
    const alCambiarUrl = vi.fn<(evento: UrlUpdateEvent) => void>()
    render(
      <NuqsTestingAdapter searchParams={url} onUrlUpdate={alCambiarUrl} hasMemory>
        <FilterShell
          esquema={CON_SECCIONES}
          accionesDeSeccion={{ marcas: <button>Gestionar</button> }}
        >
          <Lista />
        </FilterShell>
      </NuqsTestingAdapter>,
    )
    return alCambiarUrl
  }

  it('cada sección lleva su título, su aclaración y su acción; lo suelto va aparte', () => {
    montarConSecciones('')
    const panel = within(screen.getByRole('complementary', { name: 'Filtros' }))
    const seccion = within(panel.getByRole('region', { name: 'Tus marcas' }))
    expect(seccion.getByText('Solo las ves tú.')).toBeTruthy()
    expect(seccion.getByRole('radio', { name: 'Ocultarlos' })).toBeTruthy()
    expect(seccion.getByRole('button', { name: 'Gestionar' })).toBeTruthy()
    expect(seccion.queryByRole('radio', { name: 'Sí' })).toBeNull()
    expect(panel.getByRole('radio', { name: 'Sí' })).toBeTruthy()
  })

  it('el valor por defecto está marcado sin estar en la URL, y no es un chip ni cuenta', () => {
    montarConSecciones('')
    const panel = within(screen.getByRole('complementary', { name: 'Filtros' }))
    expect((panel.getByRole('radio', { name: 'Ocultarlos' }) as HTMLInputElement).checked).toBe(
      true,
    )
    expect(screen.queryByRole('list', { name: 'Filtros activos' })).toBeNull()
    expect(screen.getByText('todo')).toBeDefined()
  })

  it('elegir otra la escribe y vuelve al valor por defecto la borra', async () => {
    const alCambiarUrl = montarConSecciones('?tachados=incluir')
    expect(screen.getByText('Tachados: Mostrarlos también')).toBeDefined()
    const panel = within(screen.getByRole('complementary', { name: 'Filtros' }))
    fireEvent.click(panel.getByRole('radio', { name: 'Ocultarlos' }))
    await waitFor(() => {
      expect(alCambiarUrl.mock.lastCall?.[0].searchParams.has('tachados')).toBe(false)
    })
  })
})

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

  it('la ayuda de un filtro va debajo de su control', () => {
    montar('')
    const panel = within(screen.getByRole('complementary', { name: 'Filtros' }))
    expect(panel.getByText('Solo busca en tus leads')).toBeTruthy()
    expect(panel.getAllByText(/Solo busca/)).toHaveLength(1)
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

describe('el mínimo de la búsqueda (5a-8)', () => {
  const CON_MINIMO: EsquemaDeFiltros = {
    busqueda: {
      clave: 'q',
      etiqueta: 'Buscar por nombre o número',
      minimo: { letras: 3, numerosLibres: true, aviso: 'Escribe al menos 3 letras' },
    },
    filtros: [],
  }
  const campoDeBusqueda = () =>
    screen.getByRole('searchbox', { name: 'Buscar por nombre o número' })

  function montarConMinimo(url: string) {
    const alCambiarUrl = vi.fn<(evento: UrlUpdateEvent) => void>()
    render(
      <NuqsTestingAdapter searchParams={url} onUrlUpdate={alCambiarUrl} hasMemory>
        <FilterShell esquema={CON_MINIMO}>
          <Lista />
        </FilterShell>
      </NuqsTestingAdapter>,
    )
    return alCambiarUrl
  }

  it('con 1 o 2 caracteres dice la línea, deja lo escrito y no escribe ?q= en la URL', async () => {
    const alCambiarUrl = montarConMinimo('')
    fireEvent.change(campoDeBusqueda(), { target: { value: 'ab' } })
    expect(await screen.findByText('Escribe al menos 3 letras')).toBeTruthy()
    expect(campoDeBusqueda().getAttribute('aria-describedby')).toBeTruthy()
    expect((campoDeBusqueda() as HTMLInputElement).value).toBe('ab')
    await new Promise((resolver) => setTimeout(resolver, 500))
    for (const [evento] of alCambiarUrl.mock.calls) {
      expect(evento.searchParams.get('q')).toBeNull()
    }
  })

  // Que el campo conserve «ab» al volver de «abc» lo comprueba el e2e en el navegador (`leads-listado-busqueda-minima.spec.ts`): el adaptador de pruebas
  // de nuqs devuelve un instante valores viejos de la URL (abc, nada, abc) y no sirve para mirar el campo después de una escritura.
  it('con 3 busca (?q=) y la línea se va; al volver a 2, quita ?q=', async () => {
    const alCambiarUrl = montarConMinimo('')
    fireEvent.change(campoDeBusqueda(), { target: { value: 'abc' } })
    await waitFor(() => {
      expect(alCambiarUrl.mock.lastCall?.[0].searchParams.get('q')).toBe('abc')
    })
    // El adaptador de pruebas repite la URL un instante (abc, nada, abc): se espera a que el campo se asiente.
    await waitFor(() => {
      expect((campoDeBusqueda() as HTMLInputElement).value).toBe('abc')
    })
    expect(screen.queryByText('Escribe al menos 3 letras')).toBeNull()
    fireEvent.change(campoDeBusqueda(), { target: { value: 'ab' } })
    await waitFor(() => {
      expect(alCambiarUrl.mock.lastCall?.[0].searchParams.get('q')).toBeNull()
    })
  })

  it('un número de 1 o 2 dígitos busca: no pide más', async () => {
    const alCambiarUrl = montarConMinimo('')
    fireEvent.change(campoDeBusqueda(), { target: { value: '12' } })
    await waitFor(() => {
      expect(alCambiarUrl.mock.lastCall?.[0].searchParams.get('q')).toBe('12')
    })
    expect(screen.queryByText('Escribe al menos 3 letras')).toBeNull()
  })

  it('un ?q=ab que viene de la URL dice la línea y no cuenta como filtro', () => {
    montarConMinimo('?q=ab')
    expect(screen.getByText('Escribe al menos 3 letras')).toBeTruthy()
    expect(screen.getByText('todo')).toBeTruthy()
  })
})

describe('FilterShell: el chip de una búsqueda larga (5a-23)', () => {
  it('cede con «…» y dice su texto entero, y la «×» no cede', () => {
    montar('?q=E2E Menu mas acciones')
    const chip = screen.getByRole('button', { name: 'Quitar el filtro «E2E Menu mas acciones»' })
    const texto = chip.querySelector('.truncate')
    expect(texto?.getAttribute('title')).toBe('«E2E Menu mas acciones»')
    expect(texto?.className).toContain('min-w-0')
    expect(chip.className).toContain('max-w-full')
    expect(chip.closest('li')?.className).toContain('min-w-0')
    expect(chip.querySelector('svg')?.getAttribute('class')).toContain('shrink-0')
  })
})
