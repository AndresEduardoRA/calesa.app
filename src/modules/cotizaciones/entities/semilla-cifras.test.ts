import { describe, expect, it } from 'vitest'
import { calcular } from './semilla-lectura'

// Las cifras de las capturas y del Excel, hechas a mano (`docs/referencias/cotizador-actual.md`, `docs/referencias/excel-de-cotizacion.md`), contra el
// motor y la semilla del cotizador (paso 4.08-3). El juego y el diseño sembrados, en `semilla.test.ts`.

describe('subasta_usa reproduce la captura 02', () => {
  it('captura 02, modo Unificado, la póliza tipeada: 1.200 × 12,2 + 1.201 × 11,68 = 28.667,68 Bs, ÷ 12,2 = $2.350', () => {
    const r = calcular(
      'subasta_usa',
      {
        vehiculo: { anio: 2025, tipo_vehiculo: 'autos' },
        overrides: { transporte_bolivia: 0, nacionalizacion: 1201 },
      },
      'unificado',
    )
    expect(r.faltantes).toEqual([])
    expect(r.totales.bs).toBeCloseTo(28667.68, 6)
    expect(r.totales.usd).toBeCloseTo(2349.809836065574, 6)
    expect(Math.round(r.totales.usd ?? 0)).toBe(2350)
    expect(r.totales.suma_usd).toBe(2401)
  })

  it('captura 02 con la póliza calculada: el CIF da 1.155, GA 57,75, IVA 181,18 e ICE 181,91, y la nacionalización 1.200,84735', () => {
    const r = calcular(
      'subasta_usa',
      {
        inputs: { valor_tabla: 0 },
        vehiculo: { anio: 2025, tipo_vehiculo: 'autos' },
        overrides: { transporte_bolivia: 0 },
      },
      'unificado',
    )
    expect(r.valores['cif']).toBe(1155)
    expect(r.valores['ga']).toBeCloseTo(57.75, 9)
    expect(r.valores['iva']).toBeCloseTo(181.18485, 9)
    expect(r.valores['ice']).toBeCloseTo(181.9125, 9)
    expect(r.valores['nacionalizacion']).toBeCloseTo(1200.84735, 9)
    // 1.200 × 12,2 + 1.200,84735 × 11,68 = 14.640 + 14.025,897048 = 28.665,897048; ÷ 12,2 = 2.349,6637…
    expect(r.totales.bs).toBeCloseTo(28665.897048, 6)
    expect(r.totales.usd).toBeCloseTo(2349.66369, 4)
  })
})

describe('subasta_usa reproduce la captura 09 y su transporte', () => {
  it('captura 09, un 4Runner híbrido, el unificado sobrescrito a 12: (53.610,4 × 12 + 19.871 × 11,68) ÷ 12 = $72.952 y la garantía 5.925', () => {
    const r = calcular(
      'subasta_usa',
      {
        variante: 'hibrido',
        inputs: { remate: 39500, grua: 1790 },
        banderas: { mostrar_garantia: true },
        // El transporte de 3.700 es la fila «vagonetas_grandes» de la tabla sembrada, sin tipearlo.
        vehiculo: { anio: 2025, tipo_vehiculo: 'vagonetas_grandes' },
        overrides: { tc_unificado: 12, nacionalizacion: 19871 },
      },
      'unificado',
    )
    expect(r.faltantes).toEqual([])
    expect(r.valores['transporte_bolivia']).toBe(3700)
    expect(r.totales.grupos['compra']?.usd).toBeCloseTo(46420.4, 6)
    expect(r.totales.grupos['logistica']?.usd).toBeCloseTo(7190, 6)
    expect(r.totales.bs).toBeCloseTo(875418.08, 6)
    expect(r.totales.usd).toBeCloseTo(72951.50666666667, 6)
    expect(Math.round(r.totales.usd ?? 0)).toBe(72952)
    expect(r.valores['garantia']).toBeCloseTo(5925, 9)
  })

  it('el transporte es sobrescribible: sin vehículo queda sin valor y dice por qué; tipeado, el total deja de ser null', () => {
    const sin = calcular('subasta_usa', {
      inputs: { remate: 10000 },
      overrides: { nacionalizacion: 1000 },
    })
    expect(sin.valores['transporte_bolivia']).toBeNull()
    expect(sin.totales.usd).toBeNull()
    expect(sin.faltantes.map((x) => `${x.codigo}@${x.donde}`)).toContain(
      'campo_sin_valor@transporte_bolivia',
    )
    const tipeado = calcular('subasta_usa', {
      inputs: { remate: 10000 },
      overrides: { nacionalizacion: 1000, transporte_bolivia: 3000 },
      vehiculo: { anio: 2025 },
    })
    expect(tipeado.valores['transporte_bolivia']).toBe(3000)
    expect(tipeado.totales.usd).not.toBeNull()
    // Un tipo que la tabla no tiene (lo que trae la subasta, «AUTOMOBILE»): sin valor, con su motivo, y también se tipea.
    const raro = calcular('subasta_usa', {
      inputs: { remate: 10000 },
      overrides: { nacionalizacion: 1000 },
      vehiculo: { anio: 2025, tipo_vehiculo: 'AUTOMOBILE' },
    })
    expect(raro.valores['transporte_bolivia']).toBeNull()
    expect(raro.faltantes.map((x) => `${x.codigo}@${x.donde}`)).toContain(
      'fila_sin_coincidencia@transporte_bolivia',
    )
  })
})

describe('planilla_usa reproduce los totales que guarda el Excel (con el oficial 9,73 y el paralelo 10 de su hoja)', () => {
  const hoja = { tc_oficial: 9.73, tc_paralelo: 10 }

  it('la moto: TOTAL DÓLARES 16.826,354 (suma 16.910, Bs 168.263,54)', () => {
    const r = calcular('planilla_usa', {
      variante: 'moto',
      inputs: { remate: 9500, grua: 880 },
      vehiculo: { anio: 2025, tipo_vehiculo: 'motos' },
      overrides: { ...hoja, fees: 1300, transporte_bolivia: 1300, nacionalizacion: 3098 },
    })
    expect(r.totales.usd).toBeCloseTo(16826.354, 6)
    expect(r.totales.suma_usd).toBe(16910)
    expect(r.totales.bs).toBeCloseTo(168263.54, 6)
  })

  it('el auto a gasolina: 43.756,416 (suma 44.344,8), con el transporte de la tabla (3.600)', () => {
    const r = calcular('planilla_usa', {
      inputs: { remate: 14000, grua: 1300 },
      vehiculo: { anio: 2025, tipo_vehiculo: 'vagonetas_medianas' },
      overrides: { ...hoja, nacionalizacion: 21792 },
    })
    expect(r.valores['transporte_bolivia']).toBe(3600)
    expect(r.totales.usd).toBeCloseTo(43756.416, 6)
    expect(r.totales.suma_usd).toBeCloseTo(44344.8, 6)
  })

  it('el híbrido: 61.710,6 (suma 62.256)', () => {
    const r = calcular('planilla_usa', {
      variante: 'hibrido',
      inputs: { remate: 30000, grua: 1500 },
      vehiculo: { anio: 2025, tipo_vehiculo: 'vagonetas_medianas' },
      overrides: { ...hoja, nacionalizacion: 20200 },
    })
    expect(r.totales.usd).toBeCloseTo(61710.6, 6)
    expect(r.totales.suma_usd).toBe(62256)
  })

  it('EE. UU. → Chile: 20.157,6, sin aduana, con el transporte de la tabla de Chile (3.300)', () => {
    const r = calcular('planilla_usa', {
      variante: 'chile',
      inputs: { remate: 13000, grua: 1180 },
      vehiculo: { anio: 2025, tipo_vehiculo: 'vagonetas_medianas' },
      overrides: hoja,
    })
    expect(r.valores['transporte_chile']).toBe(3300)
    expect(r.totales.usd).toBeCloseTo(20157.6, 6)
    expect(r.totales.suma_usd).toBeCloseTo(20157.6, 6)
  })
})

describe('oficina', () => {
  it('precio acordado − descuento, al paralelo: 25.000 − 1.500 = 23.500 y × 12,20 = 286.700 Bs', () => {
    const r = calcular('oficina', { inputs: { precio: 25000, descuento: 1500 } })
    expect(r.totales.usd).toBe(23500)
    expect(r.totales.bs).toBeCloseTo(286700, 6)
  })
})
