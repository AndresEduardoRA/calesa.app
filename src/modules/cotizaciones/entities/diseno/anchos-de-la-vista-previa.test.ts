import { describe, expect, it } from 'vitest'
import { ANCHO_AL_ABRIR, ANCHOS_DE_LA_VISTA_PREVIA } from './anchos-de-la-vista-previa'

describe('anchos de la vista previa', () => {
  it('abre en uno de los tres anchos', () => {
    expect(ANCHOS_DE_LA_VISTA_PREVIA).toContain(ANCHO_AL_ABRIR)
  })
})
