-- La lista de niveles con su uso (`…20261019006500_niveles_con_uso.sql`, paso 4.09 prompt 2): `niveles_con_uso()` con el `motivo_de_uso` de cada nivel, las banderas de lo
-- que admite (`se_renombra`, `se_retira`, `se_elimina`) y el texto de `_nivel_motivo_de_uso()` que comparten la lista y `nivel_eliminar()`.
-- Corre después de `niveles.sql` (la dueña `…0001` sale de `humo.sql`); cada bloque abre su transacción y la revierte. Los ayudantes de `pg_temp` son los de `niveles.sql`.

create or replace function pg_temp.motivo(p_sql text) returns text language plpgsql as $$
declare v_e text; v_d text; v_h text; v_m text;
begin
  execute p_sql;
  return 'sin error';
exception when others then
  get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
  v_e := sqlstate;
  return v_e || ':' || coalesce(nullif(v_d, ''), '-') || '@' || coalesce(v_h, '') || ' ' || v_m;
end $$;

-- Falla con ese estado y ese texto en el mensaje (y, si se da, ese hint y ese detail).
create or replace function pg_temp.falla_con(p_sql text, p_estado text, p_texto text, p_hint text default null, p_detail text default null) returns void language plpgsql as $$
declare v text := pg_temp.motivo(p_sql);
begin
  if v = 'sin error' or left(v, 5) <> p_estado or position(p_texto in v) = 0
     or (p_hint is not null and position('@' || p_hint || ' ' in v) = 0) or (p_detail is not null and position(':' || p_detail || '@' in v) = 0) then
    raise exception '% debía fallar con % y «%» (hint %, detail %), dio «%»', p_sql, p_estado, p_texto, p_hint, p_detail, v;
  end if;
end $$;

-- Una persona activa con un rol propio y estas concesiones ('clave', todos los orígenes).
create or replace function pg_temp.persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('nivel_' || substr(v_id::text, 1, 8), 'Nivel ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.como(p_persona uuid) returns void language sql as $$ select set_config('request.jwt.claim.sub', p_persona::text, true) $$;

-- Una versión de fórmula de ese origen que nombra el nivel: `k` de sus cuatro entradas van en una sección de ese nivel (ver y editar), el resto en una abierta.
create or replace function pg_temp.version(p_origen uuid, p_nivel text, p_estado text, p_version int, p_k int) returns uuid language plpgsql as $f$
declare
  v_def jsonb := '{"nodos": [{"id": "tc", "tipo": "tipo_cambio", "clave": "oficial", "etiqueta": "TC", "formato": "raw"},
      {"id": "a", "tipo": "input", "etiqueta": "A", "bucket": "origen"}, {"id": "b", "tipo": "input", "etiqueta": "B", "bucket": "origen"},
      {"id": "c", "tipo": "input", "etiqueta": "C", "bucket": "origen"}, {"id": "d", "tipo": "input", "etiqueta": "D", "bucket": "origen"},
      {"id": "total", "tipo": "calculo", "op": "suma", "de": ["a", "b", "c", "d"], "etiqueta": "Total", "salida": "total", "bucket": "origen"}], "buckets": {"origen": "tc"}}';
  v_nodos text[] := array['a', 'b', 'c', 'd'];
  v_sec jsonb := '[]'::jsonb; v_dis jsonb; v_id uuid; v_vis jsonb;
begin
  if p_k > 0 then
    v_sec := v_sec || jsonb_build_array(jsonb_build_object('id', 'del_nivel', 'presentacion', 'principal', 'nivel_ver', p_nivel, 'nivel_editar', p_nivel,
      'items', (select jsonb_agg(jsonb_build_object('tipo', 'celda', 'nodo', v_nodos[i], 'ancho', 'completo') order by i) from generate_series(1, p_k) i)));
  end if;
  if p_k < 4 then
    v_sec := v_sec || jsonb_build_array(jsonb_build_object('id', 'abierta', 'presentacion', 'principal',
      'items', (select jsonb_agg(jsonb_build_object('tipo', 'celda', 'nodo', v_nodos[i], 'ancho', 'completo') order by i) from generate_series(p_k + 1, 4) i)));
  end if;
  v_dis := jsonb_build_object('cabecera', '{"modos": [], "ver_total_bs": false}'::jsonb, 'secciones', v_sec, 'tarjeta_total', '{"nodo": "total", "secundarios": []}'::jsonb);
  if p_estado = 'borrador' then
    insert into public.formulas (origen_id, estado, definicion, params, diseno) values (p_origen, 'borrador', v_def, '{}', v_dis) returning id into v_id;
  else
    v_vis := public._preparar_publicacion(v_def, '{}', v_dis, false);
    insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
    values (p_origen, p_version, p_estado::public.estado_version, v_def, '{}', v_dis, v_vis) returning id into v_id;
  end if;
  return v_id;
end $f$;


-- @test niveles con uso: las RPC y los ayudantes tienen los grants que deben
begin;
do $$
declare r record;
begin
  for r in select p.proname, p.oid, pg_get_function_identity_arguments(p.oid) as args from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'niveles_con_uso' loop
    if has_function_privilege('anon', r.oid, 'execute') or not has_function_privilege('authenticated', r.oid, 'execute') then raise exception '%(%) tiene los grants mal', r.proname, r.args; end if;
  end loop;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'niveles_con_uso') <> 1 then raise exception 'falta niveles_con_uso'; end if;
  for r in select p.proname, p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('_nivel_motivo_de_uso', '_niveles_lista') loop
    if has_function_privilege('anon', r.oid, 'execute') or has_function_privilege('authenticated', r.oid, 'execute') then raise exception '% es ejecutable por quien no debe', r.proname; end if;
  end loop;
end $$;
rollback;

-- @test niveles: niveles_con_uso() trae la lista con el motivo de uso (el mismo texto que nivel_eliminar) y las banderas de lo que cada nivel admite; la leen ver y gestionar, nadie más
begin;
do $$
declare
  v_duena constant uuid := '00000000-0000-0000-0000-000000000001'; v_id uuid := gen_random_uuid(); v_v timestamptz; v_o uuid; r jsonb; e jsonb; v_msg text; v_ver uuid; v_nada uuid;
begin
  insert into public.origenes (clave, nombre) values ('prueba_con_uso', 'Prueba con uso') returning id into v_o;
  perform pg_temp.como(v_duena);
  set local role authenticated;
  v_v := (public.nivel_crear(v_id, 'Gerencia') ->> 'actualizado_en')::timestamptz;
  reset role;
  perform pg_temp.version(v_o, 'gerencia', 'borrador', null, 2);
  set local role authenticated;
  r := public.niveles_con_uso();
  if (r ->> 'tope')::int is distinct from 10 then raise exception 'el tope: %', r ->> 'tope'; end if;
  -- Orden fijo en la base: «todos» primero.
  if (r -> 'niveles' -> 0 ->> 'clave') is distinct from 'todos' then raise exception 'el primero no es «todos»'; end if;
  -- Banderas: lo que la base protege por clave.
  select x into e from jsonb_array_elements(r -> 'niveles') x where x ->> 'clave' = 'todos';
  if (e ->> 'se_renombra') is distinct from 'false' or (e ->> 'se_retira') is distinct from 'false' or (e ->> 'se_elimina') is distinct from 'false' then raise exception '«todos» admite algo: %', e; end if;
  if e ->> 'motivo_de_uso' is not null then raise exception '«todos» trae un motivo de uso'; end if;
  select x into e from jsonb_array_elements(r -> 'niveles') x where x ->> 'clave' = 'costos';
  if (e ->> 'se_renombra') is distinct from 'true' or (e ->> 'se_retira') is distinct from 'true' or (e ->> 'se_elimina') is distinct from 'false' then raise exception '«costos» admite lo que no es: %', e; end if;
  select x into e from jsonb_array_elements(r -> 'niveles') x where x ->> 'clave' = 'gerencia';
  if (e ->> 'se_renombra') is distinct from 'true' or (e ->> 'se_retira') is distinct from 'true' or (e ->> 'se_elimina') is distinct from 'true' then raise exception 'un nivel común admite menos: %', e; end if;
  -- El motivo: el mismo texto que da nivel_eliminar.
  if position('Está en 2 celdas de 1 origen (en alguna versión de su fórmula): no se elimina. Puedes retirarlo' in coalesce(e ->> 'motivo_de_uso', '')) = 0 then raise exception 'el motivo: %', e ->> 'motivo_de_uso'; end if;
  begin
    perform public.nivel_eliminar(v_id, v_v);
    raise exception 'eliminar no falló';
  exception when sqlstate '23503' then
    get stacked diagnostics v_msg = message_text;
  end;
  if v_msg is distinct from (e ->> 'motivo_de_uso') then raise exception 'el motivo de la lista (%) no es el de eliminar (%)', e ->> 'motivo_de_uso', v_msg; end if;
  -- Uno retirado que sigue en uso lleva su motivo, sin ofrecer retirarlo (ya lo está).
  v_v := (public.nivel_retirar(v_id, v_v) ->> 'actualizado_en')::timestamptz;
  select x into e from jsonb_array_elements(public.niveles_con_uso() -> 'niveles') x where x ->> 'clave' = 'gerencia';
  if e ->> 'motivo_de_uso' not like 'Está en 2 celdas de 1 origen (en alguna versión de su fórmula): no se elimina.' then raise exception 'retirado: %', e ->> 'motivo_de_uso'; end if;
  if position('Puedes retirarlo' in e ->> 'motivo_de_uso') > 0 then raise exception 'un retirado ofrece retirarse: %', e ->> 'motivo_de_uso'; end if;
  -- Sin uso, sin motivo; un retirado también lleva el suyo.
  reset role;
  delete from public.formulas where origen_id = v_o;
  set local role authenticated;
  select x into e from jsonb_array_elements(public.niveles_con_uso() -> 'niveles') x where x ->> 'clave' = 'gerencia';
  if e ->> 'motivo_de_uso' is not null then raise exception 'un nivel sin uso trae motivo: %', e; end if;
  reset role;
  -- «Todos» nunca trae motivo, aunque un diseño lo nombre a las claras (nivel_ver: todos): no se elimina ni se retira, no hay qué explicar.
  perform pg_temp.version(v_o, 'todos', 'borrador', null, 2);
  set local role authenticated;
  select x into e from jsonb_array_elements(public.niveles_con_uso() -> 'niveles') x where x ->> 'clave' = 'todos';
  if e is null or e ->> 'motivo_de_uso' is not null then raise exception '«todos» trae motivo: %', e; end if;
  reset role;
  -- Quien sólo ve roles lee; quien no tiene ninguno de los dos, no.
  v_ver := pg_temp.persona(array['equipo.roles.ver']);
  v_nada := pg_temp.persona(array['cotizaciones.ver']);
  perform pg_temp.como(v_ver);
  set local role authenticated;
  perform public.niveles_con_uso();
  reset role;
  perform pg_temp.como(v_nada);
  set local role authenticated;
  perform pg_temp.falla_con($f$select public.niveles_con_uso()$f$, '42501', 'No tienes el permiso');
  reset role;
  -- Ni anon ni PUBLIC la ejecutan.
  if has_function_privilege('anon', 'public.niveles_con_uso()', 'execute') then raise exception 'anon la ejecuta'; end if;
end $$;
rollback;

-- @test niveles con uso: la respuesta de cada escritura trae la lista con el motivo de uso (la pantalla no lo pierde al escribir)
begin;
do $$
declare
  v_duena constant uuid := '00000000-0000-0000-0000-000000000001'; v_id uuid := gen_random_uuid(); v_v timestamptz; v_o uuid; r jsonb; v_nuevo uuid := gen_random_uuid();
begin
  insert into public.origenes (clave, nombre) values ('prueba_motivo_rpc', 'Prueba motivo rpc') returning id into v_o;
  perform pg_temp.como(v_duena);
  set local role authenticated;
  v_v := (public.nivel_crear(v_id, 'Gerencia') ->> 'actualizado_en')::timestamptz;
  reset role;
  perform pg_temp.version(v_o, 'gerencia', 'borrador', null, 3);
  set local role authenticated;
  -- Retirar, restaurar, renombrar y crear otro: todas devuelven el motivo del nivel en uso.
  r := public.nivel_retirar(v_id, v_v);
  if (select e ->> 'motivo_de_uso' from jsonb_array_elements(r -> 'lista' -> 'niveles') e where e ->> 'clave' = 'gerencia') not like 'Está en 3 celdas de 1 origen%' then raise exception 'retirar: %', r; end if;
  r := public.nivel_restaurar(v_id, (r ->> 'actualizado_en')::timestamptz);
  if (select e ->> 'motivo_de_uso' from jsonb_array_elements(r -> 'lista' -> 'niveles') e where e ->> 'clave' = 'gerencia') not like 'Está en 3 celdas de 1 origen%' then raise exception 'restaurar: %', r; end if;
  r := public.nivel_renombrar(v_id, (r ->> 'actualizado_en')::timestamptz, 'Dirección');
  if (select e ->> 'motivo_de_uso' from jsonb_array_elements(r -> 'lista' -> 'niveles') e where e ->> 'clave' = 'gerencia') not like 'Está en 3 celdas%' then raise exception 'renombrar: %', r; end if;
  r := public.nivel_crear(v_nuevo, 'Otro');
  if (select e ->> 'motivo_de_uso' from jsonb_array_elements(r -> 'lista' -> 'niveles') e where e ->> 'clave' = 'gerencia') not like 'Está en 3 celdas%' then raise exception 'crear: %', r; end if;
  -- El nivel sin uso lo trae nulo (la clave existe: la pantalla distingue «sin uso» de «no vino»).
  if not (select e ? 'motivo_de_uso' and e -> 'motivo_de_uso' = 'null'::jsonb from jsonb_array_elements(r -> 'lista' -> 'niveles') e where e ->> 'clave' = 'otro') then raise exception 'sin uso: %', r; end if;
  reset role;
end $$;
rollback;
