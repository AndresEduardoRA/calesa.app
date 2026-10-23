import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { esquemaModoDeCambio, type Formula } from './formula'
import { evaluar } from './motor'
import { CODIGOS_DE_FALTANTE } from './motor-contexto'
import { esquemaEntrada } from './motor-entrada'
import { redondear } from './redondeo'
import { validarFormula } from './validar'

// El juego del motor (docs/COTIZADOR.md › «El motor»). Desde 4.06 lo lee también la prueba de paridad de
// evaluar_formula(): por eso es un archivo de datos y no TypeScript.
const numero = z.number().nullable()
const esquemaTotales = z.strictObject({
  grupos: z.record(z.string(), z.strictObject({ usd: numero, bs: numero })).optional(),
  bs: numero.optional(),
  usd: numero.optional(),
  suma_usd: numero.optional(),
})
const esquemaFaltante = z.strictObject({
  codigo: z.enum(CODIGOS_DE_FALTANTE),
  donde: z.string(),
  ref: z.string().optional(),
})
const esquemaJuego = z.strictObject({
  descripcion: z.string(),
  casos: z.array(
    z.strictObject({
      nombre: z.string().min(1),
      formula_de: z.string().optional(),
      definicion: z.unknown().optional(),
      params: z.unknown().optional(),
      entrada: z.record(z.string(), z.unknown()),
      modo: esquemaModoDeCambio.optional(),
      decimales: z.int().optional(),
      esperado: z.strictObject({
        valores: z.record(z.string(), numero).optional(),
        totales: esquemaTotales.optional(),
        faltantes: z.array(esquemaFaltante),
      }),
    }),
  ),
})
const esquemaJuegoDeFormulas = z.object({
  casos: z.array(z.object({ nombre: z.string(), definicion: z.unknown(), params: z.unknown() })),
})

const leer = (ruta: string): unknown =>
  JSON.parse(readFileSync(new URL(ruta, import.meta.url), 'utf8'))
const juego = esquemaJuego.parse(leer('./casos-del-motor.json'))
const formulas = esquemaJuegoDeFormulas.parse(leer('./casos-de-formula.json')).casos
type Caso = (typeof juego.casos)[number]

// La fórmula del caso, o la del juego de fórmulas que nombra; siempre pasa por validarFormula.
function formulaDe(c: Caso): Formula {
  const de = c.formula_de === undefined ? c : formulas.find((f) => f.nombre === c.formula_de)
  if (de === undefined) throw new Error(`${c.nombre}: no hay un caso «${c.formula_de}»`)
  const r = validarFormula(de.definicion, de.params ?? {})
  if (!r.ok) throw new Error(`${c.nombre}: ${r.error.mensaje}`)
  return r.formula
}

const VACIA = { inputs: {}, banderas: {}, tipos_cambio: {}, vehiculo: {}, tablas: {} }
const entradaDe = (c: Caso) => esquemaEntrada.parse({ ...VACIA, ...c.entrada })

// Exacto (Object.is) salvo que el caso diga con cuántos decimales.
function igual(visto: number | null | undefined, esperado: number | null, c: Caso, que: string) {
  if (esperado === null || c.decimales === undefined) expect(visto, que).toBe(esperado)
  else expect(visto, que).toBeCloseTo(esperado, c.decimales)
}

describe('casos-del-motor.json', () => {
  it.each(juego.casos)('$nombre', (c) => {
    const r = evaluar(formulaDe(c), entradaDe(c), c.modo)
    for (const [id, v] of Object.entries(c.esperado.valores ?? {})) {
      expect(Object.hasOwn(r.valores, id), id).toBe(true)
      igual(r.valores[id], v, c, `valores.${id}`)
    }
    const { grupos, ...totales } = c.esperado.totales ?? {}
    for (const [clave, v] of Object.entries(totales)) {
      igual(r.totales[clave as keyof typeof totales], v, c, `totales.${clave}`)
    }
    if (grupos !== undefined) {
      expect(Object.keys(r.totales.grupos)).toEqual(Object.keys(grupos))
      for (const [id, g] of Object.entries(grupos)) {
        igual(r.totales.grupos[id]?.usd, g.usd, c, `grupos.${id}.usd`)
        igual(r.totales.grupos[id]?.bs, g.bs, c, `grupos.${id}.bs`)
      }
    }
    expect(r.faltantes).toEqual(c.esperado.faltantes)
    expect(r.fuentes).toEqual({})
  })
})

describe('el juego del motor', () => {
  const resueltas = juego.casos.map(formulaDe)

  it('cubre cada código de faltante, cada tipo de nodo (salvo la variante) y cada operación', () => {
    const codigos = new Set(juego.casos.flatMap((c) => c.esperado.faltantes.map((f) => f.codigo)))
    const nodos = resueltas.flatMap((f) => f.definicion.nodos)
    const tipos = new Set(nodos.map((n) => n.tipo))
    const ops = new Set(nodos.flatMap((n) => (n.tipo === 'calculo' ? [n.op] : [])))
    for (const codigo of CODIGOS_DE_FALTANTE) expect(codigos, codigo).toContain(codigo)
    const todos = [
      'input',
      'constante',
      'tipo_cambio',
      'campo_vehiculo',
      'bandera',
      'tabla',
      'tramo',
    ]
    for (const tipo of todos) expect(tipos, tipo).toContain(tipo)
    const todas = [
      'suma',
      'porcentaje_de',
      'multiplicar',
      'restar',
      'dividir',
      'si',
      'depreciar',
      'redondear',
    ]
    for (const op of todas) expect(ops, op).toContain(op)
  })

  it('los nombres no se repiten y cada entrada pasa esquemaEntrada', () => {
    const nombres = juego.casos.map((c) => c.nombre)
    expect(new Set(nombres).size).toBe(nombres.length)
    for (const c of juego.casos) expect(() => entradaDe(c), c.nombre).not.toThrow()
  })
})

describe('las capturas del cotizador de hoy (docs/referencias/cotizador-actual.md)', () => {
  const total = (nombre: string) => {
    const c = juego.casos.find((x) => x.nombre.startsWith(nombre))
    if (c === undefined) throw new Error(nombre)
    return evaluar(formulaDe(c), entradaDe(c), c.modo).totales.usd ?? Number.NaN
  }

  it('la 02 da 2.349,81 sin redondear y se muestra $2.350', () => {
    const usd = total('captura 02')
    expect(usd).toBeCloseTo(2349.809836065574, 9)
    expect([redondear(usd, 2), redondear(usd, 0)]).toEqual([2349.81, 2350])
  })

  it('la 09, con el unificado en 12, da 72.951,51 sin redondear y se muestra $72.952', () => {
    const usd = total('captura 09: modo unificado')
    expect(usd).toBeCloseTo(72951.50666666667, 9)
    expect([redondear(usd, 2), redondear(usd, 0)]).toEqual([72951.51, 72952])
  })
})
