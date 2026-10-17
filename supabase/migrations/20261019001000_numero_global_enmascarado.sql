-- El número global de un lead sólo llega a quien tiene `leads.numero_global.ver` (9f-2), por ninguna ruta.
--
-- Una columna no puede ser legible según quién mira, y `authenticated` leía `leads.numero` con un grant de
-- columna (`…000200_rls_y_grants.sql`): enmascararlo sólo en `leads_vista` dejaba abierto
-- `/rest/v1/leads?select=numero`. Por eso el grant se revoca y los números se leen de dos tablas cuya policy es
-- la regla (`…000900_numeros_de_leads.sql`): la fila del global existe sólo para quien tiene el permiso, la del
-- propio para quien creó el lead o tiene el permiso, y las dos sólo de leads que se ven.
--
-- Todo lo que leía `leads.numero` como quien mira (la vista, el kanban, los vehículos, los recordatorios) pasa a
-- unir esas tablas; lo que lo leía con los derechos de la base (la papelera, el alta, la importación, verificar un
-- teléfono) calcula el permiso UNA vez por consulta y se lo pasa a `_lead_numeros()`. Donde antes había `numero`
-- ahora hay `numero` (el global, o nulo) y `numero_propio` (el que se ve, o nulo): quien dibuja no decide nada.

-- ---------------------------------------------------------------------------------------------------
-- Qué número de un lead ve quien mira: el global sólo con el permiso; el propio con el permiso o si es suyo.
-- `p_ve` lo calcula quien llama UNA vez por consulta (`(select tiene_permiso(…))` es un InitPlan): esta función no
-- pregunta nada por fila. La usan las funciones que leen `leads` con los derechos de la base (definer); las que leen
-- como quien mira se apoyan en la policy de las dos tablas de números.
-- ---------------------------------------------------------------------------------------------------
create or replace function public._lead_numeros(p_lead public.leads, p_ve boolean)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'numero', case when p_ve then p_lead.numero end,
    'numero_propio', case when p_ve or p_lead.creado_por = (select auth.uid()) then p_lead.numero_propio end);
$$;
revoke all on function public._lead_numeros(public.leads, boolean) from public, anon, authenticated;

-- Lo mismo para un solo lead por su id (una respuesta que nombra uno: el alta, el recordatorio). Pregunta el
-- permiso una vez por llamada; para listas, `_lead_numeros` con el permiso ya calculado.
create or replace function public._lead_numeros_de(p_lead uuid)
returns jsonb language sql security definer set search_path = '' as $$
  select coalesce((select public._lead_numeros(l, public.tiene_permiso('leads.numero_global.ver'))
                     from public.leads l where l.id = p_lead), '{}'::jsonb);
$$;
revoke all on function public._lead_numeros_de(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------
-- `leads.numero` deja de ser legible para la app. Desde acá el global sólo llega por `leads_numeros_globales`
-- (con el permiso) y el propio por `leads_numeros_propios`; `leads.numero_propio` nunca tuvo grant.
-- ---------------------------------------------------------------------------------------------------
revoke select (numero) on table public.leads from authenticated;

-- ---------------------------------------------------------------------------------------------------
-- leads_vista: `numero` es el global o nulo; `numero_propio` el que se ve; `numero_visible` ya viene resuelto.
-- Las copias se leen bajo la policy de quien mira, con SUBCONSULTAS en la lista de columnas y no con joins: Postgres
-- las evalúa después del orden y el límite, sólo para las filas que salen. Con joins corrían por cada fila que la
-- consulta recorre antes de cortar (una página profunda recorre ~37.000: 1.090 ms contra 332 ms).
-- ---------------------------------------------------------------------------------------------------
create or replace function public._leads_vista_crear()
 returns void
 language plpgsql
 security definer
 set search_path = ''
as $$
begin
  drop view if exists public.leads_vista;
  create view public.leads_vista with (security_invoker = true) as
  select l.id,
         (select g.numero from public.leads_numeros_globales g where g.lead_id = l.id) as numero,
         l.nombre, l.telefono_cc,
         public.telefono_lead(l.id) as telefono_principal,
         public.en_cartera(l.id) as telefono_visible,
         l.tipo, l.origen_lead_id,
         public.atributos_lead(l.id) as atributos,
         l.creado_por, l.ultimo_seguimiento_en, l.creado_en, l.actualizado_en,
         (fav.lead_id is not null) as es_favorito,
         (tach.lead_id is not null) as esta_tachado,
         (select la.usuario_id from public.leads_asesores la where la.lead_id = l.id and la.tipo_acceso = 'dueno' and la.revocado_en is null) as dueno_id,
         public.en_cartera(l.id) as en_cartera,
         array(select le.etiqueta_id from public.leads_etiquetas le join public.etiquetas e on e.id = le.etiqueta_id
                where le.lead_id = l.id and e.usuario_id = (select auth.uid()) order by le.etiqueta_id) as etiquetas,
         (select np.numero from public.leads_numeros_propios np where np.lead_id = l.id) as numero_propio,
         (select np.creado_por from public.leads_numeros_propios np where np.lead_id = l.id) as numero_propio_de,
         coalesce((select g.numero from public.leads_numeros_globales g where g.lead_id = l.id),
                  (select np.numero::bigint from public.leads_numeros_propios np where np.lead_id = l.id)) as numero_visible
  from public.leads l
  left join public.leads_favoritos fav on fav.lead_id = l.id and fav.usuario_id = (select auth.uid())
  left join public.leads_tachados tach on tach.lead_id = l.id and tach.usuario_id = (select auth.uid());
  grant select on public.leads_vista to authenticated;
end;
$$;
select public._leads_vista_crear();

-- ---------------------------------------------------------------------------------------------------
-- La ficha: el número (global o nulo) y el propio, con quién lo creó si no es quien mira.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.lead_ficha(p_lead uuid)
 returns jsonb
 language plpgsql
 stable
 set search_path = ''
as $$
declare v record; t record;
begin
  select * into v from public.leads_vista lv where lv.id = p_lead;
  if not found then
    return null;
  end if;
  select la.usuario_id as id, nullif(btrim(p.nombre), '') as nombre into t
    from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
   where la.lead_id = p_lead and la.revocado_en is null
   order by (la.tipo_acceso = 'dueno') desc, la.desde
   limit 1;
  return jsonb_build_object(
    'id', v.id, 'numero', v.numero, 'numero_propio', v.numero_propio, 'numero_propio_de', v.numero_propio_de,
    'numero_propio_creador', (select nullif(btrim(p.nombre), '') from public.perfiles p
                               where p.id = v.numero_propio_de and v.numero_propio_de is distinct from (select auth.uid())),
    'nombre', v.nombre,
    'telefono_cc', v.telefono_cc, 'telefono', v.telefono_principal, 'en_cartera', v.en_cartera,
    'tipo', v.tipo, 'origen_lead_id', v.origen_lead_id,
    'atributos', coalesce(v.atributos, '{}'::jsonb),
    'creado_en', v.creado_en, 'actualizado_en', v.actualizado_en,
    'tiene_id', t.id, 'tiene_nombre', t.nombre,
    'telefonos', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'telefono', x.telefono, 'etiqueta', x.etiqueta)
                       order by x.creado_en, x.id)
        from public.lead_telefonos(p_lead) x), '[]'::jsonb),
    'recordatorios_vencidos', (
      select count(*) from (
        select 1 from public.recordatorios r
         where r.usuario_id = (select auth.uid()) and r.lead_id = p_lead
           and r.completado_en is null and r.eliminado_en is null and r.recordar_en <= now()
         order by r.recordar_en limit 21) x),
    -- Hasta 101 (el aviso dice «más de 100»); índice `vehiculos_lead_idx`.
    'vehiculos_vinculados', (select count(*) from (select 1 from public.vehiculos x where x.lead_id = p_lead limit 101) q),
    'es_favorito', v.es_favorito, 'esta_tachado', v.esta_tachado,
    'etiquetas', to_jsonb(v.etiquetas));
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- El kanban: la tarjeta lleva el número que se ve (de las dos copias, bajo la policy de quien mira), como subconsulta:
-- con un join se buscaría para cada oportunidad que la consulta recorre antes de ordenar (7.883 en una columna de 8.000).
-- ---------------------------------------------------------------------------------------------------
create or replace function public.embudo_tablero(p_embudo uuid, p_tope integer DEFAULT 50, p_tope_total integer DEFAULT 500)
 returns jsonb
 language sql
 stable
 set search_path = ''
as $$
  with tope as (select least(greatest(coalesce(p_tope, 50), 1), 100) as n,
                       least(greatest(coalesce(p_tope_total, 500), 1), 1000) as total)
  select jsonb_build_object(
    'embudo', jsonb_build_object('id', x.id, 'nombre', x.nombre, 'es_default', x.es_default, 'actualizado_en', x.actualizado_en),
    'columnas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'etapa', jsonb_build_object('id', s.id, 'nombre', s.nombre, 'color', s.color,
                   'es_inicial', s.es_inicial, 'es_ganada', s.es_ganada, 'es_perdida', s.es_perdida),
        'total', least(c.leidas, (select total from tope)),
        'total_hay_mas', c.leidas > (select total from tope),
        'hay_mas', c.leidas > (select n from tope),
        'tarjetas', coalesce((
          select jsonb_agg(t.tarjeta order by t.en desc, t.id desc)
            from (select public._tarjeta_json(o, jsonb_build_object('id', l.id,
                                         'numero', (select g.numero from public.leads_numeros_globales g where g.lead_id = l.id),
                                         'numero_propio', (select np.numero from public.leads_numeros_propios np where np.lead_id = l.id),
                                         'nombre', l.nombre),
                                         case when v.id is not null then jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero) end) as tarjeta, o.ultima_actividad_en as en, o.id
                    from public.oportunidades o
                    join public.leads l on l.id = o.lead_id
                    left join public.vehiculos v on v.id = o.vehiculo_id
                   where o.etapa_id = s.id
                   order by o.ultima_actividad_en desc, o.id desc
                   limit (select n from tope)) t), '[]'::jsonb))
        order by s.orden, s.id)
      from public.embudos_etapas s
      cross join lateral (select count(*)::int as leidas
                            from (select 1 from public.oportunidades o2 where o2.etapa_id = s.id
                                  limit (select total from tope) + 1) q) c
      where s.embudo_id = x.id), '[]'::jsonb))
  from public.embudos x where x.id = p_embudo;
$$;
create or replace function public.embudo_etapa_pagina(p_etapa uuid, p_antes_en timestamp with time zone, p_antes_id uuid, p_tope integer DEFAULT 50)
 returns jsonb
 language plpgsql
 stable
 set search_path = ''
as $$
declare
  v_n int := least(greatest(coalesce(p_tope, 50), 1), 100);
  v_tarjetas jsonb;
  v_hay_mas boolean;
begin
  if p_antes_en is null then
    select coalesce(jsonb_agg(p.tarjeta order by p.en desc, p.id desc) filter (where p.k <= v_n), '[]'::jsonb),
           coalesce(bool_or(p.k > v_n), false)
      into v_tarjetas, v_hay_mas
      from (select public._tarjeta_json(o, jsonb_build_object('id', l.id,
                                         'numero', (select g.numero from public.leads_numeros_globales g where g.lead_id = l.id),
                                         'numero_propio', (select np.numero from public.leads_numeros_propios np where np.lead_id = l.id),
                                         'nombre', l.nombre),
                                           case when v.id is not null then jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero) end) as tarjeta,
                   o.ultima_actividad_en as en, o.id,
                   row_number() over (order by o.ultima_actividad_en desc, o.id desc) as k
              from public.oportunidades o
              join public.leads l on l.id = o.lead_id
              left join public.vehiculos v on v.id = o.vehiculo_id
             where o.etapa_id = p_etapa
             order by o.ultima_actividad_en desc, o.id desc
             limit v_n + 1) p;
  else
    select coalesce(jsonb_agg(p.tarjeta order by p.en desc, p.id desc) filter (where p.k <= v_n), '[]'::jsonb),
           coalesce(bool_or(p.k > v_n), false)
      into v_tarjetas, v_hay_mas
      from (select public._tarjeta_json(o, jsonb_build_object('id', l.id,
                                         'numero', (select g.numero from public.leads_numeros_globales g where g.lead_id = l.id),
                                         'numero_propio', (select np.numero from public.leads_numeros_propios np where np.lead_id = l.id),
                                         'nombre', l.nombre),
                                           case when v.id is not null then jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero) end) as tarjeta,
                   o.ultima_actividad_en as en, o.id,
                   row_number() over (order by o.ultima_actividad_en desc, o.id desc) as k
              from public.oportunidades o
              join public.leads l on l.id = o.lead_id
              left join public.vehiculos v on v.id = o.vehiculo_id
             where o.etapa_id = p_etapa
               and (o.ultima_actividad_en, o.id) < (p_antes_en, p_antes_id)
             order by o.ultima_actividad_en desc, o.id desc
             limit v_n + 1) p;
  end if;
  return jsonb_build_object('tarjetas', v_tarjetas, 'hay_mas', v_hay_mas);
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Vehículos: el lead vinculado, los interesados y «ya vinculado a otro» nombran al lead con el número que se ve.
-- ---------------------------------------------------------------------------------------------------
drop function public.vehiculo_interesados(uuid);
create function public.vehiculo_interesados(p_vehiculo uuid)
 returns table (lead_id uuid, lead_nombre text, lead_numero bigint, lead_numero_propio integer, nota text,
                creado_en timestamptz, por_nombre text)
 language sql stable set search_path = '' as $$
  select i.lead_id, l.nombre, g.numero, np.numero, i.nota, i.creado_en, p.nombre
  from public.vehiculos_interesados i
  join public.leads l on l.id = i.lead_id
  left join public.leads_numeros_globales g on g.lead_id = l.id
  left join public.leads_numeros_propios np on np.lead_id = l.id
  left join public.perfiles p on p.id = i.usuario_id
  where i.vehiculo_id = p_vehiculo
  order by i.creado_en desc, i.lead_id
  limit 100;
$$;
revoke all on function public.vehiculo_interesados(uuid) from public, anon;
grant execute on function public.vehiculo_interesados(uuid) to authenticated;

drop function public.vehiculo_vinculos(uuid);
create function public.vehiculo_vinculos(p_vehiculo uuid)
 returns table (lead_id uuid, lead_nombre text, lead_numero bigint, lead_numero_propio integer, desde timestamptz,
                hasta timestamptz, por_nombre text)
 language sql stable set search_path = '' as $$
  select k.lead_id, l.nombre, g.numero, np.numero, k.desde, k.hasta, p.nombre
  from public.vehiculos_vinculos k
  left join public.leads l on l.id = k.lead_id
  left join public.leads_numeros_globales g on g.lead_id = l.id
  left join public.leads_numeros_propios np on np.lead_id = l.id
  left join public.perfiles p on p.id = k.usuario_id
  where k.vehiculo_id = p_vehiculo
  -- El vigente primero; después, del más reciente al más viejo.
  order by (k.hasta is not null), k.desde desc, k.id desc
  limit 50;
$$;
revoke all on function public.vehiculo_vinculos(uuid) from public, anon;
grant execute on function public.vehiculo_vinculos(uuid) to authenticated;
create or replace function public.vehiculos_para_lead(p_lead uuid, p_texto text DEFAULT NULL::text)
 returns jsonb
 language plpgsql
 stable
 set search_path = ''
as $$
declare
  v_texto text := nullif(btrim(left(coalesce(p_texto, ''), 60)), '');
  v_numero bigint;
  v_patron text;
begin
  if not public.puede_lead(p_lead, 'leads.ver') then
    return '[]'::jsonb;
  end if;
  if v_texto ~ '^#?[0-9]{1,12}$' then
    v_numero := ltrim(v_texto, '#')::bigint;
  end if;
  v_patron := '%' || replace(replace(replace(coalesce(v_texto, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return coalesce((
    select jsonb_agg(public._vehiculo_resumen(v) || jsonb_build_object(
             'vinculado_aqui', v.lead_id is not distinct from p_lead,
             'vinculado_a_otro', v.lead_id is not null and v.lead_id <> p_lead,
             'otro_lead', case when v.lead_id is not null and v.lead_id <> p_lead then
                            (select jsonb_build_object('nombre', l.nombre, 'numero', g.numero, 'numero_propio', np.numero)
                              from public.leads l
                              left join public.leads_numeros_globales g on g.lead_id = l.id
                              left join public.leads_numeros_propios np on np.lead_id = l.id
                             where l.id = v.lead_id) end,
             'reemplazable', v.lead_id is not null and v.lead_id <> p_lead and public.puede_actuar_lead(v.lead_id, 'leads.editar'),
             'interesado', exists (select 1 from public.vehiculos_interesados i where i.vehiculo_id = v.id and i.lead_id = p_lead))
           order by v.creado_en desc, v.id desc)
      from (select * from public.vehiculos x
             where v_texto is null
                or x.numero = v_numero
                or x.titulo ilike v_patron or x.vin ilike v_patron or x.lote ilike v_patron
             order by x.creado_en desc, x.id desc
             limit 20) v), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Recordatorios: el lead que nombran lleva el número que se ve.
-- ---------------------------------------------------------------------------------------------------
drop view public.recordatorios_vista;
create view public.recordatorios_vista with (security_invoker = true) as
 select r.id, r.titulo, r.recordar_en, r.notificado_en, r.completado_en, r.creado_en, r.actualizado_en,
        l.id as lead_id, l.nombre as lead_nombre,
        (select g.numero from public.leads_numeros_globales g where g.lead_id = r.lead_id) as lead_numero,
        (select np.numero from public.leads_numeros_propios np where np.lead_id = r.lead_id) as lead_numero_propio,
        v.id as vehiculo_id, v.titulo as vehiculo_titulo, v.numero as vehiculo_numero,
        r.vehiculo_id is not null and v.id is null as vehiculo_oculto
   from public.recordatorios r
   left join public.leads l on l.id = r.lead_id
   left join public.vehiculos v on v.id = r.vehiculo_id;
grant select on public.recordatorios_vista to authenticated;
create or replace function public.lead_recordatorios(p_lead uuid, p_completados boolean DEFAULT false, p_desde_en timestamp with time zone DEFAULT NULL::timestamp with time zone, p_desde_id uuid DEFAULT NULL::uuid, p_tamano integer DEFAULT 20)
 returns jsonb
 language plpgsql
 stable
 set search_path = ''
as $$
declare
  v_tamano int := least(greatest(coalesce(p_tamano, 20), 1), 50);
  v_yo uuid := (select auth.uid());
  v_lead record;
  v_filas public.recordatorios[];
  v_json jsonb;
  v_hay_completados boolean;
begin
  select l.id, l.nombre, g.numero, np.numero as numero_propio into v_lead
    from public.leads l
    left join public.leads_numeros_globales g on g.lead_id = l.id
    left join public.leads_numeros_propios np on np.lead_id = l.id
   where l.id = p_lead;
  if not found then
    return jsonb_build_object('recordatorios', '[]'::jsonb, 'hay_mas', false, 'hay_completados', false,
                              'puedo_agendar', false);
  end if;
  if coalesce(p_completados, false) then
    if p_desde_en is null then
      select array_agg(x.r order by (x.r).completado_en desc, (x.r).id desc) into v_filas from (
        select r from public.recordatorios r
         where r.usuario_id = v_yo and r.lead_id = p_lead and r.completado_en is not null and r.eliminado_en is null
         order by r.completado_en desc, r.id desc limit v_tamano + 1) x;
    else
      select array_agg(x.r order by (x.r).completado_en desc, (x.r).id desc) into v_filas from (
        select r from public.recordatorios r
         where r.usuario_id = v_yo and r.lead_id = p_lead and r.completado_en is not null and r.eliminado_en is null
           and (r.completado_en, r.id) < (p_desde_en, p_desde_id)
         order by r.completado_en desc, r.id desc limit v_tamano + 1) x;
    end if;
    v_hay_completados := true;
  else
    if p_desde_en is null then
      select array_agg(x.r order by (x.r).recordar_en, (x.r).id) into v_filas from (
        select r from public.recordatorios r
         where r.usuario_id = v_yo and r.lead_id = p_lead and r.completado_en is null and r.eliminado_en is null
         order by r.recordar_en, r.id limit v_tamano + 1) x;
    else
      select array_agg(x.r order by (x.r).recordar_en, (x.r).id) into v_filas from (
        select r from public.recordatorios r
         where r.usuario_id = v_yo and r.lead_id = p_lead and r.completado_en is null and r.eliminado_en is null
           and (r.recordar_en, r.id) > (p_desde_en, p_desde_id)
         order by r.recordar_en, r.id limit v_tamano + 1) x;
    end if;
    v_hay_completados := exists (
      select 1 from public.recordatorios r
       where r.usuario_id = v_yo and r.lead_id = p_lead and r.completado_en is not null and r.eliminado_en is null);
  end if;
  -- La forma de `recordatorios_vista`; la RLS de `vehiculos` vacía el join si quien mira no lo ve.
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', u.id, 'titulo', u.titulo, 'recordar_en', u.recordar_en, 'notificado_en', u.notificado_en,
           'completado_en', u.completado_en, 'creado_en', u.creado_en, 'actualizado_en', u.actualizado_en,
           'lead_id', v_lead.id, 'lead_nombre', v_lead.nombre, 'lead_numero', v_lead.numero, 'lead_numero_propio', v_lead.numero_propio,
           'vehiculo_id', v.id, 'vehiculo_titulo', v.titulo, 'vehiculo_numero', v.numero,
           'vehiculo_oculto', u.vehiculo_id is not null and v.id is null) order by u.ordinality), '[]'::jsonb)
    into v_json
    from unnest(v_filas[1:v_tamano]) with ordinality as u
    left join public.vehiculos v on v.id = u.vehiculo_id;
  return jsonb_build_object(
    'recordatorios', v_json, 'hay_mas', coalesce(cardinality(v_filas), 0) > v_tamano,
    'hay_completados', v_hay_completados,
    'puedo_agendar', public.en_cartera(p_lead) and public.puede_lead(p_lead, 'leads.editar'));
end;
$$;
create or replace function public._recordatorio_json(r recordatorios)
 returns jsonb
 language sql
 stable security definer
 set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id, 'titulo', r.titulo, 'recordar_en', r.recordar_en,
    'notificado_en', r.notificado_en, 'completado_en', r.completado_en,
    'eliminado', r.eliminado_en is not null, 'actualizado_en', r.actualizado_en,
    'lead_id', case when v then r.lead_id end,
    'lead_nombre', case when v then (select l.nombre from public.leads l where l.id = r.lead_id) end,
    'lead_numero', case when v and (select public.tiene_permiso('leads.numero_global.ver')) then (select l.numero from public.leads l where l.id = r.lead_id) end,
    'lead_numero_propio', case when v then (select case when (select public.tiene_permiso('leads.numero_global.ver')) or l.creado_por = (select auth.uid()) then l.numero_propio end
                                              from public.leads l where l.id = r.lead_id) end)
    -- Un recordatorio es de su dueño: si ya no ve el vehículo, se le dice que había uno.
    || public._vehiculo_de_nota_json(r.vehiculo_id, true)
  from (select r.lead_id is not null and public.puede_lead(r.lead_id, 'leads.ver') as v) x;
$$;

-- ---------------------------------------------------------------------------------------------------
-- La papelera: cada lead lleva el número que se ve. El permiso se pregunta una vez, no por lead.
-- ---------------------------------------------------------------------------------------------------
create or replace function public._leads_papelera_lote_json(p_lote lotes_papelera, p_dias integer, p_yo uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_lote.id, 'actualizado_en', p_lote.actualizado_en, 'creado_en', p_lote.creado_en,
    'creado_por_nombre', (select nullif(btrim(p.nombre), '') from public.perfiles p where p.id = p_lote.creado_por),
    'es_mio', p_lote.creado_por is not distinct from p_yo,
    'purga_el', p_lote.creado_en + make_interval(days => p_dias),
    'enviados', coalesce((p_lote.resumen ->> 'cantidad')::int, 0),
    -- Un lote tiene a lo sumo 200 (índice `leads_lote_papelera_id_idx`).
    'leads', (
      select jsonb_agg(jsonb_build_object(
        'id', x.id, 'nombre', x.nombre,
        'motivo_de_bloqueo', public._lead_motivo_de_bloqueo(x, false),
        'motivo_de_restaurar', public._lead_motivo_de_restaurar(x))
               || public._lead_numeros(x, (select public.tiene_permiso('leads.numero_global.ver'))) order by x.numero)
      from public.leads x where x.lote_papelera_id = p_lote.id and x.eliminado_en is not null));
$$;
create or replace function public.leads_papelera_enviar(p_lote uuid, p_leads uuid[])
 returns jsonb
 language plpgsql
 security definer
 set search_path = ''
as $$
declare
  v_ids uuid[]; v_id uuid; v_n int; v_alcance public.alcance_permiso; v_lote public.lotes_papelera;
  v_yo uuid := (select auth.uid()); l public.leads; v_motivo text; v_portal int; v_version timestamptz;
begin
  perform public.assert_activo();
  if p_lote is null then
    raise exception 'Falta el identificador del envío.' using errcode = '22023';
  end if;
  if coalesce(array_length(p_leads, 1), 0) = 0 then
    raise exception 'Nada que enviar.' using errcode = '22023';
  end if;
  if array_length(p_leads, 1) > 200 then
    raise exception 'Máximo 200 por lote.' using errcode = '22023';
  end if;
  if array_position(p_leads, null) is not null then
    raise exception 'Uno de los leads llegó incompleto. Recarga e intenta de nuevo.' using errcode = '22023';
  end if;
  select array_agg(distinct x order by x) into v_ids from unnest(p_leads) x;

  -- Un reintento con el mismo lote no manda dos veces: devuelve lo que ya se mandó.
  select * into v_lote from public.lotes_papelera x where x.id = p_lote;
  if found then
    if v_lote.tipo <> 'leads' or v_lote.creado_por is distinct from v_yo then
      raise exception 'No pudimos enviar estos leads. Vuelve a intentarlo.' using errcode = '22023';
    end if;
    -- El mismo lote con otros leads no es un reintento: se rechaza en vez de decir «ya se envió».
    if exists (select 1 from unnest(v_ids) x where not exists (
         select 1 from public.leads l2 where l2.id = x and l2.lote_papelera_id = v_lote.id)) then
      raise exception 'Ese envío ya existe con otros leads. Vuelve a intentarlo.' using errcode = '22023';
    end if;
    return jsonb_build_object('lote', v_lote.id, 'actualizado_en', v_lote.actualizado_en, 'repetido', true,
      'portal_revocados', 0,
      'enviados', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'nombre', x.nombre) || public._lead_numeros(x, (select public.tiene_permiso('leads.numero_global.ver'))) order by x.numero)
                            from public.leads x where x.lote_papelera_id = v_lote.id and x.eliminado_en is not null), '[]'::jsonb));
  end if;

  v_alcance := public.alcance_de('leads.eliminar');
  if v_alcance is null then
    raise exception 'No tienes permiso para enviar leads a la papelera.' using errcode = '42501';
  end if;
  -- Primero se mira, sin bloquear: lo que no se ve da el mensaje de siempre y no dice cuál falló.
  foreach v_id in array v_ids loop
    if not public.puede_lead(v_id, 'leads.ver') then
      raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
    end if;
    if v_alcance <> 'todos' and public._lead_dueno(v_id) is distinct from v_yo then
      raise exception 'Sólo quien es dueño de un lead lo envía a la papelera.' using errcode = '42501';
    end if;
  end loop;
  -- Después se bloquea lo que se ve, en orden, y se vuelve a mirar: algo pudo irse mientras tanto.
  select count(*) into v_n from (
    select x.id from public.leads x where x.id = any (v_ids) and x.eliminado_en is null order by x.id for update) s;
  if v_n <> array_length(v_ids, 1) then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  for l in select * from public.leads x where x.id = any (v_ids) order by x.numero loop
    -- Con el lead bloqueado se vuelve a mirar quién es el dueño: pudo transferirse mientras esperaba.
    if v_alcance <> 'todos' and public._lead_dueno(l.id) is distinct from v_yo then
      raise exception 'Sólo quien es dueño de un lead lo envía a la papelera.' using errcode = '42501';
    end if;
    v_motivo := public._lead_motivo_de_bloqueo(l, true);
    if v_motivo is not null then
      raise exception 'No se envió nada. «%»: %', l.nombre, v_motivo using errcode = '23514';
    end if;
  end loop;

  begin
    insert into public.lotes_papelera (id, tipo, creado_por, resumen)
    values (p_lote, 'leads', v_yo, jsonb_build_object('cantidad', v_n, 'restaurados', 0, 'purgados', 0));
  exception when unique_violation then
    raise exception 'Ese envío ya se estaba procesando. Vuelve a intentarlo.' using errcode = 'PT409';
  end;
  update public.leads x set eliminado_en = now(), eliminado_por = v_yo, lote_papelera_id = p_lote
  where x.id = any (v_ids) and x.eliminado_en is null;
  update public.accesos_portal a set habilitado = false, revocado_por = v_yo, revocado_en = now()
  where a.lead_id = any (v_ids) and a.habilitado;
  get diagnostics v_portal = row_count;
  v_version := public._lote_papelera_tocar(p_lote);
  perform public.registrar_actividad('papelera.enviado', 'lotes_papelera', p_lote::text, null, null,
    jsonb_build_object('tipo', 'leads', 'cantidad', v_n, 'portal_revocados', v_portal));
  return jsonb_build_object('lote', p_lote, 'actualizado_en', v_version, 'repetido', false, 'portal_revocados', v_portal,
    'enviados', (select jsonb_agg(jsonb_build_object('id', x.id, 'nombre', x.nombre) || public._lead_numeros(x, (select public.tiene_permiso('leads.numero_global.ver'))) order by x.numero)
                 from public.leads x where x.lote_papelera_id = p_lote));
end;
$$;
create or replace function public.leads_papelera_restaurar(p_lote uuid, p_actualizado_en_esperado timestamp with time zone, p_leads uuid[] DEFAULT NULL::uuid[])
 returns jsonb
 language plpgsql
 security definer
 set search_path = ''
as $$
declare
  l public.lotes_papelera; x public.leads; v_motivo text; v_quedan int; v_version timestamptz;
  v_restaurados jsonb := '[]'::jsonb; v_pendientes jsonb := '[]'::jsonb;
  v_ve boolean := public.tiene_permiso('leads.numero_global.ver');
begin
  perform public.assert_activo();
  select * into l from public.lotes_papelera y where y.id = p_lote and y.tipo = 'leads' for update;
  if not found then
    raise exception 'Ese lote ya no está en la papelera.' using errcode = 'PT409';
  end if;
  if l.creado_por is distinct from (select auth.uid()) and not public.tiene_permiso('leads.papelera.purgar') then
    raise exception 'Sólo lo restaura quien lo envió o quien puede vaciar la papelera.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if l.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('lotes_papelera', l.id, l.actualizado_en, 'este lote de la papelera');
  end if;

  for x in
    select * from public.leads y
    where y.lote_papelera_id = l.id and y.eliminado_en is not null and (p_leads is null or y.id = any (p_leads))
    order by y.id for update
  loop
    v_motivo := public._lead_motivo_de_restaurar(x);
    if v_motivo is null then
      begin
        update public.leads y set eliminado_en = null, eliminado_por = null, lote_papelera_id = null where y.id = x.id;
        v_restaurados := v_restaurados || (jsonb_build_object('id', x.id, 'nombre', x.nombre) || public._lead_numeros(x, v_ve));
      exception when unique_violation then
        -- Otra persona tomó ese teléfono justo ahora.
        v_motivo := coalesce(public._lead_motivo_de_restaurar(x), 'Ese teléfono ya lo tiene otro lead.');
      end;
    end if;
    if v_motivo is not null then
      v_pendientes := v_pendientes || (jsonb_build_object('id', x.id, 'nombre', x.nombre, 'motivo', v_motivo) || public._lead_numeros(x, v_ve));
    end if;
  end loop;

  select count(*) into v_quedan from public.leads y where y.lote_papelera_id = l.id and y.eliminado_en is not null;
  if jsonb_array_length(v_restaurados) = 0 then
    return jsonb_build_object('actualizado_en', l.actualizado_en, 'restaurados', v_restaurados, 'pendientes', v_pendientes, 'quedan', v_quedan);
  end if;
  update public.lotes_papelera y
  set resumen = y.resumen || jsonb_build_object('restaurados', coalesce((y.resumen ->> 'restaurados')::int, 0) + jsonb_array_length(v_restaurados)),
      restaurado_en = case when v_quedan = 0 then now() else y.restaurado_en end,
      restaurado_por = case when v_quedan = 0 then (select auth.uid()) else y.restaurado_por end
  where y.id = l.id;
  v_version := public._lote_papelera_tocar(l.id);
  perform public.registrar_actividad('papelera.restaurado', 'lotes_papelera', l.id::text, null, null,
    jsonb_build_object('tipo', 'leads', 'cantidad', jsonb_array_length(v_restaurados)));
  return jsonb_build_object('actualizado_en', v_version, 'restaurados', v_restaurados, 'pendientes', v_pendientes, 'quedan', v_quedan);
end;
$$;
create or replace function public._papelera_purgar_leads(p_lote uuid, p_leads uuid[])
 returns jsonb
 language plpgsql
 security definer
 set search_path = ''
as $$
declare
  x public.leads; v_motivo text; v_quedan int; v_version timestamptz;
  v_purgados jsonb := '[]'::jsonb; v_bloqueados jsonb := '[]'::jsonb;
  v_ve boolean := public.tiene_permiso('leads.numero_global.ver');
begin
  for x in
    select * from public.leads y
    where y.lote_papelera_id = p_lote and y.eliminado_en is not null and (p_leads is null or y.id = any (p_leads))
    order by y.id for update
  loop
    v_motivo := public._lead_motivo_de_bloqueo(x, false);
    if v_motivo is null then
      begin
        delete from public.leads y where y.id = x.id;
        v_purgados := v_purgados || (jsonb_build_object('id', x.id, 'nombre', x.nombre) || public._lead_numeros(x, v_ve));
      exception when foreign_key_violation then
        v_motivo := 'Otros registros dependen de él.';
      end;
    end if;
    if v_motivo is not null then
      v_bloqueados := v_bloqueados || (jsonb_build_object('id', x.id, 'nombre', x.nombre, 'motivo', v_motivo) || public._lead_numeros(x, v_ve));
    end if;
  end loop;

  select count(*) into v_quedan from public.leads y where y.lote_papelera_id = p_lote and y.eliminado_en is not null;
  if jsonb_array_length(v_purgados) = 0 then
    return jsonb_build_object('actualizado_en', (select z.actualizado_en from public.lotes_papelera z where z.id = p_lote),
      'purgados', v_purgados, 'bloqueados', v_bloqueados, 'quedan', v_quedan);
  end if;
  update public.lotes_papelera z
  set resumen = z.resumen || jsonb_build_object('purgados', coalesce((z.resumen ->> 'purgados')::int, 0) + jsonb_array_length(v_purgados)),
      purgado_en = case when v_quedan = 0 then now() else z.purgado_en end
  where z.id = p_lote;
  v_version := public._lote_papelera_tocar(p_lote);
  perform public.registrar_actividad('papelera.purgado', 'lotes_papelera', p_lote::text, null, null,
    jsonb_build_object('tipo', 'leads', 'cantidad', jsonb_array_length(v_purgados), 'automatica', (select auth.uid()) is null));
  return jsonb_build_object('actualizado_en', v_version, 'purgados', v_purgados, 'bloqueados', v_bloqueados, 'quedan', v_quedan);
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Verificar un teléfono, el motivo de no restaurar y el alta: nombran al lead con el número que se ve.
-- ---------------------------------------------------------------------------------------------------
create or replace function public._lead_verificar(p_tel text, p_excluir uuid DEFAULT NULL::uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path = ''
as $$
declare l record; d record; a record;
  -- El permiso del número se pregunta sólo cuando hay un lead que nombrar («existe»): la papelera llama a esta función una vez
  -- por lead y casi nunca llega acá, y `tiene_permiso` cuesta ~0,25 ms.
  v_ve boolean;
  v_yo uuid := (select auth.uid());
begin
  select x.id, x.numero, x.numero_propio, x.creado_por, x.nombre, x.tipo into l
    from public.leads x
   where x.telefono_principal = p_tel and x.eliminado_en is null and x.id is distinct from p_excluir;
  if not found then
    select x.id, x.numero, x.numero_propio, x.creado_por, x.nombre into a
      from public.leads_telefonos t join public.leads x on x.id = t.lead_id
     where t.telefono = p_tel and x.eliminado_en is null and x.id is distinct from p_excluir
       and not public.lead_en_limbo(x.id)
     order by public.puede_lead(x.id, 'leads.ver') desc, public.en_cartera(x.id) desc, t.creado_en, t.id
     limit 1;
    if not found then
      return jsonb_build_object('estado', 'libre');
    end if;
    if public.puede_lead(a.id, 'leads.ver') then
      v_ve := public.tiene_permiso('leads.numero_global.ver');
      return jsonb_build_object('estado', 'libre', 'alterno', jsonb_build_object(
        'estado', 'existe', 'lead_id', a.id, 'numero', case when v_ve then a.numero end,
        'numero_propio', case when v_ve or a.creado_por = v_yo then a.numero_propio end, 'nombre', a.nombre,
        'es_mio', public.en_cartera(a.id)));
    end if;
    select p.nombre into d
      from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
     where la.lead_id = a.id and la.revocado_en is null
     order by (la.tipo_acceso = 'dueno') desc, la.desde
     limit 1;
    return jsonb_build_object('estado', 'libre', 'alterno', jsonb_build_object('estado', 'de_otro', 'dueno', d.nombre));
  end if;
  if public.lead_en_limbo(l.id) then
    return jsonb_build_object('estado', 'limbo');
  end if;
  if public.puede_lead(l.id, 'leads.ver') then
    v_ve := public.tiene_permiso('leads.numero_global.ver');
    return jsonb_build_object('estado', 'existe', 'lead_id', l.id, 'numero', case when v_ve then l.numero end,
                              'numero_propio', case when v_ve or l.creado_por = v_yo then l.numero_propio end, 'nombre', l.nombre,
                              'tipo', l.tipo, 'es_mio', public.en_cartera(l.id));
  end if;
  select p.id, p.nombre into d
    from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
   where la.lead_id = l.id and la.revocado_en is null
   order by (la.tipo_acceso = 'dueno') desc, la.desde
   limit 1;
  return jsonb_build_object('estado', 'de_otro', 'dueno', d.nombre, 'dueno_id', d.id);
end;
$$;
create or replace function public._lead_motivo_de_restaurar(l leads)
 returns text
 language plpgsql
 stable security definer
 set search_path = ''
as $$
declare v jsonb;
begin
  v := public._lead_verificar(l.telefono_principal, l.id);
  return case v ->> 'estado'
    when 'existe' then format('«%s»%s ya tiene este teléfono.', v ->> 'nombre',
      case when v ->> 'numero' is not null then ' (#' || (v ->> 'numero') || ')'
           when v ->> 'numero_propio' is not null then ' (tu n.º ' || (v ->> 'numero_propio') || ')'
           else '' end)
    when 'de_otro' then format('Ese teléfono ya lo tiene un lead de %s.', coalesce(v ->> 'dueno', 'otra persona'))
    when 'limbo' then 'Ese teléfono ya lo tiene un lead sin dueño.'
    else null end;
end;
$$;
create or replace function public._lead_crear(p_id uuid, p_lead jsonb, p_seguimiento jsonb, p_recordatorio jsonb, p_recordar_origen boolean)
 returns jsonb
 language plpgsql
 security definer
 set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_permitidas constant text[] := array['nombre', 'telefono_cc', 'telefono_principal', 'tipo', 'origen_lead_id', 'atributos', 'adoptar'];
  v_k text;
  v_cc text;
  v_cc_digitos text;
  v_tel text;
  v_nombre text;
  v_tipo public.tipo_lead;
  v_origen uuid;
  v_activos text[];
  v_atributos jsonb := '{}'::jsonb;
  v_verif jsonb;
  v_estado text;
  v_id uuid;
  v_adoptado boolean := false;
  v_tipo_seg uuid;
  v_titulo text;
  v_detalle text;
  v_doc jsonb;
  v_id_previo uuid;
  v_ocurrido timestamptz := now();
  v_k2 text;
  v_msg text;
  v_recordar timestamptz;
  v_titulo_rec text;
begin
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  if p_lead is null or jsonb_typeof(p_lead) <> 'object' then
    raise exception 'Los datos del lead tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_lead) loop
    if not (v_k = any (v_permitidas)) then
      raise exception 'El dato «%» no va suelto: los campos del lead se mandan dentro de «atributos».', v_k
        using errcode = '22023', hint = v_k;
    end if;
  end loop;

  -- ¿Ya entró este intento? Una respuesta perdida y un reintento: devuelve lo mismo, no duplica.
  select l.id into v_id from public.leads l where l.id = p_id and l.creado_por = v_yo;
  if found then
    return jsonb_build_object('resultado', 'creado', 'id', v_id, 'repetido', true) || public._lead_numeros_de(v_id);
  end if;
  select l.id into v_id
    from public.actividad a join public.leads l on l.id::text = a.registro_id
   where a.accion = 'lead.adoptado_del_limbo' and a.actor_id = v_yo and a.detalle ->> 'intento' = p_id::text
   order by a.id desc limit 1;
  if found then
    return jsonb_build_object('resultado', 'adoptado', 'id', v_id, 'repetido', true) || public._lead_numeros_de(v_id);
  end if;

  -- El teléfono, y lo que ya se sabe de él.
  v_cc := coalesce(nullif(btrim(p_lead ->> 'telefono_cc'), ''), (select e.telefono_cc from public.ajustes_empresa e where e.id = 1));
  v_tel := public.normalizar_telefono(v_cc, p_lead ->> 'telefono_principal');
  v_verif := public._lead_verificar(v_tel);
  v_estado := v_verif ->> 'estado';
  if v_estado in ('existe', 'de_otro') or (v_estado = 'limbo' and (p_lead ->> 'adoptar') is distinct from 'true') then
    return jsonb_build_object('resultado', v_estado, 'verificacion', v_verif);
  end if;

  -- Lo demás que tiene que pasar, antes de escribir nada.
  v_nombre := btrim(coalesce(p_lead ->> 'nombre', ''));
  if v_nombre = '' then
    raise exception 'Escribe el nombre.' using errcode = '22023', hint = 'nombre';
  end if;
  if char_length(v_nombre) > 120 then
    raise exception 'El nombre admite hasta 120 caracteres.' using errcode = '22023', hint = 'nombre';
  end if;
  begin
    v_tipo := coalesce(nullif(p_lead ->> 'tipo', ''), 'prospecto')::public.tipo_lead;
  exception when invalid_text_representation then
    raise exception 'El tipo de lead no es uno de los que hay.' using errcode = '22023', hint = 'tipo';
  end;
  begin
    v_origen := nullif(p_lead ->> 'origen_lead_id', '')::uuid;
  exception when invalid_text_representation then
    raise exception 'Ese origen del lead no existe.' using errcode = '22023', hint = 'origen_lead_id';
  end;
  if v_origen is not null then
    if not exists (select 1 from public.origenes_lead o where o.id = v_origen and o.activo) then
      raise exception 'Ese origen del lead está desactivado o ya no existe.' using errcode = '22023', hint = 'origen_lead_id';
    end if;
  elsif exists (select 1 from public.origenes_lead o where o.activo) then
    raise exception 'Elige de dónde viene el lead.' using errcode = '22023', hint = 'origen_lead_id';
  end if;

  select coalesce(array_agg(c.clave), '{}') into v_activos from public.leads_campos c where c.activo;
  if p_lead ? 'atributos' then
    v_atributos := public._atributos_fusionar('{}'::jsonb, p_lead -> 'atributos', v_activos,
      'Los atributos de un lead tienen que ser un objeto.',
      'El campo «%s» no es un campo de los leads o está desactivado.');
  end if;

  if p_seguimiento is not null then
    if jsonb_typeof(p_seguimiento) <> 'object' then
      raise exception 'El seguimiento tiene que ser un objeto.' using errcode = '22023', hint = 'seguimiento.titulo';
    end if;
    -- Las mismas claves que `seguimiento_crear`, menos las que el alta no ofrece (la visibilidad y el
    -- vehículo): una de más se rechaza con su nombre, no pasa callada.
    for v_k2 in select jsonb_object_keys(p_seguimiento) loop
      if v_k2 not in ('tipo_id', 'titulo', 'detalle', 'ocurrido_en') then
        raise exception 'El dato «%» no es del primer seguimiento.', v_k2
          using errcode = '22023', hint = 'seguimiento.' || v_k2;
      end if;
    end loop;
    begin
      v_tipo_seg := nullif(p_seguimiento ->> 'tipo_id', '')::uuid;
    exception when invalid_text_representation then
      v_tipo_seg := null;
    end;
    if v_tipo_seg is null or not exists (select 1 from public.tipos_seguimiento t where t.id = v_tipo_seg and t.activo) then
      raise exception 'Elige un tipo de seguimiento que esté activo.' using errcode = '22023', hint = 'seguimiento.tipo_id';
    end if;
    -- El resumen, el detalle y la fecha se validan con las funciones de `seguimiento_crear`: una sola
    -- regla. El resumen recibe su hint; el detalle y la fecha levantan el de la ficha («detalle»,
    -- «ocurrido_en») y acá se les pone el campo del alta.
    v_titulo := public._seguimiento_titulo(p_seguimiento -> 'titulo', 'seguimiento.titulo');
    begin
      v_doc := p_seguimiento -> 'detalle';
      v_detalle := public._seguimiento_detalle(v_doc);
      if v_detalle is null then
        v_doc := null;
      end if;
    exception when sqlstate '22023' then
      get stacked diagnostics v_msg = message_text;
      raise exception '%', v_msg using errcode = '22023', hint = 'seguimiento.detalle';
    end;
    if p_seguimiento ? 'ocurrido_en' and p_seguimiento -> 'ocurrido_en' <> 'null'::jsonb then
      begin
        v_ocurrido := public._seguimiento_fecha(p_seguimiento -> 'ocurrido_en');
      exception when sqlstate '22023' then
        get stacked diagnostics v_msg = message_text;
        raise exception '%', v_msg using errcode = '22023', hint = 'seguimiento.ocurrido_en';
      end;
    end if;
  end if;
  if p_recordatorio is not null then
    if jsonb_typeof(p_recordatorio) <> 'object' then
      raise exception 'El recordatorio tiene que ser un objeto.' using errcode = '22023', hint = 'recordatorio.recordar_en';
    end if;
    begin
      v_recordar := nullif(p_recordatorio ->> 'recordar_en', '')::timestamptz;
    exception when others then
      v_recordar := null;
    end;
    if v_recordar is null then
      raise exception 'Elige cuándo recordarlo.' using errcode = '22023', hint = 'recordatorio.recordar_en';
    end if;
    if v_recordar <= now() then
      raise exception 'El recordatorio tiene que ser en el futuro.' using errcode = '22023', hint = 'recordatorio.recordar_en';
    end if;
    v_titulo_rec := coalesce(nullif(btrim(p_recordatorio ->> 'titulo'), ''), v_titulo);
    if v_titulo_rec is null then
      raise exception 'Escribe de qué es el recordatorio.' using errcode = '22023', hint = 'recordatorio.titulo';
    end if;
  end if;

  if v_estado = 'limbo' then
    -- «Tomar lead»: queda de dueño y lo que el lead ya tiene no se pisa; lo vacío se completa.
    select l.id into v_id from public.leads l
     where l.telefono_principal = v_tel and l.eliminado_en is null for update;
    -- Otra llamada del MISMO intento pudo adoptarlo mientras esta esperaba el candado (un doble envío):
    -- ya se ve confirmado, y adoptar de nuevo duplicaría el seguimiento y el recordatorio. (Otro intento
    -- de otra persona sobre el mismo lead sigue siendo la carrera de siempre, fuera de esta parte.)
    select l.id into v_id_previo
      from public.actividad a join public.leads l on l.id::text = a.registro_id
     where a.accion = 'lead.adoptado_del_limbo' and a.actor_id = v_yo and a.detalle ->> 'intento' = p_id::text
     order by a.id desc limit 1;
    if found then
      return jsonb_build_object('resultado', 'adoptado', 'id', v_id_previo, 'repetido', true) || public._lead_numeros_de(v_id_previo);
    end if;
    insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso)
    values (v_id, v_yo, 'dueno')
    on conflict (lead_id, usuario_id) do update
      set tipo_acceso = 'dueno', desde = now(), revocado_en = null, revocado_por = null, compartido_por = null;
    update public.leads l set
      origen_lead_id = coalesce(l.origen_lead_id, v_origen),
      atributos = public._atributos_completar(l.atributos, v_atributos, v_activos,
        'Los atributos de un lead tienen que ser un objeto.',
        'El campo «%s» no es un campo de los leads o está desactivado.')
     where l.id = v_id;
    v_adoptado := true;
    perform public.registrar_actividad('lead.adoptado_del_limbo', 'leads', v_id::text, null,
      jsonb_build_object('telefono', public.enmascarar_telefono(v_tel)), jsonb_build_object('intento', p_id));
  else
    v_cc_digitos := regexp_replace(coalesce(v_cc, ''), '\D', '', 'g');
    begin
      insert into public.leads (id, nombre, telefono_cc, telefono_principal, tipo, origen_lead_id, atributos, creado_por)
      values (p_id, v_nombre,
              case when v_cc_digitos <> '' and v_tel like v_cc_digitos || '%' then '+' || v_cc_digitos end,
              v_tel, v_tipo, v_origen, v_atributos, v_yo)
      returning id into v_id;
    exception when unique_violation then
      -- Dos personas guardaron el mismo teléfono a la vez (o este mismo intento, dos veces): el que
      -- llegó segundo ve su estado «existe», no un error.
      select l.id into v_id from public.leads l where l.id = p_id and l.creado_por = v_yo;
      if found then
        return jsonb_build_object('resultado', 'creado', 'id', v_id, 'repetido', true) || public._lead_numeros_de(v_id);
      end if;
      v_verif := public._lead_verificar(v_tel);
      if (v_verif ->> 'estado') in ('existe', 'de_otro', 'limbo') then
        return jsonb_build_object('resultado', v_verif ->> 'estado', 'verificacion', v_verif);
      end if;
      raise exception 'Ese teléfono cambió mientras guardabas. Vuelve a intentarlo.' using errcode = 'PT409';
    end;
    perform public.registrar_actividad('lead.creado', 'leads', v_id::text, null,
      jsonb_build_object('nombre', v_nombre), jsonb_build_object('intento', p_id));
  end if;

  if p_seguimiento is not null then
    insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo, detalle_doc, detalle_texto, ocurrido_en, actualizado_en)
    values (v_id, v_yo, v_tipo_seg, v_titulo, v_doc, v_detalle, v_ocurrido, clock_timestamp());
  end if;
  if p_recordatorio is not null then
    insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en)
    values (v_yo, v_id, v_titulo_rec, v_recordar);
  end if;
  if p_recordar_origen and v_origen is not null then
    insert into public.preferencias_usuario (usuario_id, clave, valor)
    values (v_yo, 'leads.ultimo_origen_lead', to_jsonb(v_origen::text))
    on conflict (usuario_id, clave) do update set valor = excluded.valor, actualizado_en = now();
  end if;

  return jsonb_build_object('resultado', case when v_adoptado then 'adoptado' else 'creado' end,
                            'id', v_id, 'repetido', false) || public._lead_numeros_de(v_id);
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Importar: lo que vuelve por fila lleva el número que se ve, después de repartirlos por orden de fila.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.leads_importar_lote(p_importacion uuid, p_total integer, p_filas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_cc text := (select e.telefono_cc from public.ajustes_empresa e where e.id = 1);
  v_dueno uuid;
  v_estado public.estado_importacion;
  v_fila record;
  v_lead jsonb;
  v_res jsonb;
  v_salida jsonb := '[]'::jsonb;
  v_numero_de_fila integer;
  v_sqlstate text;
  v_mensaje text;
  v_hint text;
  v_permitidas constant text[] := array['nombre', 'telefono_principal', 'tipo', 'origen_lead_id', 'atributos'];
  v_k text;
  v_ids uuid[] := '{}';
  v_filas integer[] := '{}';
  v_ve boolean := public.tiene_permiso('leads.numero_global.ver');
begin
  perform public.assert_permiso('leads.crear');
  perform public.assert_activo();
  if p_importacion is null then
    raise exception 'Falta el identificador de la importación.' using errcode = '22023';
  end if;
  if p_total is null or p_total < 1 or p_total > 500 then
    raise exception 'Una importación lleva de 1 a 500 filas.' using errcode = '22023';
  end if;
  if p_filas is null or jsonb_typeof(p_filas) <> 'array' or jsonb_array_length(p_filas) < 1 or jsonb_array_length(p_filas) > 50 then
    raise exception 'Un lote lleva de 1 a 50 filas.' using errcode = '22023';
  end if;

  -- La importación es de quien la empieza: retomarla con el mismo id es lo que hace un reintento.
  insert into public.importaciones (id, usuario_id, entidad, archivo_ruta, estado, filas_total, iniciada_en)
  values (p_importacion, v_yo, 'leads', null, 'procesando', p_total, now())
  on conflict (id) do nothing;
  select i.usuario_id, i.estado into v_dueno, v_estado from public.importaciones i where i.id = p_importacion for update;
  if v_dueno is distinct from v_yo or not exists (select 1 from public.importaciones i where i.id = p_importacion and i.entidad = 'leads') then
    raise exception 'No encontramos esta importación.' using errcode = '42501';
  end if;
  if v_estado <> 'procesando' then
    raise exception 'Esta importación ya terminó.' using errcode = '22023';
  end if;

  -- Cada elemento, validado antes de tocar nada: una forma rota es un error del cliente, no de una fila.
  for v_fila in select e.value as v from jsonb_array_elements(p_filas) e loop
    if jsonb_typeof(v_fila.v) <> 'object' or jsonb_typeof(v_fila.v -> 'lead') is distinct from 'object'
       or jsonb_typeof(v_fila.v -> 'id') is distinct from 'string'
       or jsonb_typeof(v_fila.v -> 'fila') is distinct from 'number' then
      raise exception 'Una fila del lote no tiene la forma esperada.' using errcode = '22023';
    end if;
  end loop;

  -- En el orden del teléfono: dos lotes de dos personas que se cruzan toman los candados en el mismo
  -- orden y no se bloquean entre sí.
  for v_fila in
    select e.value as v, e.ordinality as ord
    from jsonb_array_elements(p_filas) with ordinality e
    order by public._telefono_o_nulo(v_cc, e.value -> 'lead' ->> 'telefono_principal') nulls first, e.ordinality
  loop
    v_numero_de_fila := (v_fila.v ->> 'fila')::integer;
    begin
      v_lead := v_fila.v -> 'lead';
      -- Sólo viajan las claves conocidas: `adoptar` y cualquier otra se rechazan, no se ignoran.
      for v_k in select jsonb_object_keys(v_lead) loop
        if not (v_k = any (v_permitidas)) then
          raise exception 'El dato «%» no se puede importar.', v_k using errcode = '22023', hint = v_k;
        end if;
      end loop;
      v_res := public._lead_crear((v_fila.v ->> 'id')::uuid, v_lead, null, null, false);
      if (v_res ->> 'resultado') = 'creado' then
        insert into public.importaciones_leads (importacion_id, lead_id, fila)
        values (p_importacion, (v_res ->> 'id')::uuid, v_numero_de_fila)
        on conflict do nothing;
        -- Los que ya existían (un reintento) conservan el número que tienen: sólo se reparten los de ahora.
        if not coalesce((v_res ->> 'repetido')::boolean, false) then
          v_ids := v_ids || (v_res ->> 'id')::uuid;
          v_filas := v_filas || v_numero_de_fila;
        end if;
        v_salida := v_salida || jsonb_build_array(jsonb_build_object(
          'id', v_fila.v ->> 'id', 'fila', v_numero_de_fila, 'resultado', 'creado',
          'repetido', coalesce((v_res ->> 'repetido')::boolean, false)));
      else
        -- existe, de_otro y limbo se dicen igual: en masa sólo se sabe que el número ya está.
        v_salida := v_salida || jsonb_build_array(jsonb_build_object(
          'id', v_fila.v ->> 'id', 'fila', v_numero_de_fila, 'resultado', 'ya_existe'));
      end if;
    exception when others then
      get stacked diagnostics v_sqlstate = returned_sqlstate, v_mensaje = message_text, v_hint = pg_exception_hint;
      -- Lo que levantan nuestras reglas es humano; lo inesperado no se cuenta.
      if v_sqlstate not in ('22023', '23502', '23514', 'PT409') then
        v_mensaje := 'No pudimos importar esta fila. Inténtalo de nuevo.';
        v_hint := null;
      end if;
      v_salida := v_salida || jsonb_build_array(jsonb_build_object(
        'id', v_fila.v ->> 'id', 'fila', v_numero_de_fila, 'resultado', 'error',
        'campo', nullif(v_hint, ''), 'motivo', v_mensaje));
    end;
  end loop;

  -- Los números propios de lo que entró ahora, repartidos por orden de fila (el menor, a la primera del archivo).
  if cardinality(v_ids) > 1 then
    perform set_config('importadora.numerar_lote', 'si', true);
    with a as (select t.id, row_number() over (order by t.fila) as rn from unnest(v_ids, v_filas) as t(id, fila)),
         n as (select l.numero_propio, row_number() over (order by l.numero_propio) as rn
                 from public.leads l where l.id = any (v_ids)),
         m as (select a.id, n.numero_propio from a join n using (rn))
    update public.leads l set numero_propio = m.numero_propio
      from m where l.id = m.id and l.numero_propio is distinct from m.numero_propio;
    perform set_config('importadora.numerar_lote', 'no', true);
  end if;

  -- Lo que vuelve por fila lleva los números que se ven, con el reparto por fila ya hecho.
  v_salida := coalesce((
    select jsonb_agg(case when t.e ->> 'resultado' = 'creado' then t.e || public._lead_numeros(l, v_ve) else t.e end order by t.ord)
      from jsonb_array_elements(v_salida) with ordinality as t (e, ord)
      left join public.leads l on l.id = case when t.e ->> 'resultado' = 'creado' then (t.e ->> 'id')::uuid end), '[]'::jsonb);

  update public.importaciones i set filas_ok = (select count(*) from public.importaciones_leads x where x.importacion_id = i.id)
   where i.id = p_importacion;
  return jsonb_build_object('importacion', p_importacion, 'filas', v_salida);
end;
$$;
revoke all on function public.leads_importar_lote(uuid, integer, jsonb) from public, anon;
grant execute on function public.leads_importar_lote(uuid, integer, jsonb) to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- La auditoría no guarda ninguno de los dos números: son inmutables, nunca son un cambio, y el global no debe
-- quedar en una fila que mañana lea otra pantalla. Lo ya guardado se limpia.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.lead_auditar()
 returns trigger
 language plpgsql
 security definer
 set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.actualizado_en is not distinct from old.actualizado_en then
    return null;
  end if;
  insert into public.actividad (accion, actor_id, tabla, registro_id, antes, despues)
  values ('leads.' || lower(tg_op), (select auth.uid()), 'leads', coalesce(new.id, old.id)::text,
          case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'telefono_principal' - 'numero' - 'numero_propio' end,
          case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'telefono_principal' - 'numero' - 'numero_propio' end);
  return null;
end;
$$;
update public.actividad
   set antes = antes - 'numero' - 'numero_propio', despues = despues - 'numero' - 'numero_propio'
 where tabla = 'leads' and (antes ? 'numero' or despues ? 'numero');
