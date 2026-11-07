import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// El arnés de las pruebas de `arrancar.sh` (`arrancar*.test.ts`): un repo temporal que lleva la carpeta `scripts/piloto/` real, con un `tmux`,
// un `claude` y un `gh` falsos. `preparar()` va en el beforeEach y `limpiar()` en el afterAll; `raiz`, `repo` y `comun` son los de la prueba
// en curso (enlaces vivos del módulo).
export const SCRIPT = resolve('scripts/piloto/arrancar.sh')

export let raiz = ''
export let repo = ''
export let comun = ''
const raices: string[] = []

export function preparar() {
  raiz = mkdtempSync(join(tmpdir(), 'arrancar-'))
  raices.push(raiz)
  repo = join(raiz, 'repo')
  mkdirSync(repo)
  execFileSync('git', ['init', '-q', '-b', 'main', repo])
  execFileSync('cp', ['-r', resolve('scripts/piloto'), join(repo, 'scripts-piloto-copia')])
  mkdirSync(join(repo, 'scripts'))
  execFileSync('mv', [join(repo, 'scripts-piloto-copia'), join(repo, 'scripts/piloto')])
  comun = join(repo, '.git/piloto')
  mkdirSync(join(raiz, 'bin'))
  for (const [nombre, texto] of [
    [
      'tmux',
      `#!/usr/bin/env bash\necho "$*" >> "${join(raiz, 'tmux.txt')}"\n[ "$1" = has-session ] && exit 1\nexit 0\n`,
    ],
    ['claude', '#!/usr/bin/env bash\nexit 0\n'],
    ['gh', '#!/usr/bin/env bash\nexit 0\n'],
  ] as const) {
    writeFileSync(join(raiz, 'bin', nombre), texto)
    chmodSync(join(raiz, 'bin', nombre), 0o755)
  }
}
export function limpiar() {
  for (const r of raices) {
    execFileSync('chmod', ['-R', 'u+w', r])
    rmSync(r, { recursive: true, force: true })
  }
}

export function arrancar(...args: string[]) {
  return spawnSync('bash', [SCRIPT, ...args], {
    cwd: repo,
    encoding: 'utf8',
    env: {
      NODE_ENV: 'test',
      HOME: raiz,
      PATH: `${join(raiz, 'bin')}:${process.env['PATH'] ?? ''}`,
      PILOTO_RAIZ: repo,
      CLAUDE_BIN: join(raiz, 'bin/claude'),
    },
  })
}
export const tmux = () =>
  existsSync(join(raiz, 'tmux.txt')) ? readFileSync(join(raiz, 'tmux.txt'), 'utf8') : ''
export const copia = () => readdirSync(join(comun, 'bin')).sort()
