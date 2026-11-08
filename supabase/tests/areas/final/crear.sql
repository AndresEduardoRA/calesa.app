-- Crear una cotización final con `cotizacion_crear` deja el estado de marcarla (paso 4.25-1b, cierra 4-17; P6 y P7 a de la persona): mira sin candado lo que
-- mira marcar, toma lead (no key update) → vehículo → fórmula → las vivas del vehículo y aplica `_final_aplicar()`. No depende de otro archivo
-- (`SOLO=areas/final/crear.sql`). Cada bloque abre su transacción y la revierte. El cuerpo, la preventa y los privilegios están en `crear-candados.sql`; las
-- carreras, en `carreras-crear.mjs` y `carreras-crear-candados.mjs`.
--
-- Qué asegura:
--   N1. (4-17) Crear la final deja lo mismo que crear la preventa y marcarla: la clase, las demás en un lote de quien crea con su resumen, el vínculo y su
--       historial, el lead al primer tipo activo de la clase cliente y la actividad.
--   N2. Sin el lead en la cartera con `leads.editar` (P2 a), el 42501 del lead, antes que el vínculo de otro lead (C1.3 va antes de C1.4).
--   N11. Un vehículo que no ve: el 42501 del vehículo, antes que la final activa, el vínculo o las preventas (no los delata).
--   N3. El vehículo de otro lead (P4 a): 23514 con su pista.  N4. Una preventa que no puede mandar a la papelera (P3 a): 42501.
--   N5. Otra final activa (P7 a): 23505 antes del cálculo; una final reportada baja a preventa y va al lote.

create or replace function pg_temp.fc_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('fc_' || substr(v_id::text, 1, 8), 'FC ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Quien crea: cotiza, edita y gestiona finales en todo, ve y edita leads (los de su cartera) y ve y crea vehículos. `p_mas` reemplaza lo que difiere.
create or replace function pg_temp.fc_crea(p_concesiones text[] default null) returns uuid language sql as $f$
  select pg_temp.fc_persona(coalesce(p_concesiones, array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'cotizaciones.final.gestionar',
                                                          'leads.ver', 'leads.editar', 'vehiculos.ver', 'vehiculos.crear']));
$f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.fc_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return coalesce(v, '{}'::jsonb);
end $f$;

-- Un origen con una fórmula publicada mínima (un tipo de cambio, un input visible y el total).
create or replace function pg_temp.fc_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid;
begin
  insert into public.origenes (clave, nombre) values ('fc_' || substr(gen_random_uuid()::text, 1, 8), 'FC origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
            jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
            jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
            'buckets', jsonb_build_object('origen', 'tc')),
          '{}', '{}', jsonb_build_object('tc', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'),
                                         'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Un lead de esa persona (en su cartera, por el trigger del alta).
create or replace function pg_temp.fc_lead(p_quien uuid) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('FC lead', '58' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), p_quien)
  returning id into v;
  return v;
end $f$;

create or replace function pg_temp.fc_vehiculo(e jsonb) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'FC vehículo', 'toyota') returning id into v;
  return v;
end $f$;

-- Una cotización viva insertada directo (sin pasar por crear).
create or replace function pg_temp.fc_cot(p_quien uuid, e jsonb, p_lead uuid, p_vehiculo uuid, p_clase text default 'preventa', p_estado text default 'activa')
returns uuid language plpgsql as $f$
declare v_c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, vehiculo_id, clase, estado, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_lead, p_vehiculo, p_clase::public.clase_cotizacion, p_estado::public.estado_cotizacion,
          '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into v_c;
  return v_c;
end $f$;

-- `cotizacion_crear` como esa persona, con la hoja abierta firmada para ella ahora (como `cotizacion_hoja()`). Devuelve la respuesta, o {error, mensaje, hint}.
create or replace function pg_temp.fc_crear(p_quien uuid, e jsonb, p_lead uuid, p_vehiculo uuid, p_clase text default 'final', p_id uuid default gen_random_uuid(),
                                            p_entradas text default '{"inputs": {"visible": 10}}', p_nuevo jsonb default null) returns jsonb language plpgsql as $f$
declare v_tok text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  v_tok := public._cotizacion_abierta_firmar((e ->> 'o')::uuid, (e ->> 'f')::uuid, now());
  return pg_temp.fc_corre(p_quien, format('select public.cotizacion_crear(%L, %L, %L, %L::jsonb, %L, %L, %L::jsonb, null, %L::public.clase_cotizacion)',
                                          p_id, e ->> 'o', p_lead, p_entradas, v_tok, p_vehiculo, p_nuevo, p_clase));
end $f$;

create or replace function pg_temp.fc_da_error(p_que text, p_r jsonb, p_estado text, p_mensaje text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje then
    raise exception '%: debía dar % «%» y dio %', p_que, p_estado, p_mensaje, p_r;
  end if;
end $f$;

-- Lo que crear o marcar puede cambiar de un vehículo, con ids: sus cotizaciones, su lead, sus vínculos, los lotes y el tipo de un lead.
create or replace function pg_temp.fc_foto(p_v uuid, p_lead uuid) returns jsonb language sql as $f$
  select jsonb_build_object(
    'cotizaciones', (select jsonb_agg(jsonb_build_array(c.id, c.clase, c.eliminado_en is null, c.lote_papelera_id) order by c.id) from public.cotizaciones c where c.vehiculo_id = p_v),
    'lead_del_vehiculo', (select v.lead_id from public.vehiculos v where v.id = p_v),
    'vinculos', (select count(*) from public.vehiculos_vinculos k where k.vehiculo_id = p_v),
    'lotes', (select count(*) from public.lotes_papelera),
    'tipo', (select l.tipo_lead_id from public.leads l where l.id = p_lead));
$f$;

-- La misma foto sin ids, para comparar dos terrenos: la nueva, las demás (ordenadas), su lote, el vínculo, el tipo del lead y la actividad de la final.
create or replace function pg_temp.fc_foto_normal(p_v uuid, p_lead uuid, p_nueva uuid) returns jsonb language sql as $f$
  select jsonb_build_object(
    'nueva', (select jsonb_build_array(c.clase, c.eliminado_en is null) from public.cotizaciones c where c.id = p_nueva),
    'demas', (select jsonb_agg(jsonb_build_array(c.clase, c.eliminado_en is null, c.lote_papelera_id is not null) order by c.clase, c.eliminado_en is null)
                from public.cotizaciones c where c.vehiculo_id = p_v and c.id <> p_nueva),
    'lotes', (select jsonb_agg(distinct jsonb_build_array(l.tipo, l.resumen, l.creado_por)) from public.lotes_papelera l
               where l.id in (select c.lote_papelera_id from public.cotizaciones c where c.vehiculo_id = p_v)),
    'vehiculo_con_su_lead', (select v.lead_id = p_lead from public.vehiculos v where v.id = p_v),
    'vinculos', (select count(*) from public.vehiculos_vinculos k where k.vehiculo_id = p_v and k.lead_id = p_lead and k.hasta is null),
    'tipo', (select l.tipo_lead_id from public.leads l where l.id = p_lead),
    'actividad', (select jsonb_agg(a.despues - 'vehiculo') from public.actividad a where a.accion = 'cotizacion.final' and a.registro_id = p_nueva::text));
$f$;

-- @test crear una final: deja lo mismo que crear la preventa y marcarla (N1, 4-17)
begin;
do $$
declare
  e jsonb := pg_temp.fc_origen(); q uuid := pg_temp.fc_crea(); l1 uuid; v1 uuid; l2 uuid; v2 uuid; r jsonb; c1 uuid; c2 uuid; f1 jsonb; f2 jsonb; t_cliente uuid;
begin
  -- Un terreno por camino, iguales: un lead de q y un vehículo sin lead con dos preventas de q.
  l1 := pg_temp.fc_lead(q); v1 := pg_temp.fc_vehiculo(e); perform pg_temp.fc_cot(q, e, l1, v1); perform pg_temp.fc_cot(q, e, l1, v1);
  l2 := pg_temp.fc_lead(q); v2 := pg_temp.fc_vehiculo(e); perform pg_temp.fc_cot(q, e, l2, v2); perform pg_temp.fc_cot(q, e, l2, v2);
  -- Camino 1: crear la preventa y marcarla.
  r := pg_temp.fc_crear(q, e, l1, v1, 'preventa');
  if r ? 'error' then raise exception 'la preventa no se creó: %', r; end if;
  c1 := (r -> 'cotizacion' ->> 'id')::uuid;
  r := pg_temp.fc_corre(q, format('select jsonb_build_object(''ok'', true) from (select public.cotizacion_marcar_final(%L)) x', c1));
  if r ? 'error' then raise exception 'no se marcó: %', r; end if;
  -- Camino 2: crear la final.
  r := pg_temp.fc_crear(q, e, l2, v2, 'final');
  if r ? 'error' then raise exception 'la final no se creó: %', r; end if;
  c2 := (r -> 'cotizacion' ->> 'id')::uuid;
  f1 := pg_temp.fc_foto_normal(v1, l1, c1); f2 := pg_temp.fc_foto_normal(v2, l2, c2);
  if f1 is distinct from f2 then raise exception 'crear una final no deja lo mismo que marcarla: marcar % / crear %', f1, f2; end if;
  -- Y lo que deja, en valores: la final viva, las dos en un lote de q con su resumen, el vínculo, el primer tipo activo de clase cliente y la actividad.
  select t.id into t_cliente from public.tipos_lead t where t.clase = 'cliente' and t.activo order by t.orden, t.nombre limit 1;
  if f2 is distinct from jsonb_build_object(
       'nueva', '["final", true]'::jsonb, 'demas', '[["preventa", false, true], ["preventa", false, true]]'::jsonb,
       'lotes', jsonb_build_array(jsonb_build_array('cotizaciones', '{"cantidad": 2, "restaurados": 0, "purgados": 0}'::jsonb, q)),
       'vehiculo_con_su_lead', true, 'vinculos', 1, 'tipo', t_cliente,
       'actividad', '[{"lead_a_cliente": true, "preventas_a_papelera": 2}]'::jsonb) then
    raise exception 'crear una final no dejó lo esperado: %', f2; end if;
end $$;
reset role;
rollback;

-- @test crear una final: sin el lead en la cartera con leads.editar (P2 a), el 42501 del lead, antes que el vínculo de otro lead (N2)
begin;
do $$
declare
  e jsonb := pg_temp.fc_origen(); jefa uuid := pg_temp.fc_crea(); q uuid; l uuid; v uuid; antes jsonb;
  lead_ajeno constant text := 'No encontramos este lead o no tienes acceso.';
begin
  -- (i) Ve todos los leads y el de la jefa no está en su cartera.
  q := pg_temp.fc_crea(); l := pg_temp.fc_lead(jefa); v := pg_temp.fc_vehiculo(e); antes := pg_temp.fc_foto(v, l);
  perform pg_temp.fc_da_error('un lead fuera de su cartera', pg_temp.fc_crear(q, e, l, v), '42501', lead_ajeno);
  if pg_temp.fc_foto(v, l) is distinct from antes then raise exception '(i) cambió algo: % → %', antes, pg_temp.fc_foto(v, l); end if;
  -- (ii) En su cartera, sin leads.editar.
  q := pg_temp.fc_crea(array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.final.gestionar', 'leads.ver', 'vehiculos.ver']);
  l := pg_temp.fc_lead(q); v := pg_temp.fc_vehiculo(e); antes := pg_temp.fc_foto(v, l);
  perform pg_temp.fc_da_error('sin leads.editar', pg_temp.fc_crear(q, e, l, v), '42501', lead_ajeno);
  if pg_temp.fc_foto(v, l) is distinct from antes then raise exception '(ii) cambió algo: % → %', antes, pg_temp.fc_foto(v, l); end if;
  -- (iii) Fuera de su cartera y el vehículo vinculado a otro lead: el 42501 del lead, no el 23514 del vínculo.
  q := pg_temp.fc_crea(); l := pg_temp.fc_lead(jefa); v := pg_temp.fc_vehiculo(e);
  update public.vehiculos set lead_id = pg_temp.fc_lead(jefa) where id = v;
  antes := pg_temp.fc_foto(v, l);
  perform pg_temp.fc_da_error('fuera de su cartera, con el vehículo de otro lead', pg_temp.fc_crear(q, e, l, v), '42501', lead_ajeno);
  if pg_temp.fc_foto(v, l) is distinct from antes then raise exception '(iii) cambió algo: % → %', antes, pg_temp.fc_foto(v, l); end if;
end $$;
reset role;
rollback;

-- @test crear una final: un vehículo que no ve da el 42501 del vehículo, no delata su final, su vínculo ni sus preventas (N11)
begin;
do $$
declare e jsonb := pg_temp.fc_origen(); jefa uuid := pg_temp.fc_crea(); q uuid; l uuid; v uuid; otro uuid; antes jsonb;
begin
  q := pg_temp.fc_crea(array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'cotizaciones.final.gestionar', 'leads.ver', 'leads.editar']);
  l := pg_temp.fc_lead(q); v := pg_temp.fc_vehiculo(e); otro := pg_temp.fc_lead(jefa);
  update public.vehiculos set lead_id = otro where id = v;
  perform pg_temp.fc_cot(jefa, e, otro, v, 'final'); perform pg_temp.fc_cot(jefa, e, otro, v);
  antes := pg_temp.fc_foto(v, l);
  perform pg_temp.fc_da_error('un vehículo que no ve', pg_temp.fc_crear(q, e, l, v), '42501', 'No tienes acceso a este vehículo.');
  if pg_temp.fc_foto(v, l) is distinct from antes then raise exception 'cambió algo: % → %', antes, pg_temp.fc_foto(v, l); end if;
end $$;
reset role;
rollback;

-- @test crear una final: el vehículo vinculado a otro lead (P4 a), 23514 con su pista y nada cambia (N3)
begin;
do $$
declare e jsonb := pg_temp.fc_origen(); q uuid := pg_temp.fc_crea(); l uuid; v uuid; antes jsonb; r jsonb;
begin
  l := pg_temp.fc_lead(q); v := pg_temp.fc_vehiculo(e); perform pg_temp.fc_cot(q, e, l, v);
  update public.vehiculos set lead_id = pg_temp.fc_lead(q) where id = v;
  antes := pg_temp.fc_foto(v, l);
  r := pg_temp.fc_crear(q, e, l, v);
  perform pg_temp.fc_da_error('el vehículo de otro lead', r, '23514', 'Este vehículo está vinculado a otro lead. Desvincúlalo antes de crear la final.');
  if r ->> 'hint' is distinct from 'vehiculo' then raise exception 'el 23514 no trae la pista del vehículo: %', r; end if;
  if pg_temp.fc_foto(v, l) is distinct from antes then raise exception 'cambió algo: % → %', antes, pg_temp.fc_foto(v, l); end if;
end $$;
reset role;
rollback;

-- @test crear una final: una preventa que quien crea no ve, o ve y no puede mandar a la papelera (P3 a), da 42501 y nada cambia (N4)
begin;
do $$
declare
  e jsonb := pg_temp.fc_origen(); jefa uuid := pg_temp.fc_crea(); q uuid; l uuid; v uuid; antes jsonb;
  texto constant text := 'Este vehículo tiene preventas que no puedes mandar a la papelera. Pídeselo a quien las cotizó o a quien modera.';
begin
  -- 1. No la ve: ve sólo las suyas y las de su cartera.
  q := pg_temp.fc_crea(array['cotizaciones.ver:propios', 'cotizaciones.crear', 'cotizaciones.editar:propios', 'cotizaciones.final.gestionar', 'leads.ver', 'leads.editar', 'vehiculos.ver']);
  l := pg_temp.fc_lead(q); v := pg_temp.fc_vehiculo(e); perform pg_temp.fc_cot(jefa, e, pg_temp.fc_lead(jefa), v);
  antes := pg_temp.fc_foto(v, l);
  perform pg_temp.fc_da_error('una preventa que no ve', pg_temp.fc_crear(q, e, l, v), '42501', texto);
  if pg_temp.fc_foto(v, l) is distinct from antes then raise exception '(1) cambió algo: % → %', antes, pg_temp.fc_foto(v, l); end if;
  -- 2. La ve y no puede mandarla: ve todas, edita las suyas y no modera.
  q := pg_temp.fc_crea(array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar:propios', 'cotizaciones.final.gestionar', 'leads.ver', 'leads.editar', 'vehiculos.ver']);
  l := pg_temp.fc_lead(q); v := pg_temp.fc_vehiculo(e); perform pg_temp.fc_cot(jefa, e, pg_temp.fc_lead(jefa), v);
  antes := pg_temp.fc_foto(v, l);
  perform pg_temp.fc_da_error('una preventa que ve y no puede mandar', pg_temp.fc_crear(q, e, l, v), '42501', texto);
  if pg_temp.fc_foto(v, l) is distinct from antes then raise exception '(2) cambió algo: % → %', antes, pg_temp.fc_foto(v, l); end if;
end $$;
reset role;
rollback;

-- @test crear una final: otra final activa da 23505 antes del cálculo (P7 a); una final reportada baja a preventa y va al lote (N5)
begin;
do $$
declare e jsonb := pg_temp.fc_origen(); q uuid := pg_temp.fc_crea(); l uuid; v uuid; f uuid; p uuid; r jsonb; antes jsonb; c uuid; v_lote uuid;
begin
  -- (i) Con una final activa y una entrada que el cálculo rechazaría (un nodo que no existe): gana el 23505, con su pista.
  l := pg_temp.fc_lead(q); v := pg_temp.fc_vehiculo(e); perform pg_temp.fc_cot(q, e, l, v, 'final');
  antes := pg_temp.fc_foto(v, l);
  r := pg_temp.fc_crear(q, e, l, v, 'final', gen_random_uuid(), '{"inputs": {"visible": 10}, "overrides": {"no_existe": 5}}');
  perform pg_temp.fc_da_error('otra final activa', r, '23505', 'Este vehículo ya tiene una cotización final activa.');
  if r ->> 'hint' is distinct from 'vehiculo' then raise exception 'el 23505 no trae la pista del vehículo: %', r; end if;
  if pg_temp.fc_foto(v, l) is distinct from antes then raise exception '(i) cambió algo: % → %', antes, pg_temp.fc_foto(v, l); end if;
  -- (ii) Con una final reportada (no ocupa el índice) y una preventa: la nueva es la final, la reportada baja a preventa y las dos van a un lote.
  l := pg_temp.fc_lead(q); v := pg_temp.fc_vehiculo(e); f := pg_temp.fc_cot(q, e, l, v, 'final', 'reportada'); p := pg_temp.fc_cot(q, e, l, v);
  r := pg_temp.fc_crear(q, e, l, v);
  if r ? 'error' then raise exception '(ii) la final no se creó: %', r; end if;
  c := (r -> 'cotizacion' ->> 'id')::uuid;
  select lote_papelera_id into v_lote from public.cotizaciones where id = f;
  if (select clase::text from public.cotizaciones where id = f) <> 'preventa' or v_lote is null or (select lote_papelera_id from public.cotizaciones where id = p) is distinct from v_lote
     or (select count(*) from public.cotizaciones where vehiculo_id = v and clase = 'final' and eliminado_en is null) <> 1 then
    raise exception '(ii) la reportada no bajó al lote con la preventa: %', pg_temp.fc_foto(v, l); end if;
end $$;
reset role;
rollback;
