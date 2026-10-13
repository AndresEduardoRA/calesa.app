import { describe, expect, it } from 'vitest'
import { esquemaCrearCampo, esquemaGuardarCampo, esquemaMoverCampo } from './campos'

const ID = '00000000-0000-0000-0000-00000000000a'

const NUEVO = {
  origenId: ID,
  clave: 'kit_de_extras',
  etiqueta: 'Kit de extras',
  tipo: 'texto',
  opciones: [],
  requerido: false,
  grupo: '',
  enTarjeta: false,
  filtrable: false,
  publicoWeb: false,
  claveApibara: '',
}

describe('esquemaCrearCampo', () => {
  it('acepta un campo de texto y deja en null el grupo y la clave vacíos', () => {
    const campo = esquemaCrearCampo.parse(NUEVO)
    expect(campo.grupo).toBeNull()
    expect(campo.claveApibara).toBeNull()
  })

  it('rechaza una clave que es una columna de vehículos', () => {
    expect(esquemaCrearCampo.safeParse({ ...NUEVO, clave: 'vin' }).success).toBe(false)
  })

  it('un campo de opciones necesita al menos una', () => {
    expect(esquemaCrearCampo.safeParse({ ...NUEVO, tipo: 'opcion' }).success).toBe(false)
    expect(
      esquemaCrearCampo.safeParse({
        ...NUEVO,
        tipo: 'opcion',
        opciones: [{ clave: 'full', etiqueta: 'Full' }],
      }).success,
    ).toBe(true)
  })

  it('un campo sin opciones no las lleva', () => {
    const r = esquemaCrearCampo.safeParse({
      ...NUEVO,
      opciones: [{ clave: 'full', etiqueta: 'Full' }],
    })
    expect(r.success).toBe(false)
  })

  it('no repite la clave de una opción', () => {
    const r = esquemaCrearCampo.safeParse({
      ...NUEVO,
      tipo: 'multi_opcion',
      opciones: [
        { clave: 'a', etiqueta: 'A' },
        { clave: 'a', etiqueta: 'Otra A' },
      ],
    })
    expect(r.success).toBe(false)
  })
})

describe('esquemaGuardarCampo', () => {
  const base = { id: ID, actualizadoEnEsperado: '2026-10-12T20:00:00+00:00' }

  it('pide la versión y algo que cambiar', () => {
    expect(esquemaGuardarCampo.safeParse({ id: ID, cambios: { filtrable: true } }).success).toBe(
      false,
    )
    expect(esquemaGuardarCampo.safeParse({ ...base, cambios: {} }).success).toBe(false)
    expect(esquemaGuardarCampo.safeParse({ ...base, cambios: { filtrable: true } }).success).toBe(
      true,
    )
  })

  it('un grupo vacío vacía el grupo, y ausente no lo toca', () => {
    const vacio = esquemaGuardarCampo.parse({ ...base, cambios: { grupo: '  ' } })
    expect(vacio.cambios.grupo).toBeNull()
    const ausente = esquemaGuardarCampo.parse({ ...base, cambios: { requerido: true } })
    expect('grupo' in ausente.cambios).toBe(false)
  })
})

describe('esquemaMoverCampo', () => {
  it('acepta null para ponerlo primero', () => {
    const r = esquemaMoverCampo.safeParse({
      id: ID,
      despuesDe: null,
      actualizadoEnEsperado: 'x',
    })
    expect(r.success).toBe(true)
  })
})
