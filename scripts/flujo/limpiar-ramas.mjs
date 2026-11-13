// Borra las ramas que ya se integraron, en GitHub y en el repo local (docs/FLUJO.md). Una rama integrada con squash no queda «merged»
// para git (`git branch -d` la rechaza) y borrarla a mano con `-D` no comprueba nada: aquí se borra sólo lo que está en main.
//
//   node scripts/flujo/limpiar-ramas.mjs [--en-seco]
//
// Se borra una rama si (a) su PR está MERGED, no tiene otro abierto y su punta es la que se integró (o un ancestro de ella), o lo que
// tiene de más sobre esa punta lo trajo de main; (b) su punta ya es un ancestro de `origin/main`; o (c) no aporta nada: su árbol es
// el de su ancestro común con `origin/main` (una rama que trajo main después de integrarse con squash). Nunca `main`, la rama actual,
// una con un worktree ni una con un PR abierto.
// Se prueba en `limpiar-ramas.test.ts`.
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

/**
 * Las ramas que se pueden borrar.
 * @param {{ nombre: string, sha: string }[]} ramas
 * @param {{ headRefName: string, headRefOid: string, state: string }[]} prs
 * @param {Set<string>} protegidas las que nunca se borran
 * @param {(a: string, b: string) => boolean} [esAncestro] si el commit a está en b
 * @param {string | null} [main] el commit de `origin/main`
 * @param {(sha: string) => boolean} [sinAporte] si la rama no cambia nada respecto de su ancestro común con main
 * @param {(sha: string, integrada: string) => boolean} [soloTrajoMain] si todo lo que la rama tiene sobre la punta integrada vino de main
 * @returns {string[]}
 */
export function ramasPorBorrar(
  ramas,
  prs,
  protegidas,
  esAncestro = () => false,
  main = null,
  sinAporte = () => false,
  soloTrajoMain = () => false,
) {
  const abiertas = new Set(prs.filter((p) => p.state === 'OPEN').map((p) => p.headRefName))
  return ramas
    .filter(
      (r) =>
        !protegidas.has(r.nombre) &&
        !abiertas.has(r.nombre) &&
        (prs.some(
          (p) =>
            p.state === 'MERGED' &&
            p.headRefName === r.nombre &&
            (p.headRefOid === r.sha ||
              esAncestro(r.sha, p.headRefOid) ||
              soloTrajoMain(r.sha, p.headRefOid)),
        ) ||
          (main !== null && (esAncestro(r.sha, main) || sinAporte(r.sha)))),
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
export function limpiarRamas({ gh, git, enSeco = false }) {
  const borradas = []
  const prs = JSON.parse(
    gh(
      'pr',
      'list',
      '--state',
      'all',
      '--limit',
      '1000',
      '--json',
      'number,headRefName,headRefOid,state',
    ),
  )
  const esAncestro = (a, b) => {
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', a, b], { stdio: 'ignore' })
      return true
    } catch {
      return false // también si el commit no está en este repo
    }
  }
  const main = git('rev-parse', 'origin/main').trim()
  // El árbol de la rama es el de su ancestro común con main: todo lo suyo ya se integró y después sólo trajo main.
  const sinAporte = (sha) => {
    try {
      const base = execFileSync('git', ['merge-base', main, sha], { encoding: 'utf8' }).trim()
      execFileSync('git', ['diff', '--quiet', base, sha], { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }
  const enUso = new Set(
    lineas(git('worktree', 'list', '--porcelain'))
      .filter((l) => l.startsWith('branch refs/heads/'))
      .map((l) => l.slice('branch refs/heads/'.length)),
  )
  const protegidas = new Set(['main', ...enUso])
  // La rama siguió después de integrarse, pero sólo trayendo main: ningún commit propio (que no sea una mezcla) fuera de lo integrado
  // y de main. No pide que la punta integrada sea su ancestro: GitHub pudo recibir otra mezcla de main que la rama local no tiene.
  const soloTrajoMain = (sha, integrada) => {
    try {
      const propios = execFileSync(
        'git',
        ['rev-list', '--count', '--no-merges', sha, `^${integrada}`, `^${main}`],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
      ).trim()
      return propios === '0'
    } catch {
      return false
    }
  }

  const remotas = aRamas(
    gh(
      'api',
      '--paginate',
      'repos/{owner}/{repo}/branches?per_page=100',
      '--jq',
      '.[] | .name + " " + .commit.sha',
    ),
  )
  for (const n of ramasPorBorrar(remotas, prs, protegidas, esAncestro, main, sinAporte)) {
    try {
      if (!enSeco) gh('api', '-X', 'DELETE', `repos/{owner}/{repo}/git/refs/heads/${n}`)
      borradas.push(`origin/${n}`)
    } catch {
      // Otro la borró, o GitHub la protege: queda.
    }
  }
  const locales = aRamas(
    git('for-each-ref', 'refs/heads', '--format=%(refname:short) %(objectname)'),
  )
  // La punta que se integró puede no estar en este repo (la rama remota ya se borró): se trae de `refs/pull/<n>/head`, que GitHub
  // conserva, para poder decir si la rama local quedó detrás de ella.
  const nombres = new Set(locales.map((r) => r.nombre))
  for (const pr of prs) {
    if (pr.state !== 'MERGED' || !nombres.has(pr.headRefName)) continue
    try {
      execFileSync('git', ['cat-file', '-e', `${pr.headRefOid}^{commit}`], { stdio: 'ignore' })
    } catch {
      try {
        execFileSync('git', ['fetch', '--quiet', 'origin', `refs/pull/${String(pr.number)}/head`], {
          stdio: 'ignore',
        })
      } catch {
        // Sin red o sin esa referencia: la rama se queda.
      }
    }
  }
  for (const n of ramasPorBorrar(
    locales,
    prs,
    protegidas,
    esAncestro,
    main,
    sinAporte,
    soloTrajoMain,
  )) {
    try {
      if (!enSeco) git('branch', '-D', n)
      borradas.push(n)
    } catch {
      // Un worktree la tomó entre medio: queda.
    }
  }
  return borradas
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const correr =
    (cmd) =>
    (...args) =>
      execFileSync(cmd, args, { encoding: 'utf8' })
  const enSeco = process.argv.includes('--en-seco')
  execFileSync('git', ['fetch', '--prune', 'origin'], { stdio: 'ignore' })
  const borradas = limpiarRamas({ gh: correr('gh'), git: correr('git'), enSeco })
  console.log(
    borradas.length === 0
      ? 'limpiar-ramas: nada que borrar.'
      : `limpiar-ramas: ${enSeco ? 'se borrarían' : 'borradas'} ${String(borradas.length)}: ${borradas.join(', ')}`,
  )
}
