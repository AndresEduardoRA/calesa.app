-- La cotización final como ancla de la limpieza automática (paso 4.25-1). No depende de otro archivo (`SOLO=areas/final/ancla-y-desvincular.sql`).
-- Cada bloque que escribe abre su transacción y la revierte.
--
-- Qué asegura:
--   A1. Un importado de subasta vencido, sin lead, con una final activa y viva: `_limpieza_ancla` da 'cotizacion_final', `limpieza_el` nulo, y la limpieza
--       lo salta y lo cuenta en `saltados.cotizacion_final`; el mismo sin final se va a la papelera (la carrera existe).
--   A2. Una final en la papelera, reportada o inválida no ancla; con lead, gana 'vinculo'.

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
