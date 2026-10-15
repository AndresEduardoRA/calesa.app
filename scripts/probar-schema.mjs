// Aplica supabase/schemas + migrations + seed.sql en un Postgres embebido (PGlite 0.5: Postgres 18,
// uno más que la base real: nada de sintaxis nueva) con stubs de auth/storage/pgcrypto/vault/cron/net y corre supabase/tests/humo.sql. Uso: node scripts/probar-schema.mjs supabase
// No reemplaza a `supabase db reset` ni a splinter: es la red rápida del pre-commit.
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { citext } from '@electric-sql/pglite/contrib/citext'
import fs from 'node:fs'
import path from 'node:path'
import { NOMBRE_BASE, esquemaBaseAlDia } from './esquema-base.mjs'

const base = process.argv[2] ?? 'supabase'
const db = new PGlite({ extensions: { pg_trgm, citext } })

const preambulo = `
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;
-- stubs de pgcrypto (no disponible en PGlite)
create or replace function extensions.gen_salt(t text) returns text language sql as $$ select '$stub$' $$;
create or replace function extensions.gen_salt(t text, c int) returns text language sql as $$ select '$stub$' $$;
create or replace function extensions.crypt(p text, s text) returns text language sql as $$ select '$stub$' || md5(p || '$stub$') $$;
create or replace function extensions.gen_random_bytes(n int) returns bytea language sql as $$
  select substring(decode(string_agg(md5(random()::text), ''), 'hex') from 1 for n) from generate_series(1, (n + 15) / 16) $$;
-- roles de Supabase
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
-- auth y storage
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text, raw_user_meta_data jsonb default '{}'::jsonb, raw_app_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;
grant execute on all functions in schema extensions to anon, authenticated, service_role;
create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;
create table if not exists storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb, created_at timestamptz default now());
-- Como en Supabase: RLS encendida y la tabla al alcance de los roles de la app. Sin esto las
-- policies de storage existirían pero el humo nunca las ejercitaría.
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
create or replace function storage.foldername(n text) returns text[] language sql immutable as $$ select (string_to_array(n, '/'))[1:array_length(string_to_array(n,'/'),1)-1] $$;
-- Vault (extensión supabase_vault, que PGlite no trae): sólo lo que usan nuestras RPC, sin cifrar.
-- Prueba nuestra lógica y nuestros grants; los privilegios reales de Vault los cubre el e2e.
create schema if not exists vault;
create table if not exists vault.secrets (
  id uuid primary key default gen_random_uuid(), name text unique, description text default '',
  secret text not null, created_at timestamptz default now(), updated_at timestamptz default now()
);
create or replace view vault.decrypted_secrets as
  select id, name, description, secret, secret as decrypted_secret, created_at, updated_at from vault.secrets;
create or replace function vault.create_secret(new_secret text, new_name text default null, new_description text default '', new_key_id uuid default null)
  returns uuid language sql as $$ insert into vault.secrets (secret, name, description) values (new_secret, new_name, new_description) returning id $$;
create or replace function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null, new_description text default null, new_key_id uuid default null)
  returns void language sql as $$ update vault.secrets set secret = coalesce(new_secret, secret), name = coalesce(new_name, name), description = coalesce(new_description, description), updated_at = now() where id = secret_id $$;
-- pg_cron y pg_net (PGlite no las trae): sólo lo que usan nuestras funciones. Los jobs quedan
-- anotados y los pedidos HTTP no salen: se guardan para que humo mire qué se habría mandado.
create schema if not exists cron;
create table if not exists cron.job (jobid bigint generated always as identity primary key, jobname text unique, schedule text not null, command text not null);
create or replace function cron.schedule(job_name text, schedule text, command text) returns bigint language sql as $$
  insert into cron.job (jobname, schedule, command) values (job_name, schedule, command)
  on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command returning jobid $$;
create or replace function cron.unschedule(job_name text) returns boolean language sql as $$
  with borrado as (delete from cron.job where jobname = job_name returning 1) select exists (select 1 from borrado) $$;
create schema if not exists net;
create table if not exists net.pedidos (id bigint generated always as identity primary key, url text, body jsonb, headers jsonb, timeout_milliseconds int);
create or replace function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb, headers jsonb default '{}'::jsonb, timeout_milliseconds int default 5000)
  returns bigint language sql as $$ insert into net.pedidos (url, body, headers, timeout_milliseconds) values (url, body, headers, timeout_milliseconds) returning id $$;
grant usage on schema public to anon, authenticated, service_role;
`

function* archivos(dir) {
  for (const e of fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* archivos(p)
    else if (e.name.endsWith('.sql')) yield p
  }
}

// La migración base es la copia generada de schemas/ (lo que aplica `supabase db reset`). Acá se
// aplica schemas/ directo, así que se salta; pero si quedó vieja, la base local no es lo que se probó.
if (!esquemaBaseAlDia(base)) {
  console.error(
    `✗ migrations/${NOMBRE_BASE} está desactualizada respecto de schemas/. Corre: pnpm db:base`,
  )
  process.exit(1)
}
const migraciones = [...archivos(path.join(base, 'migrations'))].filter(
  (f) => path.basename(f) !== NOMBRE_BASE,
)
const lista = [...archivos(path.join(base, 'schemas')), ...migraciones]
if (fs.existsSync(path.join(base, 'seed.sql'))) lista.push(path.join(base, 'seed.sql'))

await db.exec(preambulo)
let ok = 0
for (const f of lista) {
  let sql = fs.readFileSync(f, 'utf8')
  // en producción las extensiones ya existen; en el test las saltamos
  if (f.endsWith('01_extensiones.sql')) continue
  try {
    await db.exec(sql)
    ok++
  } catch (e) {
    console.error(`✗ ${path.relative(base, f)}\n  ${e.message}`)
    const pos = e.position ? Number(e.position) : null
    if (pos)
      console.error(
        '  …' + sql.slice(Math.max(0, pos - 160), pos + 80).replace(/\n/g, '\n  ') + '…',
      )
    process.exit(1)
  }
}
console.log(`✓ ${ok} archivos aplicados`)

// Pruebas: el humo y, después, lo que se apoya en su base (la matriz de leads y el cinturón de la
// auditoría). Cada archivo se parte en bloques `-- @test <nombre>` y corre en la misma base.
for (const archivo of [
  'humo.sql',
  'matriz-leads.sql',
  'portal-cliente.sql',
  'auditoria-leads.sql',
]) {
  const t = path.join(base, 'tests', archivo)
  if (!fs.existsSync(t)) continue
  const bloques = fs
    .readFileSync(t, 'utf8')
    .split(/^-- @test\s+/m)
    .filter(Boolean)
  for (const b of bloques) {
    const [nombre, ...resto] = b.split('\n')
    try {
      await db.exec(resto.join('\n'))
      console.log('  ✓ ' + nombre.trim())
    } catch (e) {
      console.error('  ✗ ' + nombre.trim() + '\n    ' + e.message)
      process.exitCode = 1
    }
  }
}
await db.close()
