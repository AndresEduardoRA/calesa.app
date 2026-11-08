import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { LecturaParaLaVistaPrevia } from '../../../entities/vista-previa-de-la-plantilla'
import { VistaPreviaDeLaPlantilla } from './vista-previa-de-la-plantilla'

const C = { fondo: '#aaaaaa', borde: '#bbbbbb', tinta: '#111111' }
const lectura = (grupos: LecturaParaLaVistaPrevia['grupos']): LecturaParaLaVistaPrevia => ({
  logo: true,
  nota: null,
  columnas: { leyenda: false, tipoDeCambio: false, plazo: false },
  total: { etiqueta: 'Total final', leyenda: null },
  grupos,
  aparte: [],
  tonos: [{ clave: 'verde', claro: C, oscuro: C }],
})
const grupo = (filasDeMas: number) => ({
  id: 'compra',
  etiqueta: 'Compra',
  plazo: null,
  tono: 'verde',
  tipoDeCambio: null,
  filas: [{ nodo: 'fees', etiqueta: 'Fees', leyenda: null }],
  filasDeMas,
})

describe('VistaPreviaDeLaPlantilla', () => {
  it('dibuja los grupos, el total con su etiqueta y «Cifras de ejemplo.»', () => {
    render(<VistaPreviaDeLaPlantilla lectura={lectura([grupo(0)])} />)
    const seccion = screen.getByRole('region', { name: 'Vista previa de la tarjeta' })
    expect(seccion.textContent).toContain('Cifras de ejemplo.')
    expect(seccion.textContent).toContain('Compra')
    expect(seccion.textContent).toContain('Fees')
    expect(seccion.textContent).toContain('Total final')
    expect(seccion.querySelector('[data-tono="verde"]')).not.toBeNull()
    expect(screen.queryByText(/Se muestran las primeras/)).toBeNull()
  })

  it('avisa del tope sólo si quedaron filas fuera', () => {
    render(<VistaPreviaDeLaPlantilla lectura={lectura([grupo(496)])} />)
    expect(screen.getByText('Se muestran las primeras 4 filas de cada grupo.')).toBeTruthy()
  })

  it('sin grupos, sólo el total', () => {
    const { container } = render(<VistaPreviaDeLaPlantilla lectura={lectura([])} />)
    expect(container.querySelector('[data-grupo-de-la-tarjeta]')).toBeNull()
    expect(container.querySelector('[data-total-de-la-tarjeta]')).not.toBeNull()
  })
})
