import { describe, expect, it } from 'vitest'
import {
  borradorNuevoDePago,
  cambiosDePago,
  pagosDesde,
  textoDelSello,
  validarPago,
  type BorradorDePago,
  type DatosDePago,
  type Pago,
} from './pago'

const CONTEXTO = { monedaBase: 'USD', locale: 'es-BO', tiposDisponibles: 1 }
const TIPO = '7d1e2f3a-1b2c-4d5e-8f90-a1b2c3d4e5f6'

const borrador = (p: Partial<BorradorDePago> = {}): BorradorDePago => ({
  ...borradorNuevoDePago('USD', '2026-11-11'),
  concepto: 'Anticipo',
  monto: '1500',
  ...p,
})

const errores = (b: BorradorDePago, contexto = CONTEXTO) => {
  const r = validarPago(b, contexto)
  return r.ok ? {} : r.errores
}

const pago = (p: Partial<Pago> = {}): Pago => ({
  id: '0b6f1a0e-6a43-4c1e-9d3b-6c1d3f7a9e11',
  vehiculoId: '1b6f1a0e-6a43-4c1e-9d3b-6c1d3f7a9e11',
  leadId: null,
  concepto: 'Anticipo',
  moneda: 'USD',
  monto: 1500,
  tipoCambioId: null,
  tipoCambioAplicado: null,
  montoBase: 1500,
  metodo: null,
  fecha: '2026-11-11',
  confirmado: false,
  confirmadoPor: null,
  confirmadoPorNombre: null,
  confirmadoEn: null,
  comprobanteRuta: null,
  notas: null,
  actualizadoEn: '2026-11-11T12:00:00Z',
  ...p,
})

describe('textoDelSello', () => {
  const sellado = {
    confirmado: true,
    confirmadoEn: '2026-11-11T18:30:00Z',
  }

  it('dice quién y cuándo en la zona de la empresa', () => {
    expect(textoDelSello({ ...sellado, confirmadoPorNombre: 'Ana' }, 'America/La_Paz')).toBe(
      'Confirmado por Ana el 11 nov 2026, 14:30',
    )
  })

  it('sin el nombre dice «otra persona»', () => {
    expect(textoDelSello({ ...sellado, confirmadoPorNombre: null }, 'America/La_Paz')).toBe(
      'Confirmado por otra persona el 11 nov 2026, 14:30',
    )
  })

  it('un pago sin confirmar no tiene sello', () => {
    expect(
      textoDelSello(
        { confirmado: false, confirmadoPorNombre: null, confirmadoEn: null },
        'America/La_Paz',
      ),
    ).toBeNull()
  })
})

describe('validarPago', () => {
  it('el monto es mayor que cero: 0, negativo, vacío y tres decimales fallan', () => {
    for (const monto of ['0', '-5', '', '1,005']) {
      expect(errores(borrador({ monto }))['monto'], monto).toBeTruthy()
    }
    expect(errores(borrador({ monto: '0' }))['monto']).toBe(
      'El monto de un pago es mayor que cero.',
    )
  })

  it('0,01 es un monto válido', () => {
    const r = validarPago(borrador({ monto: '0,01' }), CONTEXTO)
    expect(r.ok && r.datos.monto).toBe(0.01)
  })

  it('otra moneda exige tipo de cambio y la base lo manda nulo', () => {
    expect(errores(borrador({ moneda: 'BOB' }))['tipoCambioId']).toBe('Elige el tipo de cambio.')
    const enBase = validarPago(borrador({ tipoCambioId: TIPO }), CONTEXTO)
    expect(enBase.ok && enBase.datos.tipoCambioId).toBeNull()
    const enOtra = validarPago(borrador({ moneda: 'BOB', tipoCambioId: TIPO }), CONTEXTO)
    expect(enOtra.ok && enOtra.datos.tipoCambioId).toBe(TIPO)
  })

  it('sin ningún tipo activo lo dice', () => {
    const e = errores(borrador({ moneda: 'BOB' }), { ...CONTEXTO, tiposDisponibles: 0 })
    expect(e['tipoCambioId']).toMatch(/No hay un tipo de cambio activo para BOB/)
  })

  it('el concepto se pide y admite 200 letras', () => {
    expect(errores(borrador({ concepto: '   ' }))['concepto']).toBe('Escribe el concepto del pago.')
    expect(errores(borrador({ concepto: 'a'.repeat(200) }))['concepto']).toBeUndefined()
    expect(errores(borrador({ concepto: 'a'.repeat(201) }))['concepto']).toMatch(/hasta 200/)
  })

  it('recorta el concepto y manda el método vacío como nulo', () => {
    const r = validarPago(borrador({ concepto: '  Anticipo  ', metodo: ' ' }), CONTEXTO)
    expect(r.ok && r.datos.concepto).toBe('Anticipo')
    expect(r.ok && r.datos.metodo).toBeNull()
  })
})

describe('cambiosDePago', () => {
  const original = pago({ moneda: 'BOB', tipoCambioId: TIPO, monto: 696, metodo: 'Transferencia' })
  const datos = (p: Partial<DatosDePago> = {}): DatosDePago => ({
    concepto: 'Anticipo',
    moneda: 'BOB',
    monto: 696,
    tipoCambioId: TIPO,
    metodo: 'Transferencia',
    fecha: '2026-11-11',
    notas: null,
    comprobanteRuta: null,
    ...p,
  })

  it('sin diferencia es nulo', () => {
    expect(cambiosDePago(original, datos())).toBeNull()
  })

  it('con sólo otro monto no manda el tipo de cambio', () => {
    expect(cambiosDePago(original, datos({ monto: 700 }))).toEqual({ monto: 700 })
  })

  it('si cambia la moneda o el tipo, manda el tipo', () => {
    expect(cambiosDePago(original, datos({ moneda: 'USD', tipoCambioId: null }))).toEqual({
      moneda: 'USD',
      tipo_cambio_id: null,
    })
    const otro = '9d1e2f3a-1b2c-4d5e-8f90-a1b2c3d4e5f6'
    expect(cambiosDePago(original, datos({ tipoCambioId: otro }))).toEqual({
      tipo_cambio_id: otro,
    })
  })

  it('nunca incluye lead_id', () => {
    const cambios = cambiosDePago(
      pago({ leadId: '5d1e2f3a-1b2c-4d5e-8f90-a1b2c3d4e5f6' }),
      datos({ moneda: 'USD', tipoCambioId: null, monto: 1, concepto: 'Otro', notas: 'x' }),
    )
    expect(cambios).not.toBeNull()
    expect(Object.keys(cambios ?? {})).not.toContain('lead_id')
  })
})

describe('pagosDesde', () => {
  const fila = {
    id: '0b6f1a0e-6a43-4c1e-9d3b-6c1d3f7a9e11',
    vehiculo_id: '1b6f1a0e-6a43-4c1e-9d3b-6c1d3f7a9e11',
    lead_id: null,
    concepto: 'Anticipo',
    moneda: 'USD',
    monto: 10,
    tipo_cambio_id: null,
    tipo_cambio_aplicado: null,
    monto_base: 10,
    metodo: null,
    fecha: '2026-11-11',
    confirmado: true,
    confirmado_por: '2b6f1a0e-6a43-4c1e-9d3b-6c1d3f7a9e11',
    confirmado_en: '2026-11-11T18:30:00Z',
    comprobante_ruta: null,
    notas: null,
    actualizado_en: '2026-11-11T18:30:00Z',
  }

  it('pone el nombre de quien confirmó', () => {
    const r = pagosDesde([fila], { [fila.confirmado_por]: 'Ana' })
    expect(r?.[0]?.confirmadoPorNombre).toBe('Ana')
  })

  it('sin el nombre queda nulo y una fila mal formada da nulo', () => {
    expect(pagosDesde([fila], {})?.[0]?.confirmadoPorNombre).toBeNull()
    expect(pagosDesde([{ ...fila, monto: 'x' }], {})).toBeNull()
  })
})
