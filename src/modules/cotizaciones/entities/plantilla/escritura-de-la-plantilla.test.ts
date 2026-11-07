import { describe, expect, it } from 'vitest'
import {
  esquemaDeNotaDePlantilla,
  LARGO_MAXIMO_DE_NOTA_DE_PLANTILLA,
  rechazoHaciaUnCampo,
} from './escritura-de-la-plantilla'
import { REGLAS_DE_PLANTILLA, rechazoDePlantilla } from './motivos-de-plantilla'

describe('rechazoHaciaUnCampo: las nueve reglas de la plantilla', () => {
  it.each(REGLAS_DE_PLANTILLA)(
    '«%s»: va al campo `donde`, con el mensaje de la base tal cual',
    (regla) => {
      const { mensaje } = rechazoDePlantilla(regla, 'grupos[2].tono')
      expect(
        rechazoHaciaUnCampo({
          code: '22023',
          message: mensaje,
          details: regla,
          hint: 'grupos[2].tono',
        }),
      ).toEqual({
        ok: false,
        error: { codigo: 'regla', mensaje },
        porCampo: { 'grupos[2].tono': mensaje },
      })
    },
  )

  it('sin `hint`, el campo es `definicion`', () => {
    const r = rechazoHaciaUnCampo({ code: '22023', message: 'M', details: 'forma' })
    expect(r).toMatchObject({ porCampo: { definicion: 'M' } })
    expect(
      rechazoHaciaUnCampo({ code: '22023', message: 'M', details: 'forma', hint: '  ' }),
    ).toMatchObject({
      porCampo: { definicion: 'M' },
    })
  })

  it('un id con «column» o «relation» en el mensaje no cae al genérico', () => {
    const { mensaje } = rechazoDePlantilla('nodo_inexistente', 'columna_x')
    expect(mensaje).toMatch(/column/i)
    const r = rechazoHaciaUnCampo({
      code: '22023',
      message: mensaje,
      details: 'nodo_inexistente',
      hint: 'etiquetas.columna_x',
    })
    expect(r).toMatchObject({
      error: { mensaje },
      porCampo: { 'etiquetas.columna_x': mensaje },
    })
  })

  it('un mensaje vacío cae al genérico del 22023', () => {
    const r = rechazoHaciaUnCampo({ code: '22023', message: ' ', details: 'forma', hint: 'logo' })
    expect(r).toMatchObject({
      error: { mensaje: 'Hay un dato que no es válido.' },
      porCampo: { logo: 'Hay un dato que no es válido.' },
    })
  })
})

describe('rechazoHaciaUnCampo: lo demás', () => {
  it('«Publicar pide una nota.» (22023, hint nota) va al campo `nota`', () => {
    expect(
      rechazoHaciaUnCampo({ code: '22023', message: 'Publicar pide una nota.', hint: 'nota' }),
    ).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'Publicar pide una nota.' },
      porCampo: { nota: 'Publicar pide una nota.' },
    })
  })

  it('el PT409 conserva el mensaje de la base y no va a un campo', () => {
    const mensaje = 'El borrador de esta plantilla cambió hace 2 min, mientras lo editabas.'
    expect(rechazoHaciaUnCampo({ code: 'PT409', message: mensaje })).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje },
    })
  })

  it('el 42501 es sin permiso; un 22P02 técnico, inesperado, y ninguno va a un campo', () => {
    expect(rechazoHaciaUnCampo({ code: '42501', message: 'No tienes permiso.' })).toEqual({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: 'No tienes permiso.' },
    })
    const r = rechazoHaciaUnCampo({ code: '22P02', message: 'invalid input syntax for type json' })
    expect(r).toMatchObject({ ok: false, error: { codigo: 'inesperado' } })
    expect('porCampo' in r).toBe(false)
  })

  it('un 22023 que no es de la plantilla ni de la nota queda sin campo', () => {
    const r = rechazoHaciaUnCampo({
      code: '22023',
      message: 'Otra cosa.',
      details: 'otra',
      hint: 'x',
    })
    expect('porCampo' in r).toBe(false)
  })
})

describe('esquemaDeNotaDePlantilla', () => {
  const motivo = (nota: string) => {
    const r = esquemaDeNotaDePlantilla.safeParse(nota)
    return r.success ? null : r.error.issues[0]?.message
  }

  it('una nota con texto pasa, sin los espacios de los bordes', () => {
    const r = esquemaDeNotaDePlantilla.safeParse('  Nueva portada  ')
    expect(r.success && r.data).toBe('Nueva portada')
  })

  it('vacía o en blanco: «Publicar pide una nota.»', () => {
    expect(motivo('')).toBe('Publicar pide una nota.')
    expect(motivo('   ')).toBe('Publicar pide una nota.')
  })

  it('pasa de 2.000 caracteres: no; 2.000 emojis sí (se cuentan caracteres, no UTF-16)', () => {
    expect(LARGO_MAXIMO_DE_NOTA_DE_PLANTILLA).toBe(2000)
    expect(motivo('a'.repeat(2001))).toBe('La nota pasa de 2.000 caracteres.')
    expect(motivo('😀'.repeat(2001))).toBe('La nota pasa de 2.000 caracteres.')
    expect(motivo('😀'.repeat(2000))).toBeNull()
    expect(motivo('a'.repeat(2000))).toBeNull()
  })

  it('con un surrogate suelto o un `\\u0000`: un carácter que no se puede guardar', () => {
    expect(motivo('hola\uD83D')).toBe('La nota tiene un carácter que no se puede guardar.')
    expect(motivo('ho\u0000la')).toBe('La nota tiene un carácter que no se puede guardar.')
    expect(motivo('hola 😀')).toBeNull()
  })
})
