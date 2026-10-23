// El corpus diferencial de `validar_formula()` contra `validarFormula()` (paso 4.05, prompt 4). Muta las fórmulas válidas de
// `casos-de-formula.json` de forma determinista (un PRNG con semilla fija) y guarda, para cada una, lo que dice `validarFormula`. La
// base lo corre en `supabase/tests/validar-formula.sql` (`pnpm db:probar`) y compara la regla y `donde`. Lo regenera y lo compara
// con el guardado `corpus-de-formula.test.ts`.
//
// Las claves de cada objeto se guardan en el orden de jsonb (largo en bytes y después bytes): es lo que la base ve, y el primer
// rechazo depende del orden cuando un mismo `params`, `buckets` o `match` trae dos errores (docs/COTIZADOR.md › «Las reglas»).
import { validarFormula } from '@/modules/cotizaciones/entities/validar'
import { MUTADORES_DE_FORMA } from './mutadores-de-forma'
import {
  MUTADORES_BASICOS,
  clonar,
  elegir,
  esObjeto,
  type Azar,
  type Formula,
  type Json,
  type Mutador,
} from './mutadores-de-formula'
import { MUTADORES_DEL_TOTAL } from './mutadores-del-total'
import { MUTADORES_DE_GRUPOS } from './mutadores-de-grupos'
import { MUTADORES_DE_VARIANTE } from './mutadores-de-variante'

export const SEMILLA = 20261023

export const MUTADORES_CRUZADOS: readonly Mutador[] = [
  ...MUTADORES_BASICOS,
  ...MUTADORES_DEL_TOTAL,
  ...MUTADORES_DE_GRUPOS,
  ...MUTADORES_DE_VARIANTE,
]
export { MUTADORES_DE_FORMA }

// Cuántas veces se aplica solo cada mutador cruzado (rotando por las bases donde se aplica, con otra elección al azar cada vez), y
// cuántas mezclas se arman.
const APLICACIONES_POR_MUTADOR = 5
const MEZCLAS_CRUZADAS = 180
const MEZCLAS_CON_FORMA = 50

// mulberry32: chico, determinista y suficiente para elegir.
export function azarCon(semilla: number): Azar {
  let a = semilla >>> 0
  const siguiente = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return { entero: (hasta) => Math.floor(siguiente() * hasta) }
}

const bytes = new TextEncoder()
function compararComoJsonb(a: string, b: string): number {
  const [x, y] = [bytes.encode(a), bytes.encode(b)]
  if (x.length !== y.length) return x.length - y.length
  for (let i = 0; i < x.length; i += 1) {
    const d = (x[i] ?? 0) - (y[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

// Una copia con las claves de cada objeto en el orden de jsonb. JS pone primero las claves que parecen enteros y Zod descarta
// `__proto__`: ninguna de las dos puede guardar ese orden, así que el corpus no las lleva.
export function enOrdenDeJsonb(x: Json): Json {
  if (Array.isArray(x)) return x.map(enOrdenDeJsonb)
  if (!esObjeto(x)) return x
  const claves = Object.keys(x).sort(compararComoJsonb)
  for (const k of claves) {
    if (/^(0|[1-9][0-9]*)$/.test(k) || k === '__proto__')
      throw new Error(`clave «${k}»: JS no guarda su orden`)
  }
  return Object.fromEntries(claves.map((k) => [k, enOrdenDeJsonb(x[k] ?? null)]))
}

export type Base = { nombre: string; definicion: Json; params: Json }
export type Caso = {
  nombre: string
  valida: boolean
  motivo?: { regla: string; donde?: string }
  mutaciones: string[]
  definicion: Json
  params: Json
}

// Aplica los mutadores en orden; si uno no se aplica, prueba otro del mismo grupo (hasta 20 intentos). Null si no logra ninguno.
function mutar(
  base: Base,
  grupos: (readonly Mutador[])[],
  azar: Azar,
): { f: Formula; hechas: string[] } | null {
  const f: Formula = { definicion: clonar(base.definicion), params: clonar(base.params) }
  const hechas: string[] = []
  for (const grupo of grupos) {
    let hecha: string | null = null
    for (let intento = 0; intento < 20 && hecha === null; intento += 1) {
      hecha = elegir(azar, grupo)?.aplicar(f, azar) ?? null
    }
    if (hecha === null) return null
    hechas.push(hecha)
  }
  return { f, hechas }
}

function caso(k: number, base: Base, f: Formula, mutaciones: string[]): Caso {
  const definicion = enOrdenDeJsonb(f.definicion)
  const params = enOrdenDeJsonb(f.params)
  const r = validarFormula(definicion, params)
  const motivo = r.ok
    ? undefined
    : { regla: r.error.regla, ...(r.error.donde === undefined ? {} : { donde: r.error.donde }) }
  return {
    nombre: `${String(k).padStart(3, '0')} ${base.nombre}: ${mutaciones.join(' + ')}`,
    valida: r.ok,
    ...(motivo ? { motivo } : {}),
    mutaciones,
    definicion,
    params,
  }
}

type Agregar = (base: Base, r: ReturnType<typeof mutar>) => void

// 1. Dirigidos: cada mutador solo. Los cruzados, cinco veces, rotando por las bases (los de grupos sólo se aplican al Excel).
function dirigidosCruzados(bases: readonly Base[], azar: Azar, agregar: Agregar) {
  for (const m of MUTADORES_CRUZADOS) {
    let hechos = 0
    for (
      let intento = 0;
      intento < 8 * bases.length && hechos < APLICACIONES_POR_MUTADOR;
      intento += 1
    ) {
      const base = bases[intento % bases.length]
      const r = base ? mutar(base, [[m]], azar) : null
      if (base && r) {
        agregar(base, r)
        hechos += 1
      }
    }
  }
}

// Los de forma, sobre la base más chica en que se aplican: su defecto no depende de la base, y así pesan menos.
function dirigidosDeForma(bases: readonly Base[], semilla: number, azar: Azar, agregar: Agregar) {
  const porTamano = [...bases].sort((a, b) => JSON.stringify(a).length - JSON.stringify(b).length)
  for (const m of MUTADORES_DE_FORMA) {
    const chica = porTamano.find((b) => mutar(b, [[m]], azarCon(semilla)) !== null)
    if (chica) agregar(chica, mutar(chica, [[m]], azar))
  }
}

// 2. Mezclas de dos o tres reglas cruzadas (lo que prueba el orden del primer rechazo) y 3. mezclas con la forma: una cruzada y una
//    de forma al final (la forma va primero), o dos de forma.
function mezclas(bases: readonly Base[], azar: Azar, agregar: Agregar) {
  for (let i = 0; i < MEZCLAS_CRUZADAS; i += 1) {
    const base = elegir(azar, bases)
    const cuantas = 2 + azar.entero(2)
    if (base)
      agregar(
        base,
        mutar(
          base,
          Array.from({ length: cuantas }, () => MUTADORES_CRUZADOS),
          azar,
        ),
      )
  }
  for (let i = 0; i < MEZCLAS_CON_FORMA; i += 1) {
    const base = elegir(azar, bases)
    const grupos =
      azar.entero(3) === 0
        ? [MUTADORES_DE_FORMA, MUTADORES_DE_FORMA]
        : [MUTADORES_CRUZADOS, MUTADORES_DE_FORMA]
    if (base) agregar(base, mutar(base, grupos, azar))
  }
}

export function generarCorpus(bases: readonly Base[], semilla: number = SEMILLA): Caso[] {
  const azar = azarCon(semilla)
  const casos: Caso[] = []
  const agregar: Agregar = (base, r) => {
    if (r) casos.push(caso(casos.length + 1, base, r.f, r.hechas))
  }
  dirigidosCruzados(bases, azar, agregar)
  dirigidosDeForma(bases, semilla, azar, agregar)
  mezclas(bases, azar, agregar)
  return casos
}

// Un caso por línea, compacto: el diff de una regeneración muestra los casos que cambiaron.
export function corpusComoTexto(
  semilla: number,
  casos: readonly Caso[],
  sinteticas: Record<string, unknown>,
): string {
  const lineas = casos.map((c) => JSON.stringify(c)).join(',\n')
  const sint = Object.entries(sinteticas)
    .map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`)
    .join(',\n')
  return `{"semilla":${String(semilla)},"casos":[\n${lineas}\n],"sinteticas":{\n${sint}\n}}\n`
}
