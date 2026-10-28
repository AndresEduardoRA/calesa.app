import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import { definicionSql, definicionesEn, tablaSql, tablasEn } from './definicion-sql'

describe('definicion-sql', () => {
  it('lee el estilo escrito a mano y el del volcado, con cualquier etiqueta de dólar', () => {
    const sql = [
      'create or replace function public.x(p int) returns int language sql as $$ select p $$;',
      'select 1;',
      'CREATE OR REPLACE FUNCTION "public"."x"("p" integer) RETURNS integer',
      '    LANGUAGE "plpgsql"',
      '    AS $_$ begin return $$a$$::int; end $_$;',
    ].join('\n')
    const defs = definicionesEn(sql, 'x')
    expect(defs).toHaveLength(2)
    expect(defs[0]).toBe(
      'create or replace function public.x(p int) returns int language sql as $$ select p $$;',
    )
    expect(defs[1]).toContain('AS $_$ begin return $$a$$::int; end $_$;')
  })

  it('no confunde un nombre que empieza igual', () => {
    expect(
      definicionesEn(
        'create function public.xy() returns int language sql as $$ select 1 $$;',
        'x',
      ),
    ).toEqual([])
  })

  describe('entre migraciones', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'definicion-sql-'))
    afterAll(() => rmSync(raiz, { recursive: true, force: true }))
    mkdirSync(join(raiz, 'supabase/migrations'), { recursive: true })
    writeFileSync(
      join(raiz, 'supabase/migrations/20261028000000_base.sql'),
      'CREATE OR REPLACE FUNCTION "public"."f"() RETURNS integer LANGUAGE "sql" AS $$ select 1 $$;\n',
    )
    writeFileSync(
      join(raiz, 'supabase/migrations/20261029000000_cambio.sql'),
      'create or replace function public.f() returns integer language sql as $$ select 2 $$;\n',
    )

    it('vale la última, en orden de archivo', () => {
      expect(definicionSql('f', raiz)).toEqual({
        archivo: '20261029000000_cambio.sql',
        texto:
          'create or replace function public.f() returns integer language sql as $$ select 2 $$;',
      })
    })

    it('una función que nadie define es un error claro', () => {
      expect(() => definicionSql('nadie', raiz)).toThrow('ninguna migración define public.nadie')
    })
  })
})

describe('tablas', () => {
  it('lee la tabla entera con sus paréntesis anidados, en los dos estilos', () => {
    const sql = [
      "create table if not exists public.t (a int check (a > 0), b text check (b <> ')'));",
      'CREATE TABLE IF NOT EXISTS "public"."t" (',
      '    "a" integer NOT NULL,',
      '    CONSTRAINT "t_a" CHECK (("a" > (0)))',
      ');',
      'create table public.tt (a int);',
    ].join('\n')
    const defs = tablasEn(sql, 't')
    expect(defs).toHaveLength(2)
    expect(defs[0]).toContain("check (b <> ')')")
    expect(defs[1]).toContain('CHECK (("a" > (0)))')
    expect(defs[1]?.endsWith(');')).toBe(true)
  })

  it('vale la última entre las migraciones y una tabla que nadie crea es un error claro', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'tabla-sql-'))
    try {
      mkdirSync(join(raiz, 'supabase/migrations'), { recursive: true })
      writeFileSync(join(raiz, 'supabase/migrations/1_a.sql'), 'create table public.t (a int);\n')
      writeFileSync(
        join(raiz, 'supabase/migrations/2_b.sql'),
        'CREATE TABLE IF NOT EXISTS "public"."t" ("b" int);\n',
      )
      expect(tablaSql('t', raiz)).toEqual({
        archivo: '2_b.sql',
        texto: 'CREATE TABLE IF NOT EXISTS "public"."t" ("b" int);',
      })
      expect(() => tablaSql('nadie', raiz)).toThrow('ninguna migración crea la tabla public.nadie')
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })
})
