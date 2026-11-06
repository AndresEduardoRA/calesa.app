import { describe, expect, it } from 'vitest'
import { restauracionDesde, resumenDeRestauracion } from './resultados'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'
const D = '44444444-4444-4444-8444-444444444444'
const E = '55555555-5555-4555-8555-555555555555'

const hecha = (id: string, numero: number) => ({
  id,
  numero,
  titulo: `Cotización #${String(numero)}`,
})
const pendiente = (
  id: string,
  numero: number,
  motivo = 'Esa cotización ya tiene otra versión nueva.',
) => ({
  ...hecha(id, numero),
  motivo,
})

const respuesta = (restaurados: unknown[], pendientes: unknown[], quedan = pendientes.length) => ({
  actualizado_en: '2026-11-06T12:00:00.000001+00:00',
  restaurados,
  pendientes,
  quedan,
})

describe('restauracionDesde', () => {
  it('lee lo que responde la base', () => {
    expect(restauracionDesde(respuesta([hecha(A, 1)], [pendiente(B, 2)]))).toEqual({
      actualizadoEn: '2026-11-06T12:00:00.000001+00:00',
      restaurados: [{ id: A, numero: 1, titulo: 'Cotización #1' }],
      pendientes: [
        {
          id: B,
          numero: 2,
          titulo: 'Cotización #2',
          motivo: 'Esa cotización ya tiene otra versión nueva.',
        },
      ],
      quedan: 1,
    })
  })

  it('una forma rota es null', () => {
    expect(restauracionDesde({})).toBeNull()
    expect(restauracionDesde(null)).toBeNull()
    expect(restauracionDesde(respuesta([{ id: 'x' }], []))).toBeNull()
    expect(restauracionDesde({ ...respuesta([], []), quedan: 'uno' })).toBeNull()
  })
})

describe('resumenDeRestauracion', () => {
  const dicho = (restaurados: unknown[], pendientes: unknown[]) => {
    const r = restauracionDesde(respuesta(restaurados, pendientes))
    if (!r) {
      throw new Error('forma rota')
    }
    return resumenDeRestauracion(r)
  }

  it('una sola, por su título', () => {
    expect(dicho([hecha(A, 1)], [])).toBe('«Cotización #1» volvió a tus cotizaciones.')
  })

  it('varias, cuántas', () => {
    expect(dicho([hecha(A, 1), hecha(B, 2)], [])).toBe('Se restauraron 2.')
  })

  it('con pendientes, cuántas de cuántas y el motivo de cada una', () => {
    expect(dicho([hecha(A, 1), hecha(B, 2)], [pendiente(C, 3)])).toBe(
      'Se restauraron 2 de 3. No se restauró «Cotización #3»: Esa cotización ya tiene otra versión nueva.',
    )
  })

  it('una restaurada y una pendiente no usa el singular', () => {
    expect(dicho([hecha(A, 1)], [pendiente(B, 2)])).toBe(
      'Se restauró 1 de 2. No se restauró «Cotización #2»: Esa cotización ya tiene otra versión nueva.',
    )
  })

  it('más de tres motivos: tres y «Y N más.»', () => {
    expect(
      dicho(
        [],
        [
          pendiente(A, 1, 'a.'),
          pendiente(B, 2, 'b.'),
          pendiente(C, 3, 'c.'),
          pendiente(D, 4, 'd.'),
          pendiente(E, 5, 'e.'),
        ],
      ),
    ).toBe(
      'No se restauró ninguna. No se restauró «Cotización #1»: a. No se restauró «Cotización #2»: b. No se restauró «Cotización #3»: c. Y 2 más.',
    )
  })

  it('una sola pendiente y ninguna restaurada dice el motivo, sin «ninguna»', () => {
    expect(dicho([], [pendiente(A, 1, 'Su vehículo ya no existe.')])).toBe(
      'No se restauró «Cotización #1»: Su vehículo ya no existe.',
    )
  })
})
