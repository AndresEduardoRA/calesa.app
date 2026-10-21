import { describe, expect, it, vi } from 'vitest'
import type { TipoDeSeguimientoConUso } from '../../../entities/tipo-de-seguimiento'
import { accionesDeTipoDeSeguimiento } from './acciones-de-tipo-de-seguimiento'
import { filasDeTiposDeSeguimiento } from './filas-de-tipos-de-seguimiento'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'

const tipo = (id: string, nombre: string, resto: Partial<TipoDeSeguimientoConUso> = {}) => ({
  id,
  clave: nombre.toLowerCase(),
  nombre,
  icono: null,
  activo: true,
  orden: 10,
  actualizadoEn: '2026-10-21T10:00:00Z',
  conSeguimientos: false,
  ...resto,
})

const quehaceres = () => ({ alEditar: vi.fn(), alActivar: vi.fn(), alPedirEliminar: vi.fn() })

describe('el «⋯» de un tipo de seguimiento', () => {
  it('lleva Editar, Desactivar, un separador y Eliminar, en ese orden', () => {
    const lineas = accionesDeTipoDeSeguimiento(tipo(A, 'Llamada'), quehaceres())
    expect(lineas.map((l) => (l.tipo === 'accion' ? l.etiqueta : l.tipo))).toEqual([
      'Editar',
      'Desactivar',
      'separador',
      'Eliminar',
    ])
  })

  it('uno apagado ofrece Activar, y cualquiera se puede apagar (ningún tipo es de sistema)', () => {
    const apagado = accionesDeTipoDeSeguimiento(tipo(A, 'Nota', { activo: false }), quehaceres())
    expect(apagado[1]).toMatchObject({ clave: 'activar', etiqueta: 'Activar' })
    const unico = accionesDeTipoDeSeguimiento(tipo(A, 'Nota'), quehaceres())
    expect(unico[1]).toMatchObject({ clave: 'desactivar' })
    expect(unico[1]).not.toHaveProperty('deshabilitada', true)
  })

  it('con seguimientos, Eliminar sale apagado y la nota dice por qué', () => {
    const lineas = accionesDeTipoDeSeguimiento(
      tipo(A, 'Llamada', { conSeguimientos: true }),
      quehaceres(),
    )
    expect(lineas.find((l) => l.tipo === 'accion' && l.clave === 'eliminar')).toMatchObject({
      deshabilitada: true,
      destructiva: true,
    })
    expect(lineas.at(-1)).toEqual({
      tipo: 'nota',
      clave: 'motivo-de-eliminar',
      texto:
        '«Llamada» ya tiene seguimientos: no se elimina. Desactívalo para que no se ofrezca a los nuevos.',
    })
  })

  it('sin seguimientos, Eliminar se puede y no hay nota', () => {
    const lineas = accionesDeTipoDeSeguimiento(tipo(A, 'Llamada'), quehaceres())
    expect(lineas.at(-1)).toMatchObject({ clave: 'eliminar', deshabilitada: false })
  })

  it('cada línea avisa a quien la pidió', () => {
    const q = quehaceres()
    const llamada = tipo(A, 'Llamada')
    const lineas = accionesDeTipoDeSeguimiento(llamada, q)
    for (const clave of ['editar', 'desactivar', 'eliminar']) {
      const linea = lineas.find((l) => l.tipo === 'accion' && l.clave === clave)
      if (linea?.tipo === 'accion') linea.alElegir()
    }
    expect(q.alEditar).toHaveBeenCalledWith(A)
    expect(q.alActivar).toHaveBeenCalledWith(llamada, false)
    expect(q.alPedirEliminar).toHaveBeenCalledWith(A)
  })

  it('Editar y Eliminar abren algo encima: esperan a que el menú se cierre', () => {
    const lineas = accionesDeTipoDeSeguimiento(tipo(A, 'Llamada'), quehaceres())
    for (const clave of ['editar', 'eliminar']) {
      expect(lineas.find((l) => l.tipo === 'accion' && l.clave === clave)).toMatchObject({
        despuesDeCerrar: true,
      })
    }
  })
})

describe('filasDeTiposDeSeguimiento', () => {
  const lista = {
    tope: 100,
    tipos: [
      tipo(A, 'WhatsApp', { icono: 'mensaje' }),
      tipo(B, 'Llamada', { conSeguimientos: true }),
      tipo(C, 'Visita', { activo: false }),
    ],
  }
  const filas = filasDeTiposDeSeguimiento(lista, quehaceres())

  it('una fila por tipo, en su orden, con su icono y su estado', () => {
    expect(filas.map((f) => f.nombre)).toEqual(['WhatsApp', 'Llamada', 'Visita'])
    expect(filas[0]).toMatchObject({ icono: 'mensaje', activo: true, insignias: [] })
    expect(filas[2]).toMatchObject({ activo: false })
  })

  it('dice si algún seguimiento lo usa', () => {
    expect(filas.map((f) => f.uso)).toEqual([
      'Sin seguimientos',
      'Tiene seguimientos',
      'Sin seguimientos',
    ])
  })

  it('el primero no sube y el último no baja', () => {
    expect(filas.map((f) => [f.puedeSubir, f.puedeBajar])).toEqual([
      [false, true],
      [true, true],
      [true, false],
    ])
  })
})
