-- Cada página se acota en la base, con un máximo declarado, nunca con lo que pida el cliente (9g).
--
-- `_acotar_pagina(pedido, por_defecto, maximo)` es la única forma de decir «de a cuántos»: lo que pide el cliente
-- (nulo, cero, negativo, 100000) vuelve a algo que vale: nulo da el valor por defecto, y el resultado queda entre 1 y
-- el máximo. Cada RPC con tamaño la llama con su máximo escrito a la vista:
--
--   lead_seguimientos, lead_recordatorios        de a 20 por «Ver más», hasta 50
--   leads_papelera_listar, vehiculos_papelera_listar   6 lotes (5 y uno más para saber si hay otra página), hasta 51
--   embudo_tablero                               50 por columna (hasta 100) y 500 en total por columna (hasta 1.000)
--   embudo_etapa_pagina                          50 por «Ver más», hasta 100
--
-- Antes cada una repetía su `least(greatest(coalesce(…)))` con su literal. El listado de leads y el inventario de
-- vehículos no son RPC: los lee PostgREST con `limit`, y su tope en la base es `max_rows` de `config.toml` (1.000).
-- `scripts/guardas/paginas.test.ts` exige que el máximo de cada RPC sea al menos el tamaño que pide el código, y
-- `supabase/tests/escala.sql` que ninguna función con un parámetro de tamaño deje de pasar por acá.
-- Los cuerpos de las seis funciones son los vigentes; sólo cambia la línea de la cota (misma firma, mismos errores).
create or replace function public._acotar_pagina(p_pedido int, p_defecto int, p_maximo int)
 returns int
 language sql
 immutable
 parallel safe
 set search_path = ''
as $$
  select least(greatest(coalesce(p_pedido, p_defecto), 1), p_maximo);
$$;
revoke all on function public._acotar_pagina(int, int, int) from public, anon;
grant execute on function public._acotar_pagina(int, int, int) to authenticated;

create or replace function public.lead_seguimientos(p_lead uuid, p_antes_en timestamptz default null,
                                                    p_antes_id uuid default null, p_tamano int default 20)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_tamano int := public._acotar_pagina(p_tamano, 20, 50);
  v_yo uuid := (select auth.uid());
  v_filas public.seguimientos[];
  v_json jsonb;
begin
  -- `union` (no `all`): uno mío y público llega por las dos ramas.
  if p_antes_en is null then
    select array_agg(x.s order by (x.s).ocurrido_en desc, (x.s).id desc) into v_filas from (
      select u.s from (
        (select s from public.seguimientos s
          where s.lead_id = p_lead and s.usuario_id = v_yo and s.eliminado_en is null
          order by s.ocurrido_en desc, s.id desc limit v_tamano + 1)
        union
        (select s from public.seguimientos s
          where s.lead_id = p_lead and s.visibilidad = 'publico' and s.eliminado_en is null
          order by s.ocurrido_en desc, s.id desc limit v_tamano + 1)) u
      order by (u.s).ocurrido_en desc, (u.s).id desc limit v_tamano + 1) x;
  else
    select array_agg(x.s order by (x.s).ocurrido_en desc, (x.s).id desc) into v_filas from (
      select u.s from (
        (select s from public.seguimientos s
          where s.lead_id = p_lead and s.usuario_id = v_yo and s.eliminado_en is null
            and (s.ocurrido_en, s.id) < (p_antes_en, p_antes_id)
          order by s.ocurrido_en desc, s.id desc limit v_tamano + 1)
        union
        (select s from public.seguimientos s
          where s.lead_id = p_lead and s.visibilidad = 'publico' and s.eliminado_en is null
            and (s.ocurrido_en, s.id) < (p_antes_en, p_antes_id)
          order by s.ocurrido_en desc, s.id desc limit v_tamano + 1)) u
      order by (u.s).ocurrido_en desc, (u.s).id desc limit v_tamano + 1) x;
  end if;
  -- La forma de siempre (la misma que `lead_seguimiento()`). La RLS de `vehiculos` vacía el join si
  -- quien mira no ve ese vehículo.
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', u.id, 'lead_id', u.lead_id,
           'tipo_id', u.tipo_id, 'tipo_nombre', t.nombre, 'tipo_icono', t.icono,
           'titulo', u.titulo, 'detalle_doc', u.detalle_doc, 'detalle_texto', u.detalle_texto,
           'visibilidad', u.visibilidad, 'ocurrido_en', u.ocurrido_en, 'actualizado_en', u.actualizado_en,
           'eliminado', false,
           'autor_id', u.usuario_id, 'autor_nombre', nullif(btrim(p.nombre), ''),
           'es_mio', u.usuario_id = v_yo,
           'vehiculo', case when v.id is not null then
                         jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero) end,
           'vehiculo_oculto', u.vehiculo_id is not null and v.id is null and u.usuario_id = v_yo)
           order by u.ordinality), '[]'::jsonb)
    into v_json
    from unnest(v_filas[1:v_tamano]) with ordinality as u
    join public.tipos_seguimiento t on t.id = u.tipo_id
    left join public.perfiles p on p.id = u.usuario_id
    left join public.vehiculos v on v.id = u.vehiculo_id;
  return jsonb_build_object(
    'seguimientos', v_json, 'hay_mas', coalesce(cardinality(v_filas), 0) > v_tamano,
    'puedo_anotar', public.en_cartera(p_lead) and public.puede_lead(p_lead, 'leads.editar'));
end;
$$;

create or replace function public.lead_recordatorios(p_lead uuid, p_completados boolean DEFAULT false, p_desde_en timestamp with time zone DEFAULT NULL::timestamp with time zone, p_desde_id uuid DEFAULT NULL::uuid, p_tamano integer DEFAULT 20)
 returns jsonb
 language plpgsql
 stable
 set search_path = ''
as $$
declare
  v_tamano int := public._acotar_pagina(p_tamano, 20, 50);
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

create or replace function public.leads_papelera_listar(
  p_antes_en timestamptz default null, p_antes_id uuid default null,
  p_hacia_atras boolean default false, p_tope int default 6)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_dias int; v_todo boolean; v_yo uuid := (select auth.uid()); v_n int := public._acotar_pagina(p_tope, 6, 51); v_ids uuid[];
begin
  perform public.assert_activo();
  select e.papelera_dias into v_dias from public.ajustes_empresa e where e.id = 1;
  v_todo := public.tiene_permiso('leads.papelera.purgar');
  if p_antes_en is null then
    v_ids := array(select l.id from public.lotes_papelera l
      where l.tipo = 'leads' and l.purgado_en is null and l.restaurado_en is null
        and (v_todo or l.creado_por = v_yo)
        and exists (select 1 from public.leads x where x.lote_papelera_id = l.id and x.eliminado_en is not null)
      order by l.creado_en desc, l.id desc limit v_n);
  elsif not coalesce(p_hacia_atras, false) then
    v_ids := array(select l.id from public.lotes_papelera l
      where l.tipo = 'leads' and l.purgado_en is null and l.restaurado_en is null
        and (v_todo or l.creado_por = v_yo)
        and (l.creado_en, l.id) < (p_antes_en, p_antes_id)
        and exists (select 1 from public.leads x where x.lote_papelera_id = l.id and x.eliminado_en is not null)
      order by l.creado_en desc, l.id desc limit v_n);
  else
    v_ids := array(select l.id from public.lotes_papelera l
      where l.tipo = 'leads' and l.purgado_en is null and l.restaurado_en is null
        and (v_todo or l.creado_por = v_yo)
        and (l.creado_en, l.id) > (p_antes_en, p_antes_id)
        and exists (select 1 from public.leads x where x.lote_papelera_id = l.id and x.eliminado_en is not null)
      order by l.creado_en, l.id limit v_n);
  end if;
  return coalesce((
    select jsonb_agg(public._leads_papelera_lote_json(l, v_dias, v_yo) order by o.ord)
    from unnest(v_ids) with ordinality o (id, ord) join public.lotes_papelera l on l.id = o.id), '[]'::jsonb);
end;
$$;

create or replace function public.vehiculos_papelera_listar(
  p_antes_en timestamptz default null, p_antes_id uuid default null,
  p_hacia_atras boolean default false, p_tope int default 6)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_dias int; v_todo boolean; v_yo uuid := (select auth.uid()); v_n int := public._acotar_pagina(p_tope, 6, 51); v_ids uuid[];
begin
  perform public.assert_activo();
  select e.papelera_dias into v_dias from public.ajustes_empresa e where e.id = 1;
  v_todo := public.tiene_permiso('vehiculos.papelera.purgar');
  if p_antes_en is null then
    v_ids := array(select l.id from public.lotes_papelera l
      where l.tipo = 'vehiculos' and l.purgado_en is null and l.restaurado_en is null
        and (v_todo or l.creado_por = v_yo)
        and exists (select 1 from public.vehiculos v where v.lote_papelera_id = l.id and v.eliminado_en is not null)
      order by l.creado_en desc, l.id desc limit v_n);
  elsif not coalesce(p_hacia_atras, false) then
    v_ids := array(select l.id from public.lotes_papelera l
      where l.tipo = 'vehiculos' and l.purgado_en is null and l.restaurado_en is null
        and (v_todo or l.creado_por = v_yo)
        and (l.creado_en, l.id) < (p_antes_en, p_antes_id)
        and exists (select 1 from public.vehiculos v where v.lote_papelera_id = l.id and v.eliminado_en is not null)
      order by l.creado_en desc, l.id desc limit v_n);
  else
    v_ids := array(select l.id from public.lotes_papelera l
      where l.tipo = 'vehiculos' and l.purgado_en is null and l.restaurado_en is null
        and (v_todo or l.creado_por = v_yo)
        and (l.creado_en, l.id) > (p_antes_en, p_antes_id)
        and exists (select 1 from public.vehiculos v where v.lote_papelera_id = l.id and v.eliminado_en is not null)
      order by l.creado_en, l.id limit v_n);
  end if;
  return coalesce((
    select jsonb_agg(public._vehiculos_papelera_lote_json(l, v_dias, v_yo) order by o.ord)
    from unnest(v_ids) with ordinality o (id, ord) join public.lotes_papelera l on l.id = o.id), '[]'::jsonb);
end;
$$;

create or replace function public.embudo_tablero(p_embudo uuid, p_tope integer DEFAULT 50, p_tope_total integer DEFAULT 500)
 returns jsonb
 language sql
 stable
 set search_path = ''
as $$
  with tope as (select public._acotar_pagina(p_tope, 50, 100) as n,
                       public._acotar_pagina(p_tope_total, 500, 1000) as total)
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
  v_n int := public._acotar_pagina(p_tope, 50, 100);
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
