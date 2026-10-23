import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { esquemaModoDeCambio, type Formula } from './formula'
import { evaluar, type Resultado } from './motor'
import { CODIGOS_DE_FALTANTE, ESTADOS, FUENTES, MOTIVOS_DE_DESCARTE } from './motor-contexto'
import { esquemaEntrada } from './motor-entrada'
import { redondear } from './redondeo'
import { validarFormula } from './validar'

// El juego del motor (docs/COTIZADOR.md › «El motor»). Desde 4.06 lo lee también la prueba de paridad de
// evaluar_formula(): por eso es un archivo de datos y no TypeScript.
const numero = z.number().nullable()
const esquemaTotales = z.strictObject({
  grupos: z
    .record(z.string(), z.strictObject({ usd: numero, bs: numero, se_dibuja: z.boolean() }))
    .optional(),
  bs: numero.optional(),
  usd: numero.optional(),
  suma_usd: numero.optional(),
})
const esquemaFaltante = z.strictObject({
  codigo: z.enum(CODIGOS_DE_FALTANTE),
  donde: z.string(),
  ref: z.string().optional(),
})
const esquemaEsperado = z.strictObject({
  valores: z.record(z.string(), z.union([z.number(), z.string()]).nullable()).optional(),
  // Los que no están activos; el resto, activo.
  estados: z.record(z.string(), z.enum(ESTADOS).exclude(['activo'])).optional(),
  // El mapa entero, en el orden de la lista.
  fuentes: z.record(z.string(), z.enum(FUENTES)).optional(),
  totales: esquemaTotales.optional(),
  faltantes: z.array(esquemaFaltante),
  overrides_descartados: z
    .array(z.strictObject({ id: z.string(), motivo: z.enum(MOTIVOS_DE_DESCARTE) }))
    .optional(),
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
      esperado: esquemaEsperado,
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

const VACIA = {
  inputs: {},
  banderas: {},
  tipos_cambio: {},
  vehiculo: {},
  tablas: {},
  overrides: {},
}
const entradaDe = (c: Caso) => esquemaEntrada.parse({ ...VACIA, ...c.entrada })

// Exacto (Object.is) salvo que el caso diga con cuántos decimales; un texto, siempre exacto.
function igual(visto: unknown, esperado: number | string | null, c: Caso, que: string) {
  if (typeof esperado !== 'number' || c.decimales === undefined) expect(visto, que).toBe(esperado)
  else expect(visto, que).toBeCloseTo(esperado, c.decimales)
}

function compararValores(r: Resultado, c: Caso) {
  for (const [id, v] of Object.entries(c.esperado.valores ?? {})) {
    expect(Object.hasOwn(r.valores, id), id).toBe(true)
    igual(r.valores[id], v, c, `valores.${id}`)
  }
}

function compararTotales(r: Resultado, c: Caso) {
  const { grupos, ...totales } = c.esperado.totales ?? {}
  for (const [clave, v] of Object.entries(totales)) {
    igual(r.totales[clave as keyof typeof totales], v, c, `totales.${clave}`)
  }
  if (grupos === undefined) return
  expect(Object.keys(r.totales.grupos)).toEqual(Object.keys(grupos))
  for (const [id, g] of Object.entries(grupos)) {
    igual(r.totales.grupos[id]?.usd, g.usd, c, `grupos.${id}.usd`)
    igual(r.totales.grupos[id]?.bs, g.bs, c, `grupos.${id}.bs`)
    expect(r.totales.grupos[id]?.se_dibuja, `grupos.${id}.se_dibuja`).toBe(g.se_dibuja)
  }
}

// Los estados y las fuentes se comparan enteros y en el orden de la lista (como los guarda la base).
function compararMapas(r: Resultado, c: Caso, formula: Formula) {
  const { estados, fuentes } = c.esperado
  if (estados !== undefined) {
    const todos = formula.definicion.nodos.map((n) => [
      n.id,
      Object.hasOwn(estados, n.id) ? estados[n.id] : 'activo',
    ])
    expect(Object.entries(r.estados), 'estados').toEqual(todos)
  }
  if (fuentes !== undefined)
    expect(Object.entries(r.fuentes), 'fuentes').toEqual(Object.entries(fuentes))
}

describe('casos-del-motor.json', () => {
  it.each(juego.casos)('$nombre', (c) => {
    const formula = formulaDe(c)
    const r = evaluar(formula, entradaDe(c), c.modo)
    compararValores(r, c)
    compararTotales(r, c)
    compararMapas(r, c, formula)
    expect(r.faltantes).toEqual(c.esperado.faltantes)
    expect(r.overrides_descartados).toEqual(c.esperado.overrides_descartados ?? [])
  })
})

describe('el juego del motor', () => {
  const resueltas = juego.casos.map(formulaDe)
  const esperados = juego.casos.map((c) => c.esperado)

  it('cubre cada tipo de nodo, cada operación y cada código de faltante', () => {
    const codigos = new Set(esperados.flatMap((e) => e.faltantes.map((f) => f.codigo)))
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
      'opcion',
      'tabla',
      'tramo',
    ]
    for (const tipo of todos) expect(tipos, tipo).toContain(tipo)
    const todas = ['suma', 'porcentaje_de', 'multiplicar', 'restar', 'dividir', 'si']
    for (const op of [...todas, 'depreciar', 'redondear']) expect(ops, op).toContain(op)
  })

  it('cubre cada fuente, cada estado y cada motivo de descarte', () => {
    const fuentes = new Set(esperados.flatMap((e) => Object.values(e.fuentes ?? {})))
    const estados = new Set(esperados.flatMap((e) => Object.values(e.estados ?? {})))
    const motivos = new Set(
      esperados.flatMap((e) => (e.overrides_descartados ?? []).map((d) => d.motivo)),
    )
    for (const f of FUENTES) expect(fuentes, f).toContain(f)
    for (const e of ESTADOS) if (e !== 'activo') expect(estados, e).toContain(e)
    for (const m of MOTIVOS_DE_DESCARTE) expect(motivos, m).toContain(m)
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
    for (const nombre of ['captura 09: modo unificado', 'captura 09: el unificado de la empresa']) {
      const usd = total(nombre)
      expect(usd, nombre).toBeCloseTo(72951.50666666667, 9)
      expect([redondear(usd, 2), redondear(usd, 0)], nombre).toEqual([72951.51, 72952])
    }
  })
})
