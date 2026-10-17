-- @test número global (9f-2): el terreno de las sondas
-- El número global de un lead sólo llega a quien tiene `leads.numero_global.ver`, por ninguna ruta. La matriz de
-- leads (`matriz-leads.sql`) ya revisa lo que devuelve cada celda de cada RPC que recibe un lead, y desde su primer
-- bloque todo número global es de la forma 9182xxxxx. Acá van las rutas que no pasan por ella (el alta, verificar un
-- teléfono, importar, la papelera, el kanban, los recordatorios, los vehículos, las vistas), las lecturas directas de
-- las tablas, el permiso concedido y quitado con la sesión abierta, y el inventario que obliga a que toda función
-- que pueda devolver un número esté cubierta.
--
-- Personas de la matriz, ninguna con el permiso: 0050 «propios» (dueño de LP), 0052 y 0058 «todos», 0053 «propios»
-- (dueño de LA), 0054 sólo ve, 0060 y 0063 «propios» de vehículos, 0062 «todos» de vehículos. Quien sí lo tiene: la
-- dueña (0001), que es el control: lo que no lleva el número a una persona sin el permiso lo lleva a ella.
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- Un lead de la dueña (que sí ve el número global) con un recordatorio y una oportunidad, para el control.
do $$
declare v_web uuid := (select id from public.origenes_lead where clave = 'web'); v_id uuid;
begin
  insert into public.leads (nombre, telefono_principal, origen_lead_id, creado_por)
  values ('NG Dueña', '59179190001', v_web, '00000000-0000-0000-0000-000000000001') returning id into v_id;
  perform set_config('ng.dueno', v_id::text, false);
  insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en)
  values ('00000000-0000-0000-0000-000000000001', v_id, 'NG recordatorio de la dueña', now() + interval '1 day');
  insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en)
  values ('00000000-0000-0000-0000-000000000050', current_setting('matriz.lp')::uuid, 'NG recordatorio de 0050', now() + interval '1 day');
  perform set_config('ng.rec', (select id::text from public.recordatorios where titulo = 'NG recordatorio de 0050'), false);
end $$;
-- Un embudo y una oportunidad para 0050 (sobre LP) y para la dueña (sobre su lead).
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000050', false);
set role authenticated;
select public.embudo_por_defecto();
select public.oportunidad_crear(gen_random_uuid(), current_setting('matriz.lp')::uuid, '{"titulo": "NG oportunidad de 0050"}');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
select public.embudo_por_defecto();
select public.oportunidad_crear(gen_random_uuid(), current_setting('ng.dueno')::uuid, '{"titulo": "NG oportunidad de la dueña"}');
reset role;
-- Un vehículo vinculado al lead LV de 0060, con ese lead como interesado.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000060', false);
set role authenticated;
do $$ declare v uuid := (select id from public.vehiculos where titulo = 'Matriz V propio 60'); lv uuid := (select id from public.leads where nombre = 'Matriz LV'); begin
  perform set_config('ng.veh', v::text, false);
  perform set_config('ng.lv', lv::text, false);
  perform public.vehiculo_vincular(v, (select actualizado_en from public.vehiculos where id = v), lv);
  perform public.vehiculo_interesado_marcar(v, lv, 'NG interés');
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- Las sondas: cada una, una sentencia que devuelve lo que la app recibiría. `{lp}`, `{la}`, `{ll}`, `{lv}`, `{dueno}`,
-- `{veh}` y `{rec}` son los leads, el vehículo y el recordatorio del terreno. `control`: la dueña debe ver el global en lo
-- que devuelve (si no, la sonda no mira nada).
create temp table sondas (nombre text not null, plantilla text not null, control boolean not null default false);
insert into sondas (nombre, plantilla, control) values
  ('leads_vista', $q$select * from public.leads_vista$q$, true),
  ('recordatorios_vista', $q$select * from public.recordatorios_vista$q$, true),
  ('lead_ficha', $q$select public.lead_ficha('{lp}')$q$, true),
  ('lead_ficha', $q$select public.lead_ficha('{la}')$q$, true),
  ('lead_ficha', $q$select public.lead_ficha('{lv}')$q$, true),
  ('crear_lead', $q$select public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'NG alta', 'telefono_principal', '79190100', 'origen_lead_id', (select id from public.origenes_lead where clave = 'web')))$q$, true),
  ('crear_lead', $q$select public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'NG duplicado', 'telefono_principal', '78000001', 'origen_lead_id', (select id from public.origenes_lead where clave = 'web')))$q$, true),
  ('crear_lead', $q$select public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'NG adopta', 'telefono_principal', '78000002', 'adoptar', true, 'origen_lead_id', (select id from public.origenes_lead where clave = 'web')))$q$, false),
  ('verificar_telefono', $q$select public.verificar_telefono(null, '78000001')$q$, true),
  ('verificar_telefono', $q$select public.verificar_telefono(null, '78000004')$q$, true),
  ('leads_importar_lote', $q$select public.leads_importar_lote(gen_random_uuid(), 2, jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'fila', 2, 'lead', jsonb_build_object('nombre', 'NG imp uno', 'telefono_principal', '79190200', 'origen_lead_id', (select id from public.origenes_lead where clave = 'web'))),
      jsonb_build_object('id', gen_random_uuid(), 'fila', 3, 'lead', jsonb_build_object('nombre', 'NG imp dos', 'telefono_principal', '79190201', 'origen_lead_id', (select id from public.origenes_lead where clave = 'web')))))$q$, true),
  ('leads_papelera_listar', $q$select public.leads_papelera_listar(null, null, false, 6)$q$, true),
  ('embudo_tablero', $q$select public.embudo_tablero((select id from public.embudos where es_default and usuario_id = (select auth.uid())), 50, 500)$q$, false),
  ('embudo_etapa_pagina', $q$select public.embudo_etapa_pagina((select o.etapa_id from public.oportunidades o where o.usuario_id = (select auth.uid()) limit 1), null, null, 50)$q$, false),
  ('lead_oportunidades', $q$select public.lead_oportunidades('{lp}')$q$, false),
  ('lead_seguimientos', $q$select public.lead_seguimientos('{lp}', null, null, 20)$q$, false),
  ('lead_recordatorios', $q$select public.lead_recordatorios('{lp}', false, null, null, 20)$q$, false),
  ('lead_recordatorios', $q$select public.lead_recordatorios('{dueno}', false, null, null, 20)$q$, true),
  ('recordatorio_guardar', $q$select public.recordatorio_guardar('{rec}', (select actualizado_en from public.recordatorios where id = '{rec}'), '{"titulo": "NG cambia"}')$q$, false),
  ('recordatorio_completar', $q$select public.recordatorio_completar('{rec}', (select actualizado_en from public.recordatorios where id = '{rec}'), true)$q$, false),
  ('recordatorio_eliminar', $q$select public.recordatorio_eliminar('{rec}', (select actualizado_en from public.recordatorios where id = '{rec}'))$q$, false),
  ('recordatorio_restaurar', $q$select public.recordatorio_restaurar('{rec}', (select actualizado_en from public.recordatorios where id = '{rec}'))$q$, false),
  ('vehiculo_vinculos', $q$select * from public.vehiculo_vinculos('{veh}')$q$, true),
  ('vehiculo_interesados', $q$select * from public.vehiculo_interesados('{veh}')$q$, true),
  ('vehiculos_para_lead', $q$select public.vehiculos_para_lead('{lp}', 'Matriz')$q$, false);

-- Una vista previa de lo que la sonda devuelve a quien sí lo ve, para que el control signifique algo.
create function pg_temp.salida(p_persona text, p_sql text) returns text language plpgsql as $$
declare v text;
begin
  begin
    perform set_config('request.jwt.claim.sub', p_persona, true);
    set local role authenticated;
    begin
      execute 'select coalesce(jsonb_agg(to_jsonb(t))::text, '''') from (' || p_sql || ') t' into v;
    exception when others then
      v := 'ERROR ' || sqlstate || ': ' || sqlerrm;
    end;
    raise exception 'deshacer' using errcode = 'P0999';
  exception when sqlstate 'P0999' then
    null;
  end;
  return v;
end $$;
create function pg_temp.con_terreno(p_sql text) returns text language sql as $$
  select replace(replace(replace(replace(replace(replace(replace(p_sql,
    '{lp}', current_setting('matriz.lp')), '{la}', current_setting('matriz.la')), '{ll}', current_setting('matriz.ll')),
    '{lv}', current_setting('ng.lv')), '{dueno}', current_setting('ng.dueno')), '{veh}', current_setting('ng.veh')), '{rec}', current_setting('ng.rec'));
$$;

-- @test número global (9f-2): ninguna persona sin el permiso recibe un número global en lo que devuelve cada ruta, y la dueña sí
do $$
declare
  -- Personas de la matriz sin `leads.numero_global.ver`: «propios», «todos», sólo ver y las de vehículos.
  v_personas constant text[] := array['00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000052',
    '00000000-0000-0000-0000-000000000053', '00000000-0000-0000-0000-000000000054', '00000000-0000-0000-0000-000000000058',
    '00000000-0000-0000-0000-000000000060', '00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000063'];
  v_duena constant text := '00000000-0000-0000-0000-000000000001';
  s record; p text; v text; v_fallas text := ''; v_vacias text := ''; v_ok int;
begin
  -- Que sea verdad que ninguna de estas personas lo tiene.
  if exists (select 1 from public.usuarios_roles ur join public.roles_permisos rp on rp.rol_id = ur.rol_id
              where ur.usuario_id::text = any (v_personas) and rp.permiso_clave = 'leads.numero_global.ver') then
    raise exception 'una persona de la prueba tiene el permiso: la sonda no mide nada';
  end if;
  for s in select nombre, pg_temp.con_terreno(plantilla) as sql, control from sondas order by nombre, plantilla loop
    v_ok := 0;
    foreach p in array v_personas loop
      v := pg_temp.salida(p, s.sql);
      if v ~ '\m9182[0-9]{5}\M' then
        v_fallas := v_fallas || E'\n  ' || s.nombre || ' como ' || right(p, 4) || ' devolvió un número global: ' || left(v, 240);
      end if;
      if v not like 'ERROR%' then v_ok := v_ok + 1; end if;
    end loop;
    -- Una sonda que da error a todas las personas no mira nada: el cinturón lo dice.
    if v_ok = 0 then
      v_vacias := v_vacias || E'\n  ' || s.nombre || ' dio error a todas las personas: ' || left(pg_temp.salida(v_personas[1], s.sql), 160);
    end if;
    -- El control: con el permiso, el global está en lo que devuelve.
    if s.control then
      v := pg_temp.salida(v_duena, s.sql);
      if v not like 'ERROR%' and v !~ '\m9182[0-9]{5}\M' then
        v_vacias := v_vacias || E'\n  ' || s.nombre || ' no lleva el número global ni a la dueña (' || left(v, 160) || ')';
      elsif v like 'ERROR%' then
        v_vacias := v_vacias || E'\n  ' || s.nombre || ' le dio error a la dueña: ' || left(v, 160);
      end if;
    end if;
  end loop;
  if v_fallas <> '' then raise exception 'Una persona sin el permiso recibió el número global:%', v_fallas; end if;
  if v_vacias <> '' then raise exception 'Hay sondas que no miran nada:%', v_vacias; end if;
end $$;

-- @test número global (9f-2): las tablas no se leen directo, y el número propio es de quien lo creó
do $$
declare
  p50 constant text := '00000000-0000-0000-0000-000000000050'; p52 constant text := '00000000-0000-0000-0000-000000000052';
  p53 constant text := '00000000-0000-0000-0000-000000000053'; p01 constant text := '00000000-0000-0000-0000-000000000001';
  v text;
begin
  -- `leads.numero` y `leads.numero_propio` no tienen grant para la app.
  foreach v in array array[p01, p50, p52] loop
    if pg_temp.salida(v, 'select numero from public.leads') not like 'ERROR 42501%'
       or pg_temp.salida(v, 'select numero_propio from public.leads') not like 'ERROR 42501%' then
      raise exception 'se pudo leer leads.numero o leads.numero_propio como %: %', right(v, 4), pg_temp.salida(v, 'select numero from public.leads'); end if;
  end loop;
  -- Sin el permiso, la copia del número global no tiene filas; con él, todas las de leads que se ven.
  if pg_temp.salida(p50, 'select * from public.leads_numeros_globales') <> '' or pg_temp.salida(p52, 'select * from public.leads_numeros_globales') <> '' then
    raise exception 'una persona sin el permiso leyó leads_numeros_globales'; end if;
  if pg_temp.salida(p01, 'select * from public.leads_numeros_globales') !~ '\m9182[0-9]{5}\M' then raise exception 'la dueña no lee leads_numeros_globales'; end if;
  -- El número propio: sólo el de lo que creó cada quien («Matriz LP» y «Matriz LL» son de 0050; «Matriz LA», de 0053).
  if (select count(*) from public.leads_numeros_propios where creado_por = p50::uuid) < 3 then raise exception 'terreno: 0050 debía haber creado al menos 3'; end if;
  if pg_temp.salida(p50, 'select count(*) from public.leads_numeros_propios where creado_por <> (select auth.uid())') not like '%"count": 0%' then
    raise exception '0050 leyó el número propio de otra persona'; end if;
  if pg_temp.salida(p52, 'select count(*) from public.leads_numeros_propios where creado_por <> (select auth.uid())') not like '%"count": 0%' then
    raise exception 'la supervisión sin el permiso leyó el número propio de otra persona'; end if;
  if pg_temp.salida(p53, 'select count(*) from public.leads_numeros_propios') not like '%"count": 1%' then
    raise exception '0053 debía leer sólo el suyo: %', pg_temp.salida(p53, 'select count(*) from public.leads_numeros_propios'); end if;
  if pg_temp.salida(p01, 'select count(*) from public.leads_numeros_propios where creado_por <> (select auth.uid())') like '%"count": 0%' then
    raise exception 'la dueña, con el permiso, debía leer el número propio de los demás'; end if;
  -- Ni el limbo ni la papelera, tampoco con el permiso.
  if pg_temp.salida(p01, format('select * from public.leads_numeros_globales where lead_id in (%L, %L)', current_setting('matriz.ll'), current_setting('matriz.lt'))) <> '' then
    raise exception 'la dueña leyó el número de un lead en limbo o en la papelera'; end if;
  -- La vista dice lo mismo que las copias: el global o nada, y el visible ya resuelto.
  if pg_temp.salida(p52, 'select 1 as x from public.leads_vista where numero is not null or numero_visible is not null and numero_propio is null') <> '' then
    raise exception '«todos» sin el permiso vio un número visible que no es el propio'; end if;
  if pg_temp.salida(p01, 'select 1 as x from public.leads_vista where numero is null or numero_visible <> numero') <> '' then
    raise exception 'con el permiso, el visible debía ser el global'; end if;
end $$;

-- @test número global (9f-2): conceder o quitar el permiso con la sesión abierta se ve en la siguiente consulta
do $$
declare
  r uuid := (select id from public.roles where clave = 'humo_matriz_todos');
  p52 constant text := '00000000-0000-0000-0000-000000000052';
  v_ver timestamptz; v text;
begin
  -- Sin el permiso: nada.
  if pg_temp.salida(p52, 'select count(*) as n from public.leads_vista where numero is not null') not like '%"n": 0%' then
    raise exception 'ya veía números globales'; end if;
  -- Se lo conceden (una persona con rbac.gestionar, como el dueño): la siguiente consulta del mismo rol ya los ve.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  perform public.rbac_otorgar(r, 'leads.numero_global.ver', (select actualizado_en from public.roles where id = r));
  reset role;
  v := pg_temp.salida(p52, 'select count(*) as n from public.leads_vista where numero is not null');
  if v like '%"n": 0%' or v like 'ERROR%' then raise exception 'conceder el permiso no se vio en la siguiente consulta: %', v; end if;
  if pg_temp.salida(p52, 'select count(*) as n from public.leads_numeros_globales') like '%"n": 0%' then raise exception 'las copias no se abrieron'; end if;
  -- Se lo quitan: vuelve a no ver nada, sin que quede nada en caché.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  perform public.rbac_revocar(r, 'leads.numero_global.ver', (select actualizado_en from public.roles where id = r));
  reset role;
  if pg_temp.salida(p52, 'select count(*) as n from public.leads_vista where numero is not null') not like '%"n": 0%' then
    raise exception 'quitar el permiso no se vio en la siguiente consulta'; end if;
  if pg_temp.salida(p52, 'select count(*) as n from public.leads_numeros_globales') not like '%"n": 0%' then raise exception 'las copias siguieron abiertas'; end if;
end $$;

-- @test número global (9f-2): la auditoría y las constancias no guardan ningún número global
do $$
declare v text;
begin
  -- Desde que los números globales son de 9182xxxxx (la matriz), ni `actividad.antes/despues` ni `detalle` llevan uno.
  select string_agg(a.id::text || ':' || a.accion, ', ') into v from public.actividad a
   where (coalesce(a.antes::text, '') || coalesce(a.despues::text, '') || coalesce(a.detalle::text, '')) ~ '\m9182[0-9]{5}\M';
  if v is not null then raise exception 'la actividad guardó un número global: %', left(v, 300); end if;
  -- Y las que dejan la fila de un lead tampoco llevan el propio: es inmutable, nunca es un cambio.
  if exists (select 1 from public.actividad a where a.tabla = 'leads' and (a.antes ? 'numero' or a.despues ? 'numero' or a.antes ? 'numero_propio' or a.despues ? 'numero_propio')) then
    raise exception 'la actividad de un lead guardó un número'; end if;
  if not exists (select 1 from public.actividad a where a.tabla = 'leads') then raise exception 'sin actividad de leads: el terreno no corrió'; end if;
end $$;

-- @test número global (9f-2): el inventario. Toda función que puede devolver el número de un lead está cubierta
-- Calcula, sobre el catálogo vigente, todo lo que la app puede llamar y que emite números de leads: lo que lee las
-- copias o `leads_vista`, lo que arma JSON con la fila de un lead, y todo lo que llama (directa o indirectamente) a
-- algo así. Cada una tiene que pasar por la matriz de leads (que revisa lo que devuelve cada celda), por una sonda de
-- arriba, o figurar con el motivo por el que no devuelve el número de un lead. Una función nueva que devuelve leads y
-- no figura rompe esta prueba; una que figura y ya no existe, también.
do $$
declare
  -- No devuelven el número de un lead (el motivo, en una frase). Entran al inventario por llamar a algo que sí lo hace.
  v_sin_numero constant jsonb := jsonb_build_object(
    '_oportunidad_json', 'recibe una oportunidad y devuelve el número del vehículo, nunca el de un lead',
    'lead_seguimiento', 'devuelve un seguimiento: sólo el número del vehículo que nombra',
    'leads_exportacion_registrar', 'deja la constancia (cuántas filas y qué filtros): ningún lead',
    'lead_campo_crear', 'devuelve el campo creado: nada de leads');
  r record; v_fallas text := '';
begin
  if to_regclass('pg_temp.matriz_cubiertas') is null then
    raise exception 'la matriz de leads no corrió antes de este cinturón';
  end if;
  for r in
    with recursive todas as (
      select p.oid, p.proname, p.prosrc, p.prorettype, p.prosecdef,
             (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute')) as ejecutable
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname in ('public', 'web') and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
         and p.proname not in ('_lead_numeros', '_lead_numeros_de', '_leads_numerar_existentes', '_leads_vista_crear')
    ), fuente as (
      select oid from todas
       where (prosrc ~* '\ynumero' and prosrc ~* 'lead')
          or (prosrc ~* '(to_jsonb|row_to_json)\s*\(\s*[a-z_]+\s*\)' and prosrc ~* 'leads')
          or prorettype in ('public.leads'::regtype, 'public.leads_vista'::regtype)
          or prosrc ~* 'leads_numeros_(globales|propios)' or prosrc ~* 'leads_vista|recordatorios_vista'
    ), cierre as (
      select oid from fuente
      union
      select t.oid from todas t join cierre c on true join todas g on g.oid = c.oid
       where t.prosrc ~ ('\m' || g.proname || '\s*\(') and t.oid <> g.oid
    )
    select distinct t.proname from todas t where t.oid in (select oid from cierre) and t.ejecutable
  loop
    if not exists (select 1 from pg_temp.matriz_cubiertas c where c.rpc = r.proname)
       and not exists (select 1 from sondas s where s.nombre = r.proname) and not v_sin_numero ? r.proname then
      v_fallas := v_fallas || E'\n  puede devolver el número de un lead y nadie lo prueba: ' || r.proname;
    end if;
  end loop;
  -- Las que figuran y ya no existen.
  for r in select k as nombre from jsonb_object_keys(v_sin_numero) k
            union select distinct nombre from sondas where nombre not in ('leads_vista', 'recordatorios_vista')
  loop
    if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'web') and p.proname = r.nombre) then
      v_fallas := v_fallas || E'\n  figura y ya no existe: ' || r.nombre;
    end if;
  end loop;
  -- Las vistas: cada una que nombra el número de un lead tiene su sonda.
  for r in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where c.relkind in ('v', 'm') and n.nspname in ('public', 'web')
       and ((pg_get_viewdef(c.oid) ~* '\ynumero' and pg_get_viewdef(c.oid) ~* 'lead') or pg_get_viewdef(c.oid) ~* 'leads_numeros_(globales|propios)' or pg_get_viewdef(c.oid) ~* 'leads_vista')
  loop
    if not exists (select 1 from sondas s where s.nombre = r.relname) then
      v_fallas := v_fallas || E'\n  una vista que nombra números de leads sin sonda: ' || r.relname;
    end if;
  end loop;
  if v_fallas <> '' then
    raise exception 'El número global tiene una ruta sin probar:%', v_fallas;
  end if;
end $$;
