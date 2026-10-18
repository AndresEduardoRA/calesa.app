import {
  act,
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProveedorDeAncho } from '../ancho-de-pantalla'
import {
  AbrirResumen,
  FilaDeLista,
  MasAcciones,
  PestanasDelResumen,
  TarjetaDeLista,
  UnaSolaVista,
  type AccionDeMenu,
} from '.'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function enUnaTabla(fila: React.ReactNode) {
  return (
    <table>
      <tbody>{fila}</tbody>
    </table>
  )
}

describe('FilaDeLista', () => {
  function fila(alAbrir: () => void) {
    return enUnaTabla(
      <FilaDeLista alAbrir={alAbrir}>
        <td>
          <AbrirResumen nombre="Ana Rojas">Ana Rojas</AbrirResumen>
        </td>
        <td data-testid="celda">+591 70011002</td>
        <td>
          <input type="checkbox" aria-label="Seleccionar" />
          <a href="#enlace">Abrir enlace</a>
        </td>
      </FilaDeLista>,
    )
  }

  it('un clic en una celda cualquiera, o en el botón del nombre, abre una sola vez', () => {
    const alAbrir = vi.fn()
    render(fila(alAbrir))
    fireEvent.click(screen.getByTestId('celda'))
    expect(alAbrir).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Ana Rojas' }))
    expect(alAbrir).toHaveBeenCalledTimes(2)
  })

  it('la casilla y el enlace de la fila no la abren', () => {
    const alAbrir = vi.fn()
    render(fila(alAbrir))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar' }))
    fireEvent.click(screen.getByRole('link', { name: 'Abrir enlace' }))
    expect(alAbrir).not.toHaveBeenCalled()
  })

  it('lo que sube desde un portal (el menú del «⋯») no la abre', () => {
    const alAbrir = vi.fn()
    function ConPortal() {
      return enUnaTabla(
        <FilaDeLista alAbrir={alAbrir}>
          <td>{createPortal(<span data-testid="en-el-portal">ítem</span>, document.body)}</td>
        </FilaDeLista>,
      )
    }
    render(<ConPortal />)
    fireEvent.click(screen.getByTestId('en-el-portal'))
    expect(alAbrir).not.toHaveBeenCalled()
  })

  it('Enter sobre el botón del nombre la abre (es un clic) y la abierta se marca', () => {
    const alAbrir = vi.fn()
    const { rerender } = render(fila(alAbrir))
    const boton = screen.getByRole('button', { name: 'Abrir Ana Rojas' })
    // El teclado: Enter sobre un botón dispara su clic.
    const clic = createEvent.click(boton)
    fireEvent(boton, clic)
    expect(alAbrir).toHaveBeenCalledTimes(1)
    rerender(
      enUnaTabla(
        <FilaDeLista alAbrir={alAbrir} abierta>
          <td>x</td>
        </FilaDeLista>,
      ),
    )
    expect(document.querySelector('tr')?.getAttribute('data-state')).toBe('selected')
  })
})

describe('TarjetaDeLista', () => {
  it('abre con un clic en cualquier parte, y no con el de sus acciones', () => {
    const alAbrir = vi.fn()
    render(
      <ul>
        <TarjetaDeLista alAbrir={alAbrir} acciones={<button type="button">Más</button>}>
          <AbrirResumen nombre="Ana">Ana</AbrirResumen>
          <span data-testid="telefono">+591</span>
          <a href="#enlace">Abrir enlace</a>
        </TarjetaDeLista>
      </ul>,
    )
    fireEvent.click(screen.getByTestId('telefono'))
    expect(alAbrir).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('link', { name: 'Abrir enlace' }))
    fireEvent.click(screen.getByRole('button', { name: 'Más' }))
    expect(alAbrir).toHaveBeenCalledTimes(1)
  })
})

describe('UnaSolaVista', () => {
  function Vistas() {
    return <UnaSolaVista tabla={() => <p>tabla</p>} tarjetas={() => <p>tarjetas</p>} />
  }
  function pantalla(ancho: number) {
    vi.stubGlobal('innerWidth', ancho)
    vi.stubGlobal(
      'matchMedia',
      vi.fn((consulta: string) => ({
        matches: ancho >= Number(/min-width: (\d+)px/.exec(consulta)?.[1]),
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      })),
    )
  }

  it('dibuja sólo una: la tabla desde 768 px, las tarjetas por debajo', () => {
    pantalla(1280)
    const { unmount } = render(
      <ProveedorDeAncho inicial={1280}>
        <Vistas />
      </ProveedorDeAncho>,
    )
    expect(screen.getByText('tabla')).toBeTruthy()
    expect(screen.queryByText('tarjetas')).toBeNull()
    unmount()
    pantalla(400)
    render(
      <ProveedorDeAncho inicial={400}>
        <Vistas />
      </ProveedorDeAncho>,
    )
    expect(screen.getByText('tarjetas')).toBeTruthy()
    expect(screen.queryByText('tabla')).toBeNull()
  })
})

describe('MasAcciones', () => {
  const acciones: AccionDeMenu[] = [
    { tipo: 'accion', clave: 'a', etiqueta: 'Primera', alElegir: vi.fn() },
    { tipo: 'separador', clave: 's1' },
    { tipo: 'casilla', clave: 'b', etiqueta: 'Segunda', marcada: true, alCambiar: vi.fn() },
    { tipo: 'separador', clave: 's2' },
    { tipo: 'accion', clave: 'c', etiqueta: 'Tercera', destructiva: true, alElegir: vi.fn() },
    { tipo: 'nota', clave: 'n', texto: 'Por qué no.' },
  ]

  it('el botón se llama «Más acciones de …» y las líneas salen en el orden dado', async () => {
    render(<MasAcciones nombre="Ana Rojas" id="lead-1" acciones={acciones} />)
    const boton = screen.getByRole('button', { name: 'Más acciones de Ana Rojas' })
    expect(boton.getAttribute('data-mas-acciones')).toBe('lead-1')
    act(() => {
      fireEvent.pointerDown(boton)
      fireEvent.mouseDown(boton)
      fireEvent.click(boton)
    })
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Primera' })).toBeTruthy()
    })
    const titulos = [
      ...document.querySelectorAll(
        '[role="menuitem"], [role="menuitemcheckbox"], [role="separator"], p',
      ),
    ].map((n) => (n.getAttribute('role') === 'separator' ? '—' : n.textContent))
    expect(titulos).toEqual(['Primera', '—', 'Segunda', '—', 'Tercera', 'Por qué no.'])
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Segunda' }).getAttribute('aria-checked'),
    ).toBe('true')
  })
})

describe('PestanasDelResumen', () => {
  // La lista se desplaza con pista (`useDesborde`) y deja a la vista la elegida: jsdom no trae ni lo uno ni lo otro.
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
    Element.prototype.scrollIntoView = () => {}
  })

  const pestanas = [
    { clave: 'resumen', titulo: 'Resumen' },
    { clave: 'fotos', titulo: 'Fotos' },
    { clave: 'interesados', titulo: 'Interesados' },
  ] as const

  function Pestanas({ inicial }: { inicial: (typeof pestanas)[number]['clave'] }) {
    const [activa, setActiva] = useState(inicial)
    return (
      <PestanasDelResumen
        etiqueta="Secciones del vehículo"
        pestanas={pestanas}
        activa={activa}
        alElegir={setActiva}
      >
        <p>{`contenido de ${activa}`}</p>
      </PestanasDelResumen>
    )
  }

  it('sólo la elegida es parada de Tab, y las flechas, Inicio y Fin la mueven y la eligen', () => {
    render(<Pestanas inicial="resumen" />)
    const lista = screen.getByRole('tablist', { name: 'Secciones del vehículo' })
    const tab = (nombre: string) => screen.getByRole('tab', { name: nombre })
    expect(tab('Resumen').getAttribute('tabindex')).toBe('0')
    expect(tab('Fotos').getAttribute('tabindex')).toBe('-1')
    fireEvent.keyDown(lista, { key: 'ArrowRight' })
    expect(tab('Fotos').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('contenido de fotos')).toBeTruthy()
    fireEvent.keyDown(lista, { key: 'End' })
    expect(tab('Interesados').getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(lista, { key: 'ArrowRight' })
    expect(tab('Resumen').getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(lista, { key: 'ArrowLeft' })
    expect(tab('Interesados').getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(lista, { key: 'Home' })
    expect(tab('Resumen').getAttribute('aria-selected')).toBe('true')
  })

  it('un clic elige la pestaña y el panel dice cuál lo nombra', () => {
    render(<Pestanas inicial="resumen" />)
    fireEvent.click(screen.getByRole('tab', { name: 'Fotos' }))
    const panel = screen.getByRole('tabpanel')
    expect(panel.getAttribute('aria-labelledby')).toBe(
      screen.getByRole('tab', { name: 'Fotos' }).getAttribute('id'),
    )
  })
})
