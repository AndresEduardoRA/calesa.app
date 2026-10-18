import { describe, expect, it } from 'vitest'
import { CLAVE_DEL_ALTA, hayAlgoEscritoEnElAlta } from './alta'
import { valoresDeSeguimientoNuevo } from './seguimiento-nuevo'

describe('hayAlgoEscritoEnElAlta', () => {
  const vacio = {
    [CLAVE_DEL_ALTA.telefono]: '',
    [CLAVE_DEL_ALTA.nombre]: '',
    [CLAVE_DEL_ALTA.tipo]: 'p',
  }
  const seguimiento = valoresDeSeguimientoNuevo([{ id: 't1' }])

  it('un alta recién abierta no tiene nada escrito', () => {
    expect(hayAlgoEscritoEnElAlta(vacio, seguimiento)).toBe(false)
  })

  it('el teléfono o el nombre bastan; los espacios no cuentan', () => {
    expect(
      hayAlgoEscritoEnElAlta({ ...vacio, [CLAVE_DEL_ALTA.telefono]: '7000' }, seguimiento),
    ).toBe(true)
    expect(hayAlgoEscritoEnElAlta({ ...vacio, [CLAVE_DEL_ALTA.nombre]: 'Ana' }, seguimiento)).toBe(
      true,
    )
    expect(hayAlgoEscritoEnElAlta({ ...vacio, [CLAVE_DEL_ALTA.nombre]: '   ' }, seguimiento)).toBe(
      false,
    )
  })

  it('algo del primer seguimiento cuenta', () => {
    expect(hayAlgoEscritoEnElAlta(vacio, { ...seguimiento, titulo: 'Llamé' })).toBe(true)
  })

  it('cambiar el origen o el tipo solos no es un lead a medio hacer', () => {
    expect(hayAlgoEscritoEnElAlta({ ...vacio, [CLAVE_DEL_ALTA.tipo]: 'c' }, seguimiento)).toBe(
      false,
    )
  })
})
