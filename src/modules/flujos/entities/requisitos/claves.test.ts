// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { definicionSql } from '../../../../../scripts/lib/definicion-sql'
import { CLAVES_POR_AMBITO, ETIQUETAS_DE_CLAVE, etiquetaDeClave, reglaDeLaClave } from './claves'

// Las claves de cada ámbito como las dice el SQL vigente de `claves_dato_requisito`: las dos listas de `array[...]`, la de vehículos y la del `else`.
function clavesDelSql(): { vehiculos: string[]; repuestos: string[] } {
  const { texto } = definicionSql('claves_dato_requisito')
  const listas = [...texto.matchAll(/array\[([^\]]*)\]/g)].map((m) =>
    [...(m[1] ?? '').matchAll(/'([^']+)'/g)].map((c) => c[1] ?? ''),
  )
  return { vehiculos: listas[0] ?? [], repuestos: listas[1] ?? [] }
}

describe('claves de dato de un requisito', () => {
  it('la lista que ofrece la pantalla es igual a la de la base, en cada ámbito', () => {
    const sql = clavesDelSql()
    expect(sql.vehiculos.length).toBeGreaterThan(0)
    expect(sql.repuestos.length).toBeGreaterThan(0)
    expect([...CLAVES_POR_AMBITO.vehiculos].sort()).toEqual([...sql.vehiculos].sort())
    expect([...CLAVES_POR_AMBITO.repuestos].sort()).toEqual([...sql.repuestos].sort())
  })

  it('toda clave de la base tiene su etiqueta, y ninguna etiqueta sobra', () => {
    const sql = clavesDelSql()
    const todas = new Set([...sql.vehiculos, ...sql.repuestos])
    for (const clave of todas) {
      expect(ETIQUETAS_DE_CLAVE[clave], `falta la etiqueta de ${clave}`).toBeTruthy()
    }
    expect(Object.keys(ETIQUETAS_DE_CLAVE).sort()).toEqual([...todas].sort())
  })

  it('una clave desconocida se dice tal cual, nunca se oculta', () => {
    expect(etiquetaDeClave('vehiculo.vin')).toBe('VIN del vehículo')
    expect(etiquetaDeClave('algo.nuevo')).toBe('Dato: algo.nuevo')
  })

  it('la regla que apaga una clave sale de su prefijo', () => {
    expect(reglaDeLaClave('transporte.eta')).toBe('transporte')
    expect(reglaDeLaClave('aduana.canal')).toBe('aduana')
    expect(reglaDeLaClave('pagos.confirmado')).toBe('pagos')
    expect(reglaDeLaClave('vehiculo.vin')).toBeNull()
    expect(reglaDeLaClave('repuesto.tracking')).toBeNull()
  })
})
