import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { urlLocal } from '../despliegue/avisos'

// El despliegue en seco (`scripts/despliegue/`, 9.13-2) es sólo local: ninguna orden contra el proyecto remoto, ninguna API de gestión,
// ninguna credencial nombrada, ninguna base que no sea local. Se lee línea por línea, comentarios incluidos (un comentario se copia a un
// comando). Los `*.test.ts` no corren en el guion y llevan URLs remotas a propósito: son los casos que prueban que el revisor las rechaza.
// Este archivo nombra las órdenes que el hook de Bash veta: se edita con Write o Edit, nunca desde un comando.
const CARPETA = join(process.cwd(), 'scripts/despliegue')
const GUION = 'en-seco.sh'

type Regla = { motivo: string; cae: (linea: string, archivo: string) => boolean }

const patron =
  (re: RegExp) =>
  (linea: string): boolean =>
    re.test(linea)

const esComentario = (linea: string) => /^\s*(#|\/\/|\*|\/\*)/.test(linea)

const REGLAS: Regla[] = [
  {
    motivo: 'la bandera de proyecto enlazado o de ref apunta al remoto',
    cae: patron(/--linked\b|--project-ref\b/),
  },
  {
    motivo: 'empujar migraciones o configuración es de la persona',
    cae: patron(/\b(db|config)\s+push\b/),
  },
  { motivo: 'desplegar funciones es de la persona', cae: patron(/\bfunctions\s+deploy\b/) },
  {
    motivo: 'los secretos y el enlace de la CLI tocan el proyecto remoto',
    cae: patron(/\bsupabase\s+(secrets|link)\b/),
  },
  { motivo: 'la CLI de la plataforma de la app despliega', cae: patron(/\bvercel\b/) },
  {
    motivo: 'una API de gestión o un proyecto de la nube',
    cae: patron(/\bapi\.supabase\.com\b|\bapi\.vercel\.com\b|\.supabase\.co\b/),
  },
  { motivo: 'una credencial nombrada', cae: patron(/\b[A-Z][A-Z0-9_]*_TOKEN\b/) },
  { motivo: 'un pedido de red', cae: patron(/\bfetch\(/) },
  {
    motivo: 'la CLI de Supabase directa: va por pnpm db:* (candado y .env.carril)',
    cae: patron(/(^\s*|[;&|(]\s*|\$\(\s*|\bexec\s+|\bnpx\s+|\bdlx\s+)supabase\s/),
  },
  {
    motivo: 'una URL de Postgres que no es local (o con parámetros)',
    cae: (linea) =>
      [...linea.matchAll(/postgres(?:ql)?:\/\/[^\s'"`]+/g)].some((m) => !urlLocal(m[0]).ok),
  },
  {
    motivo: 'env:check de producción corre sin entorno (env -i), así no lee credenciales',
    cae: (linea, archivo) =>
      archivo === GUION &&
      !esComentario(linea) &&
      /(\bpnpm\s+env:check|scripts\/env-check\.ts)\s+produccion\b/.test(linea) &&
      !/^\s*env -i /.test(linea),
  },
]

function violaciones(archivo: string, texto: string): string[] {
  return texto
    .split('\n')
    .flatMap((linea, i) =>
      REGLAS.filter((r) => r.cae(linea, archivo)).map(
        (r) => `${archivo}:${String(i + 1)}: ${r.motivo}`,
      ),
    )
}

describe('el despliegue en seco no toca la nube', () => {
  const archivos = readdirSync(CARPETA).filter((n) => !n.endsWith('.test.ts'))

  it('la carpeta tiene el guion y el revisor (la guarda no mira una carpeta vacía)', () => {
    expect(archivos).toEqual(expect.arrayContaining([GUION, 'revisar-base.mjs']))
  })

  it('ningún archivo de scripts/despliegue/ tiene una orden contra el remoto', () => {
    expect(archivos.flatMap((n) => violaciones(n, readFileSync(join(CARPETA, n), 'utf8')))).toEqual(
      [],
    )
  })

  it('el guion corre env:check de producción, y sin entorno', () => {
    expect(readFileSync(join(CARPETA, GUION), 'utf8')).toMatch(
      /^\s*env -i PATH="\$PATH" HOME="\$HOME" pnpm env:check produccion /m,
    )
  })
})

describe('cada regla cae con su caso y no con uno parecido', () => {
  const casos: [string, string, string][] = [
    ['pnpm exec supabase migration list --linked', 'pnpm db:reset', 'la bandera de proyecto'],
    ['supabase db push --dry-run', 'pnpm db:probar # sin push', 'empujar migraciones'],
    ['npx supabase config push', 'cat supabase/config.toml', 'empujar migraciones'],
    ['supabase functions deploy push', 'ls supabase/functions/push', 'desplegar funciones'],
    [
      'supabase secrets list',
      'grep secretos supabase/tests/advisors.sql',
      'los secretos y el enlace',
    ],
    ['vercel env pull', 'las variables de Vercel (docs/ENTORNOS.md)', 'la CLI de la plataforma'],
    ['curl https://api.supabase.com/v1/projects', 'supabase/config.toml', 'una API de gestión'],
    ['echo "$VERCEL_TOKEN"', 'echo "$SUPABASE_DB_LOCAL"', 'una credencial nombrada'],
    ['await fetch(url)', 'const prefetch = 1', 'un pedido de red'],
    ['  supabase db reset', '  bash scripts/candado.sh db:reset', 'la CLI de Supabase directa'],
    [
      'postgresql://u:p@db.ejemplo.com:5432/postgres',
      'postgresql://postgres:postgres@127.0.0.1:54822/postgres',
      'una URL de Postgres',
    ],
    [
      'postgresql://u:p@127.0.0.1:5432/postgres?host=otro',
      'postgres://u:p@localhost:5432/postgres',
      'una URL de Postgres',
    ],
  ]
  it.each(casos)('«%s» cae y «%s» no', (cae, noCae, motivo) => {
    expect(violaciones('x.mjs', cae).join('\n')).toContain(motivo)
    expect(violaciones('x.mjs', noCae)).toEqual([])
  })

  it('env:check de producción sin env -i cae sólo en el guion, y no en un comentario', () => {
    expect(violaciones(GUION, 'pnpm env:check produccion > a.txt').join()).toContain(
      'env:check de producción',
    )
    expect(
      violaciones(GUION, '  env -i PATH="$PATH" HOME="$HOME" pnpm env:check produccion > a.txt'),
    ).toEqual([])
    expect(violaciones(GUION, '# pnpm env:check produccion lo corre la persona')).toEqual([])
  })
})
