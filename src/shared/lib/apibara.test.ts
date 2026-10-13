import { describe, expect, it } from 'vitest'
import { NOMBRE_DE_PLATAFORMA, PLATAFORMAS_APIBARA, plataformasConocidas } from './apibara'

describe('plataformas de apibara', () => {
  it('toda plataforma tiene el nombre con el que se muestra', () => {
    for (const plataforma of PLATAFORMAS_APIBARA) {
      expect(NOMBRE_DE_PLATAFORMA[plataforma]).toBeTruthy()
    }
  })

  it('se queda con las que conoce, en su orden', () => {
    expect(plataformasConocidas(['iaai', 'ebay', 'copart'])).toEqual(['copart', 'iaai'])
    expect(plataformasConocidas([])).toEqual([])
  })
})
