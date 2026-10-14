import { describe, expect, it } from 'vitest'
import { campoDeFormulario, opcionesDeCampo } from './controles'
import { TIPOS_DE_CAMPO } from './tipos'

const OPCIONES = [
  { clave: 'a', etiqueta: 'Alfa' },
  { clave: 'b', etiqueta: 'Beta' },
]

describe('campoDeFormulario', () => {
  it('todo tipo de campo tiene su control', () => {
    for (const tipo of TIPOS_DE_CAMPO) {
      const campo = campoDeFormulario(
        { etiqueta: 'Dato', tipo, opciones: OPCIONES, requerido: false },
        undefined,
        'a.dato',
      )
      expect(campo.clave).toBe('a.dato')
      expect(campo.etiqueta).toBe('Dato')
    }
  })

  it('el correo y el documento son texto con su largo, y el correo pide teclado de correo', () => {
    const base = { etiqueta: 'X', opciones: [], requerido: true }
    expect(campoDeFormulario({ ...base, tipo: 'correo' }, null, 'c').control).toEqual({
      tipo: 'texto',
      largo: 160,
      modo: 'email',
    })
    expect(campoDeFormulario({ ...base, tipo: 'documento' }, null, 'd').control).toEqual({
      tipo: 'texto',
      largo: 30,
    })
    expect(campoDeFormulario({ ...base, tipo: 'documento' }, null, 'd').requerido).toBe(true)
  })

  it('un campo de opciones ofrece las del layout', () => {
    const { control } = campoDeFormulario(
      { etiqueta: 'X', tipo: 'opcion', opciones: OPCIONES, requerido: false },
      'a',
      'a.x',
    )
    expect(control).toEqual({
      tipo: 'opcion',
      opciones: [
        { valor: 'a', etiqueta: 'Alfa' },
        { valor: 'b', etiqueta: 'Beta' },
      ],
    })
  })
})

describe('opcionesDeCampo', () => {
  it('una opción guardada que ya se sacó se sigue ofreciendo, marcada', () => {
    expect(opcionesDeCampo(OPCIONES, 'vieja').map((o) => o.etiqueta)).toEqual([
      'Alfa',
      'Beta',
      'vieja (ya no se ofrece)',
    ])
    expect(opcionesDeCampo(OPCIONES, ['a', 'vieja']).map((o) => o.valor)).toEqual([
      'a',
      'b',
      'vieja',
    ])
  })

  it('lo vacío o lo que ya es una opción no suma nada', () => {
    expect(opcionesDeCampo(OPCIONES, '')).toHaveLength(2)
    expect(opcionesDeCampo(OPCIONES, 'a')).toHaveLength(2)
    expect(opcionesDeCampo(OPCIONES, null)).toHaveLength(2)
  })
})
