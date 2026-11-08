-- La cotización final como ancla de la limpieza automática y del vínculo del vehículo (paso 4.25-1). No depende de otro archivo (`SOLO=areas/final/ancla-y-desvincular.sql`).
-- Cada bloque que escribe abre su transacción y la revierte.
--
-- Qué asegura:
--   A1. Un importado de subasta vencido, sin lead, con una final activa y viva: `_limpieza_ancla` da 'cotizacion_final', `limpieza_el` nulo, y la limpieza
--       lo salta y lo cuenta en `saltados.cotizacion_final`; el mismo sin final se va a la papelera (la carrera existe).
--   A2. Una final en la papelera, reportada o inválida no ancla; con lead, gana 'vinculo'.
--   A3. Con una final activa con lead, `vehiculo_vincular` no desvincula ni pasa a otro lead (23514, P5 a); el mismo lead da `sin_cambios`; en la papelera o
--       sin lead, desvincula; se compara con el lead de la final (dato viejo: la final de L1 y el vehículo de L2).

-- Un origen de subasta con una fórmula publicada mínima.
create or replace function pg_temp.af_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid;
begin
  insert into public.origenes (clave, nombre, tipo) values ('af_' || substr(gen_random_uuid()::text, 1, 8), 'AF origen ' || substr(gen_random_uuid()::text, 1, 8), 'subasta') returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
            jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen'))),
          '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Un importado de esa subasta que terminó hace un mes (vencido), sin lead.
create or replace function pg_temp.af_vencido(e jsonb) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, marca, importado_apibara, estado_subasta, subasta_fin_en)
  values ((e ->> 'o')::uuid, 'AF vencido', 'toyota', true, 'terminada', now() - interval '30 days') returning id into v;
  return v;
end $f$;

-- Una cotización de ese vehículo, de esa clase, sin lead, de una persona nueva.
create or replace function pg_temp.af_cot(e jsonb, p_v uuid, p_clase text) returns uuid language plpgsql as $f$
declare c uuid; q uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (q, q || '@ejemplo.com', '{"invitado": true}');
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, clase, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, q, (e ->> 'f')::uuid, p_v, p_clase::public.clase_cotizacion, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into c;
  return c;
end $f$;

create or replace function pg_temp.af_ancla(p_v uuid) returns text language sql as $f$
  select public._limpieza_ancla(v) from public.vehiculos v where v.id = p_v;
$f$;

-- @test limpieza: una cotización final activa ancla el vehículo; la limpieza lo salta y lo cuenta (A1)
begin;
do $$
declare e jsonb := pg_temp.af_origen(); v uuid; sin uuid; r jsonb;
begin
  update public.ajustes_empresa set limpieza_automatica = true where id = 1;
  v := pg_temp.af_vencido(e); perform pg_temp.af_cot(e, v, 'final');
  sin := pg_temp.af_vencido(e); perform pg_temp.af_cot(e, sin, 'preventa');
  if pg_temp.af_ancla(v) is distinct from 'cotizacion_final' then raise exception 'con una final el ancla debía ser cotizacion_final y es %', pg_temp.af_ancla(v); end if;
  if (select public.limpieza_el(x) from public.vehiculos x where x.id = v) is not null then raise exception 'con una final todavía tiene fecha de limpieza'; end if;
  if (select public.limpieza_el(x) from public.vehiculos x where x.id = sin) is null then raise exception 'sin final no tiene fecha de limpieza (la prueba no prueba nada)'; end if;
  r := public.limpieza_automatica_correr(now(), array[(e ->> 'o')::uuid]);
  if (r -> 'saltados' -> 'cotizacion_final') is distinct from '1'::jsonb then raise exception 'la limpieza no contó el ancla: %', r; end if;
  if (select eliminado_en from public.vehiculos where id = v) is not null then raise exception 'la limpieza mandó a la papelera un vehículo con final'; end if;
  if (select eliminado_en from public.vehiculos where id = sin) is null then raise exception 'la limpieza no movió el que no tiene final: %', r; end if;
end $$;
rollback;

-- @test limpieza: una final en la papelera, reportada o inválida no ancla; con lead gana el vínculo (A2)
begin;
do $$
declare e jsonb := pg_temp.af_origen(); v uuid; c uuid; v_lote uuid; l uuid; q uuid := gen_random_uuid();
begin
  update public.ajustes_empresa set limpieza_automatica = true where id = 1;
  v := pg_temp.af_vencido(e); c := pg_temp.af_cot(e, v, 'final');
  update public.cotizaciones set estado = 'reportada' where id = c;
  if pg_temp.af_ancla(v) is not null then raise exception 'una final reportada ancló: %', pg_temp.af_ancla(v); end if;
  update public.cotizaciones set estado = 'invalida' where id = c;
  if pg_temp.af_ancla(v) is not null then raise exception 'una final inválida ancló: %', pg_temp.af_ancla(v); end if;
  update public.cotizaciones set estado = 'activa' where id = c;
  insert into public.lotes_papelera (tipo, creado_por) values ('cotizaciones', null) returning id into v_lote;
  update public.cotizaciones set eliminado_en = now(), lote_papelera_id = v_lote where id = c;
  if pg_temp.af_ancla(v) is not null then raise exception 'una final en la papelera ancló: %', pg_temp.af_ancla(v); end if;
  -- Con lead, el vínculo va antes que la final.
  update public.cotizaciones set eliminado_en = null, lote_papelera_id = null where id = c;
  insert into auth.users (id, email, raw_app_meta_data) values (q, q || '@ejemplo.com', '{"invitado": true}');
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('AF lead', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), q) returning id into l;
  update public.vehiculos set lead_id = l where id = v;
  if pg_temp.af_ancla(v) is distinct from 'vinculo' then raise exception 'con lead el ancla debía ser vinculo y es %', pg_temp.af_ancla(v); end if;
end $$;
rollback;

-- Una persona que ve y edita vehículos y leads (los de su cartera), con un lead suyo nuevo cada vez.
create or replace function pg_temp.af_persona() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('af_' || substr(v_id::text, 1, 8), 'AF ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array array['vehiculos.ver', 'vehiculos.editar', 'leads.ver', 'leads.editar'] loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.af_lead(p_quien uuid) returns uuid language plpgsql as $f$
declare l uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('AF lead', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), p_quien) returning id into l;
  return l;
end $f$;

-- Vincula (o desvincula, con p_lead nulo) como esa persona, con la versión de ahora; devuelve el resultado o {error, mensaje}.
create or replace function pg_temp.af_vincular(p_quien uuid, p_v uuid, p_lead uuid) returns jsonb language plpgsql as $f$
declare r jsonb; v_m text; v_e text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  set local role authenticated;
  begin
    r := public.vehiculo_vincular(p_v, (select actualizado_en from public.vehiculos where id = p_v), p_lead);
  exception when others then
    get stacked diagnostics v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m);
  end;
  reset role;
  return r;
end $f$;

-- @test vincular: con una cotización final activa el vínculo no cambia; en la papelera o sin lead, sí; se compara con el lead de la final (A3)
begin;
do $$
declare
  e jsonb := pg_temp.af_origen(); q uuid; l1 uuid; l2 uuid; l3 uuid; v uuid; f uuid; r jsonb; v_lote uuid;
  frena constant text := 'Este vehículo tiene una cotización final: su vínculo no cambia. Para cambiarlo, manda la final a la papelera.';
begin
  perform pg_temp.af_persona();   -- con `SOLO=`, la primera cuenta nace dueña: no puede ser la que prueba
  q := pg_temp.af_persona(); l1 := pg_temp.af_lead(q); l2 := pg_temp.af_lead(q); l3 := pg_temp.af_lead(q);
  v := pg_temp.af_vencido(e); f := pg_temp.af_cot(e, v, 'final');
  update public.cotizaciones set lead_id = l1 where id = f;
  update public.vehiculos set lead_id = l1 where id = v;
  r := pg_temp.af_vincular(q, v, null);
  if r ->> 'error' is distinct from '23514' or r ->> 'mensaje' is distinct from frena then raise exception 'desvincular con final debía dar el 23514 y dio %', r; end if;
  r := pg_temp.af_vincular(q, v, l2);
  if r ->> 'error' is distinct from '23514' or r ->> 'mensaje' is distinct from frena then raise exception 'reemplazar con final debía dar el 23514 y dio %', r; end if;
  r := pg_temp.af_vincular(q, v, l1);
  if r ->> 'resultado' is distinct from 'sin_cambios' then raise exception 'el mismo lead debía dar sin_cambios y dio %', r; end if;
  if (select lead_id from public.vehiculos where id = v) is distinct from l1 then raise exception 'el vínculo cambió'; end if;
  -- Dato viejo: la final con L1 y el vehículo con L2. Desvincular o pasar a L3 frenan; pasar a L1 vuelve a quedar coherente.
  update public.vehiculos set lead_id = l2 where id = v;
  r := pg_temp.af_vincular(q, v, null);
  if r ->> 'error' is distinct from '23514' then raise exception 'con el dato viejo, desvincular debía frenar y dio %', r; end if;
  r := pg_temp.af_vincular(q, v, l3);
  if r ->> 'error' is distinct from '23514' then raise exception 'con el dato viejo, pasar a otro lead debía frenar y dio %', r; end if;
  r := pg_temp.af_vincular(q, v, l1);
  if r ->> 'resultado' is distinct from 'reemplazado' then raise exception 'con el dato viejo, volver al lead de la final debía pasar y dio %', r; end if;
  -- La final en la papelera no frena.
  insert into public.lotes_papelera (tipo, creado_por) values ('cotizaciones', q) returning id into v_lote;
  update public.cotizaciones set eliminado_en = now(), lote_papelera_id = v_lote where id = f;
  r := pg_temp.af_vincular(q, v, null);
  if r ->> 'resultado' is distinct from 'desvinculado' then raise exception 'con la final en la papelera debía desvincular y dio %', r; end if;
  -- Una final sin lead (lo purgaron) no frena.
  update public.cotizaciones set eliminado_en = null, lote_papelera_id = null, lead_id = null where id = f;
  update public.vehiculos set lead_id = l1 where id = v;
  r := pg_temp.af_vincular(q, v, null);
  if r ->> 'resultado' is distinct from 'desvinculado' then raise exception 'con una final sin lead debía desvincular y dio %', r; end if;
end $$;
reset role;
rollback;
