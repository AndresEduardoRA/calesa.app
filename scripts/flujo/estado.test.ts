import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

// `estado.sh` dice en pocas líneas cómo está el flujo (docs/FLUJO.md). Nunca frena: sin `gh`, o si GitHub no responde, dice lo local y
// sale con 0. Con un PR abierto en rojo o una noche caída, lo marca con ✗ y dice cómo verlo. Se prueba con un `gh` falso.
const GUION = resolve('scripts/flujo/estado.sh')
const raices: string[] = []
let raiz = ''
let repo = ''

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'estado-'))
  raices.push(raiz)
  repo = join(raiz, 'repo')
  mkdirSync(join(raiz, 'bin'))
  execFileSync('git', ['init', '-q', '-b', 'main', repo])
  writeFileSync(join(repo, 'a.txt'), 'a\n')
})
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

function gh(cuerpo: string) {
  writeFileSync(join(raiz, 'bin', 'gh'), `#!/usr/bin/env bash\n${cuerpo}\n`)
  chmodSync(join(raiz, 'bin', 'gh'), 0o755)
}

function estado() {
  const r = spawnSync('bash', [GUION], {
    cwd: repo,
    encoding: 'utf8',
    env: {
      NODE_ENV: 'test',
      HOME: raiz,
      PATH: `${join(raiz, 'bin')}:${process.env['PATH'] ?? ''}`,
    },
  })
  return { estado: r.status, salida: r.stdout }
}

describe('estado.sh', () => {
  it('si GitHub no responde dice lo local y no frena', () => {
    gh('exit 1')
    const r = estado()
    expect(r.estado).toBe(0)
    expect(r.salida).toContain('· rama main, 1 archivos sin commitear')
    expect(r.salida).toContain('GitHub no respondió')
  })

  it('sin PR abiertos lo dice, con el último CI de main y la noche', () => {
    gh(`case "$1 $2" in
  "auth token") exit 1 ;;
  "pr list") echo '[]' ;;
  "run list")
    case "$*" in
      *schedule*) echo '[{"conclusion":"failure","createdAt":"2026-11-13T07:00:00Z","databaseId":7,"headSha":"abcdef0123"}]' ;;
      *) echo '[{"conclusion":"success","createdAt":"2026-11-13T20:00:00Z","databaseId":9,"headSha":"0123456789"}]' ;;
    esac ;;
esac`)
    const r = estado()
    expect(r.estado).toBe(0)
    expect(r.salida).toContain('✓ sin PR abiertos')
    expect(r.salida).toContain('✓ CI de main (01234567, 2026-11-13T20:00:00Z)')
    expect(r.salida).toContain('✗ e2e completo de la noche (abcdef01, 2026-11-13T07:00:00Z)')
    expect(r.salida).toContain('gh run view 7 --log-failed')
  })

  it('un PR abierto con «Listo» en rojo va marcado: se arregla o se cierra antes que lo nuevo', () => {
    gh(`case "$1 $2" in
  "auth token") exit 1 ;;
  "pr list") echo '[{"number":12,"title":"fix(leads): algo","headRefName":"fix/algo","statusCheckRollup":[{"__typename":"CheckRun","name":"Listo · todo en verde","conclusion":"FAILURE"}]}]' ;;
  "run list") echo '[]' ;;
esac`)
    const r = estado()
    expect(r.estado).toBe(0)
    expect(r.salida).toContain('✗ PR #12 abierto (fix/algo): fix(leads): algo — CI en rojo')
  })
})
