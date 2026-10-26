import { execFileSync, spawnSync } from 'node:child_process'
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
import { dirname, join, resolve } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

// `publicar.sh` es lo único que hace `git push` en el piloto, y sólo lo corre el bucle (a una sesión `bloquear-peligrosos.sh` se lo
// niega). Se prueba contra un repo temporal con un remoto local y un `gh` falso: main limpia y sin divergencia, el CI del push
// anterior en verde (si corre, se espera), y el SQL de seguridad del rango sólo con `aprobado-<paso>` de la persona.
const SCRIPT = resolve('scripts/piloto/publicar.sh')

let raiz = ''
let repo = ''
let remoto = ''
let comun = ''
let ayuda = ''
const raices: string[] = []

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@ejemplo.test', ...args], {
    cwd,
    encoding: 'utf8',
  }).trim()

function commitear(archivo: string, texto: string, mensaje = archivo) {
  mkdirSync(dirname(join(repo, archivo)), { recursive: true })
  writeFileSync(join(repo, archivo), texto)
  git(repo, 'add', '--', archivo)
  git(repo, 'commit', '-q', '-m', mensaje)
}

// El `gh` falso: `gh run list` imprime $FAKE_GH_LISTA, `gh run watch` sale con $FAKE_GH_WATCH, y cada llamada queda en llamadas-gh.txt.
function gh() {
  mkdirSync(join(raiz, 'bin'), { recursive: true })
  const archivo = join(raiz, 'bin/gh')
  writeFileSync(
    archivo,
    `#!/usr/bin/env bash
echo "$*" >> "${join(raiz, 'llamadas-gh.txt')}"
case "$1 $2" in
  "run list") printf '%s' "\${FAKE_GH_LISTA:-[]}" ;;
  "run watch") exit "\${FAKE_GH_WATCH:-0}" ;;
esac
`,
  )
  chmodSync(archivo, 0o755)
}

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'publicar-'))
  raices.push(raiz)
  remoto = join(raiz, 'remoto.git')
  repo = join(raiz, 'repo')
  comun = join(raiz, 'comun')
  mkdirSync(comun)
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remoto])
  execFileSync('git', ['init', '-q', '-b', 'main', repo])
  git(repo, 'remote', 'add', 'origin', remoto)
  commitear('README.md', 'x\n', 'inicio')
  git(repo, 'push', '-q', 'origin', 'main')
  ayuda = git(repo, 'rev-parse', 'HEAD')
  gh()
})
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

function publicar(paso = '4.99', extra: Record<string, string> = {}, desde = ayuda) {
  const r = spawnSync('bash', [SCRIPT, paso, desde], {
    cwd: repo,
    encoding: 'utf8',
    env: {
      NODE_ENV: 'test',
      PATH: `${join(raiz, 'bin')}:${process.env['PATH'] ?? ''}`,
      PILOTO_COMUN: comun,
      PILOTO_RAIZ: repo,
      ...extra,
    },
  })
  return { estado: r.status, salida: r.stdout + r.stderr }
}

const remotoEn = () => git(remoto, 'rev-parse', 'main')
const llamadasGh = () =>
  existsSync(join(raiz, 'llamadas-gh.txt'))
    ? readFileSync(join(raiz, 'llamadas-gh.txt'), 'utf8')
    : ''
const ci = (status: string, conclusion: string) =>
  JSON.stringify([{ databaseId: 77, status, conclusion, headSha: ayuda }])

describe('publicar.sh › el estado del repo', () => {
  it('main limpia, sin divergencia y sin CI previo: empuja', () => {
    commitear('src/a.ts', 'a\n')
    const r = publicar()
    expect(r.estado, r.salida).toBe(0)
    expect(remotoEn()).toBe(git(repo, 'rev-parse', 'HEAD'))
  })

  it('una rama que no es main no empuja', () => {
    git(repo, 'checkout', '-q', '-b', 'otra')
    commitear('src/a.ts', 'a\n')
    const r = publicar()
    expect(r.estado).toBe(1)
    expect(r.salida).toContain('main')
    expect(remotoEn()).toBe(ayuda)
  })

  it('un árbol sucio (cambio sin commitear o archivo nuevo) no empuja', () => {
    commitear('src/a.ts', 'a\n')
    writeFileSync(join(repo, 'src/a.ts'), 'cambiado\n')
    expect(publicar().estado).toBe(1)
    git(repo, 'checkout', '--', 'src/a.ts')
    writeFileSync(join(repo, 'nuevo.txt'), 'x')
    expect(publicar().estado).toBe(1)
    expect(remotoEn()).toBe(ayuda)
  })

  it('si origin/main tiene algo que no tenemos (divergencia) no empuja', () => {
    const otro = join(raiz, 'otro')
    execFileSync('git', ['clone', '-q', remoto, otro])
    writeFileSync(join(otro, 'otro.txt'), 'x')
    git(otro, 'add', '.')
    git(otro, 'commit', '-q', '-m', 'de otro')
    git(otro, 'push', '-q', 'origin', 'main')
    const desdeOtro = remotoEn()
    commitear('src/a.ts', 'a\n')
    const r = publicar()
    expect(r.estado).toBe(1)
    expect(r.salida).toMatch(/diverg|origin\/main/)
    expect(remotoEn()).toBe(desdeOtro)
  })
})

describe('publicar.sh › el CI del push anterior', () => {
  beforeEach(() => commitear('src/a.ts', 'a\n'))

  it('en verde: empuja sin esperar', () => {
    const r = publicar('4.99', { FAKE_GH_LISTA: ci('completed', 'success') })
    expect(r.estado, r.salida).toBe(0)
    expect(llamadasGh()).not.toContain('run watch')
  })

  it('en curso: espera con gh run watch y, si termina bien, empuja', () => {
    const r = publicar('4.99', { FAKE_GH_LISTA: ci('in_progress', ''), FAKE_GH_WATCH: '0' })
    expect(r.estado, r.salida).toBe(0)
    expect(llamadasGh()).toContain('run watch 77 --exit-status')
    expect(remotoEn()).toBe(git(repo, 'rev-parse', 'HEAD'))
  })

  it('en curso y termina en rojo: no empuja', () => {
    const r = publicar('4.99', { FAKE_GH_LISTA: ci('in_progress', ''), FAKE_GH_WATCH: '1' })
    expect(r.estado).toBe(1)
    expect(remotoEn()).toBe(ayuda)
  })

  it.each(['failure', 'cancelled', 'timed_out'])('terminado en «%s»: no empuja', (conclusion) => {
    const r = publicar('4.99', { FAKE_GH_LISTA: ci('completed', conclusion) })
    expect(r.estado).toBe(1)
    expect(r.salida).toContain('CI')
    expect(remotoEn()).toBe(ayuda)
  })
})

describe('publicar.sh › el SQL de seguridad necesita la aprobación de la persona', () => {
  it.each([
    ['una policy', 'create policy ver on public.leads for select using (true);'],
    ['RLS', 'alter table public.leads enable row level security;'],
    [
      'security definer',
      'create function f() returns int language sql security definer as $x$ select 1 $x$;',
    ],
    ['un grant', 'grant select on public.leads to authenticated;'],
    ['un revoke', 'revoke all on public.leads from anon;'],
    ['Vault', "select vault.create_secret('x', 'y');"],
  ])('%s sin aprobado-<paso>: no empuja', (_nombre, sql) => {
    commitear('supabase/migrations/20261020000000_x.sql', `${sql}\n`)
    const r = publicar('4.15')
    expect(r.estado).toBe(1)
    expect(r.salida).toContain('aprobado-4.15')
    expect(remotoEn()).toBe(ayuda)
  })

  it('con aprobado-<paso> empuja', () => {
    commitear('supabase/migrations/20261020000000_x.sql', 'create policy a on x using (true);\n')
    writeFileSync(join(comun, 'aprobado-4.15'), 'ok\n')
    expect(publicar('4.15').estado).toBe(0)
  })

  it('la aprobación de otro paso no vale', () => {
    commitear('supabase/migrations/20261020000000_x.sql', 'create policy a on x using (true);\n')
    writeFileSync(join(comun, 'aprobado-4.24'), 'ok\n')
    expect(publicar('4.15').estado).toBe(1)
  })

  it('SQL sin nada de seguridad (un índice) empuja sin aprobación', () => {
    commitear('supabase/migrations/20261020000000_x.sql', 'create index x on leads (id);\n')
    expect(publicar('4.15').estado).toBe(0)
  })

  it('sólo mira lo que el rango agregó: una policy vieja en un archivo tocado de paso no cuenta', () => {
    commitear(
      'supabase/migrations/20261001000000_vieja.sql',
      'create policy a on x using (true);\n',
    )
    git(repo, 'push', '-q', 'origin', 'main')
    const desde = git(repo, 'rev-parse', 'HEAD')
    commitear(
      'supabase/migrations/20261001000000_vieja.sql',
      'create policy a on x using (true);\nselect 1;\n',
    )
    expect(publicar('4.15', {}, desde).estado).toBe(0)
  })
})
