import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLAVES_DE_ICONO } from '@/shared/lib/iconos'
import { SelectorDeIcono } from './selector-de-icono'

afterEach(cleanup)

describe('<SelectorDeIcono>', () => {
  it('ofrece «Sin icono» y las 24 claves, cada una con su nombre', () => {
    render(<SelectorDeIcono valor={null} alElegir={() => {}} />)
    expect(screen.getAllByRole('radio')).toHaveLength(CLAVES_DE_ICONO.length + 1)
    expect(screen.getByRole('radio', { name: 'Teléfono' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Vehículo' })).toBeTruthy()
    expect((screen.getByRole('radio', { name: 'Sin icono' }) as HTMLInputElement).checked).toBe(
      true,
    )
  })

  it('marca el icono actual y avisa lo que se elige, también «Sin icono»', () => {
    const alElegir = vi.fn()
    render(<SelectorDeIcono valor="casa" alElegir={alElegir} />)
    expect((screen.getByRole('radio', { name: 'Casa' }) as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: 'Barco' }))
    expect(alElegir).toHaveBeenLastCalledWith('barco')
    fireEvent.click(screen.getByRole('radio', { name: 'Sin icono' }))
    expect(alElegir).toHaveBeenLastCalledWith(null)
  })

  it('una clave que no es del catálogo se muestra como «Sin icono», sin romper', () => {
    render(<SelectorDeIcono valor="message-circle" alElegir={() => {}} />)
    expect((screen.getByRole('radio', { name: 'Sin icono' }) as HTMLInputElement).checked).toBe(
      true,
    )
    expect(
      screen.getAllByRole('radio').filter((r) => (r as HTMLInputElement).checked),
    ).toHaveLength(1)
  })

  it('dice un error junto al grupo y se apaga entero', () => {
    render(
      <SelectorDeIcono valor={null} alElegir={() => {}} error="Ese icono no está" deshabilitado />,
    )
    expect(screen.getByText('Ese icono no está')).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Casa' }).matches(':disabled')).toBe(true)
  })
})
