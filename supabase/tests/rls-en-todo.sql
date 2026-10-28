-- Ninguna tabla de `public` sin RLS. Era el bloque final de la migración de RLS y grants, que corría al migrar; desde el aplastado
-- (2026-10-28) las tablas nuevas llegan en migraciones nuevas, y esto lo comprueba después de aplicarlas todas. En la base real lo
-- dice también splinter (`rls_disabled_in_public`, en el job `base` de CI).

-- @test ninguna tabla de public sin RLS
do $$
declare t text;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity order by 1 loop
    raise exception 'Tabla sin RLS: public.%', t;
  end loop;
end $$;
