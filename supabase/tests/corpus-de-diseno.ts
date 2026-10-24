// El corpus diferencial de `validar_diseno()` contra `validarDiseno()` (paso 4.08, prompt 1). Muta los diseños válidos de
// `casos-de-diseno.json` de forma determinista (un PRNG con semilla fija) y guarda, para cada uno, lo que dice `validarDiseno`. La base
// lo corre en `supabase/tests/validar-diseno.sql` (`pnpm db:probar`) y compara la regla y `donde`. Lo regenera y lo compara con el
// guardado `corpus-de-diseno.test.ts`.
//
// Las claves de cada objeto se guardan en el orden de jsonb (largo en bytes y después bytes). El diseño no tiene registros, así que el
// orden no cambia ningún resultado; se guarda igual, porque es lo que la base ve.
import type { Definicion } from '@/modules/cotizaciones/entities/formula'
import { validarDiseno } from '@/modules/cotizaciones/entities/validar-diseno'
import { azarCon, enOrdenDeJsonb } from './corpus-de-formula'
import { MUTADORES_DE_ITEMS } from './mutadores-de-diseno-items'
import { MUTADORES_DE_NIVELES } from './mutadores-de-diseno-niveles'
import {
  MUTADORES_DE_COBERTURA,
  MUTADORES_DE_TARJETA,
  MUTADORES_VALIDOS,
} from './mutadores-de-diseno-cobertura'
import { MUTADORES_DE_FORMA_DE_DISENO } from './mutadores-de-diseno-forma'
import { MUTADORES_DE_MODOS, MUTADORES_DE_SECCIONES } from './mutadores-de-diseno'
import { clonar, type ContextoJson, type MutadorDeDiseno } from './mutadores-de-diseno-base'
import { elegir, type Azar, type Json, type Objeto } from './mutadores-de-formula'

export const SEMILLA = 20261024
export { azarCon }

export const MUTADORES_CRUZADOS_DE_DISENO: readonly MutadorDeDiseno[] = [
  ...MUTADORES_DE_MODOS,
  ...MUTADORES_DE_SECCIONES,
  ...MUTADORES_DE_ITEMS,
  ...MUTADORES_DE_NIVELES,
  ...MUTADORES_DE_TARJETA,
  ...MUTADORES_DE_COBERTURA,
  ...MUTADORES_VALIDOS,
]
export { MUTADORES_DE_FORMA_DE_DISENO }

// Cuántas veces se aplica solo cada mutador cruzado (rotando por las bases donde se aplica, con otra elección al azar cada vez), y
// cuántas mezclas se arman.
const APLICACIONES_POR_MUTADOR = 6
const MEZCLAS_CRUZADAS = 200
const MEZCLAS_CON_FORMA = 60

// La fórmula de una base: una clave de «formulas» del juego o el nombre de un caso válido de casos-de-formula.json.
export type RefDeFormula = { formula: string } | { formula_de: string }
export type Base = {
  nombre: string
  ref: RefDeFormula
  definicion: Objeto
  diseno: Json
  contexto: ContextoJson
}
export type Caso = {
  nombre: string
  valida: boolean
  motivo?: { regla: string; donde?: string }
  mutaciones: string[]
} & RefDeFormula & { contexto: ContextoJson; diseno: Json }

// Aplica los mutadores en orden; si uno no se aplica, prueba otro del mismo grupo (hasta 20 intentos). Null si no logra ninguno.
function mutar(
  base: Base,
  grupos: (readonly MutadorDeDiseno[])[],
  azar: Azar,
): { diseno: Json; contexto: ContextoJson; hechas: string[] } | null {
  const e = {
    diseno: clonar(base.diseno),
    contexto: clonar(base.contexto as unknown as Json) as unknown as ContextoJson,
    definicion: base.definicion,
  }
  const hechas: string[] = []
  for (const grupo of grupos) {
    let hecha: string | null = null
    for (let intento = 0; intento < 20 && hecha === null; intento += 1) {
      hecha = elegir(azar, grupo)?.aplicar(e, azar) ?? null
    }
    if (hecha === null) return null
    hechas.push(hecha)
  }
  return { diseno: e.diseno, contexto: e.contexto, hechas }
}

function caso(k: number, base: Base, r: NonNullable<ReturnType<typeof mutar>>): Caso {
  const diseno = enOrdenDeJsonb(r.diseno)
  const contexto = enOrdenDeJsonb(r.contexto as unknown as Json) as unknown as ContextoJson
  const v = validarDiseno(base.definicion as unknown as Definicion, diseno, contexto)
  const motivo = v.ok
    ? undefined
    : { regla: v.error.regla, ...(v.error.donde === undefined ? {} : { donde: v.error.donde }) }
  return {
    nombre: `${String(k).padStart(3, '0')} ${base.nombre}: ${r.hechas.join(' + ')}`,
    valida: v.ok,
    ...(motivo ? { motivo } : {}),
    mutaciones: r.hechas,
    ...base.ref,
    contexto,
    diseno,
  }
}

type Agregar = (base: Base, r: ReturnType<typeof mutar>) => void

// 1. Dirigidos: cada mutador cruzado solo, seis veces, rotando por las bases.
function dirigidosCruzados(bases: readonly Base[], azar: Azar, agregar: Agregar) {
  for (const m of MUTADORES_CRUZADOS_DE_DISENO) {
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

// Los de forma, cuatro veces cada uno: su defecto no depende de la base, y así pesan menos las grandes (rotan por las más chicas).
function dirigidosDeForma(bases: readonly Base[], azar: Azar, agregar: Agregar) {
  const porTamano = [...bases].sort(
    (a, b) => JSON.stringify(a.diseno).length - JSON.stringify(b.diseno).length,
  )
  for (const m of MUTADORES_DE_FORMA_DE_DISENO) {
    let hechos = 0
    for (let i = 0; i < 4 * porTamano.length && hechos < 4; i += 1) {
      const base = porTamano[i % porTamano.length]
      const r = base ? mutar(base, [[m]], azar) : null
      if (base && r) {
        agregar(base, r)
        hechos += 1
      }
    }
  }
}

// 2. Mezclas de dos o tres reglas cruzadas (lo que prueba el orden del primer rechazo) y 3. mezclas con la forma: una cruzada y una
//    de forma al final (la forma va primero), o dos de forma.
function mezclas(bases: readonly Base[], azar: Azar, agregar: Agregar) {
  for (let i = 0; i < MEZCLAS_CRUZADAS; i += 1) {
    const base = elegir(azar, bases)
    const cuantas = 2 + azar.entero(2)
    if (base) {
      const grupos = Array.from({ length: cuantas }, () => MUTADORES_CRUZADOS_DE_DISENO)
      agregar(base, mutar(base, grupos, azar))
    }
  }
  for (let i = 0; i < MEZCLAS_CON_FORMA; i += 1) {
    const base = elegir(azar, bases)
    const grupos =
      azar.entero(3) === 0
        ? [MUTADORES_DE_FORMA_DE_DISENO, MUTADORES_DE_FORMA_DE_DISENO]
        : [MUTADORES_CRUZADOS_DE_DISENO, MUTADORES_DE_FORMA_DE_DISENO]
    if (base) agregar(base, mutar(base, grupos, azar))
  }
}

export function generarCorpus(bases: readonly Base[], semilla: number = SEMILLA): Caso[] {
  const azar = azarCon(semilla)
  const casos: Caso[] = []
  const agregar: Agregar = (base, r) => {
    if (r) casos.push(caso(casos.length + 1, base, r))
  }
  dirigidosCruzados(bases, azar, agregar)
  dirigidosDeForma(bases, azar, agregar)
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
