import { describe, expect, it } from 'vitest'
import { COLORES_DE_FASE, colorDeLaPaleta, coloresParaElegir } from './colores-de-fase'
import { errorDeColorDeFase } from './reglas-de-fase'

describe('paleta de colores de una fase', () => {
  it('cada color es válido para la base, único y con nombre', () => {
    expect(COLORES_DE_FASE.map((c) => errorDeColorDeFase(c.valor))).toEqual(
      COLORES_DE_FASE.map(() => null),
    )
    expect(new Set(COLORES_DE_FASE.map((c) => c.valor)).size).toBe(COLORES_DE_FASE.length)
    expect(COLORES_DE_FASE.every((c) => c.nombre !== '')).toBe(true)
  })

  it('reconoce un color de la paleta sin mirar mayúsculas', () => {
    expect(colorDeLaPaleta('#465FFF')?.nombre).toBe('Azul')
    expect(colorDeLaPaleta('#123456')).toBeNull()
  })

  it('un color de afuera suma una baldosa «Otro» y conserva el valor', () => {
    expect(coloresParaElegir('#465fff')).toHaveLength(COLORES_DE_FASE.length)
    const otras = coloresParaElegir('#123456')
    expect(otras).toHaveLength(COLORES_DE_FASE.length + 1)
    expect(otras.at(-1)).toEqual({ valor: '#123456', nombre: 'Otro (#123456)' })
  })
})
