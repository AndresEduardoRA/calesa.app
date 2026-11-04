import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

// El coordinador y su lógica se prueban con `node:test` (como en calesa-web); aquí los corre `pnpm test`, y se valida el plan real.
describe('scripts/coordinador', () => {
  it('sus pruebas de node:test pasan', () => {
    const r = spawnSync(
      process.execPath,
      ['--test', 'scripts/coordinador/plan.test.mjs', 'scripts/coordinador/coordinador.test.mjs'],
      { encoding: 'utf8' },
    )
    expect(r.status, r.stdout + r.stderr).toBe(0)
  })

  it('docs/plan.yaml corre sin choques', () => {
    const r = spawnSync(process.execPath, ['scripts/coordinador/coordinador.mjs', 'validar'], {
      encoding: 'utf8',
    })
    expect(r.status, r.stdout + r.stderr).toBe(0)
  })
})
