import { describe, expect, it } from 'vitest'
import { avisoDeVerificacion, leadAbrible, verificacionDesde } from './verificacion'

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'

const DOCE = { numero: 12, numeroPropio: null, creadorDelPropio: null }

describe('verificacionDesde', () => {
  it('lee los cuatro estados', () => {
    expect(verificacionDesde({ estado: 'libre' })).toEqual({ estado: 'libre' })
    expect(verificacionDesde({ estado: 'limbo' })).toEqual({ estado: 'limbo' })
    expect(
      verificacionDesde({ estado: 'existe', lead_id: ID, numero: 12, nombre: 'Ana', es_mio: true }),
    ).toEqual({
      estado: 'existe',
      leadId: ID,
      numeros: DOCE,
      nombre: 'Ana',
      esMio: true,
    })
    expect(verificacionDesde({ estado: 'de_otro', dueno: 'Diego', dueno_id: ID })).toEqual({
      estado: 'de_otro',
      dueno: 'Diego',
      duenoId: ID,
    })
    expect(verificacionDesde({ estado: 'de_otro' })).toEqual({ estado: 'de_otro', dueno: null })
  })

  it('duenoId sólo aparece si la base mandó dueno_id; uno ilegible es un error', () => {
    expect(verificacionDesde({ estado: 'de_otro', dueno: 'Diego' })).not.toHaveProperty('duenoId')
    expect(
      verificacionDesde({ estado: 'de_otro', dueno: 'Diego', dueno_id: null }),
    ).not.toHaveProperty('duenoId')
    expect(() => verificacionDesde({ estado: 'de_otro', dueno_id: 'no-es-guid' })).toThrow()
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
      numeros: DOCE,
      nombre: 'Ana Quispe',
      esMio: true,
    })
    expect(mio).toMatchObject({ bloquea: true, ofreceTomar: false, tono: 'peligro' })
    expect(mio.texto).toBe('Ya existe: Ana Quispe (N.º 12), y es tuyo.')
    const visto = avisoDeVerificacion({
      estado: 'existe',
      leadId: ID,
      numeros: DOCE,
      nombre: 'Ana Quispe',
      esMio: false,
    })
    expect(visto.texto).toBe('Ya existe: Ana Quispe (N.º 12).')
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
      alterno: {
        estado: 'existe',
        leadId: ID,
        numeros: { ...DOCE, numero: 7 },
        nombre: 'Ana',
        esMio: true,
        como: 'extra',
      },
    })
    expect(
      verificacionDesde({ estado: 'libre', alterno: { estado: 'de_otro', dueno: 'Diego' } }),
    ).toEqual({ estado: 'libre', alterno: { estado: 'de_otro', dueno: 'Diego', como: 'extra' } })
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
      leadAbrible({
        estado: 'existe',
        leadId: ID,
        numeros: { ...DOCE, numero: 1 },
        nombre: 'Ana',
        esMio: false,
      }),
    ).toBe(ID)
    expect(
      leadAbrible({
        estado: 'libre',
        alterno: {
          estado: 'existe',
          leadId: ID,
          numeros: { ...DOCE, numero: 1 },
          nombre: 'Ana',
          esMio: false,
          como: 'extra',
        },
      }),
    ).toBe(ID)
  })

  it('no lleva a ninguno de lo que no se ve ni de lo libre', () => {
    expect(leadAbrible({ estado: 'libre' })).toBeNull()
    expect(leadAbrible({ estado: 'de_otro', dueno: 'Diego' })).toBeNull()
    expect(
      leadAbrible({ estado: 'libre', alterno: { estado: 'de_otro', dueno: null, como: 'extra' } }),
    ).toBeNull()
  })
})

describe('avisoDeVerificacion: un teléfono que figura como extra de otro lead', () => {
  it('un número que es extra de otro lead avisa, con la misma regla de qué se dice, y no bloquea', () => {
    const visto = avisoDeVerificacion({
      estado: 'libre',
      alterno: {
        estado: 'existe',
        leadId: ID,
        numeros: DOCE,
        nombre: 'Ana Quispe',
        esMio: false,
        como: 'extra',
      },
    })
    expect(visto).toMatchObject({ tono: 'aviso', bloquea: false, ofreceTomar: false })
    expect(visto.texto).toBe('Figura como teléfono extra de Ana Quispe (N.º 12).')
    expect(
      avisoDeVerificacion({
        estado: 'libre',
        alterno: { estado: 'de_otro', dueno: 'Diego', como: 'extra' },
      }).texto,
    ).toBe('Figura como teléfono extra de un lead de Diego.')
    expect(
      avisoDeVerificacion({
        estado: 'libre',
        alterno: { estado: 'de_otro', dueno: null, como: 'extra' },
      }).texto,
    ).toBe('Figura como teléfono extra de un lead de otra persona.')
  })
})

const ANA = {
  estado: 'existe',
  leadId: ID,
  numeros: { ...DOCE, numero: 12 },
  nombre: 'Ana',
  esMio: false,
} as const

describe('verificacionDesde: «como» extra y principal', () => {
  it('lee «como: extra» en un lead que existe, uno de otro, uno sin dueño y un alterno', () => {
    expect(
      verificacionDesde({
        estado: 'existe',
        como: 'extra',
        lead_id: ID,
        numero: 12,
        nombre: 'Ana',
        es_mio: false,
      }),
    ).toEqual({ ...ANA, como: 'extra' })
    expect(verificacionDesde({ estado: 'de_otro', como: 'extra', dueno: 'Diego' })).toEqual({
      estado: 'de_otro',
      dueno: 'Diego',
      como: 'extra',
    })
    expect(verificacionDesde({ estado: 'limbo', como: 'extra' })).toEqual({
      estado: 'limbo',
      como: 'extra',
    })
    expect(
      verificacionDesde({
        estado: 'libre',
        alterno: { estado: 'de_otro', como: 'principal', dueno: 'Diego' },
      }),
    ).toEqual({
      estado: 'libre',
      alterno: { estado: 'de_otro', dueno: 'Diego', como: 'principal' },
    })
  })

  it('el principal de siempre no trae «como»', () => {
    expect(verificacionDesde({ estado: 'limbo' })).toEqual({ estado: 'limbo' })
  })
})

describe('avisoDeVerificacion: agregar un teléfono extra', () => {
  const aviso = (v: Parameters<typeof avisoDeVerificacion>[0]) => avisoDeVerificacion(v, 'extra')

  it('el principal del propio lead y uno que ya es extra suyo bloquean', () => {
    expect(aviso({ estado: 'mismo' })).toMatchObject({
      texto: 'Ese es el teléfono principal de este lead.',
      bloquea: true,
    })
    expect(aviso({ estado: 'libre', esExtra: true })).toMatchObject({
      texto: 'Ese número ya está en este lead.',
      bloquea: true,
    })
  })

  it('con la regla encendida, un número de otro lead bloquea y lo dice', () => {
    expect(aviso({ ...ANA, como: 'extra' })).toMatchObject({
      texto: 'Ya es de Ana (N.º 12). Un teléfono extra no puede repetirse en otro lead.',
      bloquea: true,
    })
    expect(aviso({ estado: 'de_otro', dueno: 'Diego' })).toMatchObject({
      texto: 'Lo tiene Diego.',
      bloquea: true,
    })
    expect(aviso({ estado: 'limbo' })).toMatchObject({
      texto: 'Ya lo tiene un lead sin dueño. No se puede usar este número.',
      bloquea: true,
      ofreceTomar: false,
    })
  })

  it('con la regla apagada, sólo avisa: el principal de otro lead y el extra de otro', () => {
    expect(aviso({ estado: 'libre', alterno: { ...ANA, como: 'principal' } })).toMatchObject({
      texto: 'Es el teléfono principal de Ana (N.º 12).',
      bloquea: false,
      tono: 'aviso',
    })
    expect(
      aviso({ estado: 'libre', alterno: { estado: 'de_otro', dueno: 'Diego', como: 'principal' } })
        .texto,
    ).toBe('Es el teléfono principal de un lead de Diego.')
    expect(aviso({ estado: 'libre', alterno: { ...ANA, como: 'extra' } }).texto).toBe(
      'Figura como teléfono extra de Ana (N.º 12).',
    )
    expect(aviso({ estado: 'libre' })).toMatchObject({ texto: '', bloquea: false })
  })
})

describe('avisoDeVerificacion: el alta y el cambio con un extra de otro lead', () => {
  it('suma «, como teléfono extra» si el número es un extra', () => {
    expect(avisoDeVerificacion({ ...ANA, como: 'extra' }).texto).toBe(
      'Ya existe: Ana (N.º 12), como teléfono extra.',
    )
    expect(avisoDeVerificacion({ ...ANA, como: 'extra', esMio: true }).texto).toBe(
      'Ya existe: Ana (N.º 12), como teléfono extra, y es tuyo.',
    )
    expect(avisoDeVerificacion({ estado: 'de_otro', dueno: 'Diego', como: 'extra' }).texto).toBe(
      'Lo tiene Diego, como teléfono extra.',
    )
    expect(avisoDeVerificacion({ ...ANA }).texto).toBe('Ya existe: Ana (N.º 12).')
  })
})
