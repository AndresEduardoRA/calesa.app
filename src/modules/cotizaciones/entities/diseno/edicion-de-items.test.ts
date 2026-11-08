import { describe, expect, it } from 'vitest'
import casos from '../casos-de-diseno.json'
import { esquemaDiseno, type Diseno } from '../diseno'
import { esquemaDefinicion } from '../formula'
import { validarDiseno } from '../validar-diseno'
import { nodosPorId } from './admite-nivel'
import {
  columnasParaAtajos,
  ponerAtajos,
  ponerAyuda,
  ponerEfecto,
  tablasParaAyuda,
} from './edicion-de-items'

const juego = casos as unknown as {
  contexto: { niveles: string[]; retirados: string[]; tonos: string[] }
  formulas: Record<string, { definicion: unknown }>
  casos: { nombre: string; diseno: unknown }[]
}
const definicion = esquemaDefinicion.parse(juego.formulas['capturas']?.definicion)
const capturas = esquemaDiseno.parse(
  juego.casos.find((c) => c.nombre.startsWith('capturas'))?.diseno,
)

function congelar<T>(valor: T): T {
  if (typeof valor === 'object' && valor !== null) {
    Object.values(valor).forEach(congelar)
    Object.freeze(valor)
  }
  return valor
}
const itemDe = (d: Diseno, seccion: string, tipo: string, nodo: string) =>
  d.secciones.find((s) => s.id === seccion)?.items.find((i) => i.tipo === tipo && i.nodo === nodo)
const valida = (d: Diseno) => validarDiseno(definicion, d, juego.contexto).ok

describe('atajos', () => {
  it('T4 · ponerAtajos acota las filas a 1..12 y descarta lo que no es número; sin mutar', () => {
    const d = congelar(capturas)
    expect(
      itemDe(ponerAtajos(d, 'cif', 'factor_dp', { filas: 99 }), 'cif', 'atajos', 'factor_dp'),
    ).toMatchObject({ filas: 12 })
    expect(
      itemDe(ponerAtajos(d, 'cif', 'factor_dp', { filas: 0 }), 'cif', 'atajos', 'factor_dp'),
    ).toMatchObject({ filas: 1 })
    expect(
      itemDe(ponerAtajos(d, 'cif', 'factor_dp', { filas: 4.7 }), 'cif', 'atajos', 'factor_dp'),
    ).toMatchObject({ filas: 4 })
    expect(ponerAtajos(d, 'cif', 'factor_dp', { filas: Number.NaN })).toStrictEqual(d)
    expect(ponerAtajos(d, 'cif', 'factor_dp', { columna: 'anio' })).toStrictEqual(d)
    expect(valida(ponerAtajos(d, 'cif', 'factor_dp', { filas: 5 }))).toBe(true)
  })

  it('T4 · columnasParaAtajos da las claves de match y la columna del nodo, sin repetir y con la actual', () => {
    const nodos = nodosPorId(definicion)
    expect(columnasParaAtajos(nodos, 'factor_dp', 'anio')).toContain('anio')
    const con = columnasParaAtajos(nodos, 'factor_dp', 'rara')
    expect(con).toContain('rara')
    expect(new Set(con).size).toBe(con.length)
    expect(columnasParaAtajos(nodos, 'no_existe', 'x')).toStrictEqual(['x'])
  })
})

describe('interruptor', () => {
  it('T4 · ponerEfecto sólo acepta habilita y muestra', () => {
    const d = congelar(capturas)
    const muestra = ponerEfecto(d, 'hoja', 'cuenta_especial_usa', 'muestra')
    expect(itemDe(muestra, 'hoja', 'interruptor', 'cuenta_especial_usa')).toMatchObject({
      efecto: 'muestra',
    })
    expect(ponerEfecto(d, 'hoja', 'cuenta_especial_usa', 'otro' as 'muestra')).toStrictEqual(d)
  })
})

describe('ayuda de una celda', () => {
  const celda = (d: Diseno) => itemDe(d, 'logistica', 'celda', 'transporte_bolivia')

  it('T4 · el texto quita la tabla, la tabla quita el texto, vacío quita la clave, 301 se cortan a 300', () => {
    const d = congelar(capturas)
    const texto = ponerAyuda(d, 'logistica', 'transporte_bolivia', { texto: 'Hola mundo ' })
    expect(celda(texto)).toMatchObject({ ayuda: { texto: 'Hola mundo ' } })
    expect(celda(texto)).not.toHaveProperty('ayuda.tabla')
    const tabla = ponerAyuda(texto, 'logistica', 'transporte_bolivia', { tabla: 'depreciacion' })
    expect(celda(tabla)).toMatchObject({ ayuda: { tabla: 'depreciacion' } })
    expect(celda(tabla)).not.toHaveProperty('ayuda.texto')
    expect(celda(ponerAyuda(tabla, 'logistica', 'transporte_bolivia', null))).not.toHaveProperty(
      'ayuda',
    )
    expect(
      celda(ponerAyuda(d, 'logistica', 'transporte_bolivia', { texto: '   ' })),
    ).not.toHaveProperty('ayuda')
    const largo = ponerAyuda(d, 'logistica', 'transporte_bolivia', { texto: 'x'.repeat(301) })
    expect(JSON.stringify(celda(largo))).toContain('x'.repeat(300))
    expect(JSON.stringify(celda(largo))).not.toContain('x'.repeat(301))
    expect(valida(texto)).toBe(true)
  })

  it('T4 · tablasParaAyuda da las tablas que nombra la fórmula, en orden y sin repetir, con la actual', () => {
    const tablas = tablasParaAyuda(definicion, 'otra')
    expect(new Set(tablas).size).toBe(tablas.length)
    expect(tablas).toContain('depreciacion')
    expect(tablas).toContain('otra')
  })
})
