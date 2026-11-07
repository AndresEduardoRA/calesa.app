import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  arrancar,
  comun,
  copia,
  limpiar,
  preparar,
  raiz,
  repo,
  SCRIPT,
  tmux,
} from './arrancar.arnes'

// `arrancar.sh` copia `scripts/piloto/` (sin pruebas) a `<común>/piloto/bin/` con su `bin.sha256` y lanza ESA copia en tmux: es lo que
// impide que un paso cambie el código con que se lo verifica y publica. Se prueba con un `tmux` y un `claude` falsos y un repo temporal
// que lleva la carpeta `scripts/piloto/` real: lo que importa es la copia, su firma, y qué se lanza. La copia de origin/main y el vigía
// (FLUJO-1), en arrancar-main.test.ts.
beforeEach(preparar)
afterAll(limpiar)

describe('arrancar.sh › la copia', () => {
  it('copia las piezas del bucle y ninguna prueba, y anota un sha256 por archivo', () => {
    const r = arrancar()
    expect(r.status, r.stderr).toBe(0)
    const archivos = copia()
    for (const pieza of [
      'bucle.sh',
      'compuerta.sh',
      'cierre.sh',
      'gasto.sh',
      'ci.sh',
      'comun.sh',
      'hechos.sh',
      'verificar.sh',
      'publicar.sh',
      'decidir.sh',
      'decidir.settings.json',
      'anotar-decision.sh',
      'consumo.sh',
      'huella.sh',
      'nivel.mjs',
      'cuenta-e2e.mjs',
      'saltadas.mjs',
      'ruteo.schema.json',
      'ultimo.schema.json',
      'bin.sha256',
    ]) {
      expect(archivos, pieza).toContain(pieza)
    }
    expect(archivos.filter((a) => a.endsWith('.ts'))).toEqual([])
    const firmas = readFileSync(join(comun, 'bin/bin.sha256'), 'utf8').trim().split('\n')
    expect(firmas).toHaveLength(archivos.length - 1)
    expect(() =>
      execFileSync('sha256sum', ['-c', '--quiet', 'bin.sha256'], { cwd: join(comun, 'bin') }),
    ).not.toThrow()
  })

  it('la copia queda de sólo lectura', () => {
    arrancar()
    for (const archivo of copia())
      expect(statSync(join(comun, 'bin', archivo)).mode & 0o222, archivo).toBe(0)
  })

  it('volver a arrancar reemplaza la copia por la versión nueva del árbol', () => {
    arrancar()
    writeFileSync(join(repo, 'scripts/piloto/parar.sh'), '#!/usr/bin/env bash\n# versión nueva\n')
    arrancar()
    expect(readFileSync(join(comun, 'bin/parar.sh'), 'utf8')).toContain('versión nueva')
    expect(() =>
      execFileSync('sha256sum', ['-c', '--quiet', 'bin.sha256'], { cwd: join(comun, 'bin') }),
    ).not.toThrow()
  })
})

describe('arrancar.sh › lo que lanza', () => {
  it('el bucle de la COPIA en tmux (piloto-bucle) y una sesión de control con Remote Control', () => {
    arrancar('--hasta', '4.15')
    const lineas = tmux()
    expect(lineas).toContain('new-session -d -s piloto-bucle')
    expect(lineas).toContain(`bash '${comun}/bin/bucle.sh' --hasta 4.15`)
    expect(lineas).not.toContain(`${repo}/scripts/piloto/bucle.sh`)
    expect(lineas).toContain('new-session -d -s piloto-control')
    expect(lineas).toContain("--remote-control 'piloto · control'")
    expect(lineas).toContain('PILOTO_SESION=control')
    expect(lineas).toContain("'/piloto-control'")
  })

  it('la sesión de control no carga herramientas MCP ni Chrome (en decidir eran 677 KB de esquemas por sesión)', () => {
    arrancar('--hasta', '4.15')
    const control = tmux()
      .split('\n')
      .find((l) => l.includes('piloto-control') && l.includes('--remote-control'))
    expect(control).toContain('ENABLE_CLAUDEAI_MCP_SERVERS=false')
    expect(control).toContain("--disallowedTools 'mcp__*'")
    expect(control).toContain('--no-chrome')
  })

  it('no lanza el bucle si ya hay una sesión piloto-bucle', () => {
    writeFileSync(
      join(raiz, 'bin/tmux'),
      `#!/usr/bin/env bash\necho "$*" >> "${join(raiz, 'tmux.txt')}"\nexit 0\n`,
    )
    const r = arrancar()
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('piloto-bucle')
    expect(tmux()).not.toContain('new-session')
  })

  it('sin el binario de claude no arranca', () => {
    mkdirSync(join(raiz, 'sin-claude'))
    for (const nombre of ['tmux', 'gh']) {
      writeFileSync(join(raiz, 'sin-claude', nombre), readFileSync(join(raiz, 'bin', nombre)))
      chmodSync(join(raiz, 'sin-claude', nombre), 0o755)
    }
    // Un PATH sin el de la máquina: con `claude` instalado (~/.local/bin) la prueba lo encontraba y pasaba de largo.
    // Sólo los programas que arrancar.sh pide, enlazados, más /usr/bin y /bin para lo básico.
    for (const programa of ['git', 'jq', 'flock', 'node']) {
      const ruta = execFileSync('bash', ['-c', `command -v ${programa}`], {
        encoding: 'utf8',
      }).trim()
      symlinkSync(ruta, join(raiz, 'sin-claude', programa))
    }
    const r = spawnSync('bash', [SCRIPT], {
      cwd: repo,
      encoding: 'utf8',
      env: {
        NODE_ENV: 'test',
        HOME: raiz,
        PATH: `${join(raiz, 'sin-claude')}:/usr/bin:/bin`,
        PILOTO_RAIZ: repo,
        CLAUDE_BIN: '',
      },
    })
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('claude')
  })
})

describe('arrancar.sh › con carril', () => {
  it('--carril lanza piloto-bucle-<carril> con PILOTO_CARRIL y el coordinador, una vez', () => {
    mkdirSync(join(repo, 'scripts/coordinador'), { recursive: true })
    writeFileSync(join(repo, 'scripts/coordinador/sincronizar.sh'), '#!/usr/bin/env bash\nexit 0\n')
    const r = arrancar('--carril', 'formula')
    expect(r.status, r.stderr).toBe(0)
    expect(tmux()).toMatch(/new-session -d -s piloto-bucle-formula .*PILOTO_CARRIL='formula' bash /)
    expect(tmux()).toMatch(/new-session -d -s piloto-coordinador .*sincronizar\.sh/)
    expect(tmux()).not.toMatch(/-s piloto-bucle -c/)
  })

  it('sin --carril, lo de siempre: piloto-bucle y ningún coordinador', () => {
    arrancar()
    expect(tmux()).toMatch(/-s piloto-bucle -c/)
    expect(tmux()).not.toContain('piloto-coordinador')
  })
})
