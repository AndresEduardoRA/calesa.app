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
const SCRIPT = resolve('scripts/piloto/decidir.sh')
const BIN = resolve('scripts/piloto')

let raiz = ''
let comun = ''
const raices: string[] = []

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'decidir-'))
  raices.push(raiz)
  comun = join(raiz, 'comun')
  mkdirSync(comun)
  mkdirSync(join(raiz, 'bin'))
  writeFileSync(
    join(raiz, 'bin/tmux'),
    `#!/usr/bin/env bash\necho "$*" >> "${join(raiz, 'tmux.txt')}"\n`,
  )
  chmodSync(join(raiz, 'bin/tmux'), 0o755)
  writeFileSync(
    join(comun, 'compuerta.md'),
    'id: g-1\ncreada: 1\ntipo: datos\npaso: 4.15\nmotivo: m\npregunta: ¿sigo?\nopciones:\n- aprobar — sí\n- parar — no\ncontexto:\n',
  )
})
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

function decidir(...args: string[]) {
  return spawnSync('bash', [SCRIPT, ...args], {
    cwd: raiz,
    encoding: 'utf8',
    env: {
      NODE_ENV: 'test',
      HOME: raiz,
      PATH: `${join(raiz, 'bin')}:${process.env['PATH'] ?? ''}`,
      PILOTO_RAIZ: raiz,
      PILOTO_COMUN: comun,
      PILOTO_DIR: join(raiz, '.piloto'),
      CLAUDE_BIN: '/ruta/a/claude',
    },
  })
}
const tmux = () =>
  existsSync(join(raiz, 'tmux.txt')) ? readFileSync(join(raiz, 'tmux.txt'), 'utf8') : ''

describe('decidir.sh', () => {
  it('abrir lanza una sesión de tmux con Remote Control, sólo Read y AskUserQuestion, y la copia de los ajustes', () => {
    const r = decidir('abrir')
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
    decidir('abrir')
    expect(readFileSync(join(raiz, '.piloto/decidir-sesion'), 'utf8').trim()).toMatch(
      /^[0-9a-f-]{36}$/,
    )
  })

  it('cerrar mata la sesión de tmux', () => {
    expect(decidir('cerrar').status).toBe(0)
    expect(tmux()).toContain('kill-session -t piloto-decidir')
  })

  it('sin compuerta no abre nada', () => {
    rmSync(join(comun, 'compuerta.md'))
    const r = decidir('abrir')
    expect(r.status).toBe(1)
    expect(tmux()).not.toContain('new-session')
  })

  it('un modo desconocido es un error de uso', () => {
    expect(decidir('cualquiera').status).toBe(64)
  })

  it('los ajustes de la sesión cablean el hook que anota la decisión, de la copia', () => {
    const ajustes = JSON.parse(readFileSync(join(BIN, 'decidir.settings.json'), 'utf8'))
    const hook = ajustes.hooks.PostToolUse[0]
    expect(hook.matcher).toBe('AskUserQuestion')
    expect(hook.hooks[0].command).toContain('$PILOTO_BIN/anotar-decision.sh')
  })
})
