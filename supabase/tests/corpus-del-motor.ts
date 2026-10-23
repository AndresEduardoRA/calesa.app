// El corpus diferencial de `evaluar_formula()` contra `evaluar()` de TS (paso 4.06, prompt 1). Parte de las fórmulas y las entradas
// del juego (`casos-del-motor.json`), las muta de forma determinista (un PRNG con semilla fija: defectos de ENTRADA y de tablas, de
// a uno y mezclados) y suma los casos escritos a mano (bordes de la aritmética, fórmulas sin validar, textos JSON). Para cada
// llamada guarda lo que dice el motor de TS (`esperado-del-motor.ts`). La base lo corre en `supabase/tests/evaluar-formula.sql`
// (`pnpm db:probar`) y compara cada número como float8, sin tolerancia. Lo regenera y lo compara con el guardado
// `corpus-del-motor.test.ts`.
//
// Las claves de cada objeto se guardan en el orden de jsonb (largo en bytes y después bytes): es lo que la base ve, y con dos claves
// malas en `inputs`, `banderas` o un modo, el `donde` del error depende del orden (docs/COTIZADOR.md › «En la base»).
import { esquemaEntrada } from '@/modules/cotizaciones/entities/motor-entrada'
import { validarFormula } from '@/modules/cotizaciones/entities/validar'
import { azarCon, enOrdenDeJsonb } from './corpus-de-formula'
import {
  casosDeAritmetica,
  casosDeRedondeo,
  type CasoDeAritmetica,
  type CasoDeRedondeo,
} from './casos-de-aritmetica'
import { CASOS_DE_BORDE } from './casos-de-borde'
import { CASOS_DE_LO_QUE_FALTA } from './casos-de-lo-que-falta'
import { CASOS_DE_FORMA } from './casos-de-forma'
import { CASOS_DE_TEXTO } from './casos-de-texto'
import { CASOS_PEREZOSOS } from './casos-perezosos'
import { CASOS_SIN_VALIDAR } from './casos-sin-validar'
import type { CasoAMano } from './constructores-del-motor'
import { esperadoDe, type Esperado } from './esperado-del-motor'
import { MUTADORES_DE_ENTRADA, type Llamada, type MutadorDelMotor } from './mutadores-de-entrada'
import { MUTADORES_DE_FORMA_DE_ENTRADA, MUTADORES_DE_MODO } from './mutadores-de-modo-y-forma'
import { MUTADORES_DE_FORMULA_DEL_MOTOR, MUTADORES_DE_TABLAS } from './mutadores-del-motor'
import { clonar, elegir, type Azar, type Json, type Objeto } from './mutadores-de-formula'

export const SEMILLA = 20261024

type CasoDelJuego = {
  nombre: string
  formula_de?: string
  definicion?: Json
  params?: Json
  entrada: Objeto
  modo?: Json
}
const VACIA = {
  inputs: {},
  banderas: {},
  tipos_cambio: {},
  vehiculo: {},
  tablas: {},
  overrides: {},
}

// Las bases del corpus: los casos de `casos-del-motor.json` con su fórmula (inline, o la que nombra de `casos-de-formula.json`) y su
// entrada completa, como la deja `esquemaEntrada`.
export function basesDelJuego(
  juego: readonly CasoDelJuego[],
  formulas: readonly { nombre: string; definicion: Json; params?: Json }[],
): Base[] {
  return juego.map((c) => {
    const de = c.formula_de === undefined ? c : formulas.find((f) => f.nombre === c.formula_de)
    if (de?.definicion === undefined)
      throw new Error(`${c.nombre}: no hay una fórmula «${c.formula_de ?? ''}»`)
    return {
      nombre: c.nombre,
      formula: c.formula_de ?? c.nombre,
      definicion: de.definicion,
      params: de.params ?? {},
      entrada: esquemaEntrada.parse({ ...VACIA, ...c.entrada }) as Objeto,
      ...(c.modo === undefined ? {} : { modo: c.modo }),
    }
  })
}

export type Base = {
  nombre: string
  // La clave de su fórmula en `formulas`.
  formula: string
  definicion: Json
  params: Json
  entrada: Objeto
  modo?: Json
}

export type CasoDelMotor = {
  nombre: string
  grupo: string
  // La clave de su fórmula en `formulas`.
  formula: string
  entrada: Json
  modo?: Json
  // Los textos JSON que la base recibe tal cual (`::jsonb`) en vez de los valores de arriba (ver `CasoAMano`).
  texto?: CasoAMano['texto']
  mutaciones: string[]
  esperado: Esperado
}

export type Formulas = Record<string, { definicion: Json; params: Json }>

// Mutadores que cambian la fórmula o sus tablas congeladas: después hay que comprobar que siga validando.
const DE_FORMULA = [...MUTADORES_DE_FORMULA_DEL_MOTOR, ...MUTADORES_DE_TABLAS]
const DE_ENTRADA = [...MUTADORES_DE_ENTRADA, ...MUTADORES_DE_MODO]
export const MUTADORES_DEL_CORPUS: readonly MutadorDelMotor[] = [
  ...DE_FORMULA,
  ...DE_ENTRADA,
  ...MUTADORES_DE_FORMA_DE_ENTRADA,
]
// Los que acaban en un error de llamada: en una mezcla pesan poco, porque un error esconde todo lo demás.
const DUROS = new Set([
  'input_ajeno',
  'bandera_ajena',
  'variante_inexistente',
  'variante_sin_opcion',
  'tc_no_positivo',
  'modo_bucket_no_tc',
  'modo_total_en_malo',
  'modo_bucket_sin_cubrir',
  'modo_id_inexistente',
  'modo_forma',
])
const SUAVES = DE_ENTRADA.filter((m) => !DUROS.has(m.nombre))
const DUROS_DE_ENTRADA = DE_ENTRADA.filter((m) => DUROS.has(m.nombre))

const APLICACIONES_POR_MUTADOR = 3
const MEZCLAS = 240

// Una copia como la guarda el corpus: pasada por JSON, con las claves en el orden de jsonb.
function comoGuardada(c: Llamada): Llamada {
  const copia = JSON.parse(JSON.stringify(c)) as Llamada
  const salida: Llamada = {
    definicion: enOrdenDeJsonb(copia.definicion),
    params: enOrdenDeJsonb(copia.params),
    entrada: enOrdenDeJsonb(copia.entrada) as Objeto,
  }
  if (copia.modo !== undefined) salida.modo = enOrdenDeJsonb(copia.modo)
  return salida
}

const llamadaDe = (b: Base): Llamada => ({
  definicion: clonar(b.definicion),
  params: clonar(b.params),
  entrada: clonar(b.entrada),
  ...(b.modo === undefined ? {} : { modo: clonar(b.modo) }),
})

const esValida = (c: Llamada) => validarFormula(c.definicion, c.params).ok

// Aplica los mutadores en orden; si uno no se aplica (o deja la fórmula sin validar), prueba otro del mismo grupo (hasta 20 intentos).
function mutar(
  base: Base,
  grupos: (readonly MutadorDelMotor[])[],
  azar: Azar,
): { llamada: Llamada; hechas: string[] } | null {
  let llamada = llamadaDe(base)
  const hechas: string[] = []
  for (const grupo of grupos) {
    let hecha: string | null = null
    for (let intento = 0; intento < 20 && hecha === null; intento += 1) {
      const copia = clonar(llamada as unknown as Json) as unknown as Llamada
      const mutador = elegir(azar, grupo)
      const detalle = mutador?.aplicar(copia, azar) ?? null
      if (detalle !== null && esValida(copia)) {
        llamada = copia
        hecha = detalle
      }
    }
    if (hecha === null) return null
    hechas.push(hecha)
  }
  return { llamada, hechas }
}

type Estado = { formulas: Formulas; porTexto: Map<string, string>; casos: CasoDelMotor[] }

// Registra una fórmula en el diccionario y devuelve su clave: la misma fórmula, la misma clave.
function registrar(e: Estado, preferida: string, definicion: Json, params: Json): string {
  const huella = JSON.stringify([definicion, params])
  const conocida = e.porTexto.get(huella)
  if (conocida !== undefined) return conocida
  let clave = preferida
  for (let n = 2; e.formulas[clave] !== undefined; n += 1) clave = `${preferida} #${String(n)}`
  e.formulas[clave] = { definicion, params }
  e.porTexto.set(huella, clave)
  return clave
}

function agregar(e: Estado, grupo: string, base: Base, r: { llamada: Llamada; hechas: string[] }) {
  const g = comoGuardada(r.llamada)
  const k = e.casos.length + 1
  const formula = registrar(e, base.formula, g.definicion, g.params)
  e.casos.push({
    nombre: `${String(k).padStart(3, '0')} ${base.nombre}: ${r.hechas.join(' + ')}`,
    grupo,
    formula,
    entrada: g.entrada,
    ...(g.modo === undefined ? {} : { modo: g.modo }),
    mutaciones: r.hechas,
    esperado: esperadoDe({
      definicion: g.definicion,
      params: g.params,
      entrada: g.entrada,
      modo: g.modo,
    }),
  })
}

// 1. Dirigidos: cada mutador solo, rotando por las bases donde se aplica.
function dirigidos(bases: readonly Base[], azar: Azar, e: Estado) {
  for (const m of MUTADORES_DEL_CORPUS) {
    let hechos = 0
    for (
      let intento = 0;
      intento < 12 * bases.length && hechos < APLICACIONES_POR_MUTADOR;
      intento += 1
    ) {
      const base = bases[intento % bases.length]
      const r = base ? mutar(base, [[m]], azar) : null
      if (base && r) {
        agregar(e, 'dirigido', base, r)
        hechos += 1
      }
    }
  }
}

// 2. Mezclas de dos o tres defectos: primero los de la fórmula o las tablas (a veces), después los de la entrada, y de vez en cuando
//    uno que acaba en un error de llamada (el último, y gana a lo demás).
function mezclas(bases: readonly Base[], azar: Azar, e: Estado) {
  for (let i = 0; i < MEZCLAS; i += 1) {
    const base = elegir(azar, bases)
    if (!base) continue
    const grupos: (readonly MutadorDelMotor[])[] = []
    if (azar.entero(2) === 0) grupos.push(DE_FORMULA)
    const cuantas = 1 + azar.entero(3)
    for (let k = 0; k < cuantas; k += 1) grupos.push(SUAVES)
    if (azar.entero(5) === 0) grupos.push(DUROS_DE_ENTRADA)
    else if (azar.entero(12) === 0) grupos.push(MUTADORES_DE_FORMA_DE_ENTRADA)
    const r = mutar(base, grupos, azar)
    if (r) agregar(e, 'mezcla', base, r)
  }
}

// 3. A mano. Con textos, la base recibe el JSON tal cual y TS lo lee con JSON.parse.
function aMano(e: Estado, lista: readonly CasoAMano[]) {
  for (const c of lista) {
    const t = c.texto
    const leido = (texto: string | undefined, valor: Json | undefined) =>
      texto === undefined ? valor : (JSON.parse(texto) as Json)
    const definicion = leido(t?.definicion, c.definicion) ?? null
    const params = leido(t?.params, c.params) ?? null
    const entrada = leido(t?.entrada, c.entrada) ?? null
    const modo = leido(t?.modo, c.modo)
    const formula = registrar(e, c.nombre, c.definicion, c.params)
    const k = e.casos.length + 1
    e.casos.push({
      nombre: `${String(k).padStart(3, '0')} a mano (${c.grupo}): ${c.nombre}`,
      grupo: c.grupo,
      formula,
      entrada: c.entrada,
      ...(c.modo === undefined ? {} : { modo: c.modo }),
      ...(t === undefined ? {} : { texto: t }),
      mutaciones: [],
      esperado: esperadoDe({ definicion, params, entrada, modo }),
    })
  }
}

export type Corpus = {
  formulas: Formulas
  juego: CasoDelMotor[]
  casos: CasoDelMotor[]
  aritmetica: CasoDeAritmetica[]
  redondeo: CasoDeRedondeo[]
}

// El juego (`casos-del-motor.json`) con la entrada completa y el resultado entero de `evaluar()`, no sólo lo que el caso comprueba.
export function juegoDelMotor(bases: readonly Base[], formulas: Formulas): CasoDelMotor[] {
  return bases.map((b) => {
    const g = comoGuardada(llamadaDe(b))
    formulas[b.formula] ??= { definicion: g.definicion, params: g.params }
    return {
      nombre: b.nombre,
      grupo: 'juego',
      formula: b.formula,
      entrada: g.entrada,
      ...(g.modo === undefined ? {} : { modo: g.modo }),
      mutaciones: [],
      esperado: esperadoDe({
        definicion: g.definicion,
        params: g.params,
        entrada: g.entrada,
        modo: g.modo,
      }),
    }
  })
}

export function generarCorpus(bases: readonly Base[], semilla: number = SEMILLA): Corpus {
  const azar = azarCon(semilla)
  const formulas: Formulas = {}
  const juego = juegoDelMotor(bases, formulas)
  const porTexto = new Map(
    Object.entries(formulas).map(([k, f]) => [JSON.stringify([f.definicion, f.params]), k]),
  )
  const e: Estado = { formulas, porTexto, casos: [] }
  dirigidos(bases, azar, e)
  mezclas(bases, azar, e)
  aMano(e, [
    ...CASOS_DE_BORDE,
    ...CASOS_DE_LO_QUE_FALTA,
    ...CASOS_SIN_VALIDAR,
    ...CASOS_PEREZOSOS,
    ...CASOS_DE_FORMA,
    ...CASOS_DE_TEXTO,
  ])
  return {
    formulas,
    juego,
    casos: e.casos,
    aritmetica: casosDeAritmetica(azar),
    redondeo: casosDeRedondeo(azar),
  }
}

// Un caso por línea, compacto: el diff de una regeneración muestra los casos que cambiaron.
export function corpusComoTexto(
  semilla: number,
  c: Corpus,
  sinteticas: Record<string, unknown>,
): string {
  const lineas = (xs: readonly unknown[]) => xs.map((x) => JSON.stringify(x)).join(',\n')
  const formulas = Object.entries(c.formulas)
    .map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`)
    .join(',\n')
  const sint = Object.entries(sinteticas)
    .map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`)
    .join(',\n')
  return `{"semilla":${String(semilla)},"formulas":{\n${formulas}\n},"juego":[\n${lineas(c.juego)}\n],"casos":[\n${lineas(c.casos)}\n],"aritmetica":[\n${lineas(c.aritmetica)}\n],"redondeo":[\n${lineas(c.redondeo)}\n],"sinteticas":{\n${sint}\n}}\n`
}
