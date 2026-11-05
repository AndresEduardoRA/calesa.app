-- `cotizacion_hoja_guardada()` (paso 4.15-2): la hoja de una cotización guardada. Lo que no se ve no viaja por cada nivel lo prueba la matriz de `cotizacion-hoja.sql`
-- (H1); acá va la conducta: quién la abre, quién guarda y qué se edita, SU versión, la cadena (anterior, encima, cotizar encima), la vigencia y los privilegios.
-- Corre después de `cotizacion-hoja-dato-del-vehiculo.sql`; la dueña es `…0001` (la crea `humo.sql`). Cada bloque abre su transacción y la revierte.
-- Compara claves y hojas de la respuesta, nunca texto suelto.

create temp sequence hg_telefono;
create or replace function pg_temp.hg_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_d text; v_h text; v_e text; v_m text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true), set_config('request.jwt.claim.role', 'authenticated', true),
          set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'detail', v_d, 'hint', v_h);
  end;
  reset role;
  return v;
end $f$;

-- Una persona con un rol propio y alcance por concesión: cada una es {clave, alcance} (sin alcance = «todos»; en todos los orígenes).
create or replace function pg_temp.hg_persona(p_id uuid, p_concesiones jsonb) returns uuid language plpgsql as $f$
declare v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('hg_' || substr(p_id::text, 25, 12), 'HG ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c ->> 'clave', null, coalesce(c ->> 'alcance', 'todos')::public.alcance_permiso);
  end loop;
  return p_id;
end $f$;

create or replace function pg_temp.hg_c(variadic p_claves text[]) returns jsonb language sql as $f$ select coalesce(jsonb_agg(case when c like '%:propios' then jsonb_build_object('clave', split_part(c, ':', 1), 'alcance', 'propios') else jsonb_build_object('clave', c) end), '[]'::jsonb)
    from unnest(p_claves) c
$f$;

-- El terreno: un origen con una fórmula publicada (tc, visible, oculto del nivel «costos», total) y su diseño de una sección, un lead y dos vehículos.
create or replace function pg_temp.hg_terreno() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; l uuid; v uuid; v2 uuid; v_def jsonb; v_vis jsonb;
begin
  insert into public.origenes (clave, nombre) values ('hg_' || substr(gen_random_uuid()::text, 1, 8), 'HG origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'oculto', 'tipo', 'input', 'etiqueta', 'Oculto', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible', 'oculto'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
    'buckets', jsonb_build_object('origen', 'tc'));
  v_vis := '{"tc": {"ver": "todos", "editar": "todos"}, "visible": {"ver": "todos", "editar": "todos"}, "oculto": {"ver": "costos", "editar": "costos"}, "total": {"ver": "todos", "editar": null}}';
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  values (o, 1, 'publicada', v_def, '{}', '{"secciones": [{"id": "s1", "titulo": "Uno", "items": [{"tipo": "celda", "nodo": "tc"}, {"tipo": "celda", "nodo": "visible"},
          {"tipo": "celda", "nodo": "oculto"}, {"tipo": "celda", "nodo": "total"}]}]}', v_vis, now() - interval '10 days') returning id into f;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('HG lead', '7216' || lpad(nextval('pg_temp.hg_telefono')::text, 4, '0'), '00000000-0000-0000-0000-000000000001', (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'HG vehículo', 'toyota') returning id into v;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'HG vehículo 2', 'mazda') returning id into v2;
  return jsonb_build_object('o', o, 'f', f, 'l', l, 'v', v, 'v2', v2);
end $f$;

-- Una cotización escrita como postgres (el snapshot del motor con visible 100 y oculto 25).
create or replace function pg_temp.hg_cot(t jsonb, p_creador uuid, p_padre uuid default null, p_clase text default 'preventa', p_vehiculo uuid default null,
                                          p_creado timestamptz default now(), p_sin_vehiculo boolean default false) returns uuid language plpgsql as $f$
declare v_ent jsonb; v_res jsonb; c uuid;
begin
  v_ent := '{"inputs": {"visible": 100, "oculto": 25}, "banderas": {}, "overrides": {}, "vehiculo": {}, "tablas": {}}'::jsonb
           || jsonb_build_object('tipos_cambio', jsonb_build_object('oficial', (select valor from public.tipos_cambio where clave = 'oficial')));
  v_res := public.evaluar_formula((select definicion from public.formulas where id = (t ->> 'f')::uuid), '{}', v_ent, null);
  insert into public.cotizaciones (origen_id, lead_id, vehiculo_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, clase,
                                   cotizacion_padre_id, version, creado_en)
  values ((t ->> 'o')::uuid, (t ->> 'l')::uuid, case when not p_sin_vehiculo then coalesce(p_vehiculo, (t ->> 'v')::uuid) end, p_creador, (t ->> 'f')::uuid,
          v_res -> 'valores', v_res -> 'fuentes', v_ent -> 'tipos_cambio', v_res -> 'totales', (v_res #>> '{totales,usd}')::numeric, p_clase::public.clase_cotizacion,
          p_padre, coalesce((select x.version + 1 from public.cotizaciones x where x.id = p_padre), 1), p_creado)
  returning id into c;
  return c;
end $f$;

create or replace function pg_temp.hg_hoja(p_quien uuid, p_c uuid) returns jsonb language sql as $f$ select pg_temp.hg_corre(p_quien, format('select public.cotizacion_hoja_guardada(%L)', p_c)) $f$;

-- Los ítems de celda: nodo → editable, y nodo → motivo.
create or replace function pg_temp.hg_editables(r jsonb) returns text[] language sql as $f$ select coalesce(array_agg(i ->> 'nodo' order by i ->> 'nodo'), '{}') from jsonb_path_query(r, 'strict $.secciones[*].items[*]') i where (i ->> 'editable')::boolean $f$;
create or replace function pg_temp.hg_item(r jsonb, p_nodo text) returns jsonb language sql as $f$ select i from jsonb_path_query(r, 'strict $.secciones[*].items[*]') i where i ->> 'nodo' = p_nodo limit 1 $f$;

-- @test cotizacion_hoja_guardada: L1 lo inexistente, lo de la papelera y lo que no se ve dan el 42501 de cotizacion_leer; una cuenta bloqueada recibe el suyo, también con un id que no existe
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t jsonb := pg_temp.hg_terreno(); c uuid; cp uuid; ve uuid; bl uuid; r jsonb; r_leer jsonb; v_id uuid; v_quien uuid;
begin
  ve := pg_temp.hg_persona(gen_random_uuid(), pg_temp.hg_c('cotizaciones.ver:propios', 'cotizaciones.crear', 'leads.ver', 'vehiculos.ver'));
  bl := pg_temp.hg_persona(gen_random_uuid(), pg_temp.hg_c('cotizaciones.ver', 'cotizaciones.editar', 'leads.ver', 'vehiculos.ver'));
  c := pg_temp.hg_cot(t, duena);
  cp := pg_temp.hg_cot(t, duena, p_vehiculo => (t ->> 'v2')::uuid);
  update public.cotizaciones set eliminado_en = now() where id = cp;
  foreach v_id in array array[gen_random_uuid(), cp, c] loop
    v_quien := case when v_id = c then ve else duena end;
    r := pg_temp.hg_hoja(v_quien, v_id);
    r_leer := pg_temp.hg_corre(v_quien, format('select public.cotizacion_leer(%L)', v_id));
    if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' or r - 'detail' - 'hint' is distinct from r_leer - 'detail' - 'hint' then
      raise exception 'L1: % debía dar el 42501 de cotizacion_leer (%): %', v_id, r_leer, r;
    end if;
  end loop;
  -- La bloqueada la vería («todos»): recibe el de su cuenta, con la cotización y con un id que no existe.
  if pg_temp.hg_hoja(bl, c) ? 'error' then raise exception 'L1: bl debía verla antes de bloquearse: %', pg_temp.hg_hoja(bl, c); end if;
  update public.perfiles set bloqueado = true where id = bl;
  foreach v_id in array array[c, gen_random_uuid()] loop
    r := pg_temp.hg_hoja(bl, v_id);
    if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'Tu cuenta está bloqueada o dada de baja.' then raise exception 'L1: la bloqueada: %', r; end if;
  end loop;
end $$;
rollback;

-- @test cotizacion_hoja_guardada: L2 quién guarda decide qué se edita (ver y editar por su alcance; una final, ver y final.gestionar), no _nodos_visibles
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t jsonb := pg_temp.hg_terreno(); c uuid; cf uuid; ed uuid; sc uuid; cr uuid; ep uuid; fg uuid; r jsonb; v_txt text; v_quien uuid; v_puede boolean;
begin
  ed := pg_temp.hg_persona(gen_random_uuid(), pg_temp.hg_c('cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'leads.ver', 'vehiculos.ver'));
  sc := pg_temp.hg_persona(gen_random_uuid(), pg_temp.hg_c('cotizaciones.ver', 'leads.ver', 'vehiculos.ver'));
  cr := pg_temp.hg_persona(gen_random_uuid(), pg_temp.hg_c('cotizaciones.ver', 'cotizaciones.crear', 'leads.ver', 'vehiculos.ver'));
  ep := pg_temp.hg_persona(gen_random_uuid(), pg_temp.hg_c('cotizaciones.ver', 'cotizaciones.editar:propios', 'leads.ver', 'vehiculos.ver'));
  fg := pg_temp.hg_persona(gen_random_uuid(), pg_temp.hg_c('cotizaciones.ver', 'cotizaciones.editar', 'cotizaciones.final.gestionar', 'leads.ver', 'vehiculos.ver'));
  c := pg_temp.hg_cot(t, duena);
  foreach v_txt in array array['duena', 'ed', 'sc', 'cr', 'ep'] loop
    v_quien := case v_txt when 'duena' then duena when 'ed' then ed when 'sc' then sc when 'cr' then cr else ep end;
    v_puede := v_txt in ('duena', 'ed');
    r := pg_temp.hg_hoja(v_quien, c);
    if r ? 'error' or r ->> 'estado' is distinct from 'lista' then raise exception 'L2: % no abre la hoja: %', v_txt, r; end if;
    if (r -> 'puede_guardar')::boolean is distinct from v_puede then raise exception 'L2: % puede_guardar = %', v_txt, r -> 'puede_guardar'; end if;
    if pg_temp.hg_editables(r) is distinct from (case when v_txt = 'duena' then array['oculto', 'tc', 'visible'] when v_puede then array['tc', 'visible'] else '{}'::text[] end) then
      raise exception 'L2: % edita %', v_txt, pg_temp.hg_editables(r);
    end if;
  end loop;
  -- Una final: la guarda quien gestiona finales (y la ve); quien edita preventas, no. Lo editable es eso y el nivel de `_nodos_visibles`, como en `cotizacion_guardar`.
  cf := pg_temp.hg_cot(t, duena, p_clase => 'final', p_vehiculo => (t ->> 'v2')::uuid);
  r := pg_temp.hg_hoja(fg, cf);
  if r ? 'error' or not (r -> 'puede_guardar')::boolean or pg_temp.hg_editables(r) is distinct from array['tc', 'visible'] then raise exception 'L2: fg y la final: %', r; end if;
  r := pg_temp.hg_hoja(ed, cf);
  if r ? 'error' or (r -> 'puede_guardar')::boolean or pg_temp.hg_editables(r) <> '{}' then raise exception 'L2: ed y la final: %', r; end if;
end $$;
rollback;

-- @test cotizacion_hoja_guardada: L3 sin poder guardar, el motivo de una celda de un nivel es no_se_edita (no el nivel) y una calculada sigue se_calcula
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t jsonb := pg_temp.hg_terreno(); c uuid; sk uuid; r jsonb;
begin
  sk := pg_temp.hg_persona(gen_random_uuid(), pg_temp.hg_c('cotizaciones.ver', 'cotizaciones.nivel.costos.ver', 'leads.ver', 'vehiculos.ver'));
  c := pg_temp.hg_cot(t, duena);
  r := pg_temp.hg_hoja(sk, c);
  if pg_temp.hg_item(r, 'oculto') -> 'motivo' is distinct from '{"codigo": "no_se_edita"}'::jsonb then raise exception 'L3: oculto: %', pg_temp.hg_item(r, 'oculto'); end if;
  if pg_temp.hg_item(r, 'total') -> 'motivo' is distinct from '{"codigo": "se_calcula"}'::jsonb then raise exception 'L3: total: %', pg_temp.hg_item(r, 'total'); end if;
  if pg_temp.hg_item(r, 'visible') -> 'motivo' is distinct from '{"codigo": "no_se_edita"}'::jsonb then raise exception 'L3: visible: %', pg_temp.hg_item(r, 'visible'); end if;
  -- La hoja nueva del origen, para quien edita sin el nivel: ahí el motivo sí es el nivel (no cambia).
  r := pg_temp.hg_corre(pg_temp.hg_persona(gen_random_uuid(), pg_temp.hg_c('cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.nivel.costos.ver')),
                        format('select public.cotizacion_hoja(%L)', t ->> 'o'));
  if pg_temp.hg_item(r, 'oculto') -> 'motivo' ->> 'codigo' is distinct from 'nivel' then raise exception 'L3: la hoja nueva: %', pg_temp.hg_item(r, 'oculto'); end if;
end $$;
rollback;

-- @test cotizacion_hoja_guardada: L4 abre SU versión de la fórmula aunque haya otra publicada, y dice cuál es la publicada; con la misma, el diseño es el de cotizacion_hoja
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t jsonb := pg_temp.hg_terreno(); c uuid; f2 uuid; r jsonb; r2 jsonb;
begin
  c := pg_temp.hg_cot(t, duena);
  r := pg_temp.hg_hoja(duena, c);
  r2 := pg_temp.hg_corre(duena, format('select public.cotizacion_hoja(%L)', t ->> 'o'));
  if r -> 'secciones' is distinct from r2 -> 'secciones' or r -> 'publicada' is distinct from jsonb_build_object('id', t ->> 'f', 'version', 1) then
    raise exception 'L4: con la misma publicada: % / %', r -> 'secciones', r -> 'publicada';
  end if;
  update public.formulas set estado = 'archivada' where id = (t ->> 'f')::uuid;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  select origen_id, 2, 'publicada', definicion, params, jsonb_set(diseno, '{secciones,0,titulo}', '"Dos"'), visibilidad, now() from public.formulas where id = (t ->> 'f')::uuid
  returning id into f2;
  r := pg_temp.hg_hoja(duena, c);
  if r -> 'formula' is distinct from jsonb_build_object('id', t ->> 'f', 'version', 1) or r -> 'publicada' is distinct from jsonb_build_object('id', f2, 'version', 2)
     or r -> 'secciones' -> 0 ->> 'titulo' is distinct from 'Uno' then
    raise exception 'L4: con otra publicada: % / % / %', r -> 'formula', r -> 'publicada', r -> 'secciones' -> 0 ->> 'titulo';
  end if;
  if r -> 'cotizacion' ->> 'id' is distinct from c::text or (r -> 'valores' ->> 'visible')::numeric is distinct from 100 then raise exception 'L4: el snapshot: %', r; end if;
end $$;
rollback;

-- @test cotizacion_hoja_guardada: L5 la anterior y la versión nueva: las que se ven, con su número; la nueva que no se ve, sólo que existe (P11); la anterior que no se ve, nula
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t jsonb := pg_temp.hg_terreno(); a uuid; b uuid; c uuid; ve uuid; r jsonb; v_num bigint;
begin
  ve := pg_temp.hg_persona(gen_random_uuid(), pg_temp.hg_c('cotizaciones.ver:propios', 'cotizaciones.crear', 'leads.ver', 'vehiculos.ver'));
  -- A (dueña) ← B (ve) ← C (dueña). ve no está en la cartera del lead: ve sólo lo que creó.
  a := pg_temp.hg_cot(t, duena);
  b := pg_temp.hg_cot(t, ve, a);
  c := pg_temp.hg_cot(t, duena, b);
  select numero into v_num from public.cotizaciones where id = c;
  r := pg_temp.hg_hoja(duena, b);
  if r -> 'anterior' is distinct from (select jsonb_build_object('id', id, 'numero', numero, 'version', 1) from public.cotizaciones where id = a)
     or r -> 'encima' is distinct from jsonb_build_object('id', c, 'numero', v_num, 'version', 3) then
    raise exception 'L5: la dueña: % / %', r -> 'anterior', r -> 'encima';
  end if;
  r := pg_temp.hg_hoja(ve, b);
  if r ? 'error' or jsonb_typeof(r -> 'anterior') is distinct from 'null' or r -> 'encima' is distinct from '{"oculta": true}'::jsonb then
    raise exception 'L5: ve: % / %', r -> 'anterior', r -> 'encima';
  end if;
  if r::text like '%' || c::text || '%' or exists (select 1 from jsonb_path_query(r, 'strict $.**.numero') n where n = to_jsonb(v_num)) then
    raise exception 'L5: ve recibe el id o el número de la versión nueva';
  end if;
  -- La versión nueva en la papelera ya no cuenta.
  update public.cotizaciones set eliminado_en = now() where id = c;
  r := pg_temp.hg_hoja(duena, b);
  if jsonb_typeof(r -> 'encima') is distinct from 'null' then raise exception 'L5: la nueva en la papelera: %', r -> 'encima'; end if;
end $$;
rollback;

-- @test cotizacion_hoja_guardada: L6 puede_cotizar_encima pide crear, ver el lead y el vehículo (o que no sea obligatorio), ninguna versión nueva viva y una publicada
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t jsonb := pg_temp.hg_terreno(); d uuid; sv uuid; sc uuid; nl uuid; nv uuid; r jsonb;
begin
  sc := pg_temp.hg_persona(gen_random_uuid(), pg_temp.hg_c('cotizaciones.ver', 'leads.ver', 'vehiculos.ver'));
  nl := pg_temp.hg_persona(gen_random_uuid(), pg_temp.hg_c('cotizaciones.ver', 'cotizaciones.crear', 'vehiculos.ver'));
  nv := pg_temp.hg_persona(gen_random_uuid(), pg_temp.hg_c('cotizaciones.ver', 'cotizaciones.crear', 'leads.ver'));
  d := pg_temp.hg_cot(t, duena);
  if not (pg_temp.hg_hoja(duena, d) -> 'puede_cotizar_encima')::boolean then raise exception 'L6: la dueña: %', pg_temp.hg_hoja(duena, d); end if;
  if (pg_temp.hg_hoja(sc, d) -> 'puede_cotizar_encima')::boolean is distinct from false then raise exception 'L6: sin crear'; end if;
  if (pg_temp.hg_hoja(nl, d) -> 'puede_cotizar_encima')::boolean is distinct from false then raise exception 'L6: sin ver el lead'; end if;
  if (pg_temp.hg_hoja(nv, d) -> 'puede_cotizar_encima')::boolean is distinct from false then raise exception 'L6: sin ver el vehículo'; end if;
  -- Sin vehículo: depende del ajuste «obligatorio».
  sv := pg_temp.hg_cot(t, duena, p_sin_vehiculo => true);
  if (pg_temp.hg_hoja(duena, sv) -> 'puede_cotizar_encima')::boolean is distinct from false then raise exception 'L6: sin vehículo y obligatorio'; end if;
  update public.ajustes_empresa set vehiculo_obligatorio_al_cotizar = false where id = 1;
  if (pg_temp.hg_hoja(duena, sv) -> 'puede_cotizar_encima')::boolean is distinct from true then raise exception 'L6: sin vehículo y no obligatorio'; end if;
  -- Con una versión nueva viva, no.
  perform pg_temp.hg_cot(t, duena, d);
  if (pg_temp.hg_hoja(duena, d) -> 'puede_cotizar_encima')::boolean is distinct from false then raise exception 'L6: con una versión nueva'; end if;
  -- Sin publicada, no.
  update public.formulas set estado = 'archivada' where id = (t ->> 'f')::uuid;
  r := pg_temp.hg_hoja(duena, sv);
  if (r -> 'puede_cotizar_encima')::boolean is distinct from false or jsonb_typeof(r -> 'publicada') is distinct from 'null' then raise exception 'L6: sin publicada: %', r -> 'publicada'; end if;
end $$;
rollback;

-- @test cotizacion_hoja_guardada: L7 la vigencia: vence el día de creado_en en la zona de la empresa + vigencia_dias; vencida por día, con la sesión en cualquier zona
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t jsonb := pg_temp.hg_terreno(); z text; hoy date; c_0 uuid; c_8 uuid; c_n uuid; c_2 uuid; v_tz text; r jsonb; v_err text;
begin
  select zona_horaria into z from public.ajustes_empresa where id = 1;
  hoy := (now() at time zone z)::date;
  -- A la medianoche local de hoy−7 (y unos segundos): vale hasta hoy. A las 23:59 locales de hoy−8: venció ayer. A las 23:30 locales de hoy−8 (el día siguiente en UTC): también.
  c_0 := pg_temp.hg_cot(t, duena, p_creado => ((hoy - 7)::timestamp at time zone z) + interval '5 seconds');
  c_8 := pg_temp.hg_cot(t, duena, p_vehiculo => (t ->> 'v2')::uuid, p_creado => ((hoy - 8)::timestamp + interval '23 hours 59 minutes') at time zone z);
  c_n := pg_temp.hg_cot(t, duena, p_sin_vehiculo => true, p_creado => ((hoy - 8)::timestamp + interval '23 hours 30 minutes') at time zone z);
  foreach v_tz in array array['UTC', 'Etc/GMT-14', 'Etc/GMT+12'] loop
    perform set_config('timezone', v_tz, true);
    r := pg_temp.hg_hoja(duena, c_0);
    if r ->> 'vence_el' is distinct from hoy::text or (r -> 'vencida')::boolean is distinct from false then raise exception 'L7 (%): la de hoy−7: % %', v_tz, r -> 'vence_el', r -> 'vencida'; end if;
    r := pg_temp.hg_hoja(duena, c_8);
    if r ->> 'vence_el' is distinct from (hoy - 1)::text or (r -> 'vencida')::boolean is distinct from true then raise exception 'L7 (%): la de hoy−8: % %', v_tz, r -> 'vence_el', r -> 'vencida'; end if;
    r := pg_temp.hg_hoja(duena, c_n);
    if r ->> 'vence_el' is distinct from (hoy - 1)::text or (r -> 'vencida')::boolean is distinct from true then raise exception 'L7 (%): la de las 23:30: % %', v_tz, r -> 'vence_el', r -> 'vencida'; end if;
  end loop;
  -- Con un día de vigencia, la de hace dos días está vencida; el check rechaza 0 y 366.
  update public.ajustes_empresa set vigencia_dias = 1 where id = 1;
  c_2 := pg_temp.hg_cot(t, duena, p_vehiculo => (t ->> 'v2')::uuid, p_creado => ((hoy - 2)::timestamp + interval '12 hours') at time zone z);
  r := pg_temp.hg_hoja(duena, c_2);
  if r ->> 'vence_el' is distinct from (hoy - 1)::text or not (r -> 'vencida')::boolean then raise exception 'L7: con 1 día: % %', r -> 'vence_el', r -> 'vencida'; end if;
  foreach v_err in array array['0', '366'] loop
    begin update public.ajustes_empresa set vigencia_dias = v_err::int where id = 1; raise exception 'L7: vigencia_dias = % pasó el check', v_err;
    exception when check_violation then null; end;
  end loop;
  if (select vigencia_dias from public.ajustes_empresa where id = 1) <> 1 then raise exception 'L7: el check dejó escribir'; end if;
end $$;
rollback;

-- @test cotizacion_hoja_guardada: L8 la lectura es de quien inicia sesión y sus ayudantes de nadie; las tres, prosecdef con search_path vacío; la de dos argumentos ya no existe
do $$
declare v_f text; p record;
begin
  if to_regprocedure('public._cotizacion_hoja(uuid, uuid)') is not null then raise exception 'L8: _cotizacion_hoja(uuid, uuid) sigue existiendo'; end if;
  foreach v_f in array array['public.cotizacion_hoja_guardada(uuid)', 'public._cotizacion_hoja(uuid, uuid, boolean)', 'public._cotizacion_cadena(public.cotizaciones, uuid)'] loop
    if to_regprocedure(v_f) is null then raise exception 'L8: % no existe', v_f; end if;
    select * into p from pg_proc x where x.oid = to_regprocedure(v_f);
    if not p.prosecdef or p.proconfig is distinct from array['search_path=""'] then raise exception 'L8: % prosecdef % proconfig %', v_f, p.prosecdef, p.proconfig; end if;
    if has_function_privilege('anon', v_f, 'execute') then raise exception 'L8: anon ejecuta %', v_f; end if;
    if has_function_privilege('authenticated', v_f, 'execute') is distinct from (v_f = 'public.cotizacion_hoja_guardada(uuid)') then
      raise exception 'L8: authenticated y %', v_f;
    end if;
  end loop;
end $$;
