import { describe, expect, it } from 'vitest'
import {
  borradorNuevoDeGasto,
  cambiosDeGasto,
  tituloDeEliminarGasto,
  validarGasto,
  type BorradorDeGasto,
  type DatosDeGasto,
  type Gasto,
} from './gasto'

const CATEGORIA = '0b6f1a0e-6a43-4c1e-9d3b-6c1d3f7a9e11'
const TIPO = '7d1e2f3a-1b2c-4d5e-8f90-a1b2c3d4e5f6'
const CONTEXTO = { monedaBase: 'USD', locale: 'es-BO', tiposDisponibles: 1 }

const borrador = (p: Partial<BorradorDeGasto> = {}): BorradorDeGasto => ({
  categoriaId: CATEGORIA,
  moneda: 'USD',
  monto: '150',
  tipoCambioId: '',
  fecha: '2026-11-10',
  proveedor: '',
  notas: '',
  comprobanteRuta: '',
  ...p,
})

const errores = (b: BorradorDeGasto, contexto = CONTEXTO) => {
  const r = validarGasto(b, contexto)
  return r.ok ? {} : r.errores
}

describe('validarGasto', () => {
  it('una moneda que no es la base exige tipo de cambio', () => {
    expect(errores(borrador({ moneda: 'BOB' }))['tipoCambioId']).toBe('Elige el tipo de cambio.')
  })

  it('sin ningún tipo activo lo dice y no deja guardar', () => {
    const e = errores(borrador({ moneda: 'BOB' }), { ...CONTEXTO, tiposDisponibles: 0 })
    expect(e['tipoCambioId']).toMatch(/No hay un tipo de cambio activo para BOB/)
  })

  it('con la moneda base no manda tipo de cambio, aunque quede uno escrito', () => {
    const r = validarGasto(borrador({ tipoCambioId: TIPO }), CONTEXTO)
    expect(r.ok && r.datos.tipoCambioId).toBeNull()
  })

  it('el monto con 3 decimales, negativo o vacío es un error por campo', () => {
    expect(errores(borrador({ monto: '1,234' }))['monto']).toBe(
      'El monto lleva como mucho dos decimales.',
    )
    expect(errores(borrador({ monto: '-5' }))['monto']).toBe('El monto no puede ser negativo.')
    expect(errores(borrador({ monto: '' }))['monto']).toBe('Escribe el monto.')
    expect(errores(borrador({ monto: 'abc' }))['monto']).toMatch(/Escribe un número/)
  })

  it('0,00 es un monto válido', () => {
    const r = validarGasto(borrador({ monto: '0,00' }), CONTEXTO)
    expect(r.ok && r.datos.monto).toBe(0)
  })

  it('lee el monto con el separador del locale y deja nulos los textos vacíos', () => {
    const r = validarGasto(borrador({ monto: '1.234,50', proveedor: '  ', notas: ' n ' }), CONTEXTO)
    expect(r.ok && r.datos).toMatchObject({ monto: 1234.5, proveedor: null, notas: 'n' })
  })

  it('pide categoría y fecha', () => {
    const e = errores(borrador({ categoriaId: '', fecha: '' }))
    expect(e['categoriaId']).toBeDefined()
    expect(e['fecha']).toBeDefined()
  })
})

const original: Gasto = {
  id: '11111111-1111-4111-8111-111111111111',
  vehiculoId: '22222222-2222-4222-8222-222222222222',
  categoriaId: CATEGORIA,
  categoriaNombre: 'Flete',
  moneda: 'BOB',
  monto: 696,
  tipoCambioId: TIPO,
  tipoCambioAplicado: 6.96,
  montoBase: 100,
  fecha: '2026-11-10',
  proveedor: 'Naviera',
  comprobanteRuta: null,
  loteId: null,
  notas: null,
  actualizadoEn: '2026-11-10T12:00:00Z',
}

const iguales: DatosDeGasto = {
  categoriaId: CATEGORIA,
  moneda: 'BOB',
  monto: 696,
  tipoCambioId: TIPO,
  fecha: '2026-11-10',
  proveedor: 'Naviera',
  notas: null,
  comprobanteRuta: null,
}

describe('cambiosDeGasto', () => {
  it('sin diferencia no hay cambios', () => {
    expect(cambiosDeGasto(original, iguales)).toBeNull()
  })

  it('con sólo otro monto no manda el tipo de cambio (la base usa la tasa guardada)', () => {
    expect(cambiosDeGasto(original, { ...iguales, monto: 700 })).toEqual({ monto: 700 })
  })

  it('con otro tipo manda el tipo; con otra moneda, la moneda y el tipo', () => {
    const otro = '33333333-3333-4333-8333-333333333333'
    expect(cambiosDeGasto(original, { ...iguales, tipoCambioId: otro })).toEqual({
      tipo_cambio_id: otro,
    })
    expect(cambiosDeGasto(original, { ...iguales, moneda: 'USD', tipoCambioId: null })).toEqual({
      moneda: 'USD',
      tipo_cambio_id: null,
    })
  })

  it('vaciar el proveedor y quitar el comprobante viajan como nulos', () => {
    const con = { ...original, comprobanteRuta: 'u/abc.pdf' }
    expect(cambiosDeGasto(con, { ...iguales, proveedor: null })).toEqual({
      proveedor: null,
      comprobante_ruta: null,
    })
  })
})

describe('tituloDeEliminarGasto', () => {
  it('nombra la categoría y la fecha, sin el monto', () => {
    expect(tituloDeEliminarGasto(original, '10 nov 2026')).toBe(
      'Eliminar el gasto de Flete del 10 nov 2026',
    )
  })
})

describe('borradorNuevoDeGasto', () => {
  it('empieza en la moneda base y la fecha de hoy, sin monto ni tipo de cambio', () => {
    expect(borradorNuevoDeGasto('USD', '2026-11-12')).toMatchObject({
      moneda: 'USD',
      fecha: '2026-11-12',
      monto: '',
      tipoCambioId: '',
      categoriaId: '',
    })
  })
})
