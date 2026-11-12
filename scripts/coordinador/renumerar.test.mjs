// La renumeración del coordinador contra un remoto de verdad (una carpeta bare).
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { renumerarMigraciones } from './renumerar.mjs'

// commit-tree no pasa por `-c`: en un runner sin identidad global, la da el entorno.
Object.assign(process.env, {
  GIT_AUTHOR_NAME: 't',
  GIT_AUTHOR_EMAIL: 'a@b',
  GIT_COMMITTER_NAME: 't',
  GIT_COMMITTER_EMAIL: 'a@b',
})

function escenario() {
  const remoto = mkdtempSync(join(tmpdir(), 'renum-remoto-'))
  const dir = mkdtempSync(join(tmpdir(), 'renum-'))
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remoto])
  const g = (...a) =>
    execFileSync('git', ['-c', 'user.email=a@b', '-c', 'user.name=t', ...a], {
      cwd: dir,
      encoding: 'utf8',
    }).trim()
  const escribir = (ruta, texto) => {
    mkdirSync(join(dir, ruta, '..'), { recursive: true })
    writeFileSync(join(dir, ruta), texto)
  }
  g('init', '-q', '-b', 'main')
  g('remote', 'add', 'origin', remoto)
  escribir('supabase/migrations/20261111100000_base.sql', 'select 1;\n')
  g('add', '.')
  g('commit', '-qm', 'base')
  g('push', '-q', 'origin', 'main')
  // La rama del carril agrega una migración y la cita en su bitácora.
  g('checkout', '-qb', 'c/5.03')
  escribir('supabase/migrations/20261111120000_tipos.sql', 'create table t();\n')
  escribir('docs/pasos/5.03/bitacora.md', 'migración 20261111120000_tipos\n')
  g('add', '.')
  g('commit', '-qm', 'tipos')
  g('push', '-q', 'origin', 'c/5.03')
  const oid = g('rev-parse', 'HEAD')
  // Otro carril integra en main una migración más nueva.
  g('checkout', '-q', 'main')
  escribir('supabase/migrations/20261111130000_otro.sql', 'select 2;\n')
  g('add', '.')
  g('commit', '-qm', 'otro')
  g('push', '-q', 'origin', 'main')
  return { dir, g, oid }
}

test('renumera las migraciones atrasadas en la rama del PR y la versión vieja en sus archivos', () => {
  const { dir, g, oid } = escenario()
  const ahora = Date.UTC(2026, 10, 11, 12, 0, 0)
  const r = renumerarMigraciones('c/5.03', oid, { cwd: dir, ahora })
  assert.equal(r.hecho, true, r.motivo)
  assert.deepEqual(r.pares, ['20261111120000:20261111130001'])
  g('fetch', '-q', 'origin')
  const archivos = g('ls-tree', '-r', '--name-only', 'origin/c/5.03')
  assert.match(archivos, /20261111130001_tipos\.sql/)
  assert.doesNotMatch(archivos, /20261111120000/)
  assert.equal(
    g('show', 'origin/c/5.03:docs/pasos/5.03/bitacora.md'),
    'migración 20261111130001_tipos',
  )
  assert.equal(g('rev-parse', 'origin/c/5.03^'), oid)
})

test('si la rama cambió desde que la miró el CI no empuja nada', () => {
  const { dir, g } = escenario()
  const r = renumerarMigraciones('c/5.03', 'f'.repeat(40), { cwd: dir })
  assert.equal(r.hecho, false)
  assert.match(r.motivo, /la rama cambió/)
  g('fetch', '-q', 'origin')
  assert.match(g('ls-tree', '-r', '--name-only', 'origin/c/5.03'), /20261111120000_tipos/)
})

test('una migración posterior a main pero con una hora que no existe (…60 s, renumerada a mano) también se renumera', () => {
  const { dir, g } = escenario()
  g('checkout', '-q', 'c/5.03')
  g(
    'mv',
    'supabase/migrations/20261111120000_tipos.sql',
    'supabase/migrations/20261111135960_tipos.sql',
  )
  g('commit', '-qm', 'a mano')
  g('push', '-q', 'origin', 'c/5.03')
  const oid = g('rev-parse', 'HEAD')
  const ahora = Date.UTC(2026, 10, 11, 14, 30, 0)
  const r = renumerarMigraciones('c/5.03', oid, { cwd: dir, ahora })
  assert.equal(r.hecho, true, r.motivo)
  assert.deepEqual(r.pares, ['20261111135960:20261111143000'])
})

test('una migración posterior a main y con fecha real no se toca', () => {
  const { dir, g } = escenario()
  g('checkout', '-q', 'c/5.03')
  g(
    'mv',
    'supabase/migrations/20261111120000_tipos.sql',
    'supabase/migrations/20261111135900_tipos.sql',
  )
  g('commit', '-qm', 'al día')
  g('push', '-q', 'origin', 'c/5.03')
  const r = renumerarMigraciones('c/5.03', g('rev-parse', 'HEAD'), {
    cwd: dir,
    ahora: Date.UTC(2026, 10, 11, 14, 30, 0),
  })
  assert.equal(r.hecho, false)
  assert.match(r.motivo, /no hay migraciones atrasadas/)
})
