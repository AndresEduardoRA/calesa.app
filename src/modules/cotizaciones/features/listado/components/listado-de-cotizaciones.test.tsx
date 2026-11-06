import { cleanup, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import { render } from '../../hoja/components/render-con-url.soporte'
import { ListadoDeCotizaciones } from './listado-de-cotizaciones'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/cotizaciones',
}))
vi.mock('./diferidos', () => ({ ResumenDeCotizacionDiferido: () => null }))

beforeAll(() => {
  // jsdom no trae matchMedia: se prueba como una pantalla angosta.
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})
afterEach(cleanup)

const ESQUEMA: EsquemaDeFiltros = { busqueda: { clave: 'q', etiqueta: 'Buscar' }, filtros: [] }
const VACIA = { filas: [], siguiente: null, anterior: null }
const base = {
  esquema: ESQUEMA,
  pagina: VACIA,
  porPagina: { valor: 25, opciones: [25, 50] },
  origenes: [],
  rutaDeNueva: '/cotizaciones/nuevo?origen=o1' as string | null,
  delServidor: null,
}

// Los hijos del contenedor de acciones del `<FilterShell>`: el que tiene a «Nueva cotización» (el primero con ese botón, el de la barra).
function accionesDeLaBarra() {
  const nuevas = screen.getAllByRole('link', { name: 'Nueva cotización' })
  const barra = nuevas[0]?.parentElement
  if (!barra) throw new Error('No está la barra de acciones')
  return { nuevas, barra }
}

describe('ListadoDeCotizaciones: lo que va junto a «Nueva cotización» (4.15-6b, C5)', () => {
  it('con `junto`, va antes de «Nueva cotización» en el contenedor de acciones', () => {
    render(<ListadoDeCotizaciones {...base} junto={<button>Papelera de prueba</button>} />)
    const { barra } = accionesDeLaBarra()
    const junto = screen.getByRole('button', { name: 'Papelera de prueba' })
    expect(junto.parentElement).toBe(barra)
    expect(junto.nextElementSibling?.textContent).toBe('Nueva cotización')
  })

  it('con `junto` y sin ruta de «Nueva», sólo `junto`', () => {
    render(
      <ListadoDeCotizaciones
        {...base}
        rutaDeNueva={null}
        junto={<button>Papelera de prueba</button>}
      />,
    )
    expect(screen.queryByRole('link', { name: 'Nueva cotización' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Papelera de prueba' })).toBeTruthy()
  })

  it('sin `junto`, la barra tiene un solo hijo con «Nueva cotización», como siempre (C9)', () => {
    render(<ListadoDeCotizaciones {...base} />)
    const { barra } = accionesDeLaBarra()
    expect(barra.children).toHaveLength(1)
  })

  it('con la página vacía, el vacío ofrece sólo «Nueva cotización» aunque haya `junto`', () => {
    render(<ListadoDeCotizaciones {...base} junto={<button>Papelera de prueba</button>} />)
    const nuevas = screen.getAllByRole('link', { name: 'Nueva cotización' })
    expect(nuevas).toHaveLength(2)
    const vacio = nuevas[1]?.parentElement
    expect(vacio?.textContent).toBe('Nueva cotización')
  })
})
