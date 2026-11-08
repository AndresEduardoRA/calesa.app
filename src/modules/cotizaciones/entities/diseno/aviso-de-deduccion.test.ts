import { describe, expect, it } from 'vitest'
import { avisosDeDeduccion, textoDeDeduccion } from './aviso-de-deduccion'

const nombres = {
  nodos: new Map([
    ['total', 'Total'],
    ['b', 'Flete'],
  ]),
  niveles: new Map([['costos', 'Costos']]),
}
const una = { suma: 'total', oculto: 'b', nivel: 'costos' }

describe('aviso de deducción', () => {
  it('T5 · nombra la suma, el oculto y el nivel por sus etiquetas; sin nombre, la clave', () => {
    expect(textoDeDeduccion(una, nombres)).toBe(
      'Quien no tiene el nivel «Costos» puede deducir «Flete» restando: ve «Total» y los demás sumandos.',
    )
    const sinNombre = textoDeDeduccion(
      { suma: 'x', oculto: 'y', nivel: 'z' },
      { nodos: new Map(), niveles: new Map() },
    )
    expect(sinNombre).toContain('«z»')
    expect(sinNombre).toContain('«y»')
    expect(sinNombre).toContain('«x»')
  })

  it('T5 · hasta 3 avisos se dicen todos; desde 4, tres y «Y N más.»', () => {
    expect(avisosDeDeduccion([una, una, una], nombres)).toHaveLength(3)
    const cinco = avisosDeDeduccion([una, una, una, una, una], nombres)
    expect(cinco).toHaveLength(4)
    expect(cinco[3]).toBe('Y 2 más.')
    expect(avisosDeDeduccion([], nombres)).toEqual([])
  })
})
