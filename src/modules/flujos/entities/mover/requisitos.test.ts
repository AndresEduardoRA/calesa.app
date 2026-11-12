// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { definicionSql } from '../../../../../scripts/lib/definicion-sql'
import {
  ETIQUETAS_DE_DATO,
  anclaDeRequisito,
  detalleDeRequisito,
  etiquetaDeRequisito,
  faltaDeRequisito,
} from './requisitos'
import type { RequisitoVista } from './vista-previa'

function r(parcial: Partial<RequisitoVista>): RequisitoVista {
  return {
    requisitoId: '33333333-3333-4333-8333-333333333333',
    tipo: 'dato',
    bloqueante: true,
    descripcion: '',
    cumplido: false,
    detalle: {},
    ...parcial,
  }
}

function clavesDelSql(): string[] {
  const { texto } = definicionSql('claves_dato_requisito')
  return [...texto.matchAll(/array\[([^\]]*)\]/g)].flatMap((m) =>
    [...(m[1] ?? '').matchAll(/'([^']+)'/g)].map((c) => c[1] ?? ''),
  )
}

describe('etiquetas de lo que pide un requisito', () => {
  it('cae si una clave de dato de la base no tiene etiqueta, y ninguna sobra', () => {
    const claves = [...new Set(clavesDelSql())]
    expect(claves.length).toBeGreaterThan(0)
    for (const clave of claves) {
      expect(ETIQUETAS_DE_DATO[clave], `falta la etiqueta de ${clave}`).toBeTruthy()
    }
    expect(Object.keys(ETIQUETAS_DE_DATO).sort()).toEqual([...claves].sort())
  })

  it('un documento se llama como su tipo; una espera, por su fase', () => {
    expect(etiquetaDeRequisito(r({ tipo: 'documento', descripcion: 'Documento: BL' }))).toBe('BL')
    expect(etiquetaDeRequisito(r({ tipo: 'espera', descripcion: 'Espera: Embarcado' }))).toBe(
      'Esperar a «Embarcado»',
    )
    expect(faltaDeRequisito(r({ tipo: 'documento', descripcion: 'Documento: BL' }))).toBe(
      'BL aprobado',
    )
  })

  it('un dato se llama por su clave; una desconocida no queda en blanco', () => {
    expect(
      etiquetaDeRequisito(
        r({ descripcion: 'Dato: vehiculo.vin', detalle: { clave_dato: 'vehiculo.vin' } }),
      ),
    ).toBe('VIN del vehículo')
    expect(
      etiquetaDeRequisito(
        r({ descripcion: 'Dato: algo.nuevo', detalle: { clave_dato: 'algo.nuevo' } }),
      ),
    ).toBe('Dato: algo.nuevo')
    expect(etiquetaDeRequisito(r({ descripcion: 'Dato: algo.nuevo' }))).toBe('Dato: algo.nuevo')
  })

  it('el detalle cuenta lo que hay: documentos, esperas y porcentaje', () => {
    expect(detalleDeRequisito(r({ tipo: 'documento', detalle: { aprobados: 1, min: 2 } }))).toBe(
      '1 de 2 aprobados',
    )
    expect(
      detalleDeRequisito(r({ tipo: 'espera', detalle: { hijos: 3, llegaron: 2, sin_llegar: 0 } })),
    ).toBe('2 de 3 llegaron')
    expect(
      detalleDeRequisito(r({ tipo: 'espera', detalle: { hijos: 3, llegaron: 1, sin_llegar: 1 } })),
    ).toBe('1 de 3 llegaron, 1 sin llegar')
    expect(detalleDeRequisito(r({ tipo: 'espera', detalle: { hijos: 0, llegaron: 0 } }))).toBeNull()
    expect(detalleDeRequisito(r({ detalle: { clave_dato: 'pagos.umbral_pct', pct: 50 } }))).toBe(
      'al menos 50 %',
    )
    expect(detalleDeRequisito(r({ detalle: { clave_dato: 'vehiculo.vin' } }))).toBeNull()
  })

  it('el atajo lleva al hueco de su clase y sólo a ése', () => {
    expect(anclaDeRequisito(r({ tipo: 'documento', descripcion: 'Documento: BL' }))).toBe(
      'documentos',
    )
    expect(anclaDeRequisito(r({ detalle: { clave_dato: 'transporte.eta' } }))).toBe('transporte')
    expect(anclaDeRequisito(r({ detalle: { clave_dato: 'aduana.canal' } }))).toBe('aduana')
    expect(anclaDeRequisito(r({ detalle: { clave_dato: 'pagos.confirmado' } }))).toBe('pagos')
    expect(anclaDeRequisito(r({ detalle: { clave_dato: 'vehiculo.vin' } }))).toBeNull()
    expect(anclaDeRequisito(r({ tipo: 'espera', descripcion: 'Espera: X' }))).toBeNull()
  })
})
