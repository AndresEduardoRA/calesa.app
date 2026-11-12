// Unir main, desde el coordinador, a un PR publicado que quedó en conflicto, sin esperar a su carril.
//
// El 2026-11-11 un PR en «conflicto con main» esperaba a que su carril terminara la sesión en curso (de 20 a 60 min) para un remiendo que
// no necesita sesión: casi todos los choques eran de notas (`docs/*.md`, la ficha `CLAUDE.md` de una unidad) o de un registro donde cada
// carril agrega su línea. Mientras tanto main seguía moviéndose, el PR volvía a chocar y los pasos que dependían de él no empezaban (el
// 7.02 estuvo 8 h abierto con cinco pasos detrás). Es lo mismo que carril.sh › traer_main_merge + unir_docs, sin árbol de trabajo: el
// merge se arma con `git merge-tree`, cada choque se une con las líneas de los dos lados (`git merge-file --union`) y el commit de merge
// se empuja a la rama del PR. Su CI corre de nuevo sobre ese commit.
//
// Sólo une lo que se puede unir sin mirar: notas y registros con puros agregados de los dos lados. Si algún choque es de código, de lo
// generado (los tipos de la base piden una base para regenerarlos), si los dos lados cambiaron una línea que ya existía (la unión la
// dejaría dos veces) o si un `.mjs` unido no pasa `node --check`, no empuja nada y el paso vuelve a su carril como antes. Si el carril
// empujó entre medio, el push no avanza y se reintenta en la vuelta siguiente. COORD_UNIR=0 lo apaga.
//
// Variables: COORD_UNIR_REGISTROS (patrones separados por espacios; la misma lista que PILOTO_UNIR_REGISTROS en carril.sh).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REGISTROS = (
  process.env.COORD_UNIR_REGISTROS ??
  'scripts/carreras.mjs e2e/soporte/presupuestos.ts supabase/tests/auditoria-leads.sql supabase/tests/permisos-enforcement.sql supabase/tests/escala.sql scripts/guardas/*.ts'
)
  .split(/\s+/)
  .filter(Boolean)
  // Como el `[[ ruta == patrón ]]` de bash: `*` también cruza carpetas.
  .map((p) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`))

const esNota = (ruta) => /^docs\/.*\.md$/.test(ruta) || /^src\/.*\/CLAUDE\.md$/.test(ruta)
const esRegistro = (ruta) => !ruta.endsWith('.test.ts') && REGISTROS.some((r) => r.test(ruta))

/** ¿En algún choque los dos lados cambiaron líneas que ya existían? (la salida de `git merge-file --diff3`) */
export function unionDudosa(diff3) {
  let en = null
  let base = 0
  for (const linea of diff3.split('\n')) {
    if (en === null && linea.startsWith('<<<<<<< ')) en = 'nuestro'
    else if (en === 'nuestro' && linea.startsWith('|||||||')) {
      en = 'base'
      base = 0
    } else if (en === 'base' && linea === '=======') {
      if (base > 0) return true
      en = 'suyo'
    } else if (en === 'suyo' && linea.startsWith('>>>>>>> ')) en = null
    else if (en === 'base') base += 1
  }
  return false
}

/**
 * Une origin/main a la rama `rama` (su punta debe ser `oid`) y empuja el commit de merge. Devuelve
 * `{ hecho: true, commit, unidos, soloNotas }` o `{ hecho: false, motivo }`.
 */
export function unirMain(rama, oid, { cwd = process.cwd() } = {}) {
  const git = (args, extra = {}) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120_000,
      maxBuffer: 64 * 1024 * 1024,
      ...extra,
    })
  const dir = mkdtempSync(join(tmpdir(), 'coord-unir-'))
  try {
    git(['fetch', '--quiet', 'origin', 'main', `refs/heads/${rama}`])
    const remota = git(['ls-remote', 'origin', `refs/heads/${rama}`]).split('\t')[0]
    if (remota !== oid) return { hecho: false, motivo: 'la rama cambió desde que se miró el PR' }
    const main = git(['rev-parse', 'origin/main']).trim()
    let salida
    try {
      git(['merge-tree', '--write-tree', '-z', oid, main])
      return { hecho: false, motivo: 'main entra sin choques' }
    } catch (err) {
      // 1 = hay choques (lo esperado); otra cosa, un error de git.
      if (err.status !== 1) throw err
      salida = String(err.stdout)
    }
    const [arbol, ...resto] = salida.split('\0')
    const etapas = new Map()
    for (const r of resto) {
      if (r === '') break
      const m = /^(\d+) ([0-9a-f]+) ([123])\t([\s\S]+)$/.exec(r)
      if (!m) return { hecho: false, motivo: 'no entendí la salida de git merge-tree' }
      const [, modo, blob, etapa, ruta] = m
      etapas.set(ruta, { ...(etapas.get(ruta) ?? {}), [etapa]: { modo, blob } })
    }
    if (etapas.size === 0) return { hecho: false, motivo: 'git merge-tree no listó los choques' }
    const enCodigo = [...etapas.keys()].filter((r) => !esNota(r) && !esRegistro(r))
    if (enCodigo.length)
      return { hecho: false, motivo: `choca en código (${enCodigo.slice(0, 3).join(', ')})` }
    const env = { ...process.env, GIT_INDEX_FILE: join(dir, 'index') }
    const gi = (args, input) => git(args, { env, ...(input === undefined ? {} : { input }) })
    gi(['read-tree', arbol])
    for (const [ruta, e] of etapas) {
      // Borrado de un lado y cambiado del otro, o un enlace: no es una unión de líneas.
      if (!e[2] || !e[3] || e[2].modo !== e[3].modo || e[2].modo === '120000')
        return { hecho: false, motivo: `el choque de ${ruta} no es de líneas` }
      writeFileSync(join(dir, 'nuestro'), git(['cat-file', 'blob', e[2].blob]))
      writeFileSync(join(dir, 'suyo'), git(['cat-file', 'blob', e[3].blob]))
      writeFileSync(join(dir, 'base'), e[1] ? git(['cat-file', 'blob', e[1].blob]) : '')
      const archivos = [join(dir, 'nuestro'), join(dir, 'base'), join(dir, 'suyo')]
      // merge-file sale con el número de choques: no es un error.
      const mezclar = (modo) => {
        try {
          return git(['merge-file', modo, '-p', ...archivos])
        } catch (err) {
          if (typeof err.status === 'number' && err.status > 0 && err.status < 128)
            return String(err.stdout)
          throw err
        }
      }
      if (unionDudosa(mezclar('--diff3')))
        return { hecho: false, motivo: `los dos lados cambiaron las mismas líneas de ${ruta}` }
      const unido = mezclar('--union')
      if (ruta.endsWith('.mjs')) {
        const prueba = join(dir, 'unido.mjs')
        writeFileSync(prueba, unido)
        try {
          execFileSync(process.execPath, ['--check', prueba], { stdio: 'ignore' })
        } catch {
          return { hecho: false, motivo: `${ruta} unido no pasa node --check` }
        }
      }
      const blob = gi(['hash-object', '-w', '--stdin'], unido).trim()
      gi(['update-index', '--cacheinfo', `${e[2].modo},${blob},${ruta}`])
    }
    const unidos = [...etapas.keys()]
    const mensaje =
      `Merge remote-tracking branch 'origin/main' into ${rama}\n\n` +
      `Lo hizo el coordinador: los choques (${unidos.join(', ')}) eran de notas o de\n` +
      'registros con puros agregados y se unieron con las líneas de los dos lados.\n'
    const commit = git(
      ['commit-tree', gi(['write-tree']).trim(), '-p', oid, '-p', main, '-F', '-'],
      {
        input: mensaje,
      },
    ).trim()
    git(['push', '--quiet', 'origin', `${commit}:refs/heads/${rama}`])
    return { hecho: true, commit, unidos, soloNotas: unidos.every(esNota) }
  } catch (err) {
    return { hecho: false, motivo: String(err.stderr || err.message).split('\n')[0] }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
