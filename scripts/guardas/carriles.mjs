// Lo que un PR puede tocar, según su carril (docs/ORCA.md, docs/plan.yaml). La corre CI sobre el diff del PR (job `carriles` de ci.yml):
//
//   node scripts/guardas/carriles.mjs <commit base del PR> <rama del PR>     → los problemas por stderr; exit 1 si hay alguno
//
// Los carriles salen de docs/plan.yaml **de la base del PR**, no del PR: un PR no se da permisos a sí mismo. Sin ese archivo en la base,
// todo PR cae. El carril de una rama es lo que va antes de la primera `/` si es el `id` de un carril del plan.
// - Un carril que no es base (`b/…`, `c/…`) no toca ESTADO, PLAN, DECISIONES ni BITACORA (los edita sólo el base; el otro lo anota en
//   docs/pasos/<paso>/) y sólo crea migraciones de sus dominios (`migraciones` del plan), con el dominio al principio del nombre
//   (`<versión>_formula_….sql`). La de otro dominio la crea el carril base.
// - Todo PR: una migración nueva es posterior a la última de la base (nunca se intercala), y una migración que ya está en la base no
//   se edita, no se borra ni se renombra.
// Se prueba en `carriles.test.ts`.
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

import { parse } from 'yaml'

import { leerPlan } from '../coordinador/plan.mjs'
import { problemasDeAlcance, problemasDelPlanDelPr } from './carriles-plan.mjs'

export const SOLO_DE_A = [
  'docs/ESTADO.md',
  'docs/PLAN.md',
  'docs/DECISIONES.md',
  'docs/BITACORA.md',
]

const MIGRACION = /^supabase\/migrations\/(\d{14})_([^/]+)\.sql$/
/** El carril no base de la rama (`b/4.20` → el de `id: b`), o null: carril base, rama sin carril o plan ilegible. */
export function carrilDe(rama, plan) {
  const id = rama.split('/')[0] ?? ''
  const carril = rama.includes('/') ? plan?.carriles.find((c) => c.id === id) : undefined
  return carril && carril.base !== true ? carril : null
}
// La base aplastada (docs/PREPARACION.md, etapa 1) reemplazó a las 146 migraciones anteriores: el PR que la trae las borra. Es la
// única excepción; integrado ese PR, ninguna migración de main es anterior a la base.
const BASE_APLASTADA = '20261028180656'

/**
 * @param {{ rama: string, cambios: { estado: string, ruta: string, antes?: string }[], ultimaDeLaBase: string, plan: ReturnType<typeof leerPlan> | null, base?: string, crudos?: { base: any, pr: any } }} pr
 *   `cambios`: el `git diff --name-status` del PR (A, M, D, R…; `antes` es la ruta vieja de un renombre); `ultimaDeLaBase`: la
 *   versión de la última migración de la rama base; `plan`: docs/plan.yaml de la base (`null` si no se pudo leer). Puro: sin I/O.
 * @returns {string[]}
 */
export function problemasDelPr({ rama, cambios, ultimaDeLaBase, plan, base = 'la base', crudos }) {
  if (!plan) {
    return [
      `docs/plan.yaml: no lo pude leer en la base (${base}); la guarda de carriles saca de él los carriles.`,
    ]
  }
  const problemas = []
  const carril = carrilDe(rama, plan)
  const idBase = plan.carriles.find((c) => c.base === true)?.id ?? 'a'
  const dominios = Array.isArray(carril?.migraciones) ? carril.migraciones.map(String) : []
  for (const { estado, ruta, antes } of cambios) {
    const viejo = antes ?? ruta
    const aplastada = estado[0] === 'D' && (MIGRACION.exec(viejo)?.[1] ?? '') < BASE_APLASTADA
    if (MIGRACION.test(viejo) && estado[0] !== 'A' && !aplastada) {
      problemas.push(
        `${viejo}: una migración que ya está en la base no se edita ni se borra; el cambio va en una nueva.`,
      )
    }
    const nueva =
      estado[0] === 'A' || estado[0] === 'R' || estado[0] === 'C' ? MIGRACION.exec(ruta) : null
    if (nueva && (nueva[1] ?? '') <= ultimaDeLaBase) {
      problemas.push(
        `${ruta}: la versión ${nueva[1] ?? ''} no es posterior a la última de la base (${ultimaDeLaBase}): créala de nuevo con \`supabase migration new\`.`,
      )
    }
    if (!carril) continue
    if (SOLO_DE_A.includes(ruta)) {
      problemas.push(
        `${ruta}: el carril ${carril.id} no edita ESTADO, PLAN, DECISIONES ni BITACORA; lo escribe en docs/pasos/<paso>/ y lo pasa el carril ${idBase}.`,
      )
    }
    if (nueva) {
      const nombre = nueva[2] ?? ''
      if (dominios.length === 0) {
        problemas.push(
          `${ruta}: el carril ${carril.id} no crea migraciones (docs/plan.yaml no le da ninguna); la crea el carril ${idBase}.`,
        )
      } else if (!dominios.some((d) => nombre === d || nombre.startsWith(`${d}_`))) {
        problemas.push(
          `${ruta}: el carril ${carril.id} crea migraciones sólo de ${dominios.join(', ')} (docs/plan.yaml › migraciones), con el dominio al principio del nombre; la de otro dominio la crea el carril ${idBase}.`,
        )
      }
    }
  }
  if (carril) {
    const { problemas: delPlan, sumadas } = problemasDelPlanDelPr({
      carril,
      cambios,
      crudos: crudos ?? { base: null, pr: null },
    })
    problemas.push(...delPlan, ...problemasDeAlcance({ carril, plan, cambios, sumadas }))
  }
  return problemas
}

/** `git diff --name-status -M` en filas. */
export function leerCambios(texto) {
  return texto
    .split('\n')
    .filter(Boolean)
    .map((linea) => {
      const [estado = '', primera = '', segunda] = linea.split('\t')
      return segunda === undefined
        ? { estado, ruta: primera }
        : { estado, ruta: segunda, antes: primera }
    })
}

function principal([base, rama]) {
  if (!base || !rama) {
    console.error('uso: node scripts/guardas/carriles.mjs <commit base> <rama del PR>')
    process.exit(64)
  }
  const git = (...args) =>
    execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const cambios = leerCambios(git('diff', '--name-status', '-M', `${base}...HEAD`))
  const ultimaDeLaBase =
    git('ls-tree', '--name-only', base, 'supabase/migrations/')
      .split('\n')
      .map((r) => MIGRACION.exec(r)?.[1])
      .filter(Boolean)
      .sort()
      .at(-1) ?? ''
  let plan = null
  try {
    plan = leerPlan(git('show', `${base}:docs/plan.yaml`))
  } catch {
    plan = null
  }
  const crudo = (rev) => {
    try {
      return parse(git('show', `${rev}:docs/plan.yaml`))
    } catch {
      return null
    }
  }
  const crudos = { base: crudo(base), pr: crudo('HEAD') }
  const problemas = problemasDelPr({ rama, cambios, ultimaDeLaBase, plan, base, crudos })
  for (const p of problemas) console.error(`✗ ${p}`)
  if (problemas.length > 0) process.exit(1)
  console.log(`✓ carriles: ${String(cambios.length)} archivos de ${rama} cumplen.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2))
}
