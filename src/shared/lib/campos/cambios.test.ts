import { describe, expect, it } from 'vitest'
import { mismasOpciones, mismoValorDefecto, necesitaVistaPrevia, opcionesQuitadas } from './cambios'

const A = { clave: 'a', etiqueta: 'A' }
const B = { clave: 'b', etiqueta: 'B' }
const CAMPO = { tipo: 'opcion', requerido: false, opciones: [A, B] } as const

describe('mismasOpciones', () => {
  it('compara clave, etiqueta y orden', () => {
    expect(mismasOpciones([A, B], [A, B])).toBe(true)
    expect(mismasOpciones([A, B], [B, A])).toBe(false)
    expect(mismasOpciones([A], [A, B])).toBe(false)
    expect(mismasOpciones([A], [{ clave: 'a', etiqueta: 'Otra' }])).toBe(false)
  })
})

describe('mismoValorDefecto', () => {
  it('compara listas por contenido y el resto por igualdad', () => {
    expect(mismoValorDefecto(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(mismoValorDefecto(['a'], ['a', 'b'])).toBe(false)
    expect(mismoValorDefecto('x', 'x')).toBe(true)
    expect(mismoValorDefecto(null, 'x')).toBe(false)
  })
})

describe('opcionesQuitadas', () => {
  it('sin opciones en el cambio no se saca nada', () => {
    expect(opcionesQuitadas(CAMPO, {})).toEqual([])
  })

  it('devuelve las que ya no están', () => {
    expect(opcionesQuitadas(CAMPO, { opciones: [A] })).toEqual([B])
  })
})

describe('necesitaVistaPrevia', () => {
  it('cambiar el tipo, volver requerido o sacar una opción piden contar', () => {
    expect(necesitaVistaPrevia(CAMPO, { tipo: 'texto' })).toBe(true)
    expect(necesitaVistaPrevia(CAMPO, { requerido: true })).toBe(true)
    expect(necesitaVistaPrevia(CAMPO, { opciones: [A] })).toBe(true)
  })

  it('renombrar, desactivar o dejar el mismo tipo no', () => {
    expect(necesitaVistaPrevia(CAMPO, { etiqueta: 'Otro' })).toBe(false)
    expect(necesitaVistaPrevia(CAMPO, { activo: false })).toBe(false)
    expect(necesitaVistaPrevia(CAMPO, { tipo: 'opcion' })).toBe(false)
    expect(necesitaVistaPrevia({ ...CAMPO, requerido: true }, { requerido: true })).toBe(false)
  })
})
