import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { nivelDe } from './nivel.mjs'

// `nivel.mjs` dice el nivel de verificación de un conjunto de archivos con los seis disparadores del Nivel 2 de
// `.claude/rules/e2e.md` (y ningún otro), si el rango toca interfaz (para los e2e de celular) y, aparte, si cambió `database.types.ts`.
const sinContenido = () => ''
const ids = (archivos: string[], leer: (a: string) => string | null = sinContenido) =>
  nivelDe(archivos, leer).disparadores.map((d) => d.id)

describe('nivel.mjs › los seis disparadores del Nivel 2', () => {
  it.each([
    ['src/shared/ui/boton.tsx', 'shared'],
    ['src/shared/lib/formato.ts', 'shared'],
    ['src/proxy.ts', 'proxy'],
    ['src/modules/equipo/features/auth/actions/entrar.ts', 'auth'],
    ['src/app/auth/callback/route.ts', 'auth'],
    ['src/app/(acceso)/entrar/page.tsx', 'auth'],
    ['src/app/layout.tsx', 'layout'],
    ['src/app/(app)/layout.tsx', 'layout'],
    ['src/app/(app)/_shell/menu.tsx', 'layout'],
    ['supabase/schemas/leads/tablas.sql', 'base'],
    ['supabase/migrations/20261011000000_esquema_base.sql', 'base'],
  ])('%s dispara «%s»', (archivo, id) => {
    expect(ids([archivo])).toEqual([id])
  })

  it('el layout de (acceso) cuenta como auth y como layout', () => {
    expect(ids(['src/app/(acceso)/layout.tsx'])).toEqual(['auth', 'layout'])
  })

  it('devuelve el nivel 2 y qué archivos dispararon cada uno', () => {
    const r = nivelDe(
      ['docs/ESTADO.md', 'src/proxy.ts', 'src/shared/ui/a.tsx', 'src/shared/ui/b.tsx'],
      sinContenido,
    )
    expect(r.nivel).toBe(2)
    expect(r.disparadores).toEqual([
      { id: 'shared', archivos: ['src/shared/ui/a.tsx', 'src/shared/ui/b.tsx'] },
      { id: 'proxy', archivos: ['src/proxy.ts'] },
    ])
  })

  it.each([
    ['docs/ESTADO.md'],
    ['src/modules/leads/entities/permisos.ts'],
    ['src/modules/leads/features/tabla/x.tsx'],
    ['src/app/(app)/leads/page.tsx'],
    ['src/app/(app)/leads/layout.tsx'],
    ['src/shared/types/database.types.ts'],
    ['supabase/migrations/20261020000000_indice.sql'],
    ['supabase/tests/humo.sql'],
    ['e2e/leads.spec.ts'],
    ['scripts/mapa.sh'],
  ])('%s solo no es un disparador: nivel 1', (archivo) => {
    expect(nivelDe([archivo], sinContenido).nivel).toBe(1)
  })
})

describe('nivel.mjs › RLS se lee por contenido', () => {
  const migracion = 'supabase/migrations/20261020000000_cambio.sql'
  const con = (sql: string) => ids([migracion], () => sql)

  it.each([
    'create policy "ver" on public.leads for select using (true);',
    'CREATE POLICY ver ON leads FOR SELECT USING (true);',
    'alter policy ver on public.leads using (false);',
    'drop policy if exists ver on public.leads;',
    'alter table public.leads enable row level security;',
    'ALTER TABLE leads\n  ENABLE ROW LEVEL SECURITY;',
    'create table x (id int);\ncreate policy a on x for all using (true);',
  ])('dispara: %s', (sql) => {
    expect(con(sql)).toEqual(['rls'])
  })

  it.each([
    'create index x on leads (id);',
    'grant select on leads to authenticated;',
    '-- comentario sobre una policy vieja\nselect 1;',
    'alter table leads add column x int;',
    'create function f() returns int language sql as $$ select 1 $$;',
  ])('no dispara: %s', (sql) => {
    expect(con(sql)).toEqual([])
  })

  it('una migración borrada (sin contenido) no dispara', () => {
    expect(ids([migracion], () => null)).toEqual([])
  })

  it('el esquema base dispara «base» y, si lleva policies, también «rls»', () => {
    const base = 'supabase/migrations/20261011000000_esquema_base.sql'
    expect(ids([base], () => 'create policy a on x using (true);')).toEqual(['rls', 'base'])
    expect(ids([base], sinContenido)).toEqual(['base'])
  })
})

describe('nivel.mjs › database.types.ts se informa aparte', () => {
  it('no es un disparador de src/shared, pero se dice que cambió', () => {
    const r = nivelDe(['src/shared/types/database.types.ts'], sinContenido)
    expect(r).toMatchObject({ nivel: 1, disparadores: [], database_types: true })
  })

  it('sin ese archivo, database_types es falso', () => {
    expect(nivelDe(['src/proxy.ts'], sinContenido).database_types).toBe(false)
  })
})

describe('nivel.mjs › toca_interfaz decide si los e2e dirigidos corren también en celular', () => {
  it.each([
    'src/shared/ui/boton.tsx',
    'src/modules/leads/features/tabla/tabla.tsx',
    'src/app/(app)/leads/page.tsx',
    'src/app/(app)/leads/loading.tsx',
    'src/app/globals.css',
    'design/tokens.css',
    'src/modules/leads/pantallas/listado.ts',
    'public/manifest.webmanifest',
  ])('%s toca interfaz', (archivo) => {
    const r = nivelDe([archivo], sinContenido)
    expect(r.toca_interfaz).toBe(true)
    expect(r.interfaz).toEqual([archivo])
  })

  it.each([
    'src/modules/leads/entities/permisos.ts',
    'src/modules/leads/infra/leads.ts',
    'src/modules/leads/features/tabla/tabla.test.tsx',
    'src/shared/lib/formato.ts',
    'src/proxy.ts',
    'src/shared/types/database.types.ts',
    'e2e/leads.spec.ts',
    'docs/ESTADO.md',
    'supabase/migrations/20261020000000_indice.sql',
    'scripts/piloto/nivel.mjs',
  ])('%s no toca interfaz', (archivo) => {
    expect(nivelDe([archivo], sinContenido).toca_interfaz).toBe(false)
  })

  it('una prueba de componente (.test.tsx) no es interfaz, un componente sí', () => {
    const r = nivelDe(['src/a/b.test.tsx', 'src/a/b.tsx'], sinContenido)
    expect(r.interfaz).toEqual(['src/a/b.tsx'])
  })

  // La regla vive en `.claude/rules/e2e.md` y nivel.mjs sólo la aplica: si la lista de una y la del otro se separan, cae.
  describe('la regla está escrita en un solo lugar: .claude/rules/e2e.md', () => {
    const regla = readFileSync(resolve('.claude/rules/e2e.md'), 'utf8')
    const codigo = readFileSync(resolve('scripts/piloto/nivel.mjs'), 'utf8')

    it('nivel.mjs cita la regla por su título, que es el de e2e.md', () => {
      const titulo = 'Interfaz: cuándo los e2e dirigidos corren también en `movil`'
      expect(regla).toContain(`**${titulo}**`)
      // El comentario se parte en líneas: se junta antes de buscar el título.
      expect(codigo.replace(/\n\/\/ /g, ' ')).toContain(`.claude/rules/e2e.md\` › «${titulo}»`)
    })

    it.each([
      'design/',
      'public/',
      'src/app/',
      'src/shared/ui/',
      'src/modules/<módulo>/pantallas/',
      '.tsx',
      '.css',
    ])('la regla nombra %s', (parte) => {
      expect(regla).toContain(parte)
    })

    it.each([
      'design/x.css',
      'public/x.png',
      'src/app/x.ts',
      'src/shared/ui/x.ts',
      'src/modules/m/pantallas/x.ts',
      'src/m/x.tsx',
      'src/m/x.css',
    ])('%s es interfaz', (archivo) => {
      expect(nivelDe([archivo], sinContenido).toca_interfaz).toBe(true)
    })
  })
})

describe('nivel.mjs › la línea de comandos', () => {
  const SCRIPT = resolve('scripts/piloto/nivel.mjs')
  const raices: string[] = []
  afterAll(() => {
    for (const r of raices) rmSync(r, { recursive: true, force: true })
  })

  const correr = (cwd: string, ...args: string[]) =>
    JSON.parse(
      spawnSync('node', [SCRIPT, ...args], { cwd, encoding: 'utf8' }).stdout,
    ) as ReturnType<typeof nivelDe>

  it('sin --rango, todos los argumentos son archivos (también el primero)', () => {
    const r = correr(tmpdir(), 'src/proxy.ts', 'docs/ESTADO.md')
    expect(r.archivos).toEqual(['src/proxy.ts', 'docs/ESTADO.md'])
    expect(r.disparadores.map((d) => d.id)).toEqual(['proxy'])
  })

  it('con --rango lee los archivos del diff y el contenido de las migraciones del final del rango', () => {
    const repo = mkdtempSync(join(tmpdir(), 'nivel-'))
    raices.push(repo)
    const git = (...args: string[]) =>
      execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@ejemplo.test', ...args], {
        cwd: repo,
        encoding: 'utf8',
      }).trim()
    const escribir = (ruta: string, texto: string) => {
      mkdirSync(dirname(join(repo, ruta)), { recursive: true })
      writeFileSync(join(repo, ruta), texto)
    }
    git('init', '-q', '-b', 'main')
    escribir('README.md', 'x')
    git('add', '.')
    git('commit', '-q', '-m', 'inicio')
    const desde = git('rev-parse', 'HEAD')
    escribir(
      'supabase/migrations/20261020000000_x.sql',
      'create policy ver on leads using (true);\n',
    )
    escribir('src/modules/leads/features/tabla.tsx', 'export {}\n')
    git('add', '.')
    git('commit', '-q', '-m', 'cambio')
    const r = correr(repo, '--rango', `${desde}..HEAD`)
    expect(r.nivel).toBe(2)
    expect(r.disparadores.map((d) => d.id)).toEqual(['rls'])
    expect(r.toca_interfaz).toBe(true)
    expect([...r.archivos].sort()).toEqual([
      'src/modules/leads/features/tabla.tsx',
      'supabase/migrations/20261020000000_x.sql',
    ])
  })
})
