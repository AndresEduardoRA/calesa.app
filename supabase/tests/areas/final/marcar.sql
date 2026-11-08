-- Marcar una cotización como final (paso 4.25-1): mira sin candado, toma lead → vehículo → cotizaciones, vuelve a mirar con todo tomado y aplica los efectos
-- en `_final_aplicar()`. No depende de otro archivo (`SOLO=areas/final/marcar.sql`). Cada bloque que escribe abre su transacción y la revierte.
-- El orden de candados en el cuerpo (F10) y el ayudante (F11, F12) están en `marcar-candados.sql`; las carreras, en `carreras.mjs`.
--
-- Qué asegura:
--   F1. Quien no la ve (o una inexistente) recibe «No tienes acceso a esta cotización.» sin cambiar nada; ver se mira antes del primer candado.
--   F2. Sin `cotizaciones.final.gestionar`: «No tienes permiso para marcar la final.».
--   F3. El lead en la papelera: 23514, sin clase, vínculo ni papelera.
--   F4. Sin el lead en la cartera (P2 a): el 42501 de `_lead_mio`.
--   F5. El vehículo de otro lead (P4 a): 23514, nada cambia.
--   F6. El caso entero: final; la anterior y las preventas a un lote de quien marca con su resumen; vínculo con su historial; el lead al primer tipo activo
--       de clase cliente por orden y nombre; la actividad; su papelera muestra exactamente las enviadas.
--   F7. Un lead ya de clase cliente no cambia de tipo.  F8. Marcar dos veces no falla ni cambia nada.
--   F9. Una preventa que quien marca no ve, o ve y no puede mandar a la papelera (P3 a): 42501 con su texto, nada cambia; se mira antes del primer candado.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (alcance «todos») o 'clave:propios'.
create or replace function pg_temp.mf_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('mf_' || substr(v_id::text, 1, 8), 'MF ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Quien marca: ve, edita y gestiona finales en todo, y ve y edita leads (los de su cartera).
create or replace function pg_temp.mf_marca() returns uuid language sql as $f$
  select pg_temp.mf_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'cotizaciones.final.gestionar', 'leads.ver', 'leads.editar']);
$f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje} si falla.
create or replace function pg_temp.mf_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m);
  end;
  reset role;
  return coalesce(v, '{}'::jsonb);
end $f$;

-- Marca esa cotización como esa persona.
create or replace function pg_temp.mf_marcar(p_quien uuid, p_c uuid) returns jsonb language sql as $f$
  select pg_temp.mf_corre(p_quien, format('select jsonb_build_object(''ok'', true) from (select public.cotizacion_marcar_final(%L)) x', p_c));
$f$;

-- Da ese error (sqlstate y mensaje exactos).
create or replace function pg_temp.mf_da_error(p_que text, p_r jsonb, p_estado text, p_mensaje text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje then
    raise exception '%: debía dar % «%» y dio %', p_que, p_estado, p_mensaje, p_r;
  end if;
end $f$;

-- Un origen con una fórmula publicada mínima.
create or replace function pg_temp.mf_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid;
begin
  insert into public.origenes (clave, nombre) values ('mf_' || substr(gen_random_uuid()::text, 1, 8), 'MF origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
            jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen'))),
          '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Un lead de esa persona (en su cartera, por el trigger del alta), con un teléfono propio.
create or replace function pg_temp.mf_lead(p_quien uuid) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('MF lead', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), p_quien)
  returning id into v;
  return v;
end $f$;

-- Un vehículo de ese origen, sin lead.
create or replace function pg_temp.mf_vehiculo(e jsonb) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'MF vehículo', 'toyota') returning id into v;
  return v;
end $f$;

-- Una cotización viva de esa persona, de ese lead y ese vehículo.
create or replace function pg_temp.mf_cot(p_quien uuid, e jsonb, p_lead uuid, p_vehiculo uuid, p_clase text default 'preventa') returns uuid language plpgsql as $f$
declare v_c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, vehiculo_id, clase, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_lead, p_vehiculo, p_clase::public.clase_cotizacion, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into v_c;
  return v_c;
end $f$;

-- Lo que marcar puede cambiar de un vehículo, en una foto: clases y vida de sus cotizaciones, su lead, sus vínculos, los lotes y el tipo de un lead.
create or replace function pg_temp.mf_foto(p_v uuid, p_lead uuid) returns jsonb language sql as $f$
  select jsonb_build_object(
    'cotizaciones', (select jsonb_agg(jsonb_build_array(c.id, c.clase, c.eliminado_en is null, c.lote_papelera_id) order by c.id) from public.cotizaciones c where c.vehiculo_id = p_v),
    'lead_del_vehiculo', (select v.lead_id from public.vehiculos v where v.id = p_v),
    'vinculos', (select count(*) from public.vehiculos_vinculos k where k.vehiculo_id = p_v),
    'lotes', (select count(*) from public.lotes_papelera),
    'tipo', (select l.tipo_lead_id from public.leads l where l.id = p_lead));
$f$;

-- @test marcar final: quien no la ve (o una inexistente) recibe el 42501 de lo inexistente sin cambiar nada; ver va antes del primer candado (F1)
begin;
do $$
declare
  e jsonb := pg_temp.mf_origen(); jefa uuid := pg_temp.mf_marca(); ciego uuid; l uuid; v uuid; c uuid; antes jsonb; src text;
  acceso constant text := 'No tienes acceso a esta cotización.';
begin
  ciego := pg_temp.mf_persona(array['cotizaciones.editar', 'cotizaciones.final.gestionar', 'leads.ver', 'leads.editar']);
  l := pg_temp.mf_lead(jefa); v := pg_temp.mf_vehiculo(e); c := pg_temp.mf_cot(jefa, e, l, v);
  antes := pg_temp.mf_foto(v, l);
  perform pg_temp.mf_da_error('quien no la ve', pg_temp.mf_marcar(ciego, c), '42501', acceso);
  perform pg_temp.mf_da_error('una inexistente', pg_temp.mf_marcar(jefa, gen_random_uuid()), '42501', acceso);
  if pg_temp.mf_foto(v, l) is distinct from antes then raise exception 'quien no la ve cambió algo: % → %', antes, pg_temp.mf_foto(v, l); end if;
  select pg_get_functiondef('public.cotizacion_marcar_final(uuid)'::regprocedure) into src;
  if position('puede_cotizacion(' in src) = 0 or position('puede_cotizacion(' in src) > regexp_instr(src, 'for\s+(no\s+key\s+update|key\s+share|update|share)') then
    raise exception 'marcar toma un candado antes de mirar si quien llama la ve: quien no la ve esperaría (4-68)'; end if;
end $$;
reset role;
rollback;

-- @test marcar final: sin cotizaciones.final.gestionar, el 42501 de permiso (F2)
begin;
do $$
declare e jsonb := pg_temp.mf_origen(); ed uuid; l uuid; v uuid; c uuid;
begin
  perform pg_temp.mf_marca();   -- con `SOLO=`, la primera cuenta nace dueña (con todo): no puede ser la que prueba
  ed := pg_temp.mf_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'leads.ver', 'leads.editar']);
  l := pg_temp.mf_lead(ed); v := pg_temp.mf_vehiculo(e); c := pg_temp.mf_cot(ed, e, l, v);
  perform pg_temp.mf_da_error('sin final.gestionar', pg_temp.mf_marcar(ed, c), '42501', 'No tienes permiso para marcar la final.');
end $$;
reset role;
rollback;

-- @test marcar final: con el lead en la papelera, 23514 y nada cambia (F3)
begin;
do $$
declare e jsonb := pg_temp.mf_origen(); m uuid := pg_temp.mf_marca(); l uuid; v uuid; c uuid; p uuid; v_lote uuid; antes jsonb;
begin
  l := pg_temp.mf_lead(m); v := pg_temp.mf_vehiculo(e); c := pg_temp.mf_cot(m, e, l, v); p := pg_temp.mf_cot(m, e, l, v);
  insert into public.lotes_papelera (tipo, creado_por) values ('leads', m) returning id into v_lote;
  update public.leads set eliminado_en = now(), eliminado_por = m, lote_papelera_id = v_lote where id = l;
  antes := pg_temp.mf_foto(v, l);
  perform pg_temp.mf_da_error('el lead en la papelera', pg_temp.mf_marcar(m, c), '23514',
    'El lead de esta cotización está en la papelera. Restáuralo antes de marcarla final.');
  if pg_temp.mf_foto(v, l) is distinct from antes then raise exception 'con el lead en la papelera cambió algo: % → %', antes, pg_temp.mf_foto(v, l); end if;
end $$;
reset role;
rollback;

-- @test marcar final: sin el lead en la cartera (P2 a), el 42501 de _lead_mio (F4)
begin;
do $$
declare e jsonb := pg_temp.mf_origen(); m uuid := pg_temp.mf_marca(); otra uuid := pg_temp.mf_marca(); l uuid; v uuid; c uuid; antes jsonb;
begin
  l := pg_temp.mf_lead(otra); v := pg_temp.mf_vehiculo(e); c := pg_temp.mf_cot(m, e, l, v);
  antes := pg_temp.mf_foto(v, l);
  perform pg_temp.mf_da_error('sin el lead en la cartera', pg_temp.mf_marcar(m, c), '42501', 'No encontramos este lead o no tienes acceso.');
  if pg_temp.mf_foto(v, l) is distinct from antes then raise exception 'sin la cartera cambió algo'; end if;
end $$;
reset role;
rollback;

-- @test marcar final: el vehículo vinculado a otro lead (P4 a), 23514 y nada cambia (F5)
begin;
do $$
declare e jsonb := pg_temp.mf_origen(); m uuid := pg_temp.mf_marca(); l uuid; l2 uuid; v uuid; c uuid; antes jsonb;
begin
  l := pg_temp.mf_lead(m); l2 := pg_temp.mf_lead(m); v := pg_temp.mf_vehiculo(e); c := pg_temp.mf_cot(m, e, l, v);
  perform pg_temp.mf_cot(m, e, l, v);
  update public.vehiculos set lead_id = l2 where id = v;
  antes := pg_temp.mf_foto(v, l);
  perform pg_temp.mf_da_error('el vehículo de otro lead', pg_temp.mf_marcar(m, c), '23514',
    'Este vehículo está vinculado a otro lead. Desvincúlalo antes de marcar la final.');
  if pg_temp.mf_foto(v, l) is distinct from antes then raise exception 'con el vehículo de otro lead cambió algo: % → %', antes, pg_temp.mf_foto(v, l); end if;
end $$;
reset role;
rollback;

-- @test marcar final: el caso entero, con la anterior y las preventas en un lote, el vínculo, el lead a cliente y la actividad (F6, F9 en la papelera)
begin;
do $$
declare
  e jsonb := pg_temp.mf_origen(); m uuid := pg_temp.mf_marca(); l uuid; v uuid; c uuid; f uuid; p uuid; t_a uuid; v_lote uuid; r jsonb; ids jsonb;
begin
  -- Un cliente inactivo de orden menor y dos activos de igual orden: gana el primero por nombre.
  insert into public.tipos_lead (clave, nombre, clase, activo, orden) values ('mf_inactivo', 'MF 0 inactivo', 'cliente', false, -100);
  insert into public.tipos_lead (clave, nombre, clase, activo, orden) values ('mf_b', 'MF B cliente', 'cliente', true, -50);
  insert into public.tipos_lead (clave, nombre, clase, activo, orden) values ('mf_a', 'MF A cliente', 'cliente', true, -50) returning id into t_a;
  l := pg_temp.mf_lead(m); v := pg_temp.mf_vehiculo(e);
  c := pg_temp.mf_cot(m, e, l, v); f := pg_temp.mf_cot(m, e, l, v, 'final'); p := pg_temp.mf_cot(m, e, l, v);
  r := pg_temp.mf_marcar(m, c);
  if r ? 'error' then raise exception 'quien puede no marcó: %', r; end if;
  if (select clase::text from public.cotizaciones where id = c) <> 'final' or (select eliminado_en from public.cotizaciones where id = c) is not null then
    raise exception 'la marcada no quedó final y viva'; end if;
  if (select clase::text from public.cotizaciones where id = f) <> 'preventa' then raise exception 'la final anterior no bajó a preventa'; end if;
  select lote_papelera_id into v_lote from public.cotizaciones where id = f and eliminado_en is not null and eliminado_por = m;
  if v_lote is null or (select count(*) from public.cotizaciones where lote_papelera_id = v_lote and eliminado_en is not null) <> 2
     or (select lote_papelera_id from public.cotizaciones where id = p) is distinct from v_lote then
    raise exception 'la anterior y la preventa no quedaron en un solo lote'; end if;
  if (select tipo::text from public.lotes_papelera where id = v_lote) <> 'cotizaciones' or (select creado_por from public.lotes_papelera where id = v_lote) is distinct from m then
    raise exception 'el lote no es de cotizaciones o no es de quien marca'; end if;
  if (select resumen from public.lotes_papelera where id = v_lote) is distinct from '{"cantidad": 2, "restaurados": 0, "purgados": 0}'::jsonb then
    raise exception 'el resumen del lote no es el esperado: %', (select resumen from public.lotes_papelera where id = v_lote); end if;
  if (select lead_id from public.vehiculos where id = v) is distinct from l then raise exception 'el vehículo no quedó con el lead'; end if;
  if (select count(*) from public.vehiculos_vinculos where vehiculo_id = v and lead_id = l and hasta is null) <> 1 then raise exception 'el vínculo no quedó en el historial'; end if;
  if (select tipo_lead_id from public.leads where id = l) is distinct from t_a then raise exception 'el lead no pasó al primer tipo activo de clase cliente por orden y nombre'; end if;
  if not exists (select 1 from public.actividad a where a.accion = 'cotizacion.final' and a.registro_id = c::text and a.actor_id = m
                  and (a.despues -> 'lead_a_cliente') = 'true'::jsonb and (a.despues -> 'preventas_a_papelera') = '2'::jsonb) then
    raise exception 'la actividad no dice lo que pasó: %', (select jsonb_agg(a.despues) from public.actividad a where a.registro_id = c::text); end if;
  -- Su papelera muestra exactamente las enviadas: en la lista y en el lote.
  r := pg_temp.mf_corre(m, 'select public.cotizaciones_papelera_listar()');
  if jsonb_array_length(r) <> 1 or (r -> 0 ->> 'id')::uuid is distinct from v_lote or (r -> 0 -> 'enviados') <> '2'::jsonb then raise exception 'la lista de su papelera no es la esperada: %', r; end if;
  ids := (select jsonb_agg(x order by x) from jsonb_path_query(r, '$[0].cotizaciones[*].id') x);
  if ids is distinct from (select jsonb_agg(to_jsonb(x) order by to_jsonb(x)) from unnest(array[f, p]) x) then raise exception 'la lista muestra otras cotizaciones: %', ids; end if;
  r := pg_temp.mf_corre(m, format('select public.cotizaciones_papelera_lote(%L)', v_lote));
  ids := (select jsonb_agg(x order by x) from jsonb_path_query(r, '$.cotizaciones[*].id') x);
  if ids is distinct from (select jsonb_agg(to_jsonb(x) order by to_jsonb(x)) from unnest(array[f, p]) x) or (r -> 'enviados') <> '2'::jsonb then
    raise exception 'el lote muestra otras cotizaciones: %', r; end if;
end $$;
reset role;
rollback;

-- @test marcar final: un lead ya de clase cliente no cambia de tipo (F7)
begin;
do $$
declare e jsonb := pg_temp.mf_origen(); m uuid := pg_temp.mf_marca(); l uuid; v uuid; c uuid; t_b uuid; r jsonb;
begin
  insert into public.tipos_lead (clave, nombre, clase, activo, orden) values ('mf_a', 'MF A cliente', 'cliente', true, -50);
  insert into public.tipos_lead (clave, nombre, clase, activo, orden) values ('mf_b', 'MF B cliente', 'cliente', true, -40) returning id into t_b;
  l := pg_temp.mf_lead(m); v := pg_temp.mf_vehiculo(e); c := pg_temp.mf_cot(m, e, l, v);
  update public.leads set tipo_lead_id = t_b where id = l;
  r := pg_temp.mf_marcar(m, c);
  if r ? 'error' then raise exception 'no marcó: %', r; end if;
  if (select tipo_lead_id from public.leads where id = l) is distinct from t_b then raise exception 'cambió el tipo de un lead que ya era de clase cliente'; end if;
end $$;
reset role;
rollback;

-- @test marcar final: marcar dos veces no falla ni cambia nada (F8)
begin;
do $$
declare e jsonb := pg_temp.mf_origen(); m uuid := pg_temp.mf_marca(); l uuid; v uuid; c uuid; r jsonb; antes jsonb;
begin
  l := pg_temp.mf_lead(m); v := pg_temp.mf_vehiculo(e); c := pg_temp.mf_cot(m, e, l, v); perform pg_temp.mf_cot(m, e, l, v);
  r := pg_temp.mf_marcar(m, c);
  if r ? 'error' then raise exception 'la primera no marcó: %', r; end if;
  antes := pg_temp.mf_foto(v, l);
  r := pg_temp.mf_marcar(m, c);
  if r ? 'error' then raise exception 'la segunda falló: %', r; end if;
  if pg_temp.mf_foto(v, l) is distinct from antes then raise exception 'la segunda cambió algo: % → %', antes, pg_temp.mf_foto(v, l); end if;
end $$;
reset role;
rollback;

-- @test marcar final: una preventa que quien marca no ve, o ve y no puede mandar a la papelera (P3 a), da el 42501 de C1.8 y nada cambia (F9)
begin;
do $$
declare
  e jsonb := pg_temp.mf_origen(); jefa uuid := pg_temp.mf_marca(); m uuid; l uuid; v uuid; c uuid; antes jsonb; src text;
  texto constant text := 'Este vehículo tiene preventas que no puedes mandar a la papelera. Pídeselo a quien las cotizó o a quien modera.';
begin
  -- 1. No la ve: ve sólo las suyas y las de su cartera; la otra es de la jefa, con un lead de la jefa.
  m := pg_temp.mf_persona(array['cotizaciones.ver:propios', 'cotizaciones.editar:propios', 'cotizaciones.final.gestionar', 'cotizaciones.moderar', 'leads.ver', 'leads.editar']);
  l := pg_temp.mf_lead(m); v := pg_temp.mf_vehiculo(e); c := pg_temp.mf_cot(m, e, l, v);
  perform pg_temp.mf_cot(jefa, e, pg_temp.mf_lead(jefa), v);
  antes := pg_temp.mf_foto(v, l);
  perform pg_temp.mf_da_error('una preventa que no ve', pg_temp.mf_marcar(m, c), '42501', texto);
  if pg_temp.mf_foto(v, l) is distinct from antes then raise exception 'con una que no ve cambió algo: % → %', antes, pg_temp.mf_foto(v, l); end if;
  -- 2. La ve y no puede mandarla: ve todas, edita las suyas y no modera.
  m := pg_temp.mf_persona(array['cotizaciones.ver', 'cotizaciones.editar:propios', 'cotizaciones.final.gestionar', 'leads.ver', 'leads.editar']);
  l := pg_temp.mf_lead(m); v := pg_temp.mf_vehiculo(e); c := pg_temp.mf_cot(m, e, l, v);
  perform pg_temp.mf_cot(jefa, e, pg_temp.mf_lead(jefa), v);
  antes := pg_temp.mf_foto(v, l);
  perform pg_temp.mf_da_error('una preventa que ve y no puede mandar', pg_temp.mf_marcar(m, c), '42501', texto);
  if pg_temp.mf_foto(v, l) is distinct from antes then raise exception 'con una que no puede mandar cambió algo: % → %', antes, pg_temp.mf_foto(v, l); end if;
  -- 3. Ese rechazo se mira también sin candado, antes del primero: quien no puede no espera a nadie (C1.8; con todo tomado se vuelve a mirar, C3.iii).
  select pg_get_functiondef('public.cotizacion_marcar_final(uuid)'::regprocedure) into src;
  if position(texto in src) = 0 or position(texto in src) > regexp_instr(src, 'for\s+(no\s+key\s+update|key\s+share|update|share)') then
    raise exception 'marcar no rechaza sin candado una preventa que quien marca no puede mandar a la papelera (C1.8)'; end if;
end $$;
reset role;
rollback;
