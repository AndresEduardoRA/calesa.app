-- 4-40 (decidido el 2026-10-28): `anon` no toca `public`. Los privilegios por defecto de Supabase le dejaban EXECUTE en 32 funciones
-- (25 de trigger y 7 puras: `_lead_visible_para`, `_embudo_patron`, `claves_dato_requisito`, `enmascarar_telefono`,
-- `flujo_regla_activa`, `normalizar_telefono` y `slugificar`, las seis primeras se podían llamar por /rest/v1/rpc con la clave
-- publicable) y el uso de 15 secuencias, y le daban todo sobre cada objeto nuevo. Ninguna leía datos, pero eran superficie de más.
-- Lo que necesita `anon` vive en el esquema `web` (sus funciones corren como su dueño). Lo prueba `supabase/tests/privilegios-de-anon.sql`
-- (db:probar y el job `base` de CI).

-- 1) Lo que ya existe.
revoke execute on all functions in schema public from public, anon;
revoke all on all sequences in schema public from anon;
revoke all on all tables in schema public from anon;

-- `authenticated`, donde no corresponde: una función de trigger no se llama (dispararla no pide EXECUTE), y de una secuencia basta
-- `usage` para el `nextval` de un insert; `select` (currval) y `update` (setval) no los usa nadie.
do $$
declare f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p
           where p.pronamespace = 'public'::regnamespace and p.prorettype = 'trigger'::regtype loop
    execute format('revoke execute on function %s from authenticated', f);
  end loop;
end $$;
revoke select, update on all sequences in schema public from authenticated;

-- Lo explícito que hace falta: las 7 puras las usan `authenticated` (la policy `leads: leer`, el embudo, los candidatos de leads) y
-- `service_role`; ya tenían su grant, que no dependía de PUBLIC. Se repite para que no dependa de nada.
grant execute on function public._lead_visible_para(timestamptz, uuid[], public.alcance_permiso, uuid, uuid[]),
  public._embudo_patron(text), public.claves_dato_requisito(public.ambito_flujo), public.enmascarar_telefono(text),
  public.flujo_regla_activa(uuid, text), public.normalizar_telefono(text, text), public.slugificar(text)
  to authenticated, service_role;

-- 2) Lo que se cree después (las migraciones corren como `postgres`): por esquema se quita lo que Supabase da a `anon` en `public`, y a
-- `authenticated` lo que nunca le corresponde; lo demás lo sigue quitando y dando cada migración (`.claude/rules/migraciones.md` ›
-- «Privilegios»). El EXECUTE de PUBLIC en una función nueva no se toca aquí: es un privilegio por defecto global de Postgres (por
-- esquema no se puede quitar), y quitarlo para todo lo que crea `postgres` alcanzaba a los otros esquemas y a las funciones temporales
-- de las pruebas. Lo sigue quitando cada función nueva (`revoke … from public, anon`), y si una lo olvida, cae
-- `supabase/tests/privilegios-de-anon.sql`.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables from authenticated;
alter default privileges for role postgres in schema public revoke select, update on sequences from authenticated;
