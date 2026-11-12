import { describe, expect, it } from 'vitest'
import {
  fichaDeFila,
  referenciaDeFicha,
  referenciasSinResolver,
  resolverClase,
  type EstadoDeReferencia,
} from './referencias'

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function estado(
  r: ReturnType<typeof resolverClase>,
  clave: string,
): EstadoDeReferencia | undefined {
  expect(r.ok).toBe(true)
  return r.ok ? r.data.get(clave) : undefined
}

describe('resolverClase', () => {
  it('lo que no vino es sin_acceso', () => {
    const r = resolverClase('lead', [A, B], [{ id: A, nombre: 'Ana Pérez', numero_visible: 7 }])
    expect(estado(r, `lead:${A}`)).toEqual({
      situacion: 'visible',
      id: A,
      datos: { clase: 'lead', nombre: 'Ana Pérez', numeroVisible: 7 },
    })
    expect(estado(r, `lead:${B}`)).toEqual({ situacion: 'sin_acceso' })
  })

  it('lo que vino con eliminado_en es eliminado', () => {
    const r = resolverClase(
      'vehiculo',
      [A],
      [
        {
          id: A,
          titulo: 'Toyota Hilux',
          vin: null,
          lote: null,
          eliminado_en: '2026-11-01T00:00:00Z',
        },
      ],
    )
    expect(estado(r, `vehiculo:${A}`)).toEqual({ situacion: 'eliminado' })
  })

  it('una persona inactiva se dice como no disponible', () => {
    const r = resolverClase('usuario', [A], [{ id: A, nombre: 'Luis', activo: false }])
    expect(estado(r, `usuario:${A}`)).toEqual({ situacion: 'sin_acceso' })
  })

  it('una fila que no cumple el esquema es un valor de error, no una excepción', () => {
    const r = resolverClase('cotizacion', [A], [{ id: A, numero: 'x' }])
    expect(r.ok).toBe(false)
  })

  it('el lead no declara teléfono: una fila con teléfono no lo conserva', () => {
    const r = resolverClase(
      'lead',
      [A],
      [{ id: A, nombre: 'Ana', numero_visible: null, telefono: '+591 70000000' }],
    )
    expect(JSON.stringify(r)).not.toContain('591')
  })
})

describe('fichas', () => {
  it('una ficha con la FK nula conserva su tipo y no tiene referencia', () => {
    const ficha = fichaDeFila('lead', { lead_id: null })
    expect(ficha).toEqual({ tipo: 'lead', id: null })
    expect(referenciaDeFicha(ficha)).toBeNull()
  })

  it('una ficha de lead, vehículo o cotización es una referencia; tarea y evento no', () => {
    expect(referenciaDeFicha(fichaDeFila('cotizacion', { cotizacion_id: A }))).toEqual({
      clase: 'cotizacion',
      id: A,
    })
    expect(referenciaDeFicha(fichaDeFila('tarea', { tarea_id: A }))).toBeNull()
    expect(fichaDeFila('texto', {})).toBeNull()
  })
})

describe('referenciasSinResolver', () => {
  it('sólo pide lo que falta, una vez', () => {
    const resueltas = new Map<string, EstadoDeReferencia>([
      [`lead:${A}`, { situacion: 'sin_acceso' }],
    ])
    expect(
      referenciasSinResolver(
        [
          { clase: 'lead', id: A },
          { clase: 'lead', id: B },
          { clase: 'lead', id: B },
        ],
        resueltas,
      ),
    ).toEqual([{ clase: 'lead', id: B }])
  })
})
