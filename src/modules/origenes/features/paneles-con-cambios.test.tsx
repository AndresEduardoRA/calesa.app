import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'
import type { Categoria } from '../entities/categoria'
import type { EdicionesDeCategorias } from './categorias/hooks/use-categorias'
import { PanelDeCategoria } from './categorias/components/panel-de-categoria'
import type { EdicionesDeOrigenes } from './origenes/hooks/use-origenes'
import { PanelNuevoOrigen } from './origenes/components/panel-nuevo-origen'

afterEach(cleanup)

const edicionesDeOrigenes = {
  enCurso: false,
  errores: { crear: undefined, guardar: undefined },
  crear: vi.fn(),
} as unknown as EdicionesDeOrigenes

const edicionesDeCategorias = {
  enCurso: false,
  errores: { crear: undefined },
  crear: vi.fn(),
  renombrar: vi.fn(),
  cambiarActiva: vi.fn(),
  eliminar: vi.fn(),
} as unknown as EdicionesDeCategorias

const sedan: Categoria = {
  id: 'cat-1',
  origenId: 'o-1',
  padreId: null,
  nombre: 'Sedán',
  orden: 10,
  activa: true,
  actualizadoEn: '2026-10-17T10:00:00.000Z',
  vehiculos: 0,
}

// Lo que hace la acción de un aviso que sale de la pantalla: sigue directo, o pregunta en el pie del panel.
function pulsarAviso() {
  const salir = vi.fn()
  act(() => {
    salirSinPerder(salir)
  })
  return salir
}

const hayPregunta = () => screen.queryByText('Tienes cambios sin guardar.') !== null

describe('PanelNuevoOrigen', () => {
  function montar() {
    render(
      <PanelNuevoOrigen
        abierto
        ediciones={edicionesDeOrigenes}
        alCerrar={vi.fn()}
        alCrear={vi.fn()}
      />,
    )
  }

  it('sin escribir nada, el aviso sale directo', () => {
    montar()
    expect(pulsarAviso()).toHaveBeenCalledTimes(1)
    expect(hayPregunta()).toBe(false)
  })

  it('con el nombre escrito, pregunta en el pie y «Seguir editando» no tira lo escrito', () => {
    montar()
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Subasta Texas' } })
    const salir = pulsarAviso()
    expect(salir).not.toHaveBeenCalled()
    expect(hayPregunta()).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByLabelText('Nombre')).toHaveValue('Subasta Texas')
  })

  it('con el tipo cambiado a «subasta» también pregunta', () => {
    montar()
    fireEvent.click(screen.getByRole('radio', { name: /Subasta/ }))
    pulsarAviso()
    expect(hayPregunta()).toBe(true)
  })
})

describe('PanelDeCategoria', () => {
  function montar(categoria: Categoria | 'nueva', puedeGestionar = true) {
    render(
      <PanelDeCategoria
        categoria={categoria}
        origenId="o-1"
        raices={[sedan]}
        hijasDe={() => []}
        puedeGestionar={puedeGestionar}
        ediciones={edicionesDeCategorias}
        alCerrar={vi.fn()}
      />,
    )
  }

  it('una categoría que se edita, sin tocar, no pregunta; con el nombre cambiado, sí', () => {
    montar(sedan)
    expect(pulsarAviso()).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Sedanes' } })
    expect(pulsarAviso()).not.toHaveBeenCalled()
    expect(hayPregunta()).toBe(true)
  })

  it('una categoría nueva con el nombre escrito pregunta', () => {
    montar('nueva')
    expect(pulsarAviso()).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Camionetas' } })
    pulsarAviso()
    expect(hayPregunta()).toBe(true)
  })

  it('sin permiso no pregunta', () => {
    montar(sedan, false)
    expect(pulsarAviso()).toHaveBeenCalledTimes(1)
  })
})
