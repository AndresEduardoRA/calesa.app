-- Purgar un vehículo o un lead que nombra una cotización de la papelera: queda bloqueado con su motivo, y la cotización sigue nombrándolo.
-- No depende de otro archivo (`SOLO=areas/papelera/purga-con-cotizacion.sql`). Cada bloque que escribe abre su transacción y la revierte.
--
-- Qué asegura:
--   PC1. Un vehículo cuya final está en otro lote de la papelera queda bloqueado sin hacer caer la purga del lote: el otro vehículo se purga.
--   PC2. Una preventa de otro lote también lo bloquea y sigue con su vehículo; las cotizaciones de su propio lote no frenan y se van con él.
--        Enviarlo a la papelera no mira las de la papelera.
--   PC3. Un lead que nombra una cotización de la papelera queda bloqueado y ella sigue con su lead; una viva no lo frena.

create or replace function pg_temp.pc_persona() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('pc_' || substr(v_id::text, 1, 8), 'PC ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  return v_id;
end $f$;

-- Un origen con una fórmula publicada mínima.
create or replace function pg_temp.pc_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid;
begin
  insert into public.origenes (clave, nombre) values ('pc_' || substr(gen_random_uuid()::text, 1, 8), 'PC origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
            jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen'))),
          '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

create or replace function pg_temp.pc_cot(e jsonb, p_quien uuid, p_vehiculo uuid, p_lead uuid, p_clase text) returns uuid language plpgsql as $f$
declare c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, lead_id, clase, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_vehiculo, p_lead, p_clase::public.clase_cotizacion, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}',
          '{"usd": 10}', 10)
  returning id into c;
  return c;
end $f$;

create or replace function pg_temp.pc_lote(p_tipo text, p_quien uuid) returns uuid language sql as $f$
  insert into public.lotes_papelera (tipo, creado_por) values (p_tipo::public.tipo_lote_papelera, p_quien) returning id;
$f$;

-- Un vehículo en el lote, con sus cotizaciones vivas (como `_vehiculo_a_lote`).
create or replace function pg_temp.pc_vehiculo_al_lote(p_v uuid, p_lote uuid) returns void language sql as $f$
  update public.vehiculos set eliminado_en = now(), lote_papelera_id = p_lote where id = p_v;
  update public.cotizaciones set eliminado_en = now(), lote_papelera_id = p_lote where vehiculo_id = p_v and eliminado_en is null;
$f$;

create or replace function pg_temp.pc_cot_al_lote(p_c uuid, p_lote uuid) returns void language sql as $f$
  update public.cotizaciones set eliminado_en = now(), lote_papelera_id = p_lote where id = p_c;
$f$;

-- La purga del lote, sin sesión (como el job); su error, si cae entera.
create or replace function pg_temp.pc_purgar(p_tipo text, p_lote uuid) returns jsonb language plpgsql as $f$
declare v_e text; v_m text;
begin
  if p_tipo = 'vehiculos' then
    return public._papelera_purgar_vehiculos(p_lote, null);
  end if;
  return public._papelera_purgar_leads(p_lote, null);
exception when others then
  get stacked diagnostics v_m = message_text;
  v_e := sqlstate;
  return jsonb_build_object('error', v_e, 'mensaje', v_m);
end $f$;

create or replace function pg_temp.pc_motivo(r jsonb, p_id uuid) returns text language sql as $f$
  select y ->> 'motivo' from jsonb_array_elements(r -> 'bloqueados') y where y ->> 'id' = p_id::text;
$f$;

-- @test papelera: un vehículo cuya final está en otro lote de la papelera queda bloqueado y la purga del lote sigue con los demás (PC1)
begin;
do $$
declare
  q uuid; e jsonb := pg_temp.pc_origen(); v1 uuid; v2 uuid; c uuid; lv uuid; lc uuid; r jsonb;
  motivo constant text := 'Tiene una cotización en la papelera. Púrgala antes.';
begin
  q := pg_temp.pc_persona();
  insert into public.vehiculos (origen_id, titulo) values ((e ->> 'o')::uuid, 'PC con final') returning id into v1;
  insert into public.vehiculos (origen_id, titulo) values ((e ->> 'o')::uuid, 'PC sin nada') returning id into v2;
  c := pg_temp.pc_cot(e, q, v1, null, 'final');
  lc := pg_temp.pc_lote('cotizaciones', q);
  perform pg_temp.pc_cot_al_lote(c, lc);
  lv := pg_temp.pc_lote('vehiculos', q);
  perform pg_temp.pc_vehiculo_al_lote(v1, lv);
  perform pg_temp.pc_vehiculo_al_lote(v2, lv);

  r := pg_temp.pc_purgar('vehiculos', lv);
  if r ? 'error' then raise exception 'PC1: la purga del lote cayó entera: %', r; end if;
  if pg_temp.pc_motivo(r, v1) is distinct from motivo then raise exception 'PC1: el vehículo con la final debía quedar bloqueado con «%» y dio %', motivo, r; end if;
  if jsonb_array_length(r -> 'purgados') <> 1 or r -> 'purgados' -> 0 ->> 'id' is distinct from v2::text then
    raise exception 'PC1: el otro vehículo debía purgarse y dio %', r;
  end if;
  if (select vehiculo_id from public.cotizaciones where id = c) is distinct from v1 then raise exception 'PC1: la final dejó de nombrar su vehículo'; end if;
  if not exists (select 1 from public.vehiculos where id = v1) then raise exception 'PC1: el vehículo con la final se purgó'; end if;
  -- Purgada la final, el vehículo se purga.
  perform public._papelera_purgar_cotizaciones(lc, null);
  r := pg_temp.pc_purgar('vehiculos', lv);
  if r ? 'error' or jsonb_array_length(r -> 'purgados') <> 1 then raise exception 'PC1: sin la final debía purgarse y dio %', r; end if;
end $$;
rollback;

-- @test papelera: una preventa de otro lote bloquea la purga de su vehículo; las de su propio lote se van con él; enviarlo no las mira (PC2)
begin;
do $$
declare
  q uuid; e jsonb := pg_temp.pc_origen(); v uuid; c_otra uuid; c_suya uuid; lv uuid; lc uuid; r jsonb;
  motivo constant text := 'Tiene una cotización en la papelera. Púrgala antes.';
begin
  q := pg_temp.pc_persona();
  insert into public.vehiculos (origen_id, titulo) values ((e ->> 'o')::uuid, 'PC con preventa') returning id into v;
  c_otra := pg_temp.pc_cot(e, q, v, null, 'preventa');
  c_suya := pg_temp.pc_cot(e, q, v, null, 'preventa');
  lc := pg_temp.pc_lote('cotizaciones', q);
  perform pg_temp.pc_cot_al_lote(c_otra, lc);
  if (select public._vehiculo_motivo_de_bloqueo(x, true) from public.vehiculos x where x.id = v) is not null then
    raise exception 'PC2: una cotización de la papelera no debía frenar el envío';
  end if;
  lv := pg_temp.pc_lote('vehiculos', q);
  perform pg_temp.pc_vehiculo_al_lote(v, lv);

  r := pg_temp.pc_purgar('vehiculos', lv);
  if r ? 'error' then raise exception 'PC2: la purga cayó entera: %', r; end if;
  if pg_temp.pc_motivo(r, v) is distinct from motivo then raise exception 'PC2: debía quedar bloqueado con «%» y dio %', motivo, r; end if;
  if (select vehiculo_id from public.cotizaciones where id = c_otra) is distinct from v then raise exception 'PC2: la preventa de otro lote perdió su vehículo'; end if;
  if (select eliminado_en from public.cotizaciones where id = c_suya) is null then raise exception 'PC2: la de su lote debía seguir en la papelera'; end if;

  perform public._papelera_purgar_cotizaciones(lc, null);
  r := pg_temp.pc_purgar('vehiculos', lv);
  if r ? 'error' or jsonb_array_length(r -> 'purgados') <> 1 then raise exception 'PC2: sin la de otro lote debía purgarse y dio %', r; end if;
  if exists (select 1 from public.cotizaciones where id = c_suya) then raise exception 'PC2: la de su lote debía irse con él'; end if;
end $$;
rollback;

-- @test papelera: un lead que nombra una cotización de la papelera queda bloqueado y ella sigue con su lead; una viva no lo frena (PC3)
begin;
do $$
declare
  q uuid; e jsonb := pg_temp.pc_origen(); l1 uuid; l2 uuid; c1 uuid; c2 uuid; ll uuid; lc uuid; r jsonb;
  motivo constant text := 'Tiene una cotización en la papelera. Púrgala antes.';
begin
  q := pg_temp.pc_persona();
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('PC lead 1', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), q) returning id into l1;
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('PC lead 2', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), q) returning id into l2;
  c1 := pg_temp.pc_cot(e, q, null, l1, 'preventa');
  c2 := pg_temp.pc_cot(e, q, null, l2, 'preventa');
  lc := pg_temp.pc_lote('cotizaciones', q);
  perform pg_temp.pc_cot_al_lote(c1, lc);
  ll := pg_temp.pc_lote('leads', q);
  update public.leads set eliminado_en = now(), lote_papelera_id = ll where id in (l1, l2);

  r := pg_temp.pc_purgar('leads', ll);
  if r ? 'error' then raise exception 'PC3: la purga cayó entera: %', r; end if;
  if pg_temp.pc_motivo(r, l1) is distinct from motivo then raise exception 'PC3: el lead debía quedar bloqueado con «%» y dio %', motivo, r; end if;
  if (select lead_id from public.cotizaciones where id = c1) is distinct from l1 then raise exception 'PC3: la cotización de la papelera perdió su lead'; end if;
  if jsonb_array_length(r -> 'purgados') <> 1 or r -> 'purgados' -> 0 ->> 'id' is distinct from l2::text then
    raise exception 'PC3: el lead con una cotización viva debía purgarse y dio %', r;
  end if;
  if (select lead_id from public.cotizaciones where id = c2) is not null then raise exception 'PC3: la viva debía quedar sin lead'; end if;
end $$;
rollback;
