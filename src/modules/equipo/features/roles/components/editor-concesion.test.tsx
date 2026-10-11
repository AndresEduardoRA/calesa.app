import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import type { PermisoDelCatalogo } from '../../../entities/matriz'
import { EditorConcesion } from './editor-concesion'

const OFICINA = '11111111-1111-1111-1111-111111111111'
const USA = '22222222-2222-2222-2222-222222222222'

const verVehiculos: PermisoDelCatalogo = {
  clave: 'vehiculos.ver',
  modulo: 'vehiculos',
  nombre: 'Ver vehículos',
  descripcion: 'Ver el inventario',
  porOrigen: true,
  conAlcance: true,
}
const duena: Permisos = [{ clave: 'vehiculos.ver', origenId: null, alcance: 'todos' }]
// Sólo lo tiene en Oficina y sólo lo propio.
const gestora: Permisos = [{ clave: 'vehiculos.ver', origenId: OFICINA, alcance: 'propios' }]
const origenes = [
  { id: OFICINA, nombre: 'Oficina' },
  { id: USA, nombre: 'Subasta EE. UU.' },
]

function editor(props: Partial<Parameters<typeof EditorConcesion>[0]> = {}) {
  const alAplicar = vi.fn()
  render(
    <EditorConcesion
      permiso={verVehiculos}
      rolNombre="Ventas"
      delPermiso={[]}
      origenes={origenes}
      misPermisos={duena}
      ocupado={false}
      alAplicar={alAplicar}
      {...props}
    />,
  )
  return alAplicar
}

afterEach(cleanup)

describe('EditorConcesion', () => {
  it('con cero orígenes dice «Sin orígenes todavía» y sólo ofrece el alcance global', () => {
    editor({ origenes: [] })
    expect(screen.getByText('Sin orígenes todavía')).toBeTruthy()
    const interruptores = screen.getAllByRole('switch')
    expect(interruptores).toHaveLength(1)
    expect(interruptores[0]?.getAttribute('aria-label')).toBe(
      'Ver vehículos para Ventas: Todos los orígenes',
    )
  })

  it('con orígenes ofrece el global y uno por origen, nombrados desde la fila', () => {
    editor()
    expect(screen.queryByText('Sin orígenes todavía')).toBeNull()
    expect(screen.getAllByRole('switch')).toHaveLength(3)
    expect(screen.getByLabelText('Ver vehículos para Ventas: Subasta EE. UU.')).toBeTruthy()
  })

  it('encender un origen otorga ahí, con el alcance más amplio que la persona puede dar', () => {
    const alAplicar = editor()
    fireEvent.click(screen.getByLabelText('Ver vehículos para Ventas: Oficina'))
    expect(alAplicar).toHaveBeenCalledWith({
      tipo: 'otorgar',
      clave: 'vehiculos.ver',
      origenId: OFICINA,
      alcance: 'todos',
    })
  })

  it('apagar uno que el rol tiene lo revoca', () => {
    const alAplicar = editor({
      delPermiso: [{ clave: 'vehiculos.ver', origenId: OFICINA, alcance: 'todos' }],
    })
    fireEvent.click(screen.getByLabelText('Ver vehículos para Ventas: Oficina'))
    expect(alAplicar).toHaveBeenCalledWith({
      tipo: 'revocar',
      clave: 'vehiculos.ver',
      origenId: OFICINA,
    })
  })

  it('dominancia: lo que la persona no tiene aparece deshabilitado, con el motivo', () => {
    const alAplicar = editor({ misPermisos: gestora })
    // Tiene Oficina: ese sí. Todos los orígenes y el otro origen, no.
    const global = screen.getByLabelText('Ver vehículos para Ventas: Todos los orígenes')
    const usa = screen.getByLabelText('Ver vehículos para Ventas: Subasta EE. UU.')
    const oficina = screen.getByLabelText('Ver vehículos para Ventas: Oficina')
    expect(global.hasAttribute('data-disabled')).toBe(true)
    expect(usa.hasAttribute('data-disabled')).toBe(true)
    expect(oficina.hasAttribute('data-disabled')).toBe(false)
    expect(screen.getAllByText('No puedes dar un permiso que no tienes.')).toHaveLength(2)
    // Y lo que da, lo da con su alcance: «lo propio».
    fireEvent.click(oficina)
    expect(alAplicar).toHaveBeenCalledWith({
      tipo: 'otorgar',
      clave: 'vehiculos.ver',
      origenId: OFICINA,
      alcance: 'propios',
    })
  })
})
