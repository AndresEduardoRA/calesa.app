import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VistaGuardada } from '../../../entities/vista'
import { MenuDeVistas } from './menu-de-vistas'

const navegar = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => '/vehiculos',
  useRouter: () => ({ push: navegar }),
}))
const guardar = vi.fn(() => Promise.resolve(true))
const eliminar = vi.fn(() => Promise.resolve())
vi.mock('../hooks/use-vistas', () => ({
  useVistas: () => ({ guardar, eliminar, enCurso: false, errorDeNombre: undefined }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const VISTAS: VistaGuardada[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    nombre: 'Automáticos',
    params: { origen: 'o', fase: 'a' },
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    nombre: 'Con llave',
    params: { origen: 'o', 'a.llave': 'si' },
  },
]

function abrir(props: Partial<Parameters<typeof MenuDeVistas>[0]> = {}) {
  render(
    <MenuDeVistas
      pantalla="vehiculos"
      vistas={VISTAS}
      actuales={{ origen: 'o', fase: 'a' }}
      puedeGuardar
      {...props}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Vistas' }))
}

describe('MenuDeVistas', () => {
  it('lista las vistas y marca la que se está viendo', () => {
    abrir()
    expect(screen.getByRole('button', { name: /^Automáticos/ }).getAttribute('aria-current')).toBe(
      'true',
    )
    expect(screen.getByRole('button', { name: 'Con llave' }).hasAttribute('aria-current')).toBe(
      false,
    )
  })

  it('aplicar una vista es navegar a su URL', () => {
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Con llave' }))
    expect(navegar).toHaveBeenCalledWith('/vehiculos?a.llave=si&origen=o')
  })

  it('guarda los filtros de ahora con el nombre escrito', () => {
    abrir()
    fireEvent.change(screen.getByLabelText('Guardar los filtros de ahora'), {
      target: { value: 'Mis filtros' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar vista' }))
    expect(guardar).toHaveBeenCalledWith('Mis filtros', { origen: 'o', fase: 'a' })
  })

  it('sin filtros puestos no hay nada que guardar, y lo dice', () => {
    abrir({ puedeGuardar: false })
    expect(screen.getByLabelText('Guardar los filtros de ahora').hasAttribute('disabled')).toBe(
      true,
    )
    expect(screen.getByText('Pon algún filtro para poder guardarlo.')).toBeDefined()
  })

  it('eliminar nombra la vista', () => {
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar la vista Con llave' }))
    expect(eliminar).toHaveBeenCalledWith(VISTAS[1])
  })

  it('sin vistas explica para qué sirven', () => {
    abrir({ vistas: [] })
    expect(screen.getByText(/Todavía no guardaste ninguna/)).toBeDefined()
  })
})
