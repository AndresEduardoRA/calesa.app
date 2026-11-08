import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  contextoDeValidacion,
  TOPE_DE_TONOS,
  versionDePlantilla,
  type FormulaParaLaPlantilla,
} from './lectura-de-la-plantilla'
import { juegoDePlantilla } from './juego-de-plantilla.soporte'

const HORA = '2026-11-07T15:00:00.123456+00:00'
const base = { id: 'a', version: null, nota: null, actualizadoEn: HORA, publicadoEn: null }
const VALIDA = {
  grupos: [{ grupo: 'compra' }],
  total: { etiqueta: 'TOTAL' },
  logo: false,
  columnas: { leyenda: true, plazo: false, tipo_cambio: false },
}

describe('versionDePlantilla', () => {
  it('una definición con la forma: la plantilla, sin motivo, y las horas tal cual', () => {
    const v = versionDePlantilla({ ...base, definicion: VALIDA, version: 3, nota: 'Hola' })
    expect(v).toEqual({ ...base, version: 3, nota: 'Hola', plantilla: VALIDA, motivo: null })
    expect(v.actualizadoEn).toBe(HORA)
  })

  it('una definición rota: sin plantilla y con el mensaje del rechazo', () => {
    const v = versionDePlantilla({ ...base, definicion: { ...VALIDA, grupos: 'no' } })
    expect(v.plantilla).toBeNull()
    expect(v.motivo).toBe('La plantilla no tiene la forma esperada.')
  })

  it('lo que no es un objeto no lanza', () => {
    for (const definicion of [null, 3, 'x', [], undefined]) {
      expect(versionDePlantilla({ ...base, definicion }).plantilla).toBeNull()
    }
  })

  it('los casos de forma rota del juego dan plantilla nula', () => {
    const juego = juegoDePlantilla(
      readFileSync(
        join(dirname(fileURLToPath(import.meta.url)), 'casos-de-plantilla.json'),
        'utf8',
      ),
    )
    const rotos = juego.casos.filter((c) => 'motivo' in c && c.motivo.regla === 'forma')
    expect(rotos.length).toBeGreaterThan(0)
    for (const c of rotos) {
      expect(versionDePlantilla({ ...base, definicion: c.plantilla }).plantilla).toBeNull()
    }
  })
})

const FORMULA: FormulaParaLaPlantilla = {
  id: 'f',
  version: 2,
  definicion: { nodos: [] },
  diseno: null,
  visibilidad: { x: 1 },
}

describe('contextoDeValidacion', () => {
  it('sin fórmula no hay contexto', () => {
    expect(contextoDeValidacion(null, [{ clave: 'verde', nombre: 'Verde' }])).toBeNull()
  })

  it('con fórmula: su definición, diseño y visibilidad, y las claves de los tonos', () => {
    const contexto = contextoDeValidacion(FORMULA, [
      { clave: 'verde', nombre: 'Verde' },
      { clave: 'azul', nombre: 'Azul' },
    ])
    expect(contexto).toEqual({
      definicion: FORMULA.definicion,
      diseno: null,
      visibilidad: { x: 1 },
      tonos: ['verde', 'azul'],
    })
  })

  it('sin tonos en el catálogo, la lista está vacía y no nula (con catálogo, un tono ajeno cae)', () => {
    expect(contextoDeValidacion(FORMULA, [])?.tonos).toEqual([])
  })
})

describe('TOPE_DE_TONOS', () => {
  it('es el de la base', () => {
    expect(TOPE_DE_TONOS).toBe(24)
  })
})
