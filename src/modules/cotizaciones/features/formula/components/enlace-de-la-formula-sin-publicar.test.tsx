import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { RUTAS } from '@/shared/lib/rutas'
import { EnlaceDeLaFormulaSinPublicar } from './enlace-de-la-formula-sin-publicar'
import { HUECOS_DE_FORMULA_EN_LA_HOJA } from './huecos-en-la-hoja'

afterEach(cleanup)

describe('EnlaceDeLaFormulaSinPublicar', () => {
  it('lleva a la fórmula de ese origen, con el mismo texto y las mismas clases', () => {
    render(<EnlaceDeLaFormulaSinPublicar origenId="o1" />)
    const enlace = screen.getByRole('link', { name: 'Ir a la configuración de cotización' })
    expect(enlace.getAttribute('href')).toBe(
      `${RUTAS.configuracionDeCotizacion}?seccion=formula&origen=o1`,
    )
    expect(enlace.className).toContain('min-h-11')
    expect(enlace.className).toContain('md:min-h-8')
  })
})

describe('HUECOS_DE_FORMULA_EN_LA_HOJA', () => {
  it('trae el enlace de la fórmula sin publicar', () => {
    expect(HUECOS_DE_FORMULA_EN_LA_HOJA.EnlaceSinPublicar).toBe(EnlaceDeLaFormulaSinPublicar)
  })
})
