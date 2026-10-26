import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { EsqueletoDeHoja } from './esqueleto-de-hoja'
import { FormulaSinPublicar } from './formula-sin-publicar'
import { PestanasDeOrigen } from './pestanas-de-origen'

afterEach(cleanup)

const ORIGENES = [
  { id: 'o1', nombre: 'Subasta', color: '#112233' },
  { id: 'o2', nombre: 'Oficina', color: '#445566' },
]

describe('PestanasDeOrigen', () => {
  it('una pestaña por origen con su nombre (sale de la fila), la actual marcada, y cambiar de origen conserva el lead', () => {
    render(<PestanasDeOrigen origenes={ORIGENES} actual="o2" leadId="l1" />)
    const enlaces = screen.getAllByRole('link')
    expect(enlaces.map((e) => e.textContent)).toEqual(['Subasta', 'Oficina'])
    expect(enlaces.map((e) => e.getAttribute('href'))).toEqual([
      '/cotizaciones/nuevo?origen=o1&lead=l1',
      '/cotizaciones/nuevo?origen=o2&lead=l1',
    ])
    expect(enlaces.map((e) => e.getAttribute('aria-current'))).toEqual([null, 'page'])
  })

  it('sin lead, el enlace no lo inventa', () => {
    render(<PestanasDeOrigen origenes={ORIGENES} actual="o1" leadId={null} />)
    expect(screen.getAllByRole('link')[0]?.getAttribute('href')).toBe(
      '/cotizaciones/nuevo?origen=o1',
    )
  })
})

describe('FormulaSinPublicar', () => {
  it('dice de qué origen falta, con el enlace a configuración si puede configurar', () => {
    render(<FormulaSinPublicar origen="Oficina" puedeConfigurar />)
    expect(screen.getByText('Falta publicar la fórmula de Oficina')).toBeTruthy()
    expect(screen.getByRole('link').getAttribute('href')).toBe('/configuracion/cotizacion')
  })

  it('sin permiso para configurar, lo dice y no hay enlace', () => {
    render(<FormulaSinPublicar origen="Oficina" puedeConfigurar={false} />)
    expect(screen.getByText('Falta publicar la fórmula de Oficina')).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
  })
})

describe('EsqueletoDeHoja', () => {
  it('avisa que carga', () => {
    render(<EsqueletoDeHoja />)
    expect(screen.getByLabelText('Cargando la hoja de cotizar').getAttribute('aria-busy')).toBe(
      'true',
    )
  })
})
