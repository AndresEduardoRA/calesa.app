// Renumerar desde el coordinador las migraciones de un PR que main dejó atrás, sin esperar a su carril.
//
// El PR tiene el CI en verde y sólo le falta eso (pr.mjs › migracionesAtrasadas), pero su carril ya está en otro paso y lo retomaba
// recién al terminarlo: el 2026-11-11 el #103, el #113 y el #114 esperaron más de 1 h en verde, y con ellos los pasos que dependían. Es lo
// mismo que carril.sh › renumerar_migraciones, sin árbol de trabajo: se arma el commit con un índice aparte (read-tree, update-index,
// commit-tree) sobre la punta del PR y se empuja a su rama. No pasa por los hooks porque no hay commit en un árbol, pero el CI corre de
// nuevo sobre ese commit y el coordinador integra sólo con el CI en verde. Si el carril empujó entre medio, el push no avanza y se
// reintenta en la vuelta siguiente. COORD_RENUMERAR=0 lo apaga (el paso vuelve a su carril como antes).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fechaReal } from './pr.mjs'

const MIGRACION = /^supabase\/migrations\/(\d{14})(_[^/]+\.sql)$/
const MENSAJE =
  'fix(db): renumerar las migraciones que main dejó atrás\n\nLo hizo el coordinador con el CI del PR en verde: mismo contenido, otra\nversión.\n'

const segundos = (v) =>
  Date.UTC(
    +v.slice(0, 4),
    +v.slice(4, 6) - 1,
    +v.slice(6, 8),
    +v.slice(8, 10),
    +v.slice(10, 12),
    +v.slice(12, 14),
  ) / 1000
const version = (s) => new Date(s * 1000).toISOString().replace(/\D/g, '').slice(0, 14)
let ultimoSeg = 0

/**
 * Renumera las migraciones que agrega la rama `rama` (su punta debe ser `oid`) a versiones posteriores a la última de origin/main, y
 * reemplaza la versión vieja en los demás archivos que la rama cambió. Devuelve `{ hecho: true, pares }` o `{ hecho: false, motivo }`.
 */
export function renumerarMigraciones(rama, oid, { cwd = process.cwd(), ahora = Date.now() } = {}) {
  const git = (args, extra = {}) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120_000,
      ...extra,
    })
  git(['fetch', '--quiet', 'origin', 'main', `refs/heads/${rama}`])
  const remota = git(['ls-remote', 'origin', `refs/heads/${rama}`]).split('\t')[0]
  if (remota !== oid) return { hecho: false, motivo: 'la rama cambió desde que la miró el CI' }
  const enMain = git(['ls-tree', '--name-only', 'origin/main', 'supabase/migrations/'])
    .split('\n')
    .map((r) => MIGRACION.exec(r)?.[1])
    .filter(Boolean)
    .sort()
  const tope = enMain.at(-1)
  if (!tope) return { hecho: false, motivo: 'main no tiene migraciones' }
  const base = git(['merge-base', 'origin/main', oid]).trim()
  const propias = git([
    'diff',
    '--name-only',
    '--diff-filter=A',
    base,
    oid,
    '--',
    'supabase/migrations/',
  ])
    .split('\n')
    .filter((r) => MIGRACION.test(r))
    .sort()
  // Atrasadas, o con una fecha que no existe o del futuro (pr.mjs › fechaReal): las dos se arreglan con versiones nuevas.
  if (
    propias.length === 0 ||
    (MIGRACION.exec(propias[0])[1] > tope &&
      propias.every((r) => fechaReal(MIGRACION.exec(r)[1], ahora)))
  )
    return { hecho: false, motivo: 'no hay migraciones atrasadas' }
  // Dos PR renumerados en la misma vuelta no comparten versiones: el segundo sigue donde terminó el primero.
  let seg = Math.max(segundos(tope), Math.floor(ahora / 1000) - 1, ultimoSeg)
  const pares = propias.map((ruta) => {
    const [, v, resto] = MIGRACION.exec(ruta)
    seg += 1
    return { ruta, v, nueva: `supabase/migrations/${version(seg)}${resto}`, n: version(seg) }
  })
  ultimoSeg = seg
  const dir = mkdtempSync(join(tmpdir(), 'coord-renumerar-'))
  const env = { ...process.env, GIT_INDEX_FILE: join(dir, 'index') }
  const gi = (args, input) => git(args, { env, ...(input === undefined ? {} : { input }) })
  try {
    gi(['read-tree', oid])
    for (const p of pares) {
      const blob = git(['rev-parse', `${oid}:${p.ruta}`]).trim()
      gi(['update-index', '--force-remove', p.ruta])
      gi(['update-index', '--add', '--cacheinfo', `100644,${blob},${p.nueva}`])
    }
    const otros = git([
      'diff',
      '--name-only',
      '--diff-filter=AM',
      base,
      oid,
      '--',
      '.',
      ':(exclude)supabase/migrations/',
    ])
      .split('\n')
      .filter(Boolean)
    for (const ruta of otros) {
      const [modo] = git(['ls-tree', oid, '--', ruta]).split(' ')
      if (!modo || modo === '120000') continue
      const antes = git(['show', `${oid}:${ruta}`])
      let despues = antes
      for (const p of pares) despues = despues.split(p.v).join(p.n)
      if (despues === antes) continue
      const blob = gi(['hash-object', '-w', '--stdin'], despues).trim()
      gi(['update-index', '--cacheinfo', `${modo},${blob},${ruta}`])
    }
    const arbol = gi(['write-tree']).trim()
    const commit = git(['commit-tree', arbol, '-p', oid, '-F', '-'], { input: MENSAJE }).trim()
    git(['push', '--quiet', 'origin', `${commit}:refs/heads/${rama}`])
    return { hecho: true, pares: pares.map((p) => `${p.v}:${p.n}`), commit }
  } catch (err) {
    return { hecho: false, motivo: String(err.stderr || err.message).split('\n')[0] }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
