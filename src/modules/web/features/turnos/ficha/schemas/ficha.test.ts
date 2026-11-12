import { describe, expect, it } from 'vitest'
import { MENSAJE_SIN_WHATSAPP } from '../../../../entities/turnos/ficha'
import { esquemaFicha } from './ficha'

const base = {
  whatsapp: '+59170000000',
  handle: 'Rosa.Mamani',
  cargo: ' Asesora ',
  presentacion: '',
  especialidades: 'SUV, suv, Eléctricos',
  publicoWeb: true,
  actualizadoEnEsperado: '2026-11-12T10:00:00.000Z',
}

describe('esquemaFicha', () => {
  it('limpia: identificador en minúsculas, textos recortados y especialidades sin repetir', () => {
    const r = esquemaFicha.parse(base)
    expect(r.handle).toBe('rosa.mamani')
    expect(r.cargo).toBe('Asesora')
    expect(r.especialidades).toEqual(['SUV', 'Eléctricos'])
  })

  it('aparecer en la web sin WhatsApp lo rechaza en el campo del WhatsApp', () => {
    const r = esquemaFicha.safeParse({ ...base, whatsapp: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]).toMatchObject({ path: ['whatsapp'], message: MENSAJE_SIN_WHATSAPP })
  })

  it('sin aparecer en la web, todo puede ir vacío', () => {
    const vacio = {
      ...base,
      whatsapp: '',
      handle: '',
      cargo: '',
      especialidades: '',
      publicoWeb: false,
    }
    expect(esquemaFicha.safeParse(vacio).success).toBe(true)
  })

  it('rechaza un WhatsApp sin código de país y más de 8 especialidades', () => {
    expect(esquemaFicha.safeParse({ ...base, whatsapp: '70000000' }).success).toBe(false)
    const nueve = Array.from({ length: 9 }, (_, i) => `e${String(i)}`).join(',')
    expect(esquemaFicha.safeParse({ ...base, especialidades: nueve }).success).toBe(false)
  })
})
