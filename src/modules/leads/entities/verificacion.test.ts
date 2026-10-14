import { describe, expect, it } from 'vitest'
import { avisoDeVerificacion, verificacionDesde } from './verificacion'

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'

describe('verificacionDesde', () => {
  it('lee los cuatro estados', () => {
    expect(verificacionDesde({ estado: 'libre' })).toEqual({ estado: 'libre' })
    expect(verificacionDesde({ estado: 'limbo' })).toEqual({ estado: 'limbo' })
    expect(
      verificacionDesde({ estado: 'existe', lead_id: ID, numero: 12, nombre: 'Ana', es_mio: true }),
    ).toEqual({ estado: 'existe', leadId: ID, numero: 12, nombre: 'Ana', esMio: true })
    expect(verificacionDesde({ estado: 'de_otro', dueno: 'Diego', dueno_id: ID })).toEqual({
      estado: 'de_otro',
      dueno: 'Diego',
    })
    expect(verificacionDesde({ estado: 'de_otro' })).toEqual({ estado: 'de_otro', dueno: null })
  })

  it('un estado que no existe es un error, no un valor', () => {
    expect(() => verificacionDesde({ estado: 'otro' })).toThrow()
    expect(() => verificacionDesde(null)).toThrow()
  })
})

describe('avisoDeVerificacion', () => {
  it('libre no dice nada y deja seguir', () => {
    expect(avisoDeVerificacion({ estado: 'libre' })).toMatchObject({
      texto: '',
      bloquea: false,
      ofreceTomar: false,
    })
  })

  it('un lead mío o que puedo ver bloquea y dice cuál es', () => {
    const mio = avisoDeVerificacion({
      estado: 'existe',
      leadId: ID,
      numero: 12,
      nombre: 'Ana Quispe',
      esMio: true,
    })
    expect(mio).toMatchObject({ bloquea: true, ofreceTomar: false, tono: 'peligro' })
    expect(mio.texto).toBe('Ya existe: Ana Quispe (#12), y es tuyo.')
    const visto = avisoDeVerificacion({
      estado: 'existe',
      leadId: ID,
      numero: 12,
      nombre: 'Ana Quispe',
      esMio: false,
    })
    expect(visto.texto).toBe('Ya existe: Ana Quispe (#12).')
  })

  it('el de otra persona dice de quién y nada más', () => {
    expect(avisoDeVerificacion({ estado: 'de_otro', dueno: 'Diego Vargas' })).toMatchObject({
      texto: 'Lo tiene Diego Vargas.',
      bloquea: true,
      ofreceTomar: false,
    })
    expect(avisoDeVerificacion({ estado: 'de_otro', dueno: null }).texto).toBe(
      'Lo tiene otra persona.',
    )
  })

  it('uno sin dueño ofrece tomarlo y todavía no bloquea', () => {
    expect(avisoDeVerificacion({ estado: 'limbo' })).toMatchObject({
      texto: 'Sin dueño.',
      bloquea: false,
      ofreceTomar: true,
    })
  })
})
