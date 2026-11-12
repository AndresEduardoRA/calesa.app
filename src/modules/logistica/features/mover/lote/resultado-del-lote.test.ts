import { describe, expect, it, vi } from 'vitest'
import type { FilaDelLote, VistaPreviaDeUnaUnidad } from '@/modules/flujos/client'
import { idsParaReintentar, resumenDelLote, titularDelLote } from './resultado-del-lote'

// `flujos/client` trae las Server Actions y su `server-only`: aquí sólo se usan sus reglas puras.
vi.mock('server-only', () => ({}))

const fila = (id: string, parcial: Partial<FilaDelLote> = {}): FilaDelLote => ({
  vehiculoId: id,
  ok: true,
  codigo: null,
  motivo: null,
  historialId: 1,
  ...parcial,
})

const nombres = new Map([
  ['x', 'Toyota Hilux'],
  ['y', 'Kia Rio'],
])

describe('el resultado de un lote', () => {
  it('los titulares', () => {
    expect(titularDelLote(6, 8)).toBe('Se movieron 6 de 8.')
    expect(titularDelLote(1, 1)).toBe('Se movió 1 de 1.')
    expect(titularDelLote(0, 3)).toBe('No se movió ninguna.')
  })

  it('una línea por fallida: requisitos con sus faltas y conflicto con el nombre de la base', () => {
    const vistas: VistaPreviaDeUnaUnidad[] = [
      {
        vehiculoId: 'x',
        ok: false,
        motivos: [],
        codigos: ['requisitos'],
        faseActual: 'b',
        requisitos: [],
        notaObligatoria: false,
        faltan: [
          {
            requisitoId: 'r',
            tipo: 'documento',
            bloqueante: true,
            descripcion: 'Documento: BL',
            cumplido: false,
            detalle: {},
          },
        ],
      },
    ]
    const r = resumenDelLote(
      [
        fila('a'),
        fila('x', { ok: false, codigo: 'requisitos', motivo: 'Faltan requisitos' }),
        fila('y', { ok: false, codigo: 'conflicto', motivo: 'Rosa Mamani la movió hace 1 min.' }),
      ],
      nombres,
      vistas,
    )
    expect(r.titular).toBe('Se movió 1 de 3.')
    expect(r.fallidas.map((f) => f.linea)).toEqual([
      'No se movió «Toyota Hilux». Falta: BL aprobado.',
      'No se movió «Kia Rio». Rosa Mamani la movió hace 1 min.',
    ])
  })

  it('una fila sin nombre cae a «Una unidad»', () => {
    const r = resumenDelLote([fila('z', { ok: false, codigo: 'acceso' })], nombres)
    expect(r.fallidas[0]?.linea).toBe(
      'No se movió «Una unidad». Ya no tienes acceso a esta unidad.',
    )
  })

  it('reintentar mira sólo las que fallaron', () => {
    expect(
      idsParaReintentar([fila('a'), fila('x', { ok: false }), fila('y', { ok: false })]),
    ).toEqual(['x', 'y'])
  })
})
