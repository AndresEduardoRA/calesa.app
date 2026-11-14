-- La cotización aprobada de un vehículo (`cotizaciones_aprobadas`): quién nace aprobada, cómo se reasigna y que aprobar no toca lo demás. La base la
-- mantiene al confirmar (`trg_cotizaciones_aprobadas_al_confirmar`, diferido): en un bloque que se revierte hay que forzarlo con `ra_confirmar()` antes
-- de afirmar, o la prueba pasa sin probar nada. No depende de otro archivo (`SOLO=areas/aprobada/reponer.sql`).
--
-- Qué asegura:
--   R1. La primera cotización de un vehículo nace aprobada y la siguiente no; sin vehículo, nunca; el monto es totales.usd y la moneda USD.
--   R2. Aprobar mueve la marca (una fila por vehículo) sin mover la versión de ninguna cotización, ni revisiones, ni el vehículo; deja una actividad.
--   R3. La aprobada a la papelera o inválida pasa a la más antigua que sigue activa; restaurar o reactivar no quita la marca a quien la tiene.
--   R4. Cambiar de vehículo, la papelera del vehículo y su restauración, y guardar la aprobada (el monto se refresca).
--   R5. Sin activas no hay fila; el relleno deja la más antigua activa de cada vehículo vivo y es idempotente.
--   R6. El primer resultado: número, nulo, sin clave y texto.

create or replace function pg_temp.ra_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('ra_' || substr(v_id::text, 1, 8), 'RA ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.ra_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.ra_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid;
begin
  insert into public.origenes (clave, nombre) values ('ra_' || substr(gen_random_uuid()::text, 1, 8), 'RA origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
            jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen'))),
          '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

create or replace function pg_temp.ra_vehiculo(e jsonb) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'RA vehículo', 'toyota') returning id into v;
  return v;
end $f$;

-- Una cotización viva creada hace p_min minutos (el orden de «la más antigua»), con ese totales.
create or replace function pg_temp.ra_cot(p_quien uuid, e jsonb, p_vehiculo uuid, p_min integer, p_totales jsonb default '{"usd": 10}') returns uuid language plpgsql as $f$
declare v_c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, valores, fuentes, tipos_cambio, totales, total_base, creado_en)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_vehiculo, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', p_totales, 10,
          now() - make_interval(mins => p_min))
  returning id into v_c;
  return v_c;
end $f$;

-- Fuerza el trigger diferido (en un bloque revertido no correría).
create or replace function pg_temp.ra_confirmar() returns void language plpgsql as $f$
begin
  set constraints public.trg_cotizaciones_aprobadas_al_confirmar immediate;
  set constraints public.trg_cotizaciones_aprobadas_al_confirmar deferred;
end $f$;

create or replace function pg_temp.ra_aprobada(p_v uuid) returns uuid language sql as $f$
  select a.cotizacion_id from public.cotizaciones_aprobadas a where a.vehiculo_id = p_v;
$f$;

-- Falla si la aprobada de ese vehículo no es esa (o ninguna, con null).
create or replace function pg_temp.ra_es(p_que text, p_v uuid, p_esperada uuid) returns void language plpgsql as $f$
begin
  if pg_temp.ra_aprobada(p_v) is distinct from p_esperada then
    raise exception '%: la aprobada debía ser % y es %', p_que, p_esperada, pg_temp.ra_aprobada(p_v);
  end if;
end $f$;

-- La invariante: con alguna activa y el vehículo vivo, exactamente una fila y apunta a una activa suya; si no, ninguna.
create or replace function pg_temp.ra_invariante(p_que text, p_v uuid) returns void language plpgsql as $f$
declare v_n integer; v_hay boolean; v_apunta boolean;
begin
  select count(*) into v_n from public.cotizaciones_aprobadas a where a.vehiculo_id = p_v;
  select exists (select 1 from public.cotizaciones c join public.vehiculos v on v.id = c.vehiculo_id and v.eliminado_en is null
                  where c.vehiculo_id = p_v and c.eliminado_en is null and c.estado <> 'invalida') into v_hay;
  select exists (select 1 from public.cotizaciones_aprobadas a join public.cotizaciones c on c.id = a.cotizacion_id
                  where a.vehiculo_id = p_v and c.vehiculo_id = p_v and c.eliminado_en is null and c.estado <> 'invalida') into v_apunta;
  if v_n <> (case when v_hay then 1 else 0 end) or (v_hay and not v_apunta) then
    raise exception '%: invariante rota (filas %, hay activa %, apunta a una activa %)', p_que, v_n, v_hay, v_apunta;
  end if;
end $f$;

-- @test aprobada: la primera nace aprobada, la siguiente no, sin vehículo nunca; monto = totales.usd y moneda USD (R1)
begin;
do $$
declare e jsonb := pg_temp.ra_origen(); u uuid := pg_temp.ra_persona(array['cotizaciones.ver']); v uuid := pg_temp.ra_vehiculo(e); c1 uuid; c2 uuid; c3 uuid; a record;
begin
  c1 := pg_temp.ra_cot(u, e, v, 30, '{"usd": 1234.5}');
  c2 := pg_temp.ra_cot(u, e, v, 20, '{"usd": 99}');
  c3 := pg_temp.ra_cot(u, e, null, 10);
  perform pg_temp.ra_confirmar();
  perform pg_temp.ra_es('la primera', v, c1);
  perform pg_temp.ra_invariante('R1', v);
  select * into a from public.cotizaciones_aprobadas x where x.vehiculo_id = v;
  if a.monto is distinct from 1234.5 or a.moneda is distinct from 'USD' or a.origen_id is distinct from (e ->> 'o')::uuid or a.creado_por is distinct from u then
    raise exception 'R1: fila mal copiada %', to_jsonb(a); end if;
  if exists (select 1 from public.cotizaciones_aprobadas x where x.cotizacion_id in (c2, c3)) then raise exception 'R1: la segunda o la sin vehículo quedó aprobada'; end if;
end $$;
rollback;

-- @test aprobada: una cotización «encima» (N+1 del mismo vehículo) deja la primera aprobada y la nueva sin aprobar (R1)
begin;
do $$
declare e jsonb := pg_temp.ra_origen(); u uuid := pg_temp.ra_persona(array['cotizaciones.ver']); v uuid := pg_temp.ra_vehiculo(e); c1 uuid; c2 uuid;
begin
  c1 := pg_temp.ra_cot(u, e, v, 30);
  perform pg_temp.ra_confirmar();
  -- «Encima» es una N+1 con el mismo vehículo: otra fila viva.
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, valores, fuentes, tipos_cambio, totales, total_base, cotizacion_padre_id, version)
  values ((e ->> 'o')::uuid, u, (e ->> 'f')::uuid, v, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 11}', 11, c1, 2) returning id into c2;
  perform pg_temp.ra_confirmar();
  perform pg_temp.ra_es('encima', v, c1);
  perform pg_temp.ra_invariante('R1 encima', v);
end $$;
rollback;

-- @test aprobada: aprobar mueve la marca sin mover versiones, revisiones, vehículo ni actividad ajena; deja una cotizacion.aprobada con su anterior (R2)
begin;
do $$
declare
  e jsonb := pg_temp.ra_origen(); u uuid := pg_temp.ra_persona(array['cotizaciones.ver', 'cotizaciones.aprobar']); v uuid := pg_temp.ra_vehiculo(e);
  c1 uuid; c2 uuid; v1 timestamptz; v2 timestamptz; vv timestamptz; r jsonb; n_rev integer; n_act integer; f jsonb;
begin
  c1 := pg_temp.ra_cot(u, e, v, 30, '{"usd": 10}');
  c2 := pg_temp.ra_cot(u, e, v, 20, '{"usd": 20.25}');
  perform pg_temp.ra_confirmar();
  -- Versiones en el pasado: con el now() fijo de la transacción, un movimiento no se vería.
  set local session_replication_role = replica;
  update public.cotizaciones set actualizado_en = actualizado_en - interval '1 day' where id in (c1, c2);
  update public.vehiculos set actualizado_en = actualizado_en - interval '1 day' where id = v;
  set local session_replication_role = origin;
  select actualizado_en into v1 from public.cotizaciones where id = c1;
  select actualizado_en into v2 from public.cotizaciones where id = c2;
  select actualizado_en into vv from public.vehiculos where id = v;
  select count(*) into n_rev from public.cotizaciones_revisiones where cotizacion_id in (c1, c2);
  select count(*) into n_act from public.actividad where tabla = 'vehiculos' and registro_id = v::text;

  r := pg_temp.ra_corre(u, format('select public.cotizacion_aprobar(%L, %L)', c2, v2));
  if r ->> 'error' is not null then raise exception 'R2: aprobar falló %', r; end if;
  if (r #>> '{cotizacion,id}')::uuid <> c2 or (r #>> '{anterior,id}')::uuid is distinct from c1 then raise exception 'R2: respuesta %', r; end if;
  perform pg_temp.ra_es('aprobada la segunda', v, c2);
  if (select monto from public.cotizaciones_aprobadas where vehiculo_id = v) is distinct from 20.25 then raise exception 'R2: monto de la nueva'; end if;
  if (select count(*) from public.cotizaciones_aprobadas where vehiculo_id = v) <> 1 then raise exception 'R2: más de una fila'; end if;
  if (select actualizado_en from public.cotizaciones where id = c1) is distinct from v1 or (select actualizado_en from public.cotizaciones where id = c2) is distinct from v2 then
    raise exception 'R2: aprobar movió una versión'; end if;
  if (select actualizado_en from public.vehiculos where id = v) is distinct from vv then raise exception 'R2: aprobar movió el vehículo'; end if;
  if (select count(*) from public.cotizaciones_revisiones where cotizacion_id in (c1, c2)) <> n_rev then raise exception 'R2: aprobar escribió una revisión'; end if;
  if (select count(*) from public.actividad where tabla = 'vehiculos' and registro_id = v::text) <> n_act then raise exception 'R2: aprobar ensució la actividad del vehículo'; end if;
  select jsonb_build_object('n', count(*), 'antes', max(antes ->> 'aprobada'), 'despues', max(despues ->> 'aprobada')) into f
    from public.actividad where accion = 'cotizacion.aprobada' and registro_id = c2::text;
  if (f ->> 'n')::int <> 1 or f ->> 'antes' <> c1::text or f ->> 'despues' <> c2::text then raise exception 'R2: actividad %', f; end if;
  -- Aprobar la que ya lo es: sin cambios ni actividad nueva.
  r := pg_temp.ra_corre(u, format('select public.cotizacion_aprobar(%L, %L)', c2, v2));
  if r ->> 'error' is not null or r -> 'anterior' <> 'null'::jsonb then raise exception 'R2: aprobar otra vez %', r; end if;
  if (select count(*) from public.actividad where accion = 'cotizacion.aprobada' and registro_id = c2::text) <> 1 then raise exception 'R2: aprobar otra vez dejó actividad'; end if;
  perform pg_temp.ra_invariante('R2', v);
end $$;
rollback;

-- @test aprobada: la aprobada a la papelera o inválida pasa a la más antigua activa; restaurar y reactivar no quitan la marca (R3)
begin;
do $$
declare e jsonb := pg_temp.ra_origen(); u uuid := pg_temp.ra_persona(array['cotizaciones.ver']); v uuid := pg_temp.ra_vehiculo(e); c1 uuid; c2 uuid; c3 uuid; c4 uuid;
begin
  c1 := pg_temp.ra_cot(u, e, v, 40); c2 := pg_temp.ra_cot(u, e, v, 30); c3 := pg_temp.ra_cot(u, e, v, 20); c4 := pg_temp.ra_cot(u, e, v, 10);
  perform pg_temp.ra_confirmar();
  perform pg_temp.ra_es('inicio', v, c1);
  -- A la papelera: la más antigua activa es la 2.
  update public.cotizaciones set eliminado_en = now() where id = c1;
  perform pg_temp.ra_confirmar();
  perform pg_temp.ra_es('c1 a la papelera', v, c2); perform pg_temp.ra_invariante('R3 papelera', v);
  -- Restaurar c1 (la más antigua) no le quita la marca a c2.
  update public.cotizaciones set eliminado_en = null where id = c1;
  perform pg_temp.ra_confirmar();
  perform pg_temp.ra_es('restaurar c1', v, c2);
  -- Invalidar c2: pasa a c1 (la más antigua activa), no a la siguiente.
  update public.cotizaciones set estado = 'invalida' where id = c2;
  perform pg_temp.ra_confirmar();
  perform pg_temp.ra_es('invalidar c2', v, c1); perform pg_temp.ra_invariante('R3 invalidar', v);
  -- Reportada cuenta como activa: no mueve nada.
  update public.cotizaciones set estado = 'reportada' where id = c1;
  perform pg_temp.ra_confirmar();
  perform pg_temp.ra_es('c1 reportada', v, c1);
  -- Reactivar c2 (más nueva que c1) no le quita la marca a c1.
  update public.cotizaciones set estado = 'activa' where id = c2;
  perform pg_temp.ra_confirmar();
  perform pg_temp.ra_es('reactivar c2', v, c1);
  -- Un lote entero: c1 y c2 a la papelera en la misma transacción → c3.
  update public.cotizaciones set eliminado_en = now() where id in (c1, c2);
  perform pg_temp.ra_confirmar();
  perform pg_temp.ra_es('lote', v, c3); perform pg_temp.ra_invariante('R3 lote', v);
end $$;
rollback;

-- @test aprobada: cambiar de vehículo, la papelera del vehículo y su restauración, y guardar la aprobada (R4)
begin;
do $$
declare
  e jsonb := pg_temp.ra_origen(); u uuid := pg_temp.ra_persona(array['cotizaciones.ver']); va uuid := pg_temp.ra_vehiculo(e); vb uuid := pg_temp.ra_vehiculo(e);
  a1 uuid; a2 uuid; b1 uuid;
begin
  a1 := pg_temp.ra_cot(u, e, va, 40); a2 := pg_temp.ra_cot(u, e, va, 30); b1 := pg_temp.ra_cot(u, e, vb, 20, '{"usd": 7}');
  perform pg_temp.ra_confirmar();
  perform pg_temp.ra_es('a', va, a1); perform pg_temp.ra_es('b', vb, b1);
  -- La aprobada de A pasa a B: A repone la más antigua que queda y B conserva la suya.
  update public.cotizaciones set vehiculo_id = vb where id = a1;
  perform pg_temp.ra_confirmar();
  perform pg_temp.ra_es('A tras ceder', va, a2); perform pg_temp.ra_es('B conserva', vb, b1);
  perform pg_temp.ra_invariante('R4 A', va); perform pg_temp.ra_invariante('R4 B', vb);
  -- Un vehículo sin cotizaciones que recibe una la toma como aprobada.
  update public.cotizaciones set vehiculo_id = null where id = a2;
  perform pg_temp.ra_confirmar();
  perform pg_temp.ra_es('A sin cotizaciones', va, null);
  update public.cotizaciones set vehiculo_id = va where id = a2;
  perform pg_temp.ra_confirmar();
  perform pg_temp.ra_es('A recibe', va, a2);
  -- Guardar la aprobada refresca su monto; guardar otra no lo toca.
  update public.cotizaciones set totales = '{"usd": 555}' where id = a2;
  update public.cotizaciones set totales = '{"usd": 1}' where id = a1;
  perform pg_temp.ra_confirmar();
  if (select monto from public.cotizaciones_aprobadas where vehiculo_id = va) is distinct from 555 then raise exception 'R4: el monto de la aprobada no se refrescó'; end if;
  if (select monto from public.cotizaciones_aprobadas where vehiculo_id = vb) is distinct from 7 then raise exception 'R4: guardar otra tocó el monto de B'; end if;
  -- La papelera del vehículo: sin fila; restaurarlo la toma la más antigua activa.
  update public.vehiculos set eliminado_en = now() where id = va;
  update public.cotizaciones set eliminado_en = now() where vehiculo_id = va;
  perform pg_temp.ra_confirmar();
  perform pg_temp.ra_es('vehículo en la papelera', va, null); perform pg_temp.ra_invariante('R4 papelera del vehículo', va);
  update public.vehiculos set eliminado_en = null where id = va;
  update public.cotizaciones set eliminado_en = null where id = a2;
  perform pg_temp.ra_confirmar();
  perform pg_temp.ra_es('vehículo restaurado', va, a2); perform pg_temp.ra_invariante('R4 restaurado', va);
end $$;
rollback;

-- @test aprobada: sin activas no hay fila; el relleno deja la más antigua activa de cada vehículo vivo y es idempotente (R5)
begin;
do $$
declare
  e jsonb := pg_temp.ra_origen(); u uuid := pg_temp.ra_persona(array['cotizaciones.ver']); v1 uuid := pg_temp.ra_vehiculo(e); v2 uuid := pg_temp.ra_vehiculo(e); v3 uuid := pg_temp.ra_vehiculo(e);
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; n integer;
begin
  c1 := pg_temp.ra_cot(u, e, v1, 40); c2 := pg_temp.ra_cot(u, e, v1, 30); c3 := pg_temp.ra_cot(u, e, v2, 20); c4 := pg_temp.ra_cot(u, e, v3, 10);
  perform pg_temp.ra_confirmar();
  perform pg_temp.ra_es('v2 con su cotización', v2, c3);
  update public.cotizaciones set estado = 'invalida' where id = c3;
  perform pg_temp.ra_confirmar();
  perform pg_temp.ra_es('sin activas', v2, null);
  -- Sin la fila, el relleno la repone (v1 conserva la suya).
  delete from public.cotizaciones_aprobadas where vehiculo_id in (v1, v2, v3);
  update public.cotizaciones set estado = 'invalida' where id = c1;
  update public.vehiculos set eliminado_en = now() where id = v3;
  perform pg_temp.ra_confirmar();
  delete from public.cotizaciones_aprobadas where vehiculo_id in (v1, v2, v3);
  select public._cotizaciones_aprobadas_rellenar() into n;
  perform pg_temp.ra_es('relleno salta la inválida', v1, c2);
  perform pg_temp.ra_es('relleno sin activas', v2, null);
  perform pg_temp.ra_es('relleno salta el vehículo en la papelera', v3, null);
  if public._cotizaciones_aprobadas_rellenar() <> 0 then raise exception 'R5: el relleno no es idempotente'; end if;
end $$;
rollback;

-- @test aprobada: el primer resultado es totales.usd si es un número; nulo si falta o no lo es; la moneda siempre USD (R6)
begin;
do $$
declare r record; c record;
begin
  for c in select * from (values ('{"usd": 12.5}'::jsonb, 12.5::numeric), ('{"usd": 0}', 0), ('{"usd": null}', null), ('{}', null), ('{"usd": "12"}', null), ('{"usd": true}', null), ('{"bs": 5}', null)) t(totales, esperado) loop
    select * into r from public._cotizacion_primer_resultado(c.totales);
    if r.monto is distinct from c.esperado or r.moneda is distinct from 'USD' then raise exception 'R6: % dio % %', c.totales, r.monto, r.moneda; end if;
  end loop;
end $$;
rollback;
