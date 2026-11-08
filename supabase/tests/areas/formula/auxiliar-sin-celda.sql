-- Una constante auxiliar de un número escrito en el texto de su fila no pide celda en el diseño (4.21-3b-2, P2 = a), y publicarla sin celda no la
-- deja ver a nadie más: no entra a la `visibilidad`, `_nodos_visibles` sólo la da a quien configura (sin editar) y la hoja y el recálculo de un vendedor
-- no la nombran. docs/COTIZADOR.md › «El diseño de la hoja (D7)». Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su
-- terreno con `as_preparar()` dentro de su transacción y la revierte. La paridad de la regla con TS está en `validar-diseno.sql` (casos «auxiliar sin celda»).

-- @test fórmula: los ayudantes de la auxiliar sin celda
reset role;
create or replace function pg_temp.as_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, detail, hint} si falla.
create or replace function pg_temp.as_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_d text; v_h text; v_e text;
begin
  perform pg_temp.as_como(p_quien);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'detail', v_d, 'hint', v_h);
  end;
  reset role;
  return v;
end $f$;

-- Una persona con un rol propio; cada concesión es {clave, origen}. Si corre sola (`SOLO=`) la primera cuenta nace dueña: se le deja sólo su rol.
create or replace function pg_temp.as_persona(p_id uuid, p_concesiones jsonb) returns void language plpgsql as $f$
declare v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('as_' || substr(p_id::text, 25, 12), 'AS ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, c ->> 'clave', (c ->> 'origen')::uuid, 'todos');
  end loop;
end $f$;

-- La fórmula publicada de la semilla con una fila más al final, `zz` = `=<input>*7`, como la deja el compilador: su auxiliar `zz__1` (el 7) justo antes,
-- sin celda en el diseño. Con `p_seguro`, además una fila constante `seguro_x` (`150`) sin celda.
create or replace function pg_temp.as_formula(p_seguro boolean) returns jsonb language plpgsql as $f$
declare s public.formulas; v_in text; v_nodos jsonb; v_params jsonb;
begin
  select * into s from public.formulas f where f.estado = 'publicada' and f.diseno is not null order by f.creado_en, f.id limit 1;
  if s.id is null then raise exception 'la semilla no trae una fórmula publicada con diseño'; end if;
  select n ->> 'id' into v_in from jsonb_array_elements(s.definicion -> 'nodos') n where n ->> 'tipo' = 'input' limit 1;
  v_nodos := (s.definicion -> 'nodos') || jsonb_build_array(
    jsonb_build_object('id', 'zz__1', 'tipo', 'constante', 'etiqueta', '7', 'formato', 'raw'),
    jsonb_build_object('id', 'zz', 'tipo', 'calculo', 'op', 'multiplicar', 'de', jsonb_build_array(v_in, 'zz__1'), 'etiqueta', 'Zeta',
                       'texto', '=' || v_in || '*7'));
  v_params := s.params || '{"zz__1": 7}'::jsonb;
  if p_seguro then
    v_nodos := v_nodos || jsonb_build_array(jsonb_build_object('id', 'seguro_x', 'tipo', 'constante', 'etiqueta', 'Seguro', 'texto', '150'));
    v_params := v_params || '{"seguro_x": 150}'::jsonb;
  end if;
  return jsonb_build_object('definicion', s.definicion || jsonb_build_object('nodos', v_nodos), 'params', v_params, 'diseno', s.diseno);
end $f$;

-- El terreno: el origen `prueba_as` con la v1 de `as_formula(false)` publicada por `_preparar_publicacion()`, y las personas:
--   c  configura el origen          v  lo ve y cotiza (cotizaciones.ver y crear), sin configurarlo
-- Devuelve el id de la v1.
create or replace function pg_temp.as_preparar() returns uuid language plpgsql as $f$
declare o uuid; f jsonb; v uuid;
begin
  insert into public.origenes (clave, nombre) values ('prueba_as', 'Prueba as') returning id into o;
  perform pg_temp.as_persona('00000000-0000-4000-8000-0000000a500c', jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o),
    jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o)));
  perform pg_temp.as_persona('00000000-0000-4000-8000-0000000a500d', jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o),
    jsonb_build_object('clave', 'cotizaciones.crear', 'origen', o)));
  f := pg_temp.as_formula(false);
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
  values (o, 1, 'publicada', f -> 'definicion', f -> 'params', f -> 'diseno',
          public._preparar_publicacion(f -> 'definicion', f -> 'params', f -> 'diseno', false), 'v1', now())
  returning id into v;
  return v;
end $f$;

-- ¿Algún lugar del jsonb nombra `zz__1`, como clave o como texto?
create or replace function pg_temp.as_nombra(p jsonb) returns boolean language sql as $f$
  select jsonb_path_exists(p, '$.** ? (@.type() == "object").keyvalue() ? (@.key == "zz__1")') or jsonb_path_exists(p, '$.** ? (@ == "zz__1")')
$f$;

-- @test fórmula: publicar con la auxiliar sin celda entra, y su visibilidad no la nombra (S1)
begin;
do $$
declare v uuid := pg_temp.as_preparar(); f public.formulas;
begin
  select * into f from public.formulas where id = v;
  if f.visibilidad ? 'zz__1' then raise exception 'la visibilidad nombra la auxiliar sin celda: %', f.visibilidad -> 'zz__1'; end if;
  if not exists (select 1 from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'id' = 'zz__1') then
    raise exception 'la auxiliar no quedó en la fórmula publicada';
  end if;
end $$;
rollback;

-- @test fórmula: _nodos_visibles no da la auxiliar sin celda a quien cotiza; a quien configura, sí y sin editar (S2)
-- `_nodos_visibles` no la ejecuta authenticated: la llaman las RPC, como postgres, con la identidad de quien pide (aquí, la de cada persona).
begin;
do $$
declare f uuid := pg_temp.as_preparar(); r jsonb;
begin
  perform pg_temp.as_como('00000000-0000-4000-8000-0000000a500d');
  select coalesce(jsonb_object_agg(nodo, editar), '{}') into r from public._nodos_visibles(f);
  if r = '{}'::jsonb then raise exception 'el vendedor no ve ningún nodo: la prueba no mira nada'; end if;
  if r ? 'zz__1' then raise exception 'el vendedor recibe la auxiliar sin celda: %', r; end if;
  perform pg_temp.as_como('00000000-0000-4000-8000-0000000a500c');
  select coalesce(jsonb_object_agg(nodo, editar), '{}') into r from public._nodos_visibles(f);
  if (r -> 'zz__1') is distinct from 'false'::jsonb then raise exception 'quien configura debía recibirla sin editar: %', r -> 'zz__1'; end if;
end $$;
rollback;

-- @test fórmula: la hoja y el recálculo de quien cotiza no nombran la auxiliar sin celda (S3, S4)
begin;
do $$
declare f uuid := pg_temp.as_preparar(); o uuid; h jsonb; r jsonb;
begin
  select origen_id into o from public.formulas where id = f;
  h := pg_temp.as_corre('00000000-0000-4000-8000-0000000a500d', format('select public.cotizacion_hoja(%L)', o));
  if h ? 'error' or h ->> 'abierta' is null then raise exception 'el vendedor no abrió la hoja: %', h; end if;
  if pg_temp.as_nombra(h) then raise exception 'la hoja del vendedor nombra la auxiliar sin celda'; end if;
  r := pg_temp.as_corre('00000000-0000-4000-8000-0000000a500d',
         format('select public.cotizacion_evaluar(''{"inputs": {}}''::jsonb, null, %L, null, null, null, %L)', o, h ->> 'abierta'));
  if r ? 'error' or not (r ? 'valores') then raise exception 'el vendedor no recalculó: %', r; end if;
  if pg_temp.as_nombra(r) then raise exception 'el recálculo del vendedor nombra la auxiliar sin celda'; end if;
  -- Quien configura sí la recibe en su recálculo (la prueba mira algo).
  h := pg_temp.as_corre('00000000-0000-4000-8000-0000000a500c', format('select public.cotizacion_hoja(%L)', o));
  r := pg_temp.as_corre('00000000-0000-4000-8000-0000000a500c',
         format('select public.cotizacion_evaluar(''{"inputs": {}}''::jsonb, null, %L, null, null, null, %L)', o, h ->> 'abierta'));
  if not (r -> 'valores' ? 'zz__1') then raise exception 'quien configura debía recibir la auxiliar en su recálculo: %', r -> 'valores'; end if;
end $$;
rollback;

-- @test fórmula: una fila constante sin celda sigue rechazándose al publicar (S6)
begin;
do $$
declare f jsonb := pg_temp.as_formula(true); v_d text; v_h text;
begin
  begin
    perform public._preparar_publicacion(f -> 'definicion', f -> 'params', f -> 'diseno', false);
    raise exception 'publicar aceptó una fila constante sin celda';
  exception when sqlstate '22023' then
    get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint;
  end;
  if v_d is distinct from 'nodo_sin_seccion' or v_h is distinct from 'seguro_x' then
    raise exception 'debía ser nodo_sin_seccion en seguro_x: detail %, hint %', v_d, v_h;
  end if;
end $$;
rollback;
