-- El listado de cotizaciones por lead (paso 4.17-4a): `cotizaciones_listado()` suma `p_lead` al final de su firma (las llamadas posicionales de 8 siguen valiendo) para el
-- camino a lo antiguo de la sección «Cotizaciones» de la ficha del lead tras sus 500 (`/cotizaciones?lead=`, el 4.17-4b; como `?vehiculo=` desde el historial del vehículo).
-- Parte de la definición vigente (`20261105011347_cotizaciones_listado.sql`); cambiar la firma es `drop` de la de 8 y `create` de la de 9, como el 4.17-1 con
-- `lead_oportunidades()`: un `create or replace` con otro argumento dejaría dos sobrecargas.
--
-- Con el lead, una sola ruta: `cotizaciones_lead_creado_idx` (`lead_id, creado_en desc, id desc`, entero) con la RLS, en los tres bloques (sin cursor, adelante, atrás); todas
-- las demás banderas se apagan (`not v_por_lead`), también la de la cartera (`mis_leads()` no se llama) y la del vehículo. El vehículo, si llega con el lead, es un filtro sobre
-- las filas del lead y nunca una condición de índice: el costo queda acotado por las cotizaciones del lead, no por N. Lo que devuelve es lo de sin el lead filtrado a
-- `lead_id = p_lead`, con los mismos origen, clase, «mías» y vehículo: la RLS sigue decidiendo (un lead que no existe o del que no se ve nada da una página vacía, sin error).
-- Sigue invocadora, estable, con `search_path` vacío y los mismos privilegios. Lo prueban `cotizaciones-listado.sql` (L1 y L9) y `cotizaciones-visibilidad.sql`; el costo,
-- `medir-cotizaciones-listado.sql` (un lead de la cartera de Ana y uno ajeno con 5.005, con 50.000 y 250.000).

drop function public.cotizaciones_listado(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean);

create function public.cotizaciones_listado(
  p_tamano integer, p_origen uuid default null, p_clase public.clase_cotizacion default null, p_mias boolean default false, p_vehiculo uuid default null,
  p_cursor_en timestamptz default null, p_cursor_id uuid default null, p_hacia_atras boolean default false, p_lead uuid default null)
returns table (id uuid, numero bigint, origen_id uuid, lead_id uuid, vehiculo_id uuid, creado_por uuid, clase public.clase_cotizacion, estado public.estado_cotizacion,
               titulo text, total_base numeric, moneda_mostrar character(3), creado_en timestamptz, vence_el date, vencida boolean)
language plpgsql stable security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  -- MAXIMO_DE_PAGINA_DE_COTIZACIONES (src/modules/cotizaciones/entities/listado.ts), más una para saber si hay otra.
  v_n integer := public._acotar_pagina(p_tamano, 100, 100) + 1;
  v_uid uuid := (select auth.uid());
  v_t uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'todos');
  v_p uuid[] := public.origenes_con_alcance('cotizaciones.ver', 'propios');
  v_clases public.clase_cotizacion[] := case when p_clase is null then enum_range(null::public.clase_cotizacion) else array[p_clase] end;
  v_mias_en uuid[]; v_ver uuid[]; v_zona text; v_dias integer; v_hoy date;
  -- Con el lead, la ruta es la del lead y el vehículo, si llega, es un filtro sobre sus filas (4.17-4a).
  v_final boolean := p_clase is not distinct from 'final'; v_por_lead boolean := p_lead is not null; v_por_vehiculo boolean := p_vehiculo is not null and p_lead is null; v_todos boolean;
  v_listado boolean; v_finales boolean; v_por_origen boolean; v_origen_finales boolean; v_propias boolean; v_cartera boolean;
begin
  if (p_cursor_en is null) <> (p_cursor_id is null) then
    raise exception 'El cursor del listado está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  v_p := array(select x from unnest(v_p) x where x <> all (v_t));
  if p_origen is not null then
    v_t := case when p_origen = any (v_t) then array[p_origen] else '{}' end;
    v_p := case when p_origen = any (v_p) then array[p_origen] else '{}' end;
    v_todos := false;
  else
    v_todos := cardinality(v_t) > 0 and not exists (select 1 from public.origenes o where o.id <> all (v_t));
  end if;
  v_ver := v_t || v_p;
  v_mias_en := case when p_mias then v_ver else v_p end;
  -- La clase nunca es columna de un índice (`enum_eq` no es leakproof: bajo la RLS no sería condición de índice): la final va por sus parciales, con `'final'` literal.
  v_listado := not p_mias and not v_por_vehiculo and not v_por_lead and v_todos and not v_final;
  v_finales := not p_mias and not v_por_vehiculo and not v_por_lead and v_todos and v_final;
  v_por_origen := not p_mias and not v_por_vehiculo and not v_por_lead and not v_todos and cardinality(v_t) > 0 and not v_final;
  v_origen_finales := not p_mias and not v_por_vehiculo and not v_por_lead and not v_todos and cardinality(v_t) > 0 and v_final;
  v_propias := not v_por_vehiculo and not v_por_lead and cardinality(v_mias_en) > 0;
  v_cartera := not p_mias and not v_por_vehiculo and not v_por_lead and cardinality(v_p) > 0;
  select e.zona_horaria, e.vigencia_dias into v_zona, v_dias from public.ajustes_empresa e where e.id = 1;
  v_hoy := (now() at time zone v_zona)::date;

  if p_cursor_en is null then
    return query
    with filas as (
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_listado and c.clase = any (v_clases) order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_listado_idx
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_finales and c.eliminado_en is null and c.clase = 'final' order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_finales_idx
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c where c.origen_id = o.id and c.clase = any (v_clases) order by c.creado_en desc, c.id desc limit v_n) x  -- cotizaciones_origen_creado_idx
        where v_por_origen)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c where c.origen_id = o.id and c.eliminado_en is null and c.clase = 'final' order by c.creado_en desc, c.id desc limit v_n) x  -- cotizaciones_origen_finales_idx
        where v_origen_finales)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_propias and c.creado_por = v_uid and c.origen_id = any (v_mias_en) and c.clase = any (v_clases)
        order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_creador_idx
      union all
      (select x.* from public.mis_leads() m (lead_id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c where c.lead_id = m.lead_id and c.creado_por <> v_uid and c.origen_id = any (v_p) and c.clase = any (v_clases)
          order by c.creado_en desc, c.id desc limit v_n) x  -- cotizaciones_lead_creado_idx
        where v_cartera)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_por_vehiculo and c.vehiculo_id = p_vehiculo and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_vehiculo_creado_idx
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_por_lead and c.lead_id = p_lead and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) and (p_vehiculo is null or c.vehiculo_id = p_vehiculo) order by c.creado_en desc, c.id desc limit v_n)  -- cotizaciones_lead_creado_idx
    )
    select f.*, (f.creado_en at time zone v_zona)::date + v_dias, (f.creado_en at time zone v_zona)::date + v_dias < v_hoy
      from filas f order by f.creado_en desc, f.id desc limit v_n;
  elsif not p_hacia_atras then
    return query
    with filas as (
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_listado and c.clase = any (v_clases) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_finales and c.eliminado_en is null and c.clase = 'final' and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c where c.origen_id = o.id and c.clase = any (v_clases) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n) x
        where v_por_origen)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c where c.origen_id = o.id and c.eliminado_en is null and c.clase = 'final' and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n) x
        where v_origen_finales)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_propias and c.creado_por = v_uid and c.origen_id = any (v_mias_en) and c.clase = any (v_clases) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id)
        order by c.creado_en desc, c.id desc limit v_n)
      union all
      (select x.* from public.mis_leads() m (lead_id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c where c.lead_id = m.lead_id and c.creado_por <> v_uid and c.origen_id = any (v_p) and c.clase = any (v_clases) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id)
          order by c.creado_en desc, c.id desc limit v_n) x
        where v_cartera)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_por_vehiculo and c.vehiculo_id = p_vehiculo and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_por_lead and c.lead_id = p_lead and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) and (p_vehiculo is null or c.vehiculo_id = p_vehiculo) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id)
        order by c.creado_en desc, c.id desc limit v_n))
    select f.*, (f.creado_en at time zone v_zona)::date + v_dias, (f.creado_en at time zone v_zona)::date + v_dias < v_hoy
      from filas f order by f.creado_en desc, f.id desc limit v_n;
  else
    -- Hacia atrás: lo estrictamente anterior, en orden ascendente (`armarPagina` lo da vuelta).
    return query
    with filas as (
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_listado and c.clase = any (v_clases) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_finales and c.eliminado_en is null and c.clase = 'final' and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c where c.origen_id = o.id and c.clase = any (v_clases) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n) x
        where v_por_origen)
      union all
      (select x.* from unnest(v_t) o (id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c where c.origen_id = o.id and c.eliminado_en is null and c.clase = 'final' and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n) x
        where v_origen_finales)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_propias and c.creado_por = v_uid and c.origen_id = any (v_mias_en) and c.clase = any (v_clases) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id)
        order by c.creado_en, c.id limit v_n)
      union all
      (select x.* from public.mis_leads() m (lead_id) cross join lateral (
         select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
           from public.cotizaciones c where c.lead_id = m.lead_id and c.creado_por <> v_uid and c.origen_id = any (v_p) and c.clase = any (v_clases) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id)
          order by c.creado_en, c.id limit v_n) x
        where v_cartera)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_por_vehiculo and c.vehiculo_id = p_vehiculo and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n)
      union all
      (select c.id, c.numero, c.origen_id, c.lead_id, c.vehiculo_id, c.creado_por, c.clase, c.estado, c.titulo, c.total_base, c.moneda_mostrar, c.creado_en
         from public.cotizaciones c where v_por_lead and c.lead_id = p_lead and c.origen_id = any (v_ver) and c.clase = any (v_clases)
          and (not p_mias or c.creado_por = v_uid) and (p_vehiculo is null or c.vehiculo_id = p_vehiculo) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id)
        order by c.creado_en, c.id limit v_n))
    select f.*, (f.creado_en at time zone v_zona)::date + v_dias, (f.creado_en at time zone v_zona)::date + v_dias < v_hoy
      from filas f order by f.creado_en, f.id limit v_n;
  end if;
end $$;

revoke all on function public.cotizaciones_listado(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean, uuid) from public, anon;
grant execute on function public.cotizaciones_listado(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean, uuid) to authenticated;
comment on function public.cotizaciones_listado(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean, uuid) is 'Una página del listado /cotizaciones de la más nueva a la más vieja (creado_en desc, id desc), por cursor (hacia atrás, en orden ascendente), con los filtros origen, clase, mías (las que creó quien mira), vehículo y lead, y la vigencia (vence_el, vencida) de cotizacion_hoja_guardada. Corre como quien la llama: la RLS decide qué se ve; cada ruta (lo de «todos», lo propio, la cartera de mis_leads(), el vehículo, el lead) va por su índice; con el lead, una sola ruta y el vehículo como filtro. Sin el snapshot. Lo mide supabase/tests/medir-cotizaciones-listado.sql.';
