import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CampoDeLayout } from '../../../entities/campo'
import { FilaDeCampo } from './fila-de-campo'

afterEach(cleanup)

const CAMPO: CampoDeLayout = {
  id: '00000000-0000-0000-0000-000000000001',
  origenId: '00000000-0000-0000-0000-0000000000aa',
  clave: 'color',
  etiqueta: 'Color',
  tipo: 'texto',
  opciones: [],
  requerido: false,
  grupo: 'Vehículo',
  orden: 10,
  enTarjeta: true,
  filtrable: false,
  publicoWeb: true,
  claveApibara: null,
  esSistema: true,
  activo: true,
  actualizadoEn: '2026-10-12T20:00:00+00:00',
}

function fila(props: Partial<Parameters<typeof FilaDeCampo>[0]> = {}) {
  const manejadores = { alAbrir: vi.fn(), alMover: vi.fn(), alCambiarBandera: vi.fn() }
  render(
    <ul>
      <FilaDeCampo
        campo={CAMPO}
        puedeGestionar
        ocupado={false}
        puedeSubir={false}
        puedeBajar
        {...manejadores}
        {...props}
      />
    </ul>,
  )
  return manejadores
}

describe('FilaDeCampo', () => {
  it('una bandera manda sólo ese cambio', () => {
    const { alCambiarBandera } = fila()
    fireEvent.click(screen.getByRole('switch', { name: 'Color: filtrable' }))
    expect(alCambiarBandera).toHaveBeenCalledWith({ filtrable: true })
  })

  it('bajar manda el sentido; subir está apagado y dice por qué', () => {
    const { alMover } = fila()
    fireEvent.click(screen.getByRole('button', { name: 'Bajar Color' }))
    expect(alMover).toHaveBeenCalledWith('bajar')
    const subir = screen.getByRole('button', { name: 'Subir Color' })
    expect(subir).toHaveProperty('disabled', true)
    expect(subir.getAttribute('title')).toBe('Ya es el primero de su grupo.')
  })

  it('sin permiso, todo queda apagado y el panel se ofrece sólo para ver', () => {
    fila({ puedeGestionar: false, puedeSubir: true })
    expect(
      screen.getByRole('switch', { name: 'Color: en tarjeta' }).hasAttribute('data-disabled'),
    ).toBe(true)
    expect(screen.getByRole('button', { name: 'Bajar Color' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Ver Color' })).toHaveProperty('disabled', false)
  })

  it('mientras algo se guarda no se toca nada', () => {
    fila({ ocupado: true })
    expect(screen.getByRole('button', { name: 'Bajar Color' })).toHaveProperty('disabled', true)
  })

  it('un campo de sistema y uno requerido lo dicen con texto', () => {
    fila({ campo: { ...CAMPO, requerido: true } })
    expect(screen.getByText('Sistema')).toBeTruthy()
    expect(screen.getByText('Requerido')).toBeTruthy()
  })
})
