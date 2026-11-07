import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

// `sincronizar.sh` carga piloto.config y llama a coordinador.mjs, otro proceso: lo de la config tiene que llegarle exportado. Se prueba con un
// `node` falso que anota lo que ve y pone PARAR para que el lazo termine en la vuelta siguiente.
const SCRIPT = resolve('scripts/coordinador/sincronizar.sh')
const raices: string[] = []
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

function correr(config: string, entorno: Record<string, string> = {}) {
  const raiz = mkdtempSync(join(tmpdir(), 'sincronizar-'))
  raices.push(raiz)
  const repo = join(raiz, 'repo')
  mkdirSync(repo)
  execFileSync('git', ['init', '-q', '-b', 'main', repo])
  writeFileSync(join(repo, 'piloto.config'), config)
  mkdirSync(join(raiz, 'bin'))
  const comun = join(repo, '.git/coordinador')
  writeFileSync(
    join(raiz, 'bin/node'),
    `#!/usr/bin/env bash\necho "COORD_MERGE_AUTO=\${COORD_MERGE_AUTO:-}" >> "${join(raiz, 'visto.log')}"\nmkdir -p "${comun}" && touch "${comun}/PARAR"\n`,
  )
  chmodSync(join(raiz, 'bin/node'), 0o755)
  const r = spawnSync('bash', [SCRIPT], {
    cwd: repo,
    encoding: 'utf8',
    timeout: 20_000,
    env: {
      NODE_ENV: 'test',
      PATH: `${join(raiz, 'bin')}:${process.env['PATH'] ?? ''}`,
      HOME: raiz,
      COORD_INTERVALO: '0',
      ...entorno,
    },
  })
  return {
    estado: r.status,
    salida: r.stdout + r.stderr,
    visto: readFileSync(join(raiz, 'visto.log'), 'utf8'),
  }
}

describe('sincronizar.sh', () => {
  it('le pasa al coordinador lo de piloto.config (exportado)', () => {
    const r = correr('COORD_MERGE_AUTO="${COORD_MERGE_AUTO:-verde,ambar,rojo}"\n')
    expect(r.estado, r.salida).toBe(0)
    expect(r.visto).toContain('COORD_MERGE_AUTO=verde,ambar,rojo')
  })

  it('una variable del entorno manda sobre piloto.config', () => {
    const r = correr('COORD_MERGE_AUTO="${COORD_MERGE_AUTO:-verde,ambar,rojo}"\n', {
      COORD_MERGE_AUTO: 'verde',
    })
    expect(r.visto).toContain('COORD_MERGE_AUTO=verde\n')
  })
})
