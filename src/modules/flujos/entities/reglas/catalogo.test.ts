import { describe, expect, it } from 'vitest'
import { definicionSql, migracionesEnOrden } from '../../../../../scripts/lib/definicion-sql'
import {
  CLAVES_DE_REGLAS,
  REGLAS_DEL_CATALOGO,
  reglaEncendida,
  reglasDelAmbito,
  reglasParaMostrar,
} from './catalogo'

// El check vigente: el último entre todas las migraciones, en orden (nunca un archivo por su nombre: cambia al aplastar).
function clavesDelCheck(): string[] {
  const sql = migracionesEnOrden()
    .map((m) => m.texto)
    .join('\n')
  const m = [
    ...sql.matchAll(
      /flujos_reglas_regla_check"?\s+CHECK\s+\(\(?"?regla"?[^;]*?ARRAY\[([^\]]+)\]/gi,
    ),
  ].at(-1)
  const lista = m?.[1] ?? ''
  return [...lista.matchAll(/'([a-z_]+)'/g)].map((x) => x[1] ?? '')
}

const EXCLUIDAS_EN_REPUESTOS = ['vitrina_web', 'portal_cliente', 'aduana']

describe('catálogo de reglas contra la base', () => {
  it('las 10 claves son las del check de flujos_reglas', () => {
    const delCheck = clavesDelCheck()
    expect(delCheck).toHaveLength(10)
    expect([...CLAVES_DE_REGLAS].sort()).toEqual([...delCheck].sort())
  })

  it('_flujo_regla_admitida repite las mismas claves y excluye tres en repuestos', () => {
    const { texto } = definicionSql('_flujo_regla_admitida')
    for (const clave of CLAVES_DE_REGLAS) {
      expect(texto).toContain(`'${clave}'`)
    }
    for (const clave of EXCLUIDAS_EN_REPUESTOS) {
      expect(texto).toMatch(new RegExp(`'repuestos'[^;]*in \\([^)]*'${clave}'`))
    }
  })

  it('repuestos no ofrece vitrina, portal ni aduana; vehículos las ofrece todas', () => {
    const claves = reglasDelAmbito('repuestos').map((r) => r.clave)
    for (const clave of EXCLUIDAS_EN_REPUESTOS) {
      expect(claves).not.toContain(clave)
    }
    expect(claves).toHaveLength(7)
    expect(reglasDelAmbito('vehiculos').map((r) => r.clave)).toEqual([...CLAVES_DE_REGLAS])
  })

  it('cada regla tiene nombre y textos, sin repetir', () => {
    for (const r of REGLAS_DEL_CATALOGO) {
      expect(r.nombre.trim()).not.toBe('')
      expect(r.explicacion.trim()).not.toBe('')
      expect(r.enciende.trim()).not.toBe('')
    }
    expect(new Set(REGLAS_DEL_CATALOGO.map((r) => r.clave)).size).toBe(10)
    expect(new Set(REGLAS_DEL_CATALOGO.map((r) => r.nombre)).size).toBe(10)
  })
})

describe('reglaEncendida', () => {
  it('sin fila es apagada', () => {
    const reglas = [
      { regla: 'aduana', activa: true },
      { regla: 'pagos', activa: false },
    ]
    expect(reglaEncendida(reglas, 'aduana')).toBe(true)
    expect(reglaEncendida(reglas, 'pagos')).toBe(false)
    expect(reglaEncendida(reglas, 'gastos')).toBe(false)
  })
})

describe('reglasParaMostrar', () => {
  it('suma una regla heredada que el ámbito no admite pero está encendida', () => {
    expect(reglasParaMostrar('repuestos', []).map((r) => r.clave)).not.toContain('aduana')
    expect(
      reglasParaMostrar('repuestos', [{ regla: 'aduana', activa: true }]).map((r) => r.clave),
    ).toContain('aduana')
  })
})
