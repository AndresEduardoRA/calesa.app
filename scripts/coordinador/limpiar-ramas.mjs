// Borra las ramas que ya se integraron, en GitHub y en el repo local (común a los worktrees de los carriles). El coordinador la corre en
// cada vuelta de `sincronizar`. El 2026-11-08 había 30 ramas remotas y 22 locales: los `fix/` que se integraban a mano, las de las partes
// (se integran con merge y sin borrar la rama) y las de los pedidos no se borraban nunca.
//
// Sólo se borra una rama cuyo PR está MERGED, sin otro abierto y cuya punta es la que se integró (o un ancestro de ella): nada que no
// esté en main se pierde. Nunca `main`, una rama protegida (la de un paso asignado o publicado, o la de un pedido abierto) ni una que
// tenga un worktree en ella.
import { execFileSync } from 'node:child_process'
import { rama } from './plan.mjs'

/** Las ramas del paso o pedido vivo, que no se borran aunque su PR anterior (una parte) ya se integró. */
export function ramasProtegidas(plan, estado) {
  const protegidas = new Set(['main'])
  for (const p of plan.pasos) {
    const e = estado.pasos[p.id]
    if (!e || !['asignado', 'publicado'].includes(e.estado)) continue
    protegidas.add(e.rama ?? rama(e.carril ?? p.carril, p.id))
  }
  for (const pd of estado.pedidos ?? [])
    if (['pendiente', 'asignado', 'publicado'].includes(pd.estado))
      protegidas.add(rama(pd.para, pd.id))
  return protegidas
}

/**
 * Las ramas que se pueden borrar. `ramas`: [{nombre, sha}]; `prs`: [{headRefName, headRefOid, state}]; `esAncestro(a, b)`: si el commit a
 * está en b (para una rama local que quedó detrás de lo que se integró).
 */
export function ramasPorBorrar(ramas, prs, protegidas, esAncestro = () => false) {
  const abiertas = new Set(prs.filter((p) => p.state === 'OPEN').map((p) => p.headRefName))
  return ramas
    .filter(
      (r) =>
        !protegidas.has(r.nombre) &&
        !abiertas.has(r.nombre) &&
        prs.some(
          (p) =>
            p.state === 'MERGED' &&
            p.headRefName === r.nombre &&
            (p.headRefOid === r.sha || esAncestro(r.sha, p.headRefOid)),
        ),
    )
    .map((r) => r.nombre)
}

const lineas = (s) => s.split('\n').filter(Boolean)
const aRamas = (s) =>
  lineas(s).map((l) => {
    const [nombre, sha] = l.trim().split(' ')
    return { nombre, sha }
  })

/** Borra lo que se puede; devuelve los nombres borrados (`origin/x` para las remotas). Un fallo deja la rama: no impide nada. */
export function limpiarRamas({ gh, git, protegidas }) {
  const borradas = []
  const prs = JSON.parse(
    gh('pr', 'list', '--state', 'all', '--limit', '500', '--json', 'headRefName,headRefOid,state'),
  )
  const remotas = aRamas(
    gh(
      'api',
      '--paginate',
      'repos/{owner}/{repo}/branches?per_page=100',
      '--jq',
      '.[] | .name + " " + .commit.sha',
    ),
  )
  for (const n of ramasPorBorrar(remotas, prs, protegidas)) {
    try {
      gh('api', '-X', 'DELETE', `repos/{owner}/{repo}/git/refs/heads/${n}`)
      borradas.push(`origin/${n}`)
    } catch {
      // Otro la borró, o GitHub la protege: queda.
    }
  }
  const enUso = new Set(
    lineas(git('worktree', 'list', '--porcelain'))
      .filter((l) => l.startsWith('branch refs/heads/'))
      .map((l) => l.slice('branch refs/heads/'.length)),
  )
  // Callado: la punta de un PR que empujó el propio coordinador (unir, renumerar) no está en este repo, y `git` lo decía por stderr en
  // cada vuelta («fatal: Not a valid commit name», 84 líneas del registro en una mañana, el 2026-11-12). Sin ese commit no es ancestro.
  const esAncestro = (a, b) => {
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', a, b], { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }
  const locales = aRamas(
    git('for-each-ref', 'refs/heads', '--format=%(refname:short) %(objectname)'),
  ).filter((r) => !enUso.has(r.nombre))
  for (const n of ramasPorBorrar(locales, prs, protegidas, esAncestro)) {
    try {
      git('branch', '-D', n)
      borradas.push(n)
    } catch {
      // Un worktree la tomó entre medio: queda.
    }
  }
  return borradas
}
