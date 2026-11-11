import { describe, expect, it } from 'vitest'
import {
  respuestaDeEliminarDesde,
  respuestaDeEscrituraDesde,
  tipoDeDocumentoDesde,
  usoPorTipoDesde,
} from './respuestas'

const ID = '11111111-1111-4111-8111-111111111111'
const FILA = {
  id: ID,
  flujo_id: null,
  nombre: 'Título',
  descripcion: null,
  formatos: ['image/png', 'application/pdf', 'application/zip'],
  modo_vencimiento: 'renovar',
  vigencia_dias: 365,
  aviso_dias: 30,
  visible_portal_permitido: true,
  activo: true,
  orden: 10,
  actualizado_en: '2026-11-11T19:52:59.123456+00:00',
}

describe('tipoDeDocumentoDesde', () => {
  it('lee la fila, deja la versión como texto y ordena los formatos que conoce', () => {
    expect(tipoDeDocumentoDesde(FILA)).toEqual({
      id: ID,
      flujoId: null,
      nombre: 'Título',
      descripcion: null,
      formatos: ['application/pdf', 'image/png'],
      modo: 'renovar',
      vigenciaDias: 365,
      avisoDias: 30,
      visiblePortal: true,
      activo: true,
      orden: 10,
      actualizadoEn: '2026-11-11T19:52:59.123456+00:00',
    })
  })

  it('una fila que no se entiende es nula', () => {
    expect(tipoDeDocumentoDesde({ ...FILA, modo_vencimiento: 'otro' })).toBeNull()
    expect(tipoDeDocumentoDesde({ ...FILA, id: 'x' })).toBeNull()
  })
})

describe('las respuestas de la base', () => {
  it('el uso llega acotado: 51 es «más de 50»', () => {
    const uso = usoPorTipoDesde([{ tipo_id: ID, documentos: 51, requisitos: 2 }])
    expect(uso?.[ID]).toEqual({
      documentos: { n: 50, hayMas: true },
      requisitos: { n: 2, hayMas: false },
    })
    expect(usoPorTipoDesde([{ tipo_id: 'x', documentos: 1, requisitos: 1 }])).toBeNull()
  })

  it('crear, guardar y mover: la versión tal cual y si ya estaba hecho', () => {
    const v = '2026-11-11T19:52:59.123456+00:00'
    expect(respuestaDeEscrituraDesde({ id: ID, actualizado_en: v, repetido: true })).toEqual({
      id: ID,
      actualizadoEn: v,
      repetido: true,
    })
    expect(
      respuestaDeEscrituraDesde({ id: ID, actualizado_en: v, sin_cambios: true })?.repetido,
    ).toBe(true)
    expect(respuestaDeEscrituraDesde({ id: ID, actualizado_en: v })?.repetido).toBe(false)
    expect(respuestaDeEscrituraDesde({ id: ID })).toBeNull()
  })

  it('eliminar: dice si borró o desactivó y con qué uso', () => {
    expect(
      respuestaDeEliminarDesde({
        accion: 'desactivado',
        documentos: 3,
        requisitos: 2,
        actualizado_en: 'v',
      }),
    ).toEqual({
      accion: 'desactivado',
      uso: { documentos: { n: 3, hayMas: false }, requisitos: { n: 2, hayMas: false } },
    })
    expect(
      respuestaDeEliminarDesde({
        accion: 'eliminado',
        documentos: 0,
        requisitos: 0,
        actualizado_en: null,
      })?.accion,
    ).toBe('eliminado')
    expect(respuestaDeEliminarDesde({ accion: 'borrado' })).toBeNull()
  })
})
