// Lo que un PR puede tocar, según su carril (docs/ORCA.md). La corre CI sobre el diff del PR (job `carriles` de ci.yml):
//
//   node scripts/guardas/carriles.mjs <commit base del PR> <rama del PR>     → los problemas por stderr; exit 1 si hay alguno
//
// - El carril B (rama `b/…`) no toca ESTADO, PLAN, DECISIONES ni BITACORA (los edita sólo A; B anota en docs/carriles/b.md) y sólo crea
//   migraciones de sus dominios, con el dominio al principio del nombre (`<versión>_notificaciones_….sql`). Una migración de un
//   dominio compartido la crea A.
// - Todo PR: una migración nueva es posterior a la última de la base (nunca se intercala), y una migración que ya está en la base no
//   se edita, no se borra ni se renombra.
// Se prueba en `carriles.test.ts`.
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

// Los dominios del carril B: la Fase 7 (agenda, chat, notificaciones, buscador) y la 8 sin repuestos (web).
export const DOMINIOS_DE_B = ['agenda', 'chat', 'notificaciones', 'buscador', 'web']
export const SOLO_DE_A = [
  'docs/ESTADO.md',
  'docs/PLAN.md',
  'docs/DECISIONES.md',
  'docs/BITACORA.md',
]

const MIGRACION = /^supabase\/migrations\/(\d{14})_([^/]+)\.sql$/
const esDeB = (rama) => /^b\//.test(rama)
// La base aplastada (docs/PREPARACION.md, etapa 1) reemplazó a las 146 migraciones anteriores: el PR que la trae las borra. Es la
// única excepción; integrado ese PR, ninguna migración de main es anterior a la base.
const BASE_APLASTADA = '20261028180656'

/**
 * @param {{ rama: string, cambios: { estado: string, ruta: string, antes?: string }[], ultimaDeLaBase: string }} pr
 *   `cambios`: el `git diff --name-status` del PR (A, M, D, R…; `antes` es la ruta vieja de un renombre); `ultimaDeLaBase`: la
 *   versión de la última migración de la rama base. Puro: sin I/O.
 * @returns {string[]}
 */
export function problemasDelPr({ rama, cambios, ultimaDeLaBase }) {
  const problemas = []
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
    if (!esDeB(rama)) continue
    if (SOLO_DE_A.includes(ruta)) {
      problemas.push(
        `${ruta}: el carril B no edita ESTADO, PLAN, DECISIONES ni BITACORA; lo anota en docs/carriles/b.md y lo pasa el carril A.`,
      )
    }
    if (
      nueva &&
      !DOMINIOS_DE_B.some((d) => (nueva[2] ?? '') === d || (nueva[2] ?? '').startsWith(`${d}_`))
    ) {
      problemas.push(
        `${ruta}: el carril B crea migraciones sólo de sus dominios (${DOMINIOS_DE_B.join(', ')}), con el dominio al principio del nombre; la de un dominio compartido la crea el carril A.`,
      )
    }
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
  const problemas = problemasDelPr({ rama, cambios, ultimaDeLaBase })
  for (const p of problemas) console.error(`✗ ${p}`)
  if (problemas.length > 0) process.exit(1)
  console.log(`✓ carriles: ${String(cambios.length)} archivos de ${rama} cumplen.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2))
}
