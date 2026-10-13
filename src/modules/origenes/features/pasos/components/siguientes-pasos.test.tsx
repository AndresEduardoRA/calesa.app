import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { PasoConDestino } from '../../../entities/pasos'
import { SiguientesPasos } from './siguientes-pasos'

afterEach(cleanup)

function paso(parcial: Partial<PasoConDestino> & Pick<PasoConDestino, 'clave'>): PasoConDestino {
  return {
    titulo: `Paso ${parcial.clave}`,
    detalle: 'Detalle',
    pendiente: true,
    ruta: null,
    motivoDeshabilitado: null,
    ...parcial,
  }
}

describe('SiguientesPasos', () => {
  it('sólo muestra lo pendiente', () => {
    render(
      <SiguientesPasos
        nombre="Corea"
        pasos={[paso({ clave: 'flujo' }), paso({ clave: 'formula', pendiente: false })]}
      />,
    )
    expect(screen.getByText('Paso flujo')).toBeTruthy()
    expect(screen.queryByText('Paso formula')).toBeNull()
  })

  it('sin nada pendiente no dibuja nada', () => {
    const { container } = render(
      <SiguientesPasos nombre="Corea" pasos={[paso({ clave: 'flujo', pendiente: false })]} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('lo que no tiene pantalla se dice, sin enlace', () => {
    render(<SiguientesPasos nombre="Corea" pasos={[paso({ clave: 'flujo' })]} />)
    expect(screen.getByText(/todavía no hay pantalla/)).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('lo que tiene pantalla lleva a ella', () => {
    render(
      <SiguientesPasos
        nombre="Corea"
        pasos={[paso({ clave: 'permisos', ruta: '/configuracion/roles' })]}
      />,
    )
    expect(screen.getByRole('link', { name: /Abrir/ }).getAttribute('href')).toBe(
      '/configuracion/roles',
    )
  })

  it('sin el permiso no hay enlace y se dice el motivo', () => {
    render(
      <SiguientesPasos
        nombre="Corea"
        pasos={[
          paso({
            clave: 'permisos',
            ruta: '/configuracion/roles',
            motivoDeshabilitado: 'Los reparte quien tiene el permiso «Gestionar roles».',
          }),
        ]}
      />,
    )
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText(/Gestionar roles/)).toBeTruthy()
  })
})
