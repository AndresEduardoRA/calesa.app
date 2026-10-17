import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CampoBase } from '@/shared/lib/campos'
import { FilaDeCampo } from './fila-de-campo'
import type { BanderaDeCampo } from './tipos'

afterEach(cleanup)

// Un campo de cualquier módulo: lo base más las banderas que ese módulo ofrece.
const CAMPO: CampoBase & { enTarjeta: boolean; filtrable: boolean } = {
  id: '00000000-0000-0000-0000-000000000001',
  clave: 'color',
  etiqueta: 'Color',
  tipo: 'texto',
  opciones: [],
  requerido: false,
  grupo: 'Vehículo',
  orden: 10,
  enTarjeta: true,
  filtrable: false,
  valorDefecto: null,
  esSistema: true,
  activo: true,
  actualizadoEn: '2026-10-12T20:00:00+00:00',
}

const BANDERAS: BanderaDeCampo[] = [
  { clave: 'enTarjeta', etiqueta: 'En tarjeta', ayuda: '', enFila: true },
  { clave: 'filtrable', etiqueta: 'Filtrable', ayuda: '', enFila: true },
]

function fila(props: Partial<Parameters<typeof FilaDeCampo>[0]> = {}) {
  const manejadores = { alAbrir: vi.fn(), alMover: vi.fn(), alCambiarBandera: vi.fn() }
  render(
    <ul>
      <FilaDeCampo
        campo={CAMPO}
        banderas={BANDERAS}
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
  it('una bandera manda su clave y el valor nuevo', () => {
    const { alCambiarBandera } = fila()
    fireEvent.click(screen.getByRole('switch', { name: 'Color: filtrable' }))
    expect(alCambiarBandera).toHaveBeenCalledWith('filtrable', true)
  })

  it('cada interruptor refleja la propiedad del campo', () => {
    fila()
    expect(
      screen.getByRole('switch', { name: 'Color: en tarjeta' }).getAttribute('aria-checked'),
    ).toBe('true')
    expect(
      screen.getByRole('switch', { name: 'Color: filtrable' }).getAttribute('aria-checked'),
    ).toBe('false')
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

  it('un campo de fábrica y uno requerido lo dicen con texto', () => {
    fila({ campo: { ...CAMPO, requerido: true } })
    expect(screen.getByText('De fábrica')).toBeTruthy()
    expect(screen.getByText('Requerido')).toBeTruthy()
  })

  it('lo que el módulo dice de un campo sale como insignia de texto', () => {
    fila({ insignias: ['Pasando a privado'] })
    expect(screen.getByText('Pasando a privado')).toBeTruthy()
  })
})
