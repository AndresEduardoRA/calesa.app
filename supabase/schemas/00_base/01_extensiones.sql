-- Extensiones. En Supabase viven en el schema `extensions`.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;
-- pg_cron y pg_net las instala `migrations/20261013001000_storage_gc_funcion.sql`, sólo donde
-- están disponibles (el Postgres embebido de `pnpm db:probar` no las trae y usa dobles).
