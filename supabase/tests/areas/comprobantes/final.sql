-- Marcar otra final del vehículo cuando la final actual tiene comprobante (paso 4.26-1, P7 a): `_final_aplicar` (de marcar y de crear una final) no se lleva
-- una cotización con comprobante. Los ayudantes son copia de `areas/final/marcar.sql`. No depende de otro archivo (`SOLO=areas/comprobantes/final.sql`).
-- Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   E6. Con un comprobante vigente en la final actual, marcar otra final del vehículo da 23514 y nada cambia. Con el comprobante anulado, marcar baja la
--       vieja a preventa y la deja viva; las otras preventas, sin comprobante, sí van al lote de la papelera.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (alcance «todos») o 'clave:propios'.
create or replace function pg_temp.cpf_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  -- La primera cuenta de la base es la dueña (con `SOLO=` no hay otra antes): una de relleno, para que ninguna de la prueba lo sea.
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email) values (gen_random_uuid(), 'cpf-primera-' || substr(v_id::text, 1, 8) || '@ejemplo.com');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('cpf_' || substr(v_id::text, 1, 8), 'CPF ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Quien marca: ve, edita y gestiona finales en todo, y ve y edita leads (los de su cartera).
create or replace function pg_temp.cpf_marca() returns uuid language sql as $f$
  select pg_temp.cpf_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'cotizaciones.final.gestionar', 'leads.ver', 'leads.editar']);
$f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje} si falla.
create or replace function pg_temp.cpf_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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
create or replace function pg_temp.cpf_marcar(p_quien uuid, p_c uuid) returns jsonb language sql as $f$
  select pg_temp.cpf_corre(p_quien, format('select jsonb_build_object(''ok'', true) from (select public.cotizacion_marcar_final(%L)) x', p_c));
$f$;

-- Da ese error (sqlstate y mensaje exactos).
create or replace function pg_temp.cpf_da_error(p_que text, p_r jsonb, p_estado text, p_mensaje text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje then
    raise exception '%: debía dar % «%» y dio %', p_que, p_estado, p_mensaje, p_r;
  end if;
end $f$;

-- Un origen con una fórmula publicada mínima.
create or replace function pg_temp.cpf_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid;
begin
  insert into public.origenes (clave, nombre) values ('cpf_' || substr(gen_random_uuid()::text, 1, 8), 'CPF origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
            jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen'))),
          '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Un lead de esa persona (en su cartera, por el trigger del alta), con un teléfono propio.
create or replace function pg_temp.cpf_lead(p_quien uuid) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('CPF lead', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), p_quien)
  returning id into v;
  return v;
end $f$;

-- Un vehículo de ese origen, sin lead.
create or replace function pg_temp.cpf_vehiculo(e jsonb) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'CPF vehículo', 'toyota') returning id into v;
  return v;
end $f$;

-- Una cotización viva de esa persona, de ese lead y ese vehículo.
create or replace function pg_temp.cpf_cot(p_quien uuid, e jsonb, p_lead uuid, p_vehiculo uuid, p_clase text default 'preventa') returns uuid language plpgsql as $f$
declare v_c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, vehiculo_id, clase, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_lead, p_vehiculo, p_clase::public.clase_cotizacion, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into v_c;
  return v_c;
end $f$;

-- Un comprobante sobre esa cotización, como postgres, en la serie CPF de la prueba (anulado si se pide).
create or replace function pg_temp.cpf_comprobante(p_c uuid, p_anulado boolean default false) returns void language sql as $f$
  insert into public.comprobantes_contadores (serie, ultimo) values ('CPF', 0) on conflict do nothing;
  with n as (update public.comprobantes_contadores set ultimo = ultimo + 1 where serie = 'CPF' returning ultimo)
  insert into public.comprobantes (cotizacion_id, serie, numero, datos, anulado_en, motivo_anulacion)
  select p_c, 'CPF', n.ultimo, '{}'::jsonb, case when p_anulado then now() end, case when p_anulado then 'CPF' end from n;
$f$;

create or replace function pg_temp.cpf_estado(p_c uuid) returns text language sql as $f$
  select clase || case when eliminado_en is null then ' viva' else ' en la papelera' end from public.cotizaciones where id = p_c;
$f$;

-- @test comprobantes: con un comprobante vigente en la final actual no se marca otra final del vehículo (E6, P7 a)
begin;
do $$
declare e jsonb := pg_temp.cpf_origen(); m uuid := pg_temp.cpf_marca(); l uuid; v uuid; f uuid; q uuid;
begin
  l := pg_temp.cpf_lead(m); v := pg_temp.cpf_vehiculo(e);
  f := pg_temp.cpf_cot(m, e, l, v, 'final'); q := pg_temp.cpf_cot(m, e, l, v);
  perform pg_temp.cpf_comprobante(f);
  perform pg_temp.cpf_da_error('marcar otra final', pg_temp.cpf_marcar(m, q), '23514',
    'La final actual tiene un comprobante vigente: anúlalo antes de marcar otra final.');
  if pg_temp.cpf_estado(f) <> 'final viva' or pg_temp.cpf_estado(q) <> 'preventa viva' or exists (select 1 from public.lotes_papelera where creado_por = m) then
    raise exception 'el rechazo cambió algo: % %', pg_temp.cpf_estado(f), pg_temp.cpf_estado(q); end if;
end $$;
reset role;
rollback;

-- @test comprobantes: con el comprobante anulado, la vieja baja a preventa y queda viva; las demás van a la papelera (E6, P7 a)
begin;
do $$
declare e jsonb := pg_temp.cpf_origen(); m uuid := pg_temp.cpf_marca(); l uuid; v uuid; f uuid; p uuid; q uuid; r jsonb;
begin
  l := pg_temp.cpf_lead(m); v := pg_temp.cpf_vehiculo(e);
  f := pg_temp.cpf_cot(m, e, l, v, 'final'); p := pg_temp.cpf_cot(m, e, l, v); q := pg_temp.cpf_cot(m, e, l, v);
  perform pg_temp.cpf_comprobante(f, true);
  r := pg_temp.cpf_marcar(m, q);
  if r ? 'error' then raise exception 'marcar falló: %', r; end if;
  if pg_temp.cpf_estado(q) <> 'final viva' or pg_temp.cpf_estado(f) <> 'preventa viva' or pg_temp.cpf_estado(p) <> 'preventa en la papelera' then
    raise exception 'debían quedar q final, f preventa viva y p en la papelera: % % %', pg_temp.cpf_estado(q), pg_temp.cpf_estado(f), pg_temp.cpf_estado(p); end if;
  if (select resumen ->> 'cantidad' from public.lotes_papelera where creado_por = m) is distinct from '1' then raise exception 'el lote debía llevar sólo la preventa sin comprobante'; end if;
end $$;
reset role;
rollback;
