import { describe, expect, it } from 'vitest'
import {
  esquemaDeValor,
  motivosPorCampo,
  numero,
  requerir,
  texto,
  type Esquema,
} from './esquema-de-valor'
import { TIPOS_DE_CAMPO } from './tipos'

const OPCIONES = [{ clave: 'a', etiqueta: 'Alfa' }]

function pasa(esquema: Esquema, valor: unknown): unknown {
  const r = esquema.safeParse(valor)
  return r.success ? r.data : 'ERROR'
}

describe('esquemaDeValor', () => {
  it('todo tipo de campo tiene su esquema', () => {
    for (const tipo of TIPOS_DE_CAMPO) {
      expect(esquemaDeValor({ tipo, opciones: OPCIONES })).toBeDefined()
    }
  })

  it('el correo acepta la forma de un correo y lo vacío es sin dato', () => {
    const esquema = esquemaDeValor({ tipo: 'correo', opciones: [] })
    expect(pasa(esquema, ' ana@correo.com ')).toBe('ana@correo.com')
    expect(pasa(esquema, '')).toBeNull()
    expect(pasa(esquema, 'ana@correo')).toBe('ERROR')
    expect(pasa(esquema, 'ana correo@x.com')).toBe('ERROR')
    expect(pasa(esquema, `${'a'.repeat(160)}@x.com`)).toBe('ERROR')
  })

  it('el documento lleva letras, números y separadores, hasta 30', () => {
    const esquema = esquemaDeValor({ tipo: 'documento', opciones: [] })
    expect(pasa(esquema, '1234567 LP')).toBe('1234567 LP')
    expect(pasa(esquema, 'AB-12/3.4')).toBe('AB-12/3.4')
    expect(pasa(esquema, '')).toBeNull()
    expect(pasa(esquema, '-123')).toBe('ERROR')
    expect(pasa(esquema, 'a'.repeat(31))).toBe('ERROR')
    expect(pasa(esquema, 'a#b')).toBe('ERROR')
  })

  it('una opción que se sacó vale mientras el registro la tenga guardada', () => {
    const sin = esquemaDeValor({ tipo: 'opcion', opciones: OPCIONES })
    const con = esquemaDeValor({ tipo: 'opcion', opciones: OPCIONES }, { guardado: 'vieja' })
    expect(pasa(sin, 'vieja')).toBe('ERROR')
    expect(pasa(con, 'vieja')).toBe('vieja')
    expect(pasa(con, 'a')).toBe('a')
  })

  it('varias opciones: sin duplicados y vacío es sin dato', () => {
    const esquema = esquemaDeValor({ tipo: 'multi_opcion', opciones: OPCIONES })
    expect(pasa(esquema, ['a', 'a'])).toEqual(['a'])
    expect(pasa(esquema, [])).toBeNull()
    expect(pasa(esquema, ['z'])).toBe('ERROR')
  })

  it('una fecha con hora se guarda como instante, en la zona de la empresa', () => {
    const esquema = esquemaDeValor({ tipo: 'fecha_hora', opciones: [] }, { zona: 'America/La_Paz' })
    expect(pasa(esquema, '2026-10-14T09:00')).toBe('2026-10-14T13:00:00.000Z')
    expect(pasa(esquema, 'ayer')).toBe('ERROR')
  })

  it('un número acepta la coma decimal', () => {
    const esquema = esquemaDeValor({ tipo: 'numero', opciones: [] })
    expect(pasa(esquema, '1,6')).toBe(1.6)
    expect(pasa(esquema, 'x')).toBe('ERROR')
  })
})

describe('requerir', () => {
  it('rechaza el sin dato con su motivo', () => {
    const esquema = requerir(texto(10))
    expect(pasa(esquema, '')).toBe('ERROR')
    expect(pasa(esquema, 'hola')).toBe('hola')
    const r = esquema.safeParse('')
    expect(r.success ? '' : r.error.issues[0]?.message).toBe('Este dato es obligatorio.')
  })
})

describe('numero', () => {
  it('respeta el rango y que sea entero', () => {
    expect(pasa(numero(1, 10, true), '5')).toBe(5)
    expect(pasa(numero(1, 10, true), '5,5')).toBe('ERROR')
    expect(pasa(numero(1, 10, true), '11')).toBe('ERROR')
  })
})

describe('motivosPorCampo', () => {
  it('deja el primer motivo de cada campo', () => {
    const r = requerir(texto(2)).safeParse('abc')
    expect(r.success).toBe(false)
    const motivos = motivosPorCampo([
      { code: 'custom', path: ['a.x'], message: 'uno' },
      { code: 'custom', path: ['a.x'], message: 'dos' },
      { code: 'custom', path: ['b'], message: 'tres' },
    ])
    expect(motivos).toEqual({ 'a.x': 'uno', b: 'tres' })
  })
})
