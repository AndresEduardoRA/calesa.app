import { describe, expect, it } from 'vitest'
import {
  esquemaCrearTipoDeDocumento,
  esquemaEliminarTipoDeDocumento,
  esquemaGuardarTipoDeDocumento,
  esquemaMoverTipoDeDocumento,
} from './tipos-de-documento'

const ID = '11111111-1111-4111-8111-111111111111'
const VERSION = '2026-11-11T19:52:59.123456+00:00'
const DATOS = {
  nombre: 'Título',
  descripcion: null,
  formatos: ['application/pdf'],
  modo_vencimiento: 'ninguno',
  vigencia_dias: null,
  aviso_dias: null,
  visible_portal_permitido: false,
}

describe('los esquemas de los tipos de documento', () => {
  it('aceptan un pedido bien formado, de toda la empresa o de un flujo', () => {
    expect(
      esquemaCrearTipoDeDocumento.safeParse({ id: ID, flujoId: null, cambios: DATOS }).success,
    ).toBe(true)
    expect(
      esquemaCrearTipoDeDocumento.safeParse({ id: ID, flujoId: ID, cambios: DATOS }).success,
    ).toBe(true)
    expect(
      esquemaGuardarTipoDeDocumento.safeParse({
        id: ID,
        flujoId: null,
        actualizadoEnEsperado: VERSION,
        cambios: { activo: false },
      }).success,
    ).toBe(true)
  })

  it('rechazan un id que no es guid', () => {
    expect(
      esquemaCrearTipoDeDocumento.safeParse({ id: 'x', flujoId: null, cambios: DATOS }).success,
    ).toBe(false)
    expect(
      esquemaMoverTipoDeDocumento.safeParse({
        id: 'x',
        flujoId: null,
        actualizadoEnEsperado: VERSION,
        despuesDe: null,
      }).success,
    ).toBe(false)
    expect(
      esquemaMoverTipoDeDocumento.safeParse({
        id: ID,
        flujoId: null,
        actualizadoEnEsperado: VERSION,
        despuesDe: 'x',
      }).success,
    ).toBe(false)
  })

  it('rechazan una versión vacía', () => {
    expect(
      esquemaEliminarTipoDeDocumento.safeParse({ id: ID, flujoId: null, actualizadoEnEsperado: '' })
        .success,
    ).toBe(false)
    expect(
      esquemaGuardarTipoDeDocumento.safeParse({
        id: ID,
        flujoId: null,
        actualizadoEnEsperado: '',
        cambios: { activo: true },
      }).success,
    ).toBe(false)
  })

  it('rechazan un flujoId que no es guid ni nulo', () => {
    expect(
      esquemaEliminarTipoDeDocumento.safeParse({
        id: ID,
        flujoId: 'x',
        actualizadoEnEsperado: VERSION,
      }).success,
    ).toBe(false)
    expect(
      esquemaEliminarTipoDeDocumento.safeParse({ id: ID, actualizadoEnEsperado: VERSION }).success,
    ).toBe(false)
  })
})

describe('las claves de los esquemas de los tipos de documento', () => {
  it('no dejan pasar una clave que la base no acepta, ni `activo` al crear, ni guardar sin cambios', () => {
    const crear = (cambios: object) =>
      esquemaCrearTipoDeDocumento.safeParse({ id: ID, flujoId: null, cambios }).success
    expect(crear({ ...DATOS, proposito: 'titulo' })).toBe(false)
    expect(crear({ ...DATOS, activo: false })).toBe(false)
    expect(
      esquemaGuardarTipoDeDocumento.safeParse({
        id: ID,
        flujoId: null,
        actualizadoEnEsperado: VERSION,
        cambios: {},
      }).success,
    ).toBe(false)
    expect(
      esquemaGuardarTipoDeDocumento.safeParse({
        id: ID,
        flujoId: null,
        actualizadoEnEsperado: VERSION,
        cambios: { orden: 1 },
      }).success,
    ).toBe(false)
  })
})
