import { describe, expect, it } from 'vitest'
import type { Mensaje } from './mensajes'
import {
  LARGO_DE_CITA,
  citaDe,
  leerResultadoDeEdicion,
  motivoParaNoBorrar,
  puedeBorrar,
  puedeEditar,
  puedeResponder,
  textoDeCita,
  VENTANA_DE_EDICION_MINUTOS,
} from './reglas-del-mensaje'

const YO = '11111111-1111-4111-8111-111111111111'
const OTRA = '22222222-2222-4222-8222-222222222222'
const CREADO = '2026-11-12T10:00:00.000+00:00'
const T0 = Date.parse(CREADO)
const MINUTO = 60_000

function mensaje(extra: Partial<Mensaje> = {}): Mensaje {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    conversacionId: '33333333-3333-4333-8333-333333333333',
    autorId: YO,
    autorNombre: 'Ana',
    tipo: 'texto',
    cuerpo: 'Hola',
    creadoEn: CREADO,
    editadoEn: null,
    eliminadoEn: null,
    respondeAId: null,
    ficha: null,
    responde: null,
    estado: 'enviado',
    ...extra,
  }
}

describe('puedeEditar', () => {
  it('el autor edita dentro de la ventana, también a los 15:00 exactos', () => {
    expect(VENTANA_DE_EDICION_MINUTOS).toBe(15)
    expect(puedeEditar(mensaje(), YO, T0 + 14 * MINUTO + 59_000)).toBe(true)
    expect(puedeEditar(mensaje(), YO, T0 + 15 * MINUTO)).toBe(true)
  })

  it('pasado un instante de la ventana ya no', () => {
    expect(puedeEditar(mensaje(), YO, T0 + 15 * MINUTO + 1)).toBe(false)
  })

  it('la ventana se cuenta desde la creación, no desde la última edición', () => {
    const editado = mensaje({ editadoEn: '2026-11-12T10:14:00.000+00:00' })
    expect(puedeEditar(editado, YO, T0 + 16 * MINUTO)).toBe(false)
  })

  it('no edita lo ajeno, lo eliminado, lo no enviado ni lo que no es texto', () => {
    const ahora = T0 + MINUTO
    expect(puedeEditar(mensaje({ autorId: OTRA }), YO, ahora)).toBe(false)
    expect(puedeEditar(mensaje({ eliminadoEn: CREADO, cuerpo: null }), YO, ahora)).toBe(false)
    expect(puedeEditar(mensaje({ estado: 'enviando' }), YO, ahora)).toBe(false)
    expect(puedeEditar(mensaje({ estado: 'fallido' }), YO, ahora)).toBe(false)
    expect(puedeEditar(mensaje({ tipo: 'ficha' }), YO, ahora)).toBe(false)
  })
})

describe('puedeBorrar', () => {
  it('el autor borra lo suyo, sin ventana', () => {
    expect(puedeBorrar(mensaje(), YO, false)).toBe(true)
  })

  it('lo ajeno sólo con permiso de moderar', () => {
    expect(puedeBorrar(mensaje({ autorId: OTRA }), YO, false)).toBe(false)
    expect(puedeBorrar(mensaje({ autorId: OTRA }), YO, true)).toBe(true)
  })

  it('no borra lo eliminado ni lo que no llegó', () => {
    expect(puedeBorrar(mensaje({ eliminadoEn: CREADO, cuerpo: null }), YO, true)).toBe(false)
    expect(puedeBorrar(mensaje({ estado: 'enviando' }), YO, true)).toBe(false)
    expect(puedeBorrar(mensaje({ estado: 'fallido' }), YO, true)).toBe(false)
  })
})

describe('puedeResponder', () => {
  it('sólo lo enviado y no eliminado', () => {
    expect(puedeResponder(mensaje())).toBe(true)
    expect(puedeResponder(mensaje({ eliminadoEn: CREADO, cuerpo: null }))).toBe(false)
    expect(puedeResponder(mensaje({ estado: 'enviando' }))).toBe(false)
    expect(puedeResponder(mensaje({ estado: 'fallido' }))).toBe(false)
  })
})

describe('motivoParaNoBorrar', () => {
  it('un mensaje que no está cargado, eliminado o ajeno dice por qué', () => {
    expect(motivoParaNoBorrar(null, YO, false)).toBe('Ese mensaje ya no está entre los cargados.')
    expect(motivoParaNoBorrar(mensaje({ eliminadoEn: CREADO, cuerpo: null }), YO, false)).toBe(
      'Ese mensaje ya está eliminado.',
    )
    expect(motivoParaNoBorrar(mensaje({ autorId: OTRA }), YO, false)).toBe(
      'No puedes borrar este mensaje.',
    )
  })

  it('si se puede, no hay motivo', () => {
    expect(motivoParaNoBorrar(mensaje(), YO, false)).toBeNull()
    expect(motivoParaNoBorrar(mensaje({ autorId: OTRA }), YO, true)).toBeNull()
  })
})

describe('textoDeCita', () => {
  const cita = { id: 'x', autorNombre: 'Luis', cuerpo: 'Hola', eliminado: false }

  it('un eliminado o sin texto lo dice', () => {
    expect(textoDeCita({ ...cita, cuerpo: null, eliminado: true })).toBe('Mensaje eliminado')
    expect(textoDeCita({ ...cita, cuerpo: null })).toBe('Mensaje no disponible')
  })

  it('colapsa saltos y espacios repetidos', () => {
    expect(textoDeCita({ ...cita, cuerpo: 'uno\n\n  dos \t tres' })).toBe('uno dos tres')
  })

  it('recorta a 120 caracteres con puntos suspensivos', () => {
    expect(LARGO_DE_CITA).toBe(120)
    const justo = 'a'.repeat(120)
    expect(textoDeCita({ ...cita, cuerpo: justo })).toBe(justo)
    const largo = textoDeCita({ ...cita, cuerpo: 'a'.repeat(121) })
    expect(largo).toBe(`${'a'.repeat(120)}…`)
  })
})

describe('citaDe', () => {
  it('lleva lo que la burbuja necesita del mensaje respondido', () => {
    expect(citaDe(mensaje({ autorNombre: 'Luis', cuerpo: 'Hola' }))).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      autorNombre: 'Luis',
      cuerpo: 'Hola',
      eliminado: false,
    })
    expect(citaDe(mensaje({ eliminadoEn: CREADO, cuerpo: null })).eliminado).toBe(true)
  })
})

describe('leerResultadoDeEdicion', () => {
  it('acepta editado y sin_cambios con el instante de la base', () => {
    const id = '00000000-0000-4000-8000-000000000001'
    expect(leerResultadoDeEdicion({ resultado: 'editado', id, actualizado_en: CREADO })).toEqual({
      ok: true,
      data: { resultado: 'editado', id, actualizadoEn: CREADO },
    })
    expect(
      leerResultadoDeEdicion({ resultado: 'sin_cambios', id, actualizado_en: CREADO }).ok,
    ).toBe(true)
  })

  it('otro resultado o sin instante es un error', () => {
    const id = '00000000-0000-4000-8000-000000000001'
    expect(leerResultadoDeEdicion({ resultado: 'raro', id, actualizado_en: CREADO }).ok).toBe(false)
    expect(leerResultadoDeEdicion({ resultado: 'editado', id }).ok).toBe(false)
    expect(leerResultadoDeEdicion(null).ok).toBe(false)
  })
})
