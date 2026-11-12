import { describe, expect, it } from 'vitest'
import { apagadosDesde, conPreferencia, estaEncendido } from './preferencia-de-push'

describe('apagadosDesde', () => {
  it('sólo cuenta lo que es exactamente false', () => {
    expect(apagadosDesde({ tarea_asignada: false, mensaje: true, evento: 0, otro: null })).toEqual({
      tarea_asignada: false,
    })
  })

  it.each([null, undefined, 'texto', 7, ['mensaje']])(
    'lo que no es un objeto (%j) es todo encendido',
    (valor) => {
      expect(apagadosDesde(valor)).toEqual({})
    },
  )
})

describe('estaEncendido', () => {
  it('sin fila todo está encendido', () => {
    expect(estaEncendido({}, 'mensaje')).toBe(true)
    expect(estaEncendido({ mensaje: false }, 'mensaje')).toBe(false)
    expect(estaEncendido({ mensaje: false }, 'constructor')).toBe(true)
  })
})

describe('conPreferencia', () => {
  it('apagar agrega la clave y conserva las otras', () => {
    expect(conPreferencia({ mensaje: false }, 'recordatorio', false)).toEqual({
      mensaje: false,
      recordatorio: false,
    })
    expect(conPreferencia(null, 'recordatorio', false)).toEqual({ recordatorio: false })
  })

  it('encender la quita', () => {
    expect(conPreferencia({ mensaje: false, evento: false }, 'mensaje', true)).toEqual({
      evento: false,
    })
  })

  it('un objeto vacío indica borrar la fila', () => {
    expect(conPreferencia({ mensaje: false }, 'mensaje', true)).toBeNull()
    expect(conPreferencia(null, 'mensaje', true)).toBeNull()
  })

  it('limpia lo que no era false al reescribir', () => {
    expect(conPreferencia({ mensaje: true, raro: 3 }, 'evento', false)).toEqual({ evento: false })
  })
})
