import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import type { Etiquetas } from '../hooks/use-etiquetas'
import { SelectorDeEtiquetas } from './selector-de-etiquetas'

const etiquetas = { lista: [], creando: false, crear: vi.fn() } as unknown as Etiquetas

beforeAll(() => {
  // cmdk desplaza la opción resaltada.
  Element.prototype.scrollIntoView = () => {}
})

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
})

function montar(conAncla: boolean) {
  const ancla = createRef<HTMLButtonElement>()
  let enfocadoAlGestionar: Element | null = null
  render(
    <>
      <button ref={ancla} type="button">
        Más acciones
      </button>
      <SelectorDeEtiquetas
        etiquetas={etiquetas}
        puestas={[]}
        alCambiar={() => {}}
        enCurso={false}
        alGestionar={() => {
          enfocadoAlGestionar = document.activeElement
        }}
        abierto
        alCambiarAbierto={() => {}}
        {...(conAncla ? { ancla } : {})}
      />
    </>,
  )
  return { ancla, enfocado: () => enfocadoAlGestionar }
}

// «Gestionar etiquetas» desde el selector anclado al «⋯» de una fila: el campo de búsqueda desaparece, así que antes de abrir el panel el foco va al
// «⋯» (4.14-2a4). Así la vuelta del foco tras recargar tiene a quién volver, el mismo a donde Base UI lo devuelve sin recargar.
it('al elegir «Gestionar etiquetas», el foco está en el ancla cuando se abre el panel', () => {
  const { ancla, enfocado } = montar(true)
  fireEvent.click(screen.getByRole('option', { name: 'Gestionar etiquetas' }))
  expect(enfocado()).toBe(ancla.current)
})

it('sin ancla, elegir «Gestionar etiquetas» no mueve el foco al de afuera', () => {
  const { ancla, enfocado } = montar(false)
  fireEvent.click(screen.getByRole('option', { name: 'Gestionar etiquetas' }))
  expect(enfocado()).not.toBe(ancla.current)
})
