import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { disenoSintetico } from '@/modules/cotizaciones/entities/diseno-sintetico'
import type { Definicion } from '@/modules/cotizaciones/entities/formula'
import { REGLAS_DE_DISENO } from '@/modules/cotizaciones/entities/motivos-de-diseno'
import { validarFormula } from '@/modules/cotizaciones/entities/validar'
import { validarDiseno } from '@/modules/cotizaciones/entities/validar-diseno'
import {
  corpusComoTexto,
  generarCorpus,
  MUTADORES_CRUZADOS_DE_DISENO,
  MUTADORES_DE_FORMA_DE_DISENO,
  SEMILLA,
  type Base,
  type RefDeFormula,
} from './corpus-de-diseno'
import type { ContextoJson } from './mutadores-de-diseno-base'
import type { Json, Objeto } from './mutadores-de-formula'

// Las rutas van por variables (Vite reescribe un `new URL('literal', import.meta.url)`).
const JUEGO = 'src/modules/cotizaciones/entities/casos-de-diseno.json'
const FORMULAS = 'src/modules/cotizaciones/entities/casos-de-formula.json'
const MIGRACION = 'supabase/migrations/20261019005600_validar_diseno.sql'
const CORPUS = 'supabase/tests/corpus-de-diseno.json'
const REGENERAR = 'ACTUALIZAR_CORPUS=1 pnpm vitest run supabase/tests/corpus-de-diseno.test.ts'

type CasoDelJuego = {
  nombre: string
  valida: boolean
  formula?: string
  formula_de?: string
  contexto?: ContextoJson
  diseno: Json
}
const juego = JSON.parse(readFileSync(JUEGO, 'utf8')) as {
  contexto: ContextoJson
  formulas: Record<string, { definicion: Objeto; params: Json }>
  casos: CasoDelJuego[]
}
const deFormulas = (
  JSON.parse(readFileSync(FORMULAS, 'utf8')) as {
    casos: { nombre: string; definicion: Objeto; params: Json }[]
  }
).casos

function definicionDe(c: CasoDelJuego): Objeto {
  const f =
    c.formula !== undefined
      ? juego.formulas[c.formula]
      : deFormulas.find((x) => x.nombre === c.formula_de)
  if (!f) throw new Error(`«${c.nombre}» no nombra una fórmula que exista`)
  return f.definicion
}
const refDe = (c: CasoDelJuego): RefDeFormula =>
  c.formula !== undefined ? { formula: c.formula } : { formula_de: c.formula_de ?? '' }

const bases: Base[] = juego.casos
  .filter((c) => c.valida)
  .map((c) => ({
    nombre: c.nombre.split(':')[0] ?? c.nombre,
    ref: refDe(c),
    definicion: definicionDe(c),
    diseno: c.diseno,
    contexto: c.contexto ?? juego.contexto,
  }))
const casos = generarCorpus(bases)
const sinteticas = { chica: disenoSintetico(40), grande: disenoSintetico(400) }
const texto = corpusComoTexto(SEMILLA, casos, sinteticas)

describe('corpus-de-diseno.json', () => {
  it(`está al día con su generador (para regenerarlo: ${REGENERAR})`, () => {
    if (process.env['ACTUALIZAR_CORPUS'] === '1') writeFileSync(CORPUS, texto)
    const guardado = existsSync(CORPUS) ? readFileSync(CORPUS, 'utf8') : ''
    if (guardado === texto) return
    // Dice el primer caso distinto, no el archivo entero.
    const [a, b] = [guardado.split('\n'), texto.split('\n')]
    const i = b.findIndex((linea, k) => linea !== a[k])
    expect.fail(
      `el corpus guardado no es el que genera el código (línea ${String(i + 1)}: ${(b[i] ?? '').slice(0, 160)}). ${REGENERAR}`,
    )
  })

  it('parte de los diseños válidos del juego, de cinco fórmulas distintas', () => {
    expect(bases.length).toBeGreaterThanOrEqual(20)
    const formulas = new Set(bases.map((b) => JSON.stringify(b.ref)))
    expect(formulas.size).toBeGreaterThanOrEqual(5)
  })

  it('tiene al menos 400 casos, cada regla es el primer rechazo de al menos 5, y mezcla defectos', () => {
    expect(casos.length).toBeGreaterThanOrEqual(400)
    const porRegla = new Map<string, number>()
    for (const c of casos) {
      if (c.motivo) porRegla.set(c.motivo.regla, (porRegla.get(c.motivo.regla) ?? 0) + 1)
    }
    for (const regla of REGLAS_DE_DISENO) {
      expect(porRegla.get(regla) ?? 0, regla).toBeGreaterThanOrEqual(5)
    }
    expect(casos.filter((c) => c.mutaciones.length >= 2).length).toBeGreaterThanOrEqual(200)
    expect(casos.filter((c) => c.valida).length).toBeGreaterThanOrEqual(15)
    expect(new Set(casos.map((c) => c.nombre)).size).toBe(casos.length)
  })

  it('el esperado de cada caso es lo que dice validarDiseno sobre lo guardado', () => {
    for (const c of casos) {
      const cruda =
        'formula' in c
          ? juego.formulas[c.formula]
          : deFormulas.find((x) => x.nombre === c.formula_de)
      const f = validarFormula(cruda?.definicion, cruda?.params)
      if (!f.ok) throw new Error(f.error.mensaje)
      const r = validarDiseno(f.formula.definicion, c.diseno, c.contexto)
      expect(r.ok ? undefined : { regla: r.error.regla, donde: r.error.donde }, c.nombre).toEqual(
        c.motivo ? { regla: c.motivo.regla, donde: c.motivo.donde } : undefined,
      )
    }
  })

  it('cada comprobación de forma de la migración tiene su mutador, y todos los mutadores se aplican', () => {
    const marcas = new Set(
      [...readFileSync(MIGRACION, 'utf8').matchAll(/\/\*(D\d+)\*\//g)].map((m) => m[1]),
    )
    const conMutador = new Set(
      MUTADORES_DE_FORMA_DE_DISENO.map((m) => m.nombre.replace('forma_', '')),
    )
    // D25 (un ítem que no pasa su forma) lo rompen todos los de D40 a D59: no tiene uno propio.
    for (const marca of marcas) {
      if (marca !== 'D25')
        expect(conMutador.has(marca ?? ''), `${marca ?? '?'} sin mutador`).toBe(true)
    }
    const aplicados = new Set(casos.flatMap((c) => c.mutaciones.map((m) => m.split('(')[0])))
    for (const m of [...MUTADORES_CRUZADOS_DE_DISENO, ...MUTADORES_DE_FORMA_DE_DISENO]) {
      expect(aplicados.has(m.nombre), `${m.nombre} nunca se aplicó`).toBe(true)
    }
  })

  it('las sintéticas de escala validan, de unos 200 y de unos 2.000 ítems', () => {
    for (const s of [sinteticas.chica, sinteticas.grande]) {
      const f = validarFormula(s.definicion, s.params)
      if (!f.ok) throw new Error(f.error.mensaje)
      const r = validarDiseno(f.formula.definicion as Definicion, s.diseno, s.contexto)
      expect(r.ok ? r : r.error).toMatchObject({ ok: true })
    }
    const items = (s: typeof sinteticas.chica) =>
      s.diseno.secciones.reduce((n, x) => n + x.items.length, 0)
    expect(items(sinteticas.chica)).toBeGreaterThan(200)
    expect(items(sinteticas.grande)).toBeGreaterThan(2000)
  })
})
