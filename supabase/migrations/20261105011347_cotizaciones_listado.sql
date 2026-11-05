-- El listado `/cotizaciones` por cursor y por alcance (paso 4.16-1, cierra 4-14): `cotizaciones_listado()`, invocadora (la RLS de «cotizaciones: leer» sigue
-- decidiendo qué se ve), con las rutas que la policy deja ver, cada una por su índice, juntas por `creado_en desc, id desc`. Medida con 50.000 y 250.000 en
-- `supabase/tests/medir-cotizaciones-listado.sql`; lo que devuelve, contra la regla escrita a mano en `cotizaciones-visibilidad.sql`.
--
-- Por qué rutas: la página de «todas las que veo» de quien ve «propios» recorría `cotizaciones_listado_idx` entera descartando lo ajeno (4-14: ≈ 1,6 s con 250.000).
-- Sea T los orígenes con «todos» y P los de «propios» menos T (`origenes_con_alcance('…', 'propios')` incluye los de «todos»):
--   1. T, en cuatro ramas. La clase nunca es columna de un índice: `enum_eq` no es leakproof y bajo la RLS no sería condición de índice (medido en el 4.16-1); la final va
--      por parciales `… where clase = 'final'` con la clase literal en su rama, y la preventa (o ninguna clase) por el índice del orden con la clase como filtro (las finales son
--      la minoría: a lo sumo una activa por vehículo). Si T cubre todos los orígenes y no hay origen: `cotizaciones_listado_idx` o, con la final, `cotizaciones_finales_idx`.
--      Con el origen, o si T no cubre todos: un lateral por origen de T sobre `cotizaciones_origen_creado_idx` o, con la final, `cotizaciones_origen_finales_idx` (nunca
--      el índice global filtrado: si T es un origen chico, eso repite 4-14).
--   2. P, las que creé: `cotizaciones_creador_idx`. Con «mías» (P1: las que creó quien mira) es la única ruta, también sobre T.
--   3. P, las de mi cartera que crearon otros: la cartera sale de `mis_leads()` (una llamada; es el conjunto de `en_cartera()`, sin la RLS de `leads`: entra el lead en
--      la papelera y no pide `leads.ver`) y un lateral por lead sobre `cotizaciones_lead_creado_idx`, que reemplaza a `cotizaciones_lead_idx` (sin `id`, no sirve el cursor) y a
--      `cotizaciones_lead_id_idx` (la FK).
--   Con el vehículo, una sola ruta: `cotizaciones_vehiculo_creado_idx` con la RLS (el camino a lo antiguo del historial del vehículo, tras sus 500).
-- Las ramas de «todos» sin origen (`cotizaciones_listado_idx`, `cotizaciones_finales_idx`) no filtran por T: sólo se encienden si T cubre todos los orígenes (la tabla `origenes` se lee
-- entera: su policy es `using (true)`), así que no hay nada que filtrar; la RLS sigue decidiendo.
-- Cada ruta lee a lo sumo `n + 1` (por origen o por lead, en los laterales) y se apaga con una condición sobre una variable (un One-Time Filter del plan
-- genérico). Sin cursor, hacia adelante y hacia atrás son tres consultas (`.claude/rules/escala.md`). «Vencida», con la regla de `cotizacion_hoja_guardada`.
-- Todas las versiones de una cadena salen, cada una en su fila (P2).

-- `lead_id` y `origen_id` quedan con un solo índice entero cada uno con esa columna al frente: entero, porque cubre la FK de verdad (también las filas de la papelera);
-- uno solo, porque dos que sirven a la misma consulta compiten en el plan genérico y el plan cambia con el volumen (medido: con 50.000 la cartera sondeaba por
-- `cotizaciones_lead_id_idx` y ordenaba). Los de la final son parciales con la clase en el predicado: la clase no puede ser columna de un índice (arriba).
create index cotizaciones_origen_creado_idx on public.cotizaciones (origen_id, creado_en desc, id desc);
create index cotizaciones_lead_creado_idx on public.cotizaciones (lead_id, creado_en desc, id desc);
create index cotizaciones_finales_idx on public.cotizaciones (creado_en desc, id desc) where eliminado_en is null and clase = 'final';
create index cotizaciones_origen_finales_idx on public.cotizaciones (origen_id, creado_en desc, id desc) where eliminado_en is null and clase = 'final';
drop index public.cotizaciones_lead_idx;
drop index public.cotizaciones_lead_id_idx;
drop index public.cotizaciones_origen_id_idx;

create function public.cotizaciones_listado(
  p_tamano integer, p_origen uuid default null, p_clase public.clase_cotizacion default null, p_mias boolean default false, p_vehiculo uuid default null,
  p_cursor_en timestamptz default null, p_cursor_id uuid default null, p_hacia_atras boolean default false)
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
  v_final boolean := p_clase is not distinct from 'final'; v_por_vehiculo boolean := p_vehiculo is not null; v_todos boolean;
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
  v_listado := not p_mias and not v_por_vehiculo and v_todos and not v_final;
  v_finales := not p_mias and not v_por_vehiculo and v_todos and v_final;
  v_por_origen := not p_mias and not v_por_vehiculo and not v_todos and cardinality(v_t) > 0 and not v_final;
  v_origen_finales := not p_mias and not v_por_vehiculo and not v_todos and cardinality(v_t) > 0 and v_final;
  v_propias := not v_por_vehiculo and cardinality(v_mias_en) > 0;
  v_cartera := not p_mias and not v_por_vehiculo and cardinality(v_p) > 0;
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
          and (not p_mias or c.creado_por = v_uid) and (c.creado_en, c.id) < (p_cursor_en, p_cursor_id) order by c.creado_en desc, c.id desc limit v_n))
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
          and (not p_mias or c.creado_por = v_uid) and (c.creado_en, c.id) > (p_cursor_en, p_cursor_id) order by c.creado_en, c.id limit v_n))
    select f.*, (f.creado_en at time zone v_zona)::date + v_dias, (f.creado_en at time zone v_zona)::date + v_dias < v_hoy
      from filas f order by f.creado_en, f.id limit v_n;
  end if;
end $$;

revoke all on function public.cotizaciones_listado(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean) from public, anon;
grant execute on function public.cotizaciones_listado(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean) to authenticated;
comment on function public.cotizaciones_listado(integer, uuid, public.clase_cotizacion, boolean, uuid, timestamptz, uuid, boolean) is 'Una página del listado /cotizaciones de la más nueva a la más vieja (creado_en desc, id desc), por cursor (hacia atrás, en orden ascendente), con los filtros origen, clase, mías (las que creó quien mira) y vehículo, y la vigencia (vence_el, vencida) de cotizacion_hoja_guardada. Corre como quien la llama: la RLS decide qué se ve; cada ruta (lo de «todos», lo propio, la cartera de mis_leads(), el vehículo) va por su índice. Sin el snapshot. Lo mide supabase/tests/medir-cotizaciones-listado.sql.';
