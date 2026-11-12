import { describe, expect, it } from 'vitest'
import { TIPOS_DE_NOTIFICACION, accionaAlAbrir, tipoDe } from './tipos'

const DE_LA_BASE = [
  'tarea_asignada',
  'recordatorio',
  'lead_compartido',
  'lead_transferido',
  'limpieza_pronto',
  'demora_fase',
  'turno_web',
  'turno_web_perdido',
  'evento',
  'evento_invitacion',
  'mensaje',
]

describe('tipoDe', () => {
  it.each(DE_LA_BASE)('conoce el tipo %s', (tipo) => {
    expect(TIPOS_DE_NOTIFICACION[tipo]).toBeDefined()
    expect(tipoDe(tipo)).toBe(TIPOS_DE_NOTIFICACION[tipo])
  })

  it('uno desconocido da el genérico y no lanza', () => {
    const generico = tipoDe('algo_que_aun_no_existe')
    expect(generico.icono).toBe('Bell')
    expect(generico.accionAlAbrir).toBe(false)
    expect(tipoDe('')).toBe(generico)
  })

  it('no confunde con propiedades heredadas del objeto', () => {
    expect(tipoDe('constructor').accionAlAbrir).toBe(false)
    expect(tipoDe('__proto__').icono).toBe('Bell')
  })
})

describe('accionaAlAbrir', () => {
  it.each(['tarea_asignada', 'recordatorio', 'demora_fase'])(
    'abrir %s la da por accionada si pedía acción',
    (tipo) => {
      expect(accionaAlAbrir(tipo, true)).toBe(true)
    },
  )

  it.each(['turno_web', 'limpieza_pronto', 'lead_compartido', 'desconocido'])(
    'abrir %s sólo la marca leída',
    (tipo) => {
      expect(accionaAlAbrir(tipo, true)).toBe(false)
    },
  )

  it('una fila que no pide acción nunca se acciona al abrir', () => {
    for (const tipo of DE_LA_BASE) {
      expect(accionaAlAbrir(tipo, false)).toBe(false)
    }
  })
})
