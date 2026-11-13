-- Los avisos de splinter (`scripts/splinter.sql`, los advisors de Supabase) sobre el esquema de la prueba, contra su lista con motivo
-- (`supabase/tests/advisors-con-motivo.json`). 9.13-1. `db:probar` carga, antes de este archivo:
--   _avisos (doc jsonb): una fila por aviso, `{ name, level, cache_key, detail, schema }`, con `pgrst.db_schemas` = los `[api] schemas` de
--     `config.toml` (también `web`, la superficie pública; sin la variable splinter sólo mira `public`).
--   _avisos_con_motivo (doc jsonb): la lista. `avisos` acepta uno por su `cache_key` exacto; `comodines`, un lint entero (sólo los de abajo);
--   `fuera`, un lint que no se compara (sólo los de abajo); `db_lint`, los avisos de `pnpm db:lint` por función (los compara la 9.13-2).
-- La regla:
--   - un ERROR cae siempre; la única excepción, escrita aquí y no en el JSON: `security_definer_view` de una vista del esquema `web` con su
--     clave exacta en la lista (las vistas `web.*` son la frontera pública por diseño: `src/modules/web/CLAUDE.md` › «No se rompe»);
--   - todo WARN y toda FK sin índice (INFO, no depende de estadísticas) necesita su entrada exacta o un comodín válido;
--   - una entrada exacta que no aparece aquí no cae: puede ser de la base real (pg_graphql no está en PGlite); ese sentido es de la 9.13-2.
-- Ningún esquema se excluye: medido en 9.13-1, los dobles del preámbulo (auth, storage, vault, cron, net, extensions, pgcrypto_real) no dan
-- ningún aviso, y `public_bucket_allows_listing` vive en `storage`.
-- Corre primero en la lista de `db:probar`: `function_search_path_mutable` no excluye `pg_temp`.

-- @test advisors: splinter corre sobre el esquema y la lista tiene forma
create or replace function pg_temp._comodines_validos() returns text[] language sql immutable as $$
  select array['authenticated_security_definer_function_executable', 'pg_graphql_authenticated_table_exposed']
$$;
create or replace function pg_temp._fuera_validos() returns text[] language sql immutable as $$
  select array['table_bloat', 'unused_index', 'extension_versions_outdated']
$$;
-- Los lints de `scripts/splinter.sql` (`grep "as name" scripts/splinter.sql`): un lint de la lista que no sea uno de estos es un error de tipeo.
create or replace function pg_temp._lints_de_splinter() returns text[] language sql immutable as $$
  select array['unindexed_foreign_keys', 'auth_users_exposed', 'auth_rls_initplan', 'no_primary_key', 'unused_index',
    'multiple_permissive_policies', 'policy_exists_rls_disabled', 'rls_enabled_no_policy', 'duplicate_index', 'security_definer_view',
    'function_search_path_mutable', 'rls_disabled_in_public', 'extension_in_public', 'rls_references_user_metadata', 'materialized_view_in_api',
    'foreign_table_in_api', 'unsupported_reg_types', 'insecure_queue_exposed_in_api', 'table_bloat', 'fkey_to_auth_unique',
    'extension_versions_outdated', 'sensitive_columns_exposed', 'rls_policy_always_true', 'public_bucket_allows_listing',
    'pg_graphql_anon_table_exposed', 'pg_graphql_authenticated_table_exposed', 'anon_security_definer_function_executable',
    'authenticated_security_definer_function_executable', 'autovacuum_disabled']
$$;

-- Lo que la lista no puede tener: un comodín o un excluido fuera de los de arriba, una entrada repetida, un lint que splinter no tiene, un
-- campo que falta o un motivo de menos de 40 caracteres (el mínimo de las guardas del repo).
create or replace function pg_temp._lista_invalida(p_lista jsonb) returns setof text language sql as $$
  select 'comodín no permitido: ' || (c ->> 'lint') from jsonb_array_elements(p_lista -> 'comodines') c
   where (c ->> 'lint') is null or not (c ->> 'lint') = any (pg_temp._comodines_validos())
  union all
  select 'excluido no permitido: ' || (f ->> 'lint') from jsonb_array_elements(p_lista -> 'fuera') f
   where (f ->> 'lint') is null or not (f ->> 'lint') = any (pg_temp._fuera_validos())
  union all
  select 'repetido: ' || l || ' · ' || coalesce(k, '') from (
    select a ->> 'lint' l, a ->> 'clave' k from jsonb_array_elements(p_lista -> 'avisos') a
  ) x group by l, k having count(*) > 1
  union all
  select 'lint que splinter no tiene: ' || coalesce(e ->> 'lint', '(nulo)')
    from jsonb_array_elements(coalesce(p_lista -> 'avisos', '[]') || coalesce(p_lista -> 'comodines', '[]') || coalesce(p_lista -> 'fuera', '[]')) e
   where (e ->> 'lint') is null or not (e ->> 'lint') = any (pg_temp._lints_de_splinter())
  union all
  select 'sin clave o sin motivo de 40: ' || coalesce(a ->> 'lint', '(nulo)') || ' · ' || coalesce(a ->> 'clave', '(nula)')
    from jsonb_array_elements(p_lista -> 'avisos') a
   where coalesce(a ->> 'clave', '') = '' or char_length(coalesce(a ->> 'motivo', '')) < 40
  union all
  select 'sin motivo de 40: ' || coalesce(e ->> 'lint', '(nulo)')
    from (select jsonb_array_elements(p_lista -> 'comodines') e union all select jsonb_array_elements(p_lista -> 'fuera')) x
   where char_length(coalesce(e ->> 'motivo', '')) < 40
  union all
  select 'db_lint sin patrón o sin motivo de 40: ' || coalesce(d ->> 'patron', '(nulo)')
    from jsonb_array_elements(p_lista -> 'db_lint') d
   where coalesce(d ->> 'patron', '') = '' or char_length(coalesce(d ->> 'motivo', '')) < 40
  union all
  select 'falta la clave ' || k from unnest(array['avisos', 'comodines', 'fuera', 'db_lint']) k
   where jsonb_typeof(p_lista -> k) is distinct from 'array'
$$;

-- Los avisos que no tienen motivo, uno por línea: `lint · clave · detalle`.
create or replace function pg_temp._avisos_sin_motivo(p_avisos jsonb, p_lista jsonb) returns setof text language sql as $$
  with a as (
    select x ->> 'name' lint, x ->> 'level' nivel, x ->> 'cache_key' clave, x ->> 'schema' esquema, x ->> 'detail' detalle
      from jsonb_array_elements(p_avisos) x
  ), exactas as (
    select e ->> 'lint' lint, e ->> 'clave' clave from jsonb_array_elements(p_lista -> 'avisos') e
  ), comodines as (
    select c ->> 'lint' lint from jsonb_array_elements(p_lista -> 'comodines') c where (c ->> 'lint') = any (pg_temp._comodines_validos())
  ), fuera as (
    select f ->> 'lint' lint from jsonb_array_elements(p_lista -> 'fuera') f where (f ->> 'lint') = any (pg_temp._fuera_validos())
  )
  select a.lint || ' · ' || a.clave || ' · ' || coalesce(a.detalle, '')
    from a
   where case
           when a.nivel = 'ERROR' then
             not (a.lint = 'security_definer_view' and a.esquema = 'web'
                  and exists (select 1 from exactas e where e.lint = a.lint and e.clave = a.clave))
           when a.nivel = 'WARN' or a.lint = 'unindexed_foreign_keys' then
             not exists (select 1 from fuera f where f.lint = a.lint)
             and not exists (select 1 from exactas e where e.lint = a.lint and e.clave = a.clave)
             and not exists (select 1 from comodines c where c.lint = a.lint)
           else false
         end
   order by 1
$$;

do $$
declare v_lista jsonb := (select doc from _avisos_con_motivo); v_errores text;
begin
  if (select count(*) from _avisos) = 0 then raise exception 'splinter no devolvió ningún aviso: la carga no corrió'; end if;
  if (select count(*) from _avisos where doc ->> 'cache_key' is null or doc ->> 'name' is null or doc ->> 'level' is null) > 0 then
    raise exception 'hay avisos sin name, level o cache_key';
  end if;
  select string_agg(e, E'\n') into v_errores from pg_temp._lista_invalida(v_lista) e where e like 'falta la clave%' or e like 'sin %' or e like 'db_lint%';
  if v_errores is not null then raise exception E'la lista no tiene forma:\n%', v_errores; end if;
end $$;

-- @test advisors: ningún aviso ERROR (salvo las vistas de web con su motivo)
do $$
declare v text;
begin
  select string_agg(e, E'\n') into v
    from pg_temp._avisos_sin_motivo((select jsonb_agg(doc) from _avisos where doc ->> 'level' = 'ERROR'), (select doc from _avisos_con_motivo)) e;
  if v is not null then raise exception E'avisos ERROR de splinter:\n%', v; end if;
end $$;

-- @test advisors: todo WARN y toda FK sin índice tiene su motivo
do $$
declare v text; r record;
begin
  for r in select doc ->> 'level' nivel, doc ->> 'name' lint, count(*) n from _avisos group by 1, 2 order by 1, 2 loop
    raise notice 'splinter: % % %', r.n, r.nivel, r.lint;
  end loop;
  select string_agg(e, E'\n') into v
    from pg_temp._avisos_sin_motivo((select jsonb_agg(doc) from _avisos where doc ->> 'level' <> 'ERROR'), (select doc from _avisos_con_motivo)) e;
  if v is not null then
    raise exception E'avisos de splinter sin motivo (arréglalos o agrégalos a supabase/tests/advisors-con-motivo.json con su porqué):\n%', v;
  end if;
end $$;

-- @test advisors: comodines y excluidos son sólo los de la regla, sin repetidos ni lints inventados
do $$
declare v text;
begin
  select string_agg(e, E'\n') into v from pg_temp._lista_invalida((select doc from _avisos_con_motivo)) e;
  if v is not null then raise exception E'la lista de avisos con motivo no cumple la regla:\n%', v; end if;
end $$;

-- @test advisors: un aviso nuevo sin motivo cae (la guarda no es vacía)
do $$
declare
  v_lista jsonb := jsonb_build_object(
    'avisos', jsonb_build_array(
      jsonb_build_object('lint', 'security_definer_view', 'clave', 'security_definer_view_public_sintetica', 'motivo', repeat('m', 40)),
      jsonb_build_object('lint', 'auth_users_exposed', 'clave', 'auth_users_exposed_public_sintetica', 'motivo', repeat('m', 40)),
      jsonb_build_object('lint', 'security_definer_view', 'clave', 'security_definer_view_web_sintetica', 'motivo', repeat('m', 40)),
      jsonb_build_object('lint', 'duplicate_index', 'clave', 'duplicate_index_con_motivo', 'motivo', repeat('m', 40))),
    'comodines', jsonb_build_array(
      jsonb_build_object('lint', 'authenticated_security_definer_function_executable', 'motivo', repeat('m', 40)),
      jsonb_build_object('lint', 'anon_security_definer_function_executable', 'motivo', repeat('m', 40))),
    'fuera', jsonb_build_array(
      jsonb_build_object('lint', 'unused_index', 'motivo', repeat('m', 40)),
      jsonb_build_object('lint', 'function_search_path_mutable', 'motivo', repeat('m', 40))),
    'db_lint', '[]'::jsonb);
  v_avisos jsonb := jsonb_build_array(
    -- caen:
    jsonb_build_object('name', 'function_search_path_mutable', 'level', 'WARN', 'cache_key', 'k_sin_motivo', 'schema', 'public'),
    jsonb_build_object('name', 'pg_graphql_anon_table_exposed', 'level', 'WARN', 'cache_key', 'k_anon', 'schema', 'public'),
    jsonb_build_object('name', 'anon_security_definer_function_executable', 'level', 'WARN', 'cache_key', 'k_comodin_indebido', 'schema', 'web'),
    jsonb_build_object('name', 'auth_users_exposed', 'level', 'ERROR', 'cache_key', 'auth_users_exposed_public_sintetica', 'schema', 'public'),
    jsonb_build_object('name', 'security_definer_view', 'level', 'ERROR', 'cache_key', 'security_definer_view_public_sintetica', 'schema', 'public'),
    jsonb_build_object('name', 'public_bucket_allows_listing', 'level', 'WARN', 'cache_key', 'k_bucket', 'schema', 'storage'),
    jsonb_build_object('name', 'unindexed_foreign_keys', 'level', 'INFO', 'cache_key', 'k_fk', 'schema', 'public'),
    -- pasan:
    jsonb_build_object('name', 'security_definer_view', 'level', 'ERROR', 'cache_key', 'security_definer_view_web_sintetica', 'schema', 'web'),
    jsonb_build_object('name', 'duplicate_index', 'level', 'WARN', 'cache_key', 'duplicate_index_con_motivo', 'schema', 'public'),
    jsonb_build_object('name', 'authenticated_security_definer_function_executable', 'level', 'WARN', 'cache_key', 'k_comodin', 'schema', 'public'),
    jsonb_build_object('name', 'unused_index', 'level', 'INFO', 'cache_key', 'k_sin_uso', 'schema', 'public'),
    jsonb_build_object('name', 'no_primary_key', 'level', 'INFO', 'cache_key', 'k_info', 'schema', 'public'));
  v_salen text[];
  v_invalidos text[];
begin
  select array_agg(split_part(e, ' · ', 2) order by split_part(e, ' · ', 2)) into v_salen from pg_temp._avisos_sin_motivo(v_avisos, v_lista) e;
  if v_salen is distinct from array['auth_users_exposed_public_sintetica', 'k_anon', 'k_bucket', 'k_comodin_indebido', 'k_fk', 'k_sin_motivo',
                                     'security_definer_view_public_sintetica'] then
    raise exception 'los avisos sin motivo sintéticos no son los esperados: %', v_salen;
  end if;

  v_lista := v_lista || jsonb_build_object('avisos', (v_lista -> 'avisos') || jsonb_build_array(
    jsonb_build_object('lint', 'duplicate_index', 'clave', 'duplicate_index_con_motivo', 'motivo', repeat('m', 40)),
    jsonb_build_object('lint', 'lint_inventado', 'clave', 'k', 'motivo', repeat('m', 40))));
  select array_agg(e order by e) into v_invalidos from pg_temp._lista_invalida(v_lista) e;
  if v_invalidos is distinct from array['comodín no permitido: anon_security_definer_function_executable',
                                        'excluido no permitido: function_search_path_mutable',
                                        'lint que splinter no tiene: lint_inventado',
                                        'repetido: duplicate_index · duplicate_index_con_motivo'] then
    raise exception 'la lista sintética inválida no da lo esperado: %', v_invalidos;
  end if;
end $$;
drop function pg_temp._avisos_sin_motivo(jsonb, jsonb);
drop function pg_temp._lista_invalida(jsonb);
drop function pg_temp._lints_de_splinter();
drop function pg_temp._fuera_validos();
drop function pg_temp._comodines_validos();
