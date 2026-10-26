import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

// El hook Stop (`verificar-al-terminar.sh`) verificaba todo en cada fin de turno (≈ 160 s: mapa, typecheck, lint, test). Ahora decide
// por el estado del árbol (medido en `docs/PILOTO.md`): sale sin verificar si la sesión no edita (`PILOTO_SESION` = ruteo|decidir|
// control|en-seco), si queda trabajo en segundo plano o si la huella del árbol es la de la última verificación verde; con el árbol sucio
// (un turno a mitad de paso) corre lo barato (≈ 20 s); con el árbol limpio (un paso cerrado), la suite completa una vez y deja la
// huella. Lee `cwd` de la entrada (no `${CLAUDE_PROJECT_DIR}`: no sigue a un worktree) y conserva el tope de 3 intentos. Se prueba con
// `pnpm`, `npx` y `mapa.sh` falsos que registran lo que se les pide, en un repo temporal.
const HOOK = resolve('.claude/hooks/verificar-al-terminar.sh')
const LINT = resolve('.claude/hooks/lint-archivo.sh')
const HUELLA = resolve('scripts/piloto/huella.sh')

let raiz = ''
let repo = ''
const raices: string[] = []

const git = (...args: string[]) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@ejemplo.test', ...args], {
    cwd: repo,
    encoding: 'utf8',
  }).trim()

function escribir(ruta: string, texto: string) {
  mkdirSync(dirname(join(repo, ruta)), { recursive: true })
  writeFileSync(join(repo, ruta), texto)
}

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'stop-'))
  raices.push(raiz)
  repo = join(raiz, 'repo')
  mkdirSync(repo)
  mkdirSync(join(raiz, 'bin'))
  execFileSync('git', ['init', '-q', '-b', 'main', repo])
  escribir('.gitignore', '.claude/.verificado-stop\n.claude/.intentos-stop\n')
  escribir('src/a.ts', 'export const a = 1\n')
  escribir('docs/ESTADO.md', 'estado\n')
  escribir('scripts/mapa.sh', `echo "mapa $*" >> "${join(raiz, 'llamadas.txt')}"\n`)
  mkdirSync(join(repo, 'scripts/piloto'))
  copyFileSync(HUELLA, join(repo, 'scripts/piloto/huella.sh'))
  git('add', '.')
  git('commit', '-q', '-m', 'inicio')
  // `pnpm` y `npx` falsos: registran, y fallan si lo que se les pidió empieza como $FAKE_FALLA.
  for (const programa of ['pnpm', 'npx']) {
    writeFileSync(
      join(raiz, 'bin', programa),
      `#!/usr/bin/env bash
echo "${programa} $*" >> "${join(raiz, 'llamadas.txt')}"
[ -n "\${FAKE_FALLA:-}" ] && [[ "${programa} $*" == "$FAKE_FALLA"* ]] && { echo "falló ${programa} $*"; exit 1; }
exit 0
`,
    )
    chmodSync(join(raiz, 'bin', programa), 0o755)
  }
})
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

function stop(entrada: Record<string, unknown> = {}, entorno: Record<string, string> = {}) {
  const r = spawnSync('bash', [HOOK], {
    cwd: raiz, // lejos del repo: el hook tiene que seguir el cwd de la entrada
    input: JSON.stringify({ hook_event_name: 'Stop', cwd: repo, ...entrada }),
    encoding: 'utf8',
    env: {
      NODE_ENV: 'test',
      PATH: `${join(raiz, 'bin')}:${process.env['PATH'] ?? ''}`,
      CLAUDE_PROJECT_DIR: join(raiz, 'otro-proyecto'),
      ...entorno,
    },
  })
  return { estado: r.status, stdout: r.stdout, stderr: r.stderr }
}

const llamadas = () =>
  existsSync(join(raiz, 'llamadas.txt'))
    ? readFileSync(join(raiz, 'llamadas.txt'), 'utf8')
        .trim()
        .split('\n')
        .map((l) => l.trimEnd())
    : []
const huellaGuardada = () => join(repo, '.claude/.verificado-stop')
const ensuciar = () => {
  escribir('src/a.ts', 'export const a = 2\n')
  escribir('src/b.test.ts', 'export {}\n')
}

describe('verificar-al-terminar.sh › salir sin verificar', () => {
  it.each(['ruteo', 'decidir', 'control', 'en-seco'])(
    'una sesión %s no edita: sale sin correr nada',
    (sesion) => {
      ensuciar()
      expect(stop({}, { PILOTO_SESION: sesion }).estado).toBe(0)
      expect(llamadas()).toEqual([])
    },
  )

  it('una sesión de paso sí verifica', () => {
    ensuciar()
    stop({}, { PILOTO_SESION: 'paso' })
    expect(llamadas().length).toBeGreaterThan(0)
  })

  it('con trabajo en segundo plano (el `-p` sigue esperando) no verifica', () => {
    ensuciar()
    expect(stop({ background_tasks: [{ id: 'b1', command: 'sleep 100' }] }).estado).toBe(0)
    expect(llamadas()).toEqual([])
  })

  it('con la lista vacía de tareas en segundo plano sí verifica', () => {
    ensuciar()
    stop({ background_tasks: [] })
    expect(llamadas().length).toBeGreaterThan(0)
  })

  it('con la huella igual a la de la última verificación verde no repite nada', () => {
    execFileSync('bash', [HUELLA, '--escribir'], { cwd: repo })
    expect(stop().estado).toBe(0)
    expect(llamadas()).toEqual([])
  })

  it('si el árbol cambió desde esa huella, verifica', () => {
    execFileSync('bash', [HUELLA, '--escribir'], { cwd: repo })
    ensuciar()
    stop()
    expect(llamadas().length).toBeGreaterThan(0)
  })
})

describe('verificar-al-terminar.sh › con el árbol sucio (a mitad de un paso)', () => {
  beforeEach(ensuciar)

  it('corre lo barato: mapa, typecheck, eslint --cache de los cambiados, vitest related, las guardas y el mapa', () => {
    const r = stop()
    expect(r.estado, r.stderr).toBe(0)
    expect(llamadas()).toEqual([
      'mapa',
      'pnpm typecheck',
      'npx eslint --cache --max-warnings 0 --no-warn-ignored src/a.ts src/b.test.ts',
      'npx vitest related --run src/a.ts src/b.test.ts',
      'npx vitest run scripts/guardas',
      'mapa --check',
    ])
  })

  it('no corre la suite completa ni el lint de todo el repo, y no deja la huella verde', () => {
    stop()
    expect(llamadas()).not.toContain('pnpm test')
    expect(llamadas()).not.toContain('pnpm lint')
    expect(existsSync(huellaGuardada())).toBe(false)
  })

  it('un cambio sólo de docs no pide eslint ni vitest related', () => {
    git('checkout', '--', 'src/a.ts')
    rmSync(join(repo, 'src/b.test.ts'))
    escribir('docs/ESTADO.md', 'otro estado\n')
    stop()
    expect(llamadas()).toEqual([
      'mapa',
      'pnpm typecheck',
      'npx vitest run scripts/guardas',
      'mapa --check',
    ])
  })

  it.each(['pnpm typecheck', 'npx eslint', 'npx vitest related', 'npx vitest run scripts/guardas'])(
    '«%s» rojo: sale con 2, dice que no está terminada y para en ese rojo',
    (falla) => {
      const r = stop({}, { FAKE_FALLA: falla })
      expect(r.estado).toBe(2)
      expect(r.stderr).toContain('no está terminada')
      expect(r.stderr).toContain(`falló ${falla}`)
      expect(llamadas().at(-1)?.startsWith(falla)).toBe(true)
    },
  )
})

describe('verificar-al-terminar.sh › con el árbol limpio (un paso cerrado)', () => {
  it('corre la suite completa una vez y deja la huella verde', () => {
    const r = stop()
    expect(r.estado, r.stderr).toBe(0)
    expect(llamadas()).toEqual(['mapa', 'pnpm typecheck', 'pnpm lint', 'pnpm test', 'mapa --check'])
    expect(readFileSync(huellaGuardada(), 'utf8').trim()).toBe(
      execFileSync('bash', [HUELLA], { cwd: repo, encoding: 'utf8' }).trim(),
    )
  })

  it('el siguiente Stop con el árbol igual no repite la suite', () => {
    stop()
    const antes = llamadas().length
    expect(stop().estado).toBe(0)
    expect(llamadas()).toHaveLength(antes)
  })

  it('un rojo no deja la huella: el siguiente Stop vuelve a verificar', () => {
    expect(stop({}, { FAKE_FALLA: 'pnpm lint' }).estado).toBe(2)
    expect(existsSync(huellaGuardada())).toBe(false)
    stop()
    expect(llamadas().filter((l) => l === 'pnpm lint')).toHaveLength(2)
  })
})

describe('verificar-al-terminar.sh › el tope de 3 intentos', () => {
  beforeEach(ensuciar)

  it('al tercer intento seguido deja pasar y avisa, para que decida una persona', () => {
    const entorno = { FAKE_FALLA: 'pnpm typecheck' }
    expect(stop({}, entorno).estado).toBe(2)
    expect(stop({ stop_hook_active: true }, entorno).estado).toBe(2)
    const tercero = stop({ stop_hook_active: true }, entorno)
    expect(tercero.estado).toBe(0)
    expect(tercero.stdout).toContain('systemMessage')
    expect(tercero.stdout).toContain('2 intentos')
    expect(existsSync(join(repo, '.claude/.intentos-stop'))).toBe(false)
  })

  it('el contador es del repo de la entrada, no del de CLAUDE_PROJECT_DIR', () => {
    stop({}, { FAKE_FALLA: 'pnpm typecheck' })
    expect(readFileSync(join(repo, '.claude/.intentos-stop'), 'utf8').trim()).toBe('1')
    expect(existsSync(join(raiz, 'otro-proyecto'))).toBe(false)
  })

  it('un verde borra el contador', () => {
    stop({}, { FAKE_FALLA: 'pnpm typecheck' })
    stop({ stop_hook_active: true })
    expect(existsSync(join(repo, '.claude/.intentos-stop'))).toBe(false)
  })
})

describe('lint-archivo.sh › sigue el cwd de la entrada', () => {
  function lintear(archivo: string, cwd = repo) {
    const r = spawnSync('bash', [LINT], {
      cwd: raiz,
      input: JSON.stringify({
        hook_event_name: 'PostToolUse',
        cwd,
        tool_input: { file_path: archivo },
      }),
      encoding: 'utf8',
      env: {
        NODE_ENV: 'test',
        PATH: `${join(raiz, 'bin')}:${process.env['PATH'] ?? ''}`,
        CLAUDE_PROJECT_DIR: join(raiz, 'otro-proyecto'),
      },
    })
    return { estado: r.status, stderr: r.stderr }
  }

  it('lintea un archivo del repo de la entrada con eslint corrido en ese repo', () => {
    writeFileSync(
      join(raiz, 'bin/npx'),
      `#!/usr/bin/env bash\necho "npx $* (en $(pwd -P))" >> "${join(raiz, 'llamadas.txt')}"\n`,
    )
    expect(lintear(join(repo, 'src/a.ts')).estado).toBe(0)
    expect(llamadas()).toEqual([
      `npx eslint --max-warnings 0 --no-warn-ignored --fix ${join(repo, 'src/a.ts')} (en ${execFileSync('realpath', [repo], { encoding: 'utf8' }).trim()})`,
    ])
  })

  it('un archivo de afuera del repo no se lintea', () => {
    writeFileSync(join(raiz, 'ajeno.ts'), 'export {}\n')
    expect(lintear(join(raiz, 'ajeno.ts')).estado).toBe(0)
    expect(llamadas()).toEqual([])
  })
})
