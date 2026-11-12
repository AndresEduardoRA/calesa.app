// La unión de main que hace el coordinador, contra un remoto de verdad (una carpeta bare).
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { unionDudosa, unirMain } from './unir-main.mjs'

// commit-tree no pasa por `-c`: en un runner sin identidad global, la da el entorno.
Object.assign(process.env, {
  GIT_AUTHOR_NAME: 't',
  GIT_AUTHOR_EMAIL: 'a@b',
  GIT_COMMITTER_NAME: 't',
  GIT_COMMITTER_EMAIL: 'a@b',
})

const BASE = {
  'docs/UX.md': '# UX\n\n## Leads\n\nla lista\n',
  'src/modules/flujos/CLAUDE.md': '# flujos\n\n- núcleo\n',
  'scripts/carreras.mjs': "export const CARRERAS = [\n  'marcar-final',\n]\n",
  'src/app/huecos.ts': 'export const HUECOS = { datos: 1 }\n',
}

/** Un remoto con main y la rama `b/5.04`; `enRama` y `enMain` son los archivos que cada lado deja distintos de la base. */
function escenario(enRama, enMain) {
  const remoto = mkdtempSync(join(tmpdir(), 'unir-remoto-'))
  const dir = mkdtempSync(join(tmpdir(), 'unir-'))
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remoto])
  const g = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' }).trim()
  const escribir = (archivos) => {
    for (const [ruta, texto] of Object.entries(archivos)) {
      mkdirSync(join(dir, ruta, '..'), { recursive: true })
      writeFileSync(join(dir, ruta), texto)
    }
    g('add', '.')
  }
  g('init', '-q', '-b', 'main')
  g('remote', 'add', 'origin', remoto)
  escribir(BASE)
  g('commit', '-qm', 'base')
  g('push', '-q', 'origin', 'main')
  g('checkout', '-qb', 'b/5.04')
  escribir(enRama)
  g('commit', '-qm', 'el paso')
  g('push', '-q', 'origin', 'b/5.04')
  const oid = g('rev-parse', 'HEAD')
  g('checkout', '-q', 'main')
  escribir(enMain)
  g('commit', '-qm', 'otro carril')
  g('push', '-q', 'origin', 'main')
  return { dir, g, oid, main: g('rev-parse', 'HEAD') }
}

test('une los choques de notas y de un registro con las líneas de los dos lados y empuja el merge', () => {
  const { dir, g, oid, main } = escenario(
    {
      'docs/UX.md': BASE['docs/UX.md'] + '\n## Flujos: fases\n\nlo del B\n',
      'src/modules/flujos/CLAUDE.md': BASE['src/modules/flujos/CLAUDE.md'] + '- fases (B)\n',
      'scripts/carreras.mjs': "export const CARRERAS = [\n  'marcar-final',\n  'fases',\n]\n",
      'src/app/propio.ts': 'export const B = 1\n',
    },
    {
      'docs/UX.md': BASE['docs/UX.md'] + '\n## Flujos: requisitos\n\nlo del C\n',
      'src/modules/flujos/CLAUDE.md': BASE['src/modules/flujos/CLAUDE.md'] + '- requisitos (C)\n',
      'scripts/carreras.mjs': "export const CARRERAS = [\n  'marcar-final',\n  'requisitos',\n]\n",
      'src/app/ajeno.ts': 'export const C = 1\n',
    },
  )
  const r = unirMain('b/5.04', oid, { cwd: dir })
  assert.equal(r.hecho, true, r.motivo)
  assert.deepEqual(r.unidos.sort(), [
    'docs/UX.md',
    'scripts/carreras.mjs',
    'src/modules/flujos/CLAUDE.md',
  ])
  assert.equal(r.soloNotas, false)
  g('fetch', '-q', 'origin')
  assert.equal(g('rev-parse', 'origin/b/5.04'), r.commit)
  assert.equal(g('rev-parse', `${r.commit}^1`), oid)
  assert.equal(g('rev-parse', `${r.commit}^2`), main)
  const ux = g('show', `${r.commit}:docs/UX.md`)
  assert.match(ux, /lo del B/)
  assert.match(ux, /lo del C/)
  assert.doesNotMatch(ux, /^(<<<<<<<|=======|>>>>>>>)/m)
  const carreras = g('show', `${r.commit}:scripts/carreras.mjs`)
  assert.match(carreras, /'fases'/)
  assert.match(carreras, /'requisitos'/)
  // Lo que no chocaba entra de los dos lados.
  const archivos = g('ls-tree', '-r', '--name-only', r.commit)
  assert.match(archivos, /src\/app\/propio\.ts/)
  assert.match(archivos, /src\/app\/ajeno\.ts/)
  // Y con main ya dentro no empuja otro merge.
  assert.equal(unirMain('b/5.04', r.commit, { cwd: dir }).motivo, 'main ya está en la rama')
  g('fetch', '-q', 'origin')
  assert.equal(g('rev-parse', 'origin/b/5.04'), r.commit)
})

test('si git une main sin choques (GitHub da el PR por chocado igual), empuja ese merge y el CI decide', () => {
  const { dir, g, oid, main } = escenario(
    { 'src/app/propio.ts': 'export const B = 1\n' },
    {
      'src/app/ajeno.ts': 'export const C = 1\n',
      'docs/UX.md': BASE['docs/UX.md'] + '\n## Chat\n',
    },
  )
  const r = unirMain('b/5.04', oid, { cwd: dir })
  assert.equal(r.hecho, true, r.motivo)
  assert.deepEqual(r.unidos, [])
  // Trae código de main: nunca hereda el verde del CI anterior.
  assert.equal(r.soloNotas, false)
  g('fetch', '-q', 'origin')
  assert.equal(g('rev-parse', 'origin/b/5.04'), r.commit)
  assert.equal(g('rev-parse', `${r.commit}^1`), oid)
  assert.equal(g('rev-parse', `${r.commit}^2`), main)
  const archivos = g('ls-tree', '-r', '--name-only', r.commit)
  assert.match(archivos, /src\/app\/propio\.ts/)
  assert.match(archivos, /src\/app\/ajeno\.ts/)
  assert.match(g('show', `${r.commit}:docs/UX.md`), /## Chat/)
})

test('con choques sólo de notas lo dice (soloNotas): ese merge no cambia lo que el CI ya probó', () => {
  const { dir, oid } = escenario(
    { 'docs/UX.md': BASE['docs/UX.md'] + '\n## Agenda\n' },
    { 'docs/UX.md': BASE['docs/UX.md'] + '\n## Chat\n' },
  )
  const r = unirMain('b/5.04', oid, { cwd: dir })
  assert.equal(r.hecho, true, r.motivo)
  assert.equal(r.soloNotas, true)
})

test('un choque de código no se toca: vuelve a su carril', () => {
  const { dir, g, oid } = escenario(
    {
      'docs/UX.md': BASE['docs/UX.md'] + '\n## Agenda\n',
      'src/app/huecos.ts': 'export const HUECOS = { datos: 1, fases: 2 }\n',
    },
    {
      'docs/UX.md': BASE['docs/UX.md'] + '\n## Chat\n',
      'src/app/huecos.ts': 'export const HUECOS = { datos: 1, requisitos: 3 }\n',
    },
  )
  const r = unirMain('b/5.04', oid, { cwd: dir })
  assert.equal(r.hecho, false)
  assert.match(r.motivo, /choca en código \(src\/app\/huecos\.ts\)/)
  g('fetch', '-q', 'origin')
  assert.equal(g('rev-parse', 'origin/b/5.04'), oid)
})

test('si los dos lados cambiaron la misma línea de una nota, la unión la dejaría dos veces: no une', () => {
  const { dir, g, oid } = escenario(
    { 'docs/UX.md': '# UX\n\n## Leads\n\nla lista, con filtros\n' },
    { 'docs/UX.md': '# UX\n\n## Leads\n\nla lista, por cursor\n' },
  )
  const r = unirMain('b/5.04', oid, { cwd: dir })
  assert.equal(r.hecho, false)
  assert.match(r.motivo, /las mismas líneas de docs\/UX\.md/)
  g('fetch', '-q', 'origin')
  assert.equal(g('rev-parse', 'origin/b/5.04'), oid)
})

test('un registro .mjs que unido no es JavaScript válido no se empuja', () => {
  const { dir, oid } = escenario(
    {
      'scripts/carreras.mjs':
        "export const CARRERAS = [\n  'marcar-final',\n]\nexport const A = {\n",
    },
    {
      'scripts/carreras.mjs':
        "export const CARRERAS = [\n  'marcar-final',\n]\nexport const B = 2\n",
    },
  )
  const r = unirMain('b/5.04', oid, { cwd: dir })
  assert.equal(r.hecho, false)
  assert.match(r.motivo, /node --check/)
})

test('un archivo borrado de un lado y cambiado del otro no es una unión de líneas', () => {
  const { dir, g, oid } = escenario(
    { 'docs/UX.md': BASE['docs/UX.md'] + '\n## Agenda\n' },
    { 'src/app/ajeno.ts': 'export const C = 1\n' },
  )
  // main borra la nota que la rama cambió.
  g('rm', '-q', 'docs/UX.md')
  g('commit', '-qm', 'main borra la nota')
  g('push', '-q', 'origin', 'main')
  const r = unirMain('b/5.04', oid, { cwd: dir })
  assert.equal(r.hecho, false)
  assert.match(r.motivo, /no es de líneas/)
})

test('si la rama cambió desde que se miró el PR no empuja nada', () => {
  const { dir, oid, g } = escenario(
    { 'docs/UX.md': BASE['docs/UX.md'] + '\n## Agenda\n' },
    { 'docs/UX.md': BASE['docs/UX.md'] + '\n## Chat\n' },
  )
  const r = unirMain('b/5.04', 'f'.repeat(40), { cwd: dir })
  assert.equal(r.hecho, false)
  assert.match(r.motivo, /la rama cambió/)
  g('fetch', '-q', 'origin')
  assert.equal(g('rev-parse', 'origin/b/5.04'), oid)
})

test('unionDudosa: sólo cuando un choque trae líneas de la base; un «=======» del texto no confunde', () => {
  const agregados = '<<<<<<< a\nuno\n||||||| b\n=======\ndos\n>>>>>>> c\n'
  const cambiados = '<<<<<<< a\nuno\n||||||| b\ncero\n=======\ndos\n>>>>>>> c\n'
  assert.equal(unionDudosa(agregados), false)
  assert.equal(unionDudosa(cambiados), true)
  assert.equal(unionDudosa('Título\n=======\n\ntexto\n' + agregados), false)
})
