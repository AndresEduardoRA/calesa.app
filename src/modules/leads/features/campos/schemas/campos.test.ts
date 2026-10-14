import { describe, expect, it } from 'vitest'
import { esquemaCrearCampo, esquemaGuardarCampo, esquemaMoverCampo } from './campos'

const BASE = {
  clave: 'signo_zodiacal',
  etiqueta: 'Signo zodiacal',
  tipo: 'opcion' as const,
  opciones: [{ clave: 'aries', etiqueta: 'Aries' }],
  requerido: false,
  grupo: 'Datos personales',
  enTabla: false,
  filtrable: true,
  soloCartera: false,
  valorDefecto: null,
  valorDefectoEmpresa: null,
}

describe('esquemaCrearCampo', () => {
  it('acepta un campo de opciones bien armado', () => {
    expect(esquemaCrearCampo.safeParse(BASE).success).toBe(true)
  })

  it('rechaza una clave reservada diciendo que es un dato fijo', () => {
    const resultado = esquemaCrearCampo.safeParse({ ...BASE, clave: 'telefono_principal' })
    expect(resultado.success).toBe(false)
    expect(resultado.error?.issues[0]?.message).toBe('Ese ya es un dato fijo de todos los leads.')
  })

  it('un lead no lleva VIN ni lote', () => {
    expect(esquemaCrearCampo.safeParse({ ...BASE, tipo: 'vin', opciones: [] }).success).toBe(false)
    expect(esquemaCrearCampo.safeParse({ ...BASE, tipo: 'lote', opciones: [] }).success).toBe(false)
  })

  it('el correo y el documento sí, y no llevan valor por defecto', () => {
    expect(esquemaCrearCampo.safeParse({ ...BASE, tipo: 'correo', opciones: [] }).success).toBe(
      true,
    )
    expect(
      esquemaCrearCampo.safeParse({ ...BASE, tipo: 'documento', opciones: [], valorDefecto: 'x' })
        .success,
    ).toBe(false)
  })

  it('un campo de opciones necesita al menos una', () => {
    expect(esquemaCrearCampo.safeParse({ ...BASE, opciones: [] }).success).toBe(false)
  })

  it('«la de la empresa» sólo en texto y sin valor fijo', () => {
    const texto = { ...BASE, tipo: 'texto' as const, opciones: [] }
    expect(esquemaCrearCampo.safeParse({ ...texto, valorDefectoEmpresa: 'ciudad' }).success).toBe(
      true,
    )
    expect(esquemaCrearCampo.safeParse({ ...BASE, valorDefectoEmpresa: 'ciudad' }).success).toBe(
      false,
    )
    expect(
      esquemaCrearCampo.safeParse({ ...texto, valorDefecto: 'Cbba', valorDefectoEmpresa: 'ciudad' })
        .success,
    ).toBe(false)
    expect(esquemaCrearCampo.safeParse({ ...texto, valorDefectoEmpresa: 'planeta' }).success).toBe(
      false,
    )
  })
})

describe('esquemaGuardarCampo', () => {
  const ID = '00000000-0000-0000-0000-000000000001'

  it('pide la versión y algo que guardar', () => {
    expect(
      esquemaGuardarCampo.safeParse({
        id: ID,
        actualizadoEnEsperado: '',
        cambios: { activo: false },
      }).success,
    ).toBe(false)
    expect(
      esquemaGuardarCampo.safeParse({ id: ID, actualizadoEnEsperado: 'v1', cambios: {} }).success,
    ).toBe(false)
  })

  it('«solo la cartera» y «en la tabla» viajan como cualquier bandera', () => {
    const resultado = esquemaGuardarCampo.safeParse({
      id: ID,
      actualizadoEnEsperado: 'v1',
      cambios: { soloCartera: true, enTabla: true },
    })
    expect(resultado.success).toBe(true)
  })
})

describe('esquemaMoverCampo', () => {
  it('«después de X» o primero', () => {
    const base = { id: '00000000-0000-0000-0000-000000000001', actualizadoEnEsperado: 'v1' }
    expect(esquemaMoverCampo.safeParse({ ...base, despuesDe: null }).success).toBe(true)
    expect(
      esquemaMoverCampo.safeParse({
        ...base,
        despuesDe: '00000000-0000-0000-0000-000000000002',
      }).success,
    ).toBe(true)
    expect(esquemaMoverCampo.safeParse({ ...base, despuesDe: 'no-es-un-id' }).success).toBe(false)
  })
})
