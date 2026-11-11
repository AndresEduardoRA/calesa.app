-- Los últimos abiertos (paso 7.12-1): `visita_registrar()` y la tabla `visitados`.
-- No depende de otro archivo (`SOLO=areas/buscador/visitados.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   V1. Cada quien registra sólo lo suyo: Beto no lee, no cambia ni borra las visitas de Ana; registrar de nuevo mueve visto_en sin duplicar.
--   V2. El tope: con 50 visitas, la 51.ª se lleva la de visto_en más viejo; las de otra persona no se tocan.
--   V3. Errores: un tipo fuera de lead, vehiculo o cotizacion, o un id nulo, dan 22023 con el campo en hint; sin sesión, 42501.
--   V4. El índice (usuario_id, visto_en desc) existe.
--   V5. `visita_registrar` es de authenticated y no de anon ni PUBLIC, invocadora y con search_path vacío.
-- En una transacción `now()` no cambia: para ver que algo se movió, las filas se envejecen antes como postgres.

-- Una persona activa sin permisos (visitar no pide ninguno).
create or replace function pg_temp.vi_persona() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated; nula = sin sesión) y devuelve su resultado, o {error, hint} si falla.
create or replace function pg_temp.vi_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_quien::text, ''), true), set_config('request.jwt.claim.role', 'authenticated', true),
          set_config('request.jwt.claims', case when p_quien is null then '' else json_build_object('sub', p_quien, 'role', 'authenticated')::text end, true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'hint', v_h);
  end;
  reset role;
  return v;
end $f$;

-- Registra esas visitas de lead (ids md5('vi' || g)) como esa persona.
create or replace function pg_temp.vi_registrar(p_quien uuid, p_desde int, p_hasta int) returns jsonb language sql as $f$
  select pg_temp.vi_corre(p_quien, format($q$select jsonb_agg(x.v) from (select public.visita_registrar('lead', md5('vi' || g)::uuid)::text as v
                                                                              from generate_series(%s, %s) g) x$q$, p_desde, p_hasta))
$f$;

-- @test visitados: V1 cada quien lo suyo; registrar de nuevo mueve visto_en sin duplicar
begin;
do $$
declare ana uuid := pg_temp.vi_persona(); beto uuid := pg_temp.vi_persona(); r jsonb;
begin
  r := pg_temp.vi_registrar(ana, 1, 3);
  if r ? 'error' then raise exception 'V1: Ana no registra: %', r; end if;
  r := pg_temp.vi_registrar(beto, 1, 1);
  if r ? 'error' then raise exception 'V1: Beto no registra: %', r; end if;
  r := pg_temp.vi_corre(beto, format('select to_jsonb(array(select referencia_id from public.visitados where usuario_id = %L))', ana));
  if jsonb_array_length(r) <> 0 then raise exception 'V1: Beto lee las visitas de Ana: %', r; end if;
  r := pg_temp.vi_corre(beto, 'select to_jsonb(array(select usuario_id from public.visitados))');
  if r is distinct from jsonb_build_array(beto) then raise exception 'V1: Beto no lee sólo la suya: %', r; end if;
  r := pg_temp.vi_corre(beto, format('with u as (update public.visitados set visto_en = now() - interval ''1 day'' where usuario_id = %L returning 1) select to_jsonb(array(select 1 from u))', ana));
  if jsonb_array_length(r) <> 0 then raise exception 'V1: Beto cambia las visitas de Ana: %', r; end if;
  r := pg_temp.vi_corre(beto, format('with d as (delete from public.visitados where usuario_id = %L returning 1) select to_jsonb(array(select 1 from d))', ana));
  if jsonb_array_length(r) <> 0 then raise exception 'V1: Beto borra las visitas de Ana: %', r; end if;
  if (select array_length(array_agg(1), 1) from public.visitados where usuario_id = ana) <> 3 then raise exception 'V1: Ana no tiene 3 visitas'; end if;
  -- Registrar de nuevo: envejecida, vuelve a now() y sigue siendo una.
  update public.visitados set visto_en = now() - interval '1 hour' where usuario_id = ana;
  r := pg_temp.vi_registrar(ana, 2, 2);
  if r ? 'error' then raise exception 'V1: Ana no registra de nuevo: %', r; end if;
  if (select array_agg(visto_en) from public.visitados where usuario_id = ana and referencia_id = md5('vi2')::uuid) is distinct from array[now()] then
    raise exception 'V1: registrar de nuevo no deja una sola fila en now()';
  end if;
  if (select array_length(array_agg(1), 1) from public.visitados where usuario_id = ana and visto_en < now()) <> 2 then raise exception 'V1: registrar de nuevo movió las otras'; end if;
end $$;
rollback;

-- @test visitados: V2 con 50 visitas, la 51.ª se lleva la más vieja; las de otra persona no se tocan
begin;
do $$
declare ana uuid := pg_temp.vi_persona(); beto uuid := pg_temp.vi_persona(); r jsonb;
begin
  r := pg_temp.vi_registrar(beto, 1, 50);
  if r ? 'error' then raise exception 'V2: Beto no registra: %', r; end if;
  r := pg_temp.vi_registrar(ana, 1, 50);
  if r ? 'error' then raise exception 'V2: Ana no registra: %', r; end if;
  -- La g-ésima queda g minutos atrás: la más vieja es la 50.
  update public.visitados v set visto_en = now() - make_interval(mins => g)
    from generate_series(1, 50) g where v.usuario_id in (ana, beto) and v.tipo = 'lead' and v.referencia_id = md5('vi' || g)::uuid;
  r := pg_temp.vi_registrar(ana, 51, 51);
  if r ? 'error' then raise exception 'V2: Ana no registra la 51.ª: %', r; end if;
  if (select array_length(array_agg(1), 1) from public.visitados where usuario_id = ana) <> 50 then raise exception 'V2: Ana no quedó con 50'; end if;
  if exists (select 1 from public.visitados where usuario_id = ana and referencia_id = md5('vi50')::uuid) then raise exception 'V2: no se fue la más vieja'; end if;
  if not exists (select 1 from public.visitados where usuario_id = ana and referencia_id = md5('vi51')::uuid) then raise exception 'V2: no quedó la nueva'; end if;
  if (select array_length(array_agg(1), 1) from public.visitados where usuario_id = beto) <> 50 then raise exception 'V2: tocó las de Beto'; end if;
end $$;
rollback;

-- @test visitados: V3 errores: tipo e id con 22023 y su hint; sin sesión, 42501
begin;
do $$
declare ana uuid := pg_temp.vi_persona(); r jsonb;
begin
  r := pg_temp.vi_corre(ana, $q$select to_jsonb(public.visita_registrar('evento', gen_random_uuid())::text)$q$);
  if r is distinct from '{"error": "22023", "hint": "tipo"}'::jsonb then raise exception 'V3: evento: %', r; end if;
  r := pg_temp.vi_corre(ana, $q$select to_jsonb(public.visita_registrar('x', gen_random_uuid())::text)$q$);
  if r is distinct from '{"error": "22023", "hint": "tipo"}'::jsonb then raise exception 'V3: x: %', r; end if;
  r := pg_temp.vi_corre(ana, $q$select to_jsonb(public.visita_registrar(null, gen_random_uuid())::text)$q$);
  if r is distinct from '{"error": "22023", "hint": "tipo"}'::jsonb then raise exception 'V3: tipo nulo: %', r; end if;
  r := pg_temp.vi_corre(ana, $q$select to_jsonb(public.visita_registrar('lead', null)::text)$q$);
  if r is distinct from '{"error": "22023", "hint": "id"}'::jsonb then raise exception 'V3: id nulo: %', r; end if;
  r := pg_temp.vi_corre(null, $q$select to_jsonb(public.visita_registrar('lead', gen_random_uuid())::text)$q$);
  if r ->> 'error' is distinct from '42501' then raise exception 'V3: sin sesión: %', r; end if;
end $$;
rollback;

-- @test visitados: V4 el índice de los últimos abiertos
do $$
begin
  if (select pg_get_indexdef(i.indexrelid) from pg_index i where i.indexrelid = 'public.visitados_usuario_visto_idx'::regclass)
     is distinct from 'CREATE INDEX visitados_usuario_visto_idx ON public.visitados USING btree (usuario_id, visto_en DESC)' then
    raise exception 'V4: el índice no es (usuario_id, visto_en desc)';
  end if;
end $$;

-- @test visitados: V5 privilegios de visita_registrar
do $$
declare v_oid oid := 'public.visita_registrar(text, uuid)'::regprocedure;
begin
  if not has_function_privilege('authenticated', v_oid, 'execute') then raise exception 'V5: authenticated no la ejecuta'; end if;
  if has_function_privilege('anon', v_oid, 'execute') then raise exception 'V5: anon la ejecuta'; end if;
  if exists (select 1 from aclexplode((select proacl from pg_proc where oid = v_oid)) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') then raise exception 'V5: PUBLIC la ejecuta'; end if;
  if (select prosecdef from pg_proc where oid = v_oid) then raise exception 'V5: corre con los derechos de su dueña: tiene que ser invocadora (la RLS de visitados decide)'; end if;
  if not coalesce((select proconfig from pg_proc where oid = v_oid) @> array['search_path=""'], false) then raise exception 'V5: sin search_path vacío'; end if;
end $$;
