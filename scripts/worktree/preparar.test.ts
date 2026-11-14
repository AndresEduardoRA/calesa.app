import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

// `preparar.sh` elige solo la letra del carril en un worktree recién creado (sin `.env.carril`): así lo llaman Orca, Claude Code y
// el orquestador. Se prueba hasta el paso 1 en un repo temporal con un `pnpm` falso que falla (el stack no se levanta en la prueba).
const raices: string[] = []
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

const COPIAR = [
  'scripts/worktree/preparar.sh',
  'scripts/lib/stack-local.mjs',
  'scripts/lib/carril.sh',
  'supabase/config.toml',
]

function worktreeNuevo() {
  const raiz = mkdtempSync(join(tmpdir(), 'preparar-'))
  raices.push(raiz)
  const repo = join(raiz, 'repo')
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@ejemplo.test', ...args], {
      cwd: repo,
      encoding: 'utf8',
    })
  mkdirSync(repo)
  git('init', '-q', '-b', 'main')
  for (const f of COPIAR) {
    mkdirSync(dirname(join(repo, f)), { recursive: true })
    copyFileSync(resolve(f), join(repo, f))
  }
  git('add', '.')
  git('commit', '-q', '-m', 'chore: inicio')
  const wt = join(raiz, 'wt')
  git('worktree', 'add', '-q', '-b', 'feat/x', wt)
  mkdirSync(join(wt, 'node_modules'))
  mkdirSync(join(raiz, 'bin'))
  writeFileSync(join(raiz, 'bin', 'pnpm'), '#!/usr/bin/env bash\nexit 1\n')
  chmodSync(join(raiz, 'bin', 'pnpm'), 0o755)
  return { raiz, wt }
}

describe('preparar.sh', () => {
  it('en un worktree nuevo, sin letra, toma la primera libre y escribe .env.carril', () => {
    const { raiz, wt } = worktreeNuevo()
    const r = spawnSync('bash', ['scripts/worktree/preparar.sh'], {
      cwd: wt,
      encoding: 'utf8',
      env: {
        NODE_ENV: 'test',
        HOME: raiz,
        PATH: `${join(raiz, 'bin')}:${process.env['PATH'] ?? ''}`,
      },
    })
    expect(r.stdout + r.stderr).toContain('✓ carril a')
    expect(readFileSync(join(wt, '.env.carril'), 'utf8')).toMatch(/^SUPABASE_PROJECT_ID=.*-a$/m)
  })
})
