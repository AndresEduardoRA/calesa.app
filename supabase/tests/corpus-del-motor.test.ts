import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { evaluacionSintetica } from '@/modules/cotizaciones/entities/evaluacion-sintetica'
import { evaluar } from '@/modules/cotizaciones/entities/motor'
import {
  CODIGOS_DE_FALTANTE,
  ESTADOS,
  FUENTES,
  MOTIVOS_DE_DESCARTE,
} from '@/modules/cotizaciones/entities/motor-contexto'
import { CODIGOS_DE_ERROR_DEL_MOTOR } from '@/modules/cotizaciones/entities/motor-errores'
import { esquemaFormula } from '@/modules/cotizaciones/entities/formula'
import { esquemaEntrada } from '@/modules/cotizaciones/entities/motor-entrada'
import { validarFormula } from '@/modules/cotizaciones/entities/validar'
import {
  basesDelJuego,
  corpusComoTexto,
  generarCorpus,
  MUTADORES_DEL_CORPUS,
  SEMILLA,
} from './corpus-del-motor'

// Las rutas van por variables (Vite reescribe un `new URL('literal', import.meta.url)`).
const JUEGO = 'src/modules/cotizaciones/entities/casos-del-motor.json'
const FORMULAS = 'src/modules/cotizaciones/entities/casos-de-formula.json'
const CORPUS = 'supabase/tests/corpus-del-motor.json'
const REGENERAR = 'ACTUALIZAR_CORPUS=1 pnpm vitest run supabase/tests/corpus-del-motor.test.ts'

const juego = JSON.parse(readFileSync(JUEGO, 'utf8')) as {
  casos: Parameters<typeof basesDelJuego>[0]
}
const formulas = (
  JSON.parse(readFileSync(FORMULAS, 'utf8')) as { casos: Parameters<typeof basesDelJuego>[1] }
).casos
const corpus = generarCorpus(basesDelJuego(juego.casos, formulas))
const sinteticas = {
  chica: evaluacionSintetica(200),
  grande: evaluacionSintetica(2000),
  // Para saber qué cuestan las tablas grandes antes de que el prompt 2 las lea de la base: 4 tablas de 1.000 filas, vivas (en la
  // entrada) y congeladas (en `params`).
  con_tablas_vivas: evaluacionSintetica(200, { filas: 1000, tablas: 4, vivas: true }),
  con_tablas_congeladas: evaluacionSintetica(200, { filas: 1000, tablas: 4 }),
  // Para la guarda de los argumentos comprimidos: con 2.000 nodos hay cientos de lecturas que descomprimir si se lee un argumento
  // dentro de un bucle.
  grande_con_tablas: evaluacionSintetica(2000, { filas: 1000, tablas: 4 }),
}
const texto = corpusComoTexto(SEMILLA, corpus, sinteticas)

describe('corpus-del-motor.json', () => {
  it(`está al día con su generador (para regenerarlo: ${REGENERAR})`, () => {
    if (process.env['ACTUALIZAR_CORPUS'] === '1') writeFileSync(CORPUS, texto)
    const guardado = existsSync(CORPUS) ? readFileSync(CORPUS, 'utf8') : ''
    if (guardado === texto) return
    // Dice la primera línea distinta, no el archivo entero.
    const [a, b] = [guardado.split('\n'), texto.split('\n')]
    const i = b.findIndex((linea, k) => linea !== a[k])
    expect.fail(
      `el corpus guardado no es el que genera el código (línea ${String(i + 1)}: ${(b[i] ?? '').slice(0, 160)}). ${REGENERAR}`,
    )
  })

  it('el juego son los 84 casos de casos-del-motor.json, y todos se evalúan', () => {
    expect(corpus.juego.map((c) => c.nombre)).toEqual(juego.casos.map((c) => c.nombre))
    expect(corpus.juego).toHaveLength(84)
    for (const c of corpus.juego) expect(Object.keys(c.esperado), c.nombre).toEqual(['resultado'])
  })

  it('trae la aritmética y el redondeo para comparar los ayudantes con JS', () => {
    expect(corpus.aritmetica.length).toBeGreaterThanOrEqual(3000)
    expect(corpus.redondeo.length).toBeGreaterThanOrEqual(700)
  })

  it('tiene al menos 400 casos, mezcla defectos y trae lo escrito a mano', () => {
    expect(corpus.casos.length).toBeGreaterThanOrEqual(400)
    expect(corpus.casos.filter((c) => c.mutaciones.length >= 2).length).toBeGreaterThanOrEqual(150)
    const porGrupo = (g: string) => corpus.casos.filter((c) => c.grupo === g).length
    expect(porGrupo('dirigido')).toBeGreaterThanOrEqual(150)
    expect(porGrupo('mezcla')).toBeGreaterThanOrEqual(200)
    expect(porGrupo('borde')).toBeGreaterThanOrEqual(40)
    expect(porGrupo('sin_validar')).toBeGreaterThanOrEqual(30)
    expect(porGrupo('texto')).toBeGreaterThanOrEqual(30)
    expect(porGrupo('forma')).toBeGreaterThanOrEqual(150)
    expect(new Set(corpus.casos.map((c) => c.nombre)).size).toBe(corpus.casos.length)
  })

  it('cada mutador se aplica en al menos 3 casos', () => {
    const usados = new Map<string, number>()
    for (const c of corpus.casos) {
      for (const m of c.mutaciones)
        usados.set(m.replace(/\(.*$/, ''), (usados.get(m.replace(/\(.*$/, '')) ?? 0) + 1)
    }
    for (const m of MUTADORES_DEL_CORPUS)
      expect(usados.get(m.nombre) ?? 0, m.nombre).toBeGreaterThanOrEqual(3)
  })
})

describe('lo que cubre el corpus de evaluar_formula()', () => {
  it('cubre cada código de faltante, de estado, de fuente, de descarte y de error de llamada', () => {
    const todos = [...corpus.juego, ...corpus.casos]
    const resultados = todos.flatMap((c) =>
      'resultado' in c.esperado ? [c.esperado.resultado] : [],
    )
    const errores = todos.flatMap((c) => ('error' in c.esperado ? [c.esperado.error] : []))
    const vistos = (xs: readonly string[]) => new Set(xs)
    const faltantes = vistos(resultados.flatMap((r) => r.faltantes.map((f) => f.codigo)))
    const estados = vistos(resultados.flatMap((r) => Object.values(r.estados)))
    const fuentes = vistos(resultados.flatMap((r) => Object.values(r.fuentes)))
    const motivos = vistos(resultados.flatMap((r) => r.overrides_descartados.map((d) => d.motivo)))
    for (const x of CODIGOS_DE_FALTANTE) expect(faltantes, x).toContain(x)
    for (const x of ESTADOS) expect(estados, x).toContain(x)
    for (const x of FUENTES) expect(fuentes, x).toContain(x)
    for (const x of MOTIVOS_DE_DESCARTE) expect(motivos, x).toContain(x)
    const codigos = vistos(errores.map((e) => e.codigo))
    for (const x of CODIGOS_DE_ERROR_DEL_MOTOR) expect(codigos, x).toContain(x)
    // Los errores de forma de la entrada y del modo nombran el campo (o ninguno), y los hay de cada campo de primer nivel.
    const campos = vistos(
      errores.filter((e) => e.codigo === 'entrada_invalida').map((e) => e.donde ?? '-'),
    )
    for (const campo of [
      'inputs',
      'banderas',
      'tipos_cambio',
      'vehiculo',
      'tablas',
      'variante',
      'overrides',
      '-',
    ])
      expect(campos, campo).toContain(campo)
    const camposDelModo = vistos(
      errores.filter((e) => e.codigo === 'modo_invalido').map((e) => e.donde ?? '-'),
    )
    for (const campo of ['buckets', 'total_en', '-']) expect(camposDelModo, campo).toContain(campo)
    expect(errores.length).toBeGreaterThanOrEqual(60)
    expect(resultados.length).toBeGreaterThanOrEqual(300)
  })

  it('las llamadas guardadas son válidas: la entrada y las fórmulas pasan su forma, y las dirigidas y mezcladas validan', () => {
    for (const c of corpus.casos) {
      const f = corpus.formulas[c.formula]
      expect(f, c.nombre).toBeDefined()
      expect(esquemaFormula.safeParse(f).success, c.nombre).toBe(true)
      if (c.grupo === 'dirigido' || c.grupo === 'mezcla' || c.grupo === 'borde')
        expect(validarFormula(f?.definicion, f?.params).ok, c.nombre).toBe(true)
    }
  })

  it('las sintéticas de escala evalúan sin faltantes, con 200 y 2.000 nodos y con 4 tablas de 1.000 filas', () => {
    for (const s of Object.values(sinteticas)) {
      const f = validarFormula(s.definicion, s.params)
      expect(f.ok).toBe(true)
      if (!f.ok) continue
      expect(evaluar(f.formula, esquemaEntrada.parse(s.entrada)).faltantes).toEqual([])
    }
    expect(sinteticas.chica.definicion.nodos).toHaveLength(200)
    expect(sinteticas.grande.definicion.nodos).toHaveLength(2000)
    expect(Object.keys(sinteticas.con_tablas_vivas.entrada.tablas)).toHaveLength(4)
    expect(Object.keys(sinteticas.con_tablas_congeladas.params['tablas'] ?? {})).toHaveLength(4)
  })
})
