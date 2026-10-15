import { describe, expect, it } from 'vitest'
import { avisoDeVerificacion, leadAbrible, verificacionDesde } from './verificacion'

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

  it('al cambiar el principal, uno sin dueño no se toma: sólo se dice y bloquea', () => {
    expect(avisoDeVerificacion({ estado: 'limbo' }, 'cambio')).toMatchObject({
      tono: 'peligro',
      bloquea: true,
      ofreceTomar: false,
    })
  })

  it('el principal de este mismo lead bloquea: no hay nada que cambiar', () => {
    expect(avisoDeVerificacion({ estado: 'mismo' }, 'cambio')).toMatchObject({
      texto: 'Ese es el teléfono principal de este lead.',
      bloquea: true,
    })
  })

  it('un número que es extra de otro lead avisa, con la misma regla de qué se dice, y no bloquea', () => {
    const visto = avisoDeVerificacion({
      estado: 'libre',
      alterno: { estado: 'existe', leadId: ID, numero: 12, nombre: 'Ana Quispe', esMio: false },
    })
    expect(visto).toMatchObject({ tono: 'aviso', bloquea: false, ofreceTomar: false })
    expect(visto.texto).toBe('Figura como teléfono extra de Ana Quispe (#12).')
    expect(
      avisoDeVerificacion({ estado: 'libre', alterno: { estado: 'de_otro', dueno: 'Diego' } })
        .texto,
    ).toBe('Figura como teléfono extra de un lead de Diego.')
    expect(
      avisoDeVerificacion({ estado: 'libre', alterno: { estado: 'de_otro', dueno: null } }).texto,
    ).toBe('Figura como teléfono extra de un lead de otra persona.')
  })

  it('un extra de este lead dice que pasará a ser el principal', () => {
    const aviso = avisoDeVerificacion({ estado: 'libre', esExtra: true }, 'cambio')
    expect(aviso.bloquea).toBe(false)
    expect(aviso.texto).toMatch(/pasará a ser el principal/)
  })
})

describe('verificacionDesde: alterno y mismo', () => {
  it('lee el alterno de un lead que se ve y el de uno que no', () => {
    expect(
      verificacionDesde({
        estado: 'libre',
        alterno: { estado: 'existe', lead_id: ID, numero: 7, nombre: 'Ana', es_mio: true },
      }),
    ).toEqual({
      estado: 'libre',
      alterno: { estado: 'existe', leadId: ID, numero: 7, nombre: 'Ana', esMio: true },
    })
    expect(
      verificacionDesde({ estado: 'libre', alterno: { estado: 'de_otro', dueno: 'Diego' } }),
    ).toEqual({ estado: 'libre', alterno: { estado: 'de_otro', dueno: 'Diego' } })
  })

  it('lee «mismo» y «es_extra»', () => {
    expect(verificacionDesde({ estado: 'mismo' })).toEqual({ estado: 'mismo' })
    expect(verificacionDesde({ estado: 'libre', es_extra: true })).toEqual({
      estado: 'libre',
      esExtra: true,
    })
  })
})

describe('leadAbrible', () => {
  it('lleva al lead que se ve, sea por el principal o por un extra', () => {
    expect(
      leadAbrible({ estado: 'existe', leadId: ID, numero: 1, nombre: 'Ana', esMio: false }),
    ).toBe(ID)
    expect(
      leadAbrible({
        estado: 'libre',
        alterno: { estado: 'existe', leadId: ID, numero: 1, nombre: 'Ana', esMio: false },
      }),
    ).toBe(ID)
  })

  it('no lleva a ninguno de lo que no se ve ni de lo libre', () => {
    expect(leadAbrible({ estado: 'libre' })).toBeNull()
    expect(leadAbrible({ estado: 'de_otro', dueno: 'Diego' })).toBeNull()
    expect(leadAbrible({ estado: 'libre', alterno: { estado: 'de_otro', dueno: null } })).toBeNull()
  })
})
