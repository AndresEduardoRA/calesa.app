import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

// `decidir.sh` abre y cierra la sesión corta de decidir (tmux + `claude --remote-control`). Se prueba con un `tmux` falso que
// registra su orden: lo que importa es la línea de la sesión, porque de sus herramientas y su hook depende que no escriba nada.
// Y que lee como la sesión: al abrir, lee desde el `-c` que recibió la ruta que SKILL.md manda leer y guarda lo que vio en
// `leido.txt`. Si la compuerta no está ahí, la sesión real contesta «No hay una compuerta abierta.» (pasó en la prueba en vivo).
const SCRIPT = resolve('scripts/piloto/decidir.sh')
const BIN = resolve('scripts/piloto')
const SKILL = readFileSync(resolve('.claude/skills/piloto-decidir/SKILL.md'), 'utf8')
const RUTA_QUE_LEE_LA_SKILL = /\*\*Lee `([^`]+)`\*\*/.exec(SKILL)?.[1] ?? ''

let raiz = ''
let comun = ''
const raices: string[] = []

const FALSO_TMUX = (dir: string) => `#!/usr/bin/env bash
echo "$*" >> "${join(dir, 'tmux.txt')}"
[ "$1" = new-session ] || exit 0
while [ $# -gt 0 ]; do [ "$1" = -c ] && { cwd="$2"; break; }; shift; done
if [ -f "$cwd/$LEE_RUTA" ]; then cp "$cwd/$LEE_RUTA" "${join(dir, 'leido.txt')}"; else echo 'NO EXISTE' > "${join(dir, 'leido.txt')}"; fi
if [ -n "\${FAKE_RESPONDE:-}" ]; then
  printf 'id: %s\\nopcion: si llegó\\nme respondió: «si llegó»\\n' "$(sed -n 's/^id: *//p' "$PILOTO_COMUN/compuerta.md" | head -n 1)" > "$PILOTO_COMUN/decision.md"
fi
`

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'decidir-'))
  raices.push(raiz)
  comun = join(raiz, 'comun')
  mkdirSync(comun)
  mkdirSync(join(raiz, 'bin'))
  mkdirSync(join(raiz, 'otro'))
  writeFileSync(join(raiz, 'bin/tmux'), FALSO_TMUX(raiz))
  chmodSync(join(raiz, 'bin/tmux'), 0o755)
  writeFileSync(
    join(comun, 'compuerta.md'),
    'id: g-1\ncreada: 1\ntipo: datos\npaso: 4.15\nmotivo: m\npregunta: ¿sigo?\nopciones:\n- aprobar — sí\n- parar — no\ncontexto:\n',
  )
})
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

// Corre desde `otro/`, no desde la raíz: que `-c` sea la raíz tiene que salir del script, no de dónde se lo llamó.
function decidir(args: string[], env: Record<string, string> = {}) {
  return spawnSync('bash', [SCRIPT, ...args], {
    cwd: join(raiz, 'otro'),
    encoding: 'utf8',
    env: {
      NODE_ENV: 'test',
      HOME: raiz,
      PATH: `${join(raiz, 'bin')}:${process.env['PATH'] ?? ''}`,
      PILOTO_RAIZ: raiz,
      PILOTO_COMUN: comun,
      PILOTO_DIR: join(raiz, '.piloto'),
      CLAUDE_BIN: '/ruta/a/claude',
      LEE_RUTA: RUTA_QUE_LEE_LA_SKILL,
      ...env,
    },
  })
}
const tmux = () =>
  existsSync(join(raiz, 'tmux.txt')) ? readFileSync(join(raiz, 'tmux.txt'), 'utf8') : ''
const leido = () =>
  existsSync(join(raiz, 'leido.txt')) ? readFileSync(join(raiz, 'leido.txt'), 'utf8') : ''

describe('decidir.sh', () => {
  it('SKILL.md nombra la ruta que lee la sesión (si no, los demás tests leerían nada)', () => {
    expect(RUTA_QUE_LEE_LA_SKILL).toMatch(/compuerta\.md$/)
  })

  it('la sesión abierta encuentra su compuerta donde la skill la lee, con el id de la que vale', () => {
    const r = decidir(['abrir'])
    expect(r.status, r.stderr).toBe(0)
    expect(leido()).toContain('id: g-1\n')
    expect(leido()).toContain('tipo: datos\npaso: 4.15')
  })

  it('abrir reemplaza una copia vieja por la compuerta vigente', () => {
    mkdirSync(join(raiz, '.piloto'))
    writeFileSync(join(raiz, RUTA_QUE_LEE_LA_SKILL), 'id: g-0\ntipo: parada\n')
    decidir(['abrir'])
    expect(leido()).toContain('id: g-1\n')
    expect(leido()).not.toContain('g-0')
  })

  it('--prueba: la sesión lee la compuerta de la prueba y la decisión que llega la termina bien', () => {
    const r = decidir(['--prueba'], { FAKE_RESPONDE: '1' })
    expect(r.status, r.stderr).toBe(0)
    expect(leido()).toMatch(/^id: prueba-\d+$/m)
    expect(leido()).toContain('tipo: prueba')
    expect(r.stdout).toContain('me respondió')
    expect(tmux()).toContain('kill-session -t piloto-decidir')
  })

  it('cerrar deja sin la copia de lectura, para que una sesión futura no tome una compuerta vieja por vigente', () => {
    decidir(['abrir'])
    expect(existsSync(join(raiz, RUTA_QUE_LEE_LA_SKILL))).toBe(true)
    decidir(['cerrar'])
    expect(existsSync(join(raiz, RUTA_QUE_LEE_LA_SKILL))).toBe(false)
  })

  it('abrir lanza una sesión de tmux con Remote Control, sólo Read y AskUserQuestion, y la copia de los ajustes', () => {
    const r = decidir(['abrir'])
    expect(r.status, r.stderr).toBe(0)
    const linea = tmux()
    expect(linea).toContain('new-session -d -s piloto-decidir')
    expect(linea).toContain("--remote-control 'piloto · datos 4.15'")
    expect(linea).toContain("--tools 'Read,AskUserQuestion'")
    expect(linea).toContain('--model sonnet --effort low')
    expect(linea).toContain(`--settings '${BIN}/decidir.settings.json'`)
    expect(linea).toContain('PILOTO_SESION=decidir')
    expect(linea).toContain(`PILOTO_COMUN='${comun}'`)
    expect(linea).toContain(`PILOTO_BIN='${BIN}'`)
    expect(linea).toContain("'/ruta/a/claude'")
    expect(linea).toMatch(/'\/piloto-decidir'$/m)
  })

  it('el id de la sesión queda anotado para contar su consumo al cerrar', () => {
    decidir(['abrir'])
    expect(readFileSync(join(raiz, '.piloto/decidir-sesion'), 'utf8').trim()).toMatch(
      /^[0-9a-f-]{36}$/,
    )
  })

  it('cerrar mata la sesión de tmux', () => {
    expect(decidir(['cerrar']).status).toBe(0)
    expect(tmux()).toContain('kill-session -t piloto-decidir')
  })

  it('sin compuerta no abre nada', () => {
    rmSync(join(comun, 'compuerta.md'))
    const r = decidir(['abrir'])
    expect(r.status).toBe(1)
    expect(tmux()).not.toContain('new-session')
  })

  it('un modo desconocido es un error de uso', () => {
    expect(decidir(['cualquiera']).status).toBe(64)
  })

  it('los ajustes de la sesión cablean el hook que anota la decisión, de la copia', () => {
    const ajustes = JSON.parse(readFileSync(join(BIN, 'decidir.settings.json'), 'utf8'))
    const hook = ajustes.hooks.PostToolUse[0]
    expect(hook.matcher).toBe('AskUserQuestion')
    expect(hook.hooks[0].command).toContain('$PILOTO_BIN/anotar-decision.sh')
  })
})
