-- Extensiones. En Supabase viven en el schema `extensions`.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;
-- pg_cron y pg_net se habilitan desde el Dashboard (Database › Extensions); las migraciones
-- que los usan comprueban su presencia antes de programar nada.
