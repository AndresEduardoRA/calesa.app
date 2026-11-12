import { describe, expect, it } from 'vitest'
import {
  MOTIVO_SIN_CONEXION_PARA_PUBLICAR,
  MOTIVO_SIN_PERMISO_PARA_PUBLICAR,
  MOTIVO_SIN_TEXTO_PARA_PUBLICAR,
  esFechaDeProgramar,
  esSlugValido,
  estadoDeGuia,
  fechaDePublicarYa,
  puedePublicar,
  rutaDeGuia,
  slugDe,
  tieneCuerpo,
} from './guias'

const AHORA = new Date('2026-11-12T12:00:00.000Z')

describe('estadoDeGuia', () => {
  it('sin fecha es borrador', () => {
    expect(estadoDeGuia(null, AHORA)).toBe('borrador')
  })
  it('una fecha pasada, o exactamente ahora, es publicada', () => {
    expect(estadoDeGuia('2026-11-12T11:59:59.000Z', AHORA)).toBe('publicada')
    expect(estadoDeGuia('2026-11-12T12:00:00.000Z', AHORA)).toBe('publicada')
  })
  it('una fecha futura es programada', () => {
    expect(estadoDeGuia('2026-11-12T12:00:01.000Z', AHORA)).toBe('programada')
  })
})

describe('slugDe y esSlugValido', () => {
  it('quita tildes y símbolos', () => {
    expect(slugDe('Cómo importar un Corolla 2020')).toBe('como-importar-un-corolla-2020')
    expect(slugDe('  ¡Ñandú & co.!  ')).toBe('nandu-co')
  })
  it('sólo símbolos queda vacío', () => {
    expect(slugDe('¿¡?!')).toBe('')
  })
  it('corta a 80 sin dejar un guion al final', () => {
    const slug = slugDe(`${'a'.repeat(79)} b`)
    expect(slug.length).toBeLessThanOrEqual(80)
    expect(slug.endsWith('-')).toBe(false)
  })
  it('valida el formato', () => {
    expect(esSlugValido('como-importar-2020')).toBe(true)
    expect(esSlugValido('')).toBe(false)
    expect(esSlugValido('Con-Mayusculas')).toBe(false)
    expect(esSlugValido('doble--guion')).toBe(false)
    expect(esSlugValido('-empieza')).toBe(false)
    expect(esSlugValido('a'.repeat(81))).toBe(false)
  })
})

describe('puedePublicar', () => {
  const todo = { permitido: true, conCuerpo: true, enLinea: true }
  it('con todo, sí', () => {
    expect(puedePublicar(todo)).toEqual({ ok: true })
  })
  it('los motivos van en su orden: permiso, texto, red', () => {
    expect(puedePublicar({ permitido: false, conCuerpo: false, enLinea: false })).toEqual({
      ok: false,
      motivo: MOTIVO_SIN_PERMISO_PARA_PUBLICAR,
    })
    expect(puedePublicar({ ...todo, conCuerpo: false, enLinea: false })).toEqual({
      ok: false,
      motivo: MOTIVO_SIN_TEXTO_PARA_PUBLICAR,
    })
    expect(puedePublicar({ ...todo, enLinea: false })).toEqual({
      ok: false,
      motivo: MOTIVO_SIN_CONEXION_PARA_PUBLICAR,
    })
  })
})

describe('tieneCuerpo', () => {
  it('nulo o sin texto no tiene', () => {
    expect(tieneCuerpo(null)).toBe(false)
    expect(tieneCuerpo({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe(false)
  })
  it('con texto sí; con un documento rechazado no', () => {
    expect(
      tieneCuerpo({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hola' }] }],
      }),
    ).toBe(true)
    expect(tieneCuerpo({ type: 'doc', content: [{ type: 'script' }] })).toBe(false)
  })
})

describe('fechas', () => {
  it('publicar ya pone la fecha un minuto antes', () => {
    expect(fechaDePublicarYa(AHORA)).toBe('2026-11-12T11:59:00.000Z')
  })
  it('programar pide al menos un minuto adelante', () => {
    expect(esFechaDeProgramar('2026-11-12T12:01:00.000Z', AHORA)).toBe(true)
    expect(esFechaDeProgramar('2026-11-12T12:00:59.000Z', AHORA)).toBe(false)
    expect(esFechaDeProgramar('ayer', AHORA)).toBe(false)
  })
})

describe('rutaDeGuia', () => {
  it('es la página de la guía bajo Sitio web', () => {
    expect(rutaDeGuia('abc')).toBe('/configuracion/web/guias/abc')
  })
})
