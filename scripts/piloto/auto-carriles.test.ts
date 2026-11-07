import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

// `auto-carriles.sh --una` decide si abre un carril: se prueba en seco (sin abrir nada) contra el repositorio real, con AUTO_LISTO
// apuntando a un archivo que sí está en origin/main. Hermética (4-83): su `.piloto/` es una carpeta temporal (un `PARAR` real del árbol la
// hacía caer) y su `tmux` no ve ninguna sesión (con los carriles corriendo decía «todos»).
const SCRIPT = resolve('scripts/piloto/auto-carriles.sh')
// Cada caso hace un `git fetch` real de origin/main: con la suite entera en paralelo pasaba de los 5 s por omisión.
vi.setConfig({ testTimeout: 60_000 })
const AISLADO = mkdtempSync(join(tmpdir(), 'auto-carriles-'))
mkdirSync(join(AISLADO, 'bin'))
mkdirSync(join(AISLADO, 'estado'))
writeFileSync(join(AISLADO, 'bin/tmux'), '#!/usr/bin/env bash\nexit 1\n')
chmodSync(join(AISLADO, 'bin/tmux'), 0o755)
const correr = (env: Record<string, string>) =>
  spawnSync('bash', [SCRIPT, '--una'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${join(AISLADO, 'bin')}:${process.env['PATH'] ?? ''}`,
      PILOTO_DIR: join(AISLADO, 'estado'),
      CARRILES_MAX: '',
      AUTO_EN_SECO: '1',
      ...env,
    },
  })

describe('auto-carriles.sh', () => {
  it('espera si origin/main no trae las áreas de 4.15-4', () => {
    expect(correr({ AUTO_LISTO: 'no/existe.ts' }).stdout).toContain('esperando 4.15-4')
  })
  it('espera si no hay disco', () => {
    const r = correr({ AUTO_LISTO: 'package.json', AUTO_DISCO_GB: '999999' })
    expect(r.stdout).toContain('disco:')
  })
  it('espera si no hay RAM', () => {
    const r = correr({ AUTO_LISTO: 'package.json', AUTO_DISCO_GB: '0', AUTO_RAM_GB: '999999' })
    expect(r.stdout).toContain('RAM:')
  })
  it('abriría el siguiente carril con todo a favor', () => {
    const r = correr({ AUTO_LISTO: 'package.json', AUTO_DISCO_GB: '0', AUTO_RAM_GB: '0' })
    expect(r.stdout).toMatch(/abriría [bc]/)
  })
  it('respeta CARRILES_MAX', () => {
    const r = correr({
      AUTO_LISTO: 'package.json',
      AUTO_DISCO_GB: '0',
      AUTO_RAM_GB: '0',
      CARRILES_MAX: '1',
    })
    expect(r.stdout).toContain('tope')
  })
})
