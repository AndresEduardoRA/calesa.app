import { describe, expect, it } from 'vitest'
import { esquemaDefinicion, esquemaModoDeCambio, esquemaParams } from './formula'

const tc = { id: 'tc_oficial', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC' }

describe('esquemaParams', () => {
  it('parte lo guardado plano en constantes y tablas congeladas', () => {
    const filas = [{ anio: 2025, factor: 0.8 }]
    expect(esquemaParams.parse({ flete: 900, tablas: { depreciacion: filas } })).toEqual({
      constantes: { flete: 900 },
      tablas: { depreciacion: filas },
    })
    expect(esquemaParams.parse({})).toEqual({ constantes: {}, tablas: {} })
  })

  it('una constante es un número, y una fila, números, textos o nulos', () => {
    expect(esquemaParams.safeParse({ flete: '900' }).success).toBe(false)
    expect(esquemaParams.safeParse({ tablas: { t: [{ c: true }] } }).success).toBe(false)
    expect(esquemaParams.safeParse({ tablas: { t: [{ c: null, d: 'X' }] } }).success).toBe(true)
  })
})

describe('esquemaDefinicion', () => {
  it('acepta grupos, buckets con nombre libre y total_en', () => {
    const def = {
      nodos: [tc],
      buckets: { aduana: 'tc_oficial' },
      total_en: 'tc_oficial',
      grupos: [
        {
          id: 'aduana',
          etiqueta: 'Aduana',
          plazo: '4 meses (Aprox.)',
          tono: 'aduana',
          bucket: 'aduana',
        },
      ],
    }
    expect(esquemaDefinicion.parse(def)).toEqual(def)
  })

  it('«ninguno» no puede ser el nombre de un bucket, y un grupo es estricto', () => {
    expect(
      esquemaDefinicion.safeParse({ nodos: [tc], buckets: { ninguno: 'tc_oficial' } }).success,
    ).toBe(false)
    const grupo = { id: 'g', etiqueta: 'G', tono: 't', bucket: 'b', color: 'verde' }
    expect(esquemaDefinicion.safeParse({ nodos: [tc], grupos: [grupo] }).success).toBe(false)
  })
})

describe('esquemaModoDeCambio', () => {
  it('es el mismo mapa que buckets, y el modo dice siempre su total_en', () => {
    const modo = {
      buckets: { exterior: 'tc_unificado', aduana: 'tc_oficial' },
      total_en: 'tc_unificado',
    }
    expect(esquemaModoDeCambio.parse(modo)).toEqual(modo)
    expect(esquemaModoDeCambio.safeParse({ buckets: modo.buckets }).success).toBe(false)
  })
})
