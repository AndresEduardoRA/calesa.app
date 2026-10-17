-- Un lote de la papelera muestra sus primeros 20 (cierre 1 de la Fase 3).
--
-- Medido (9e, con volumen): una página de papelera son 5 lotes y un lote trae hasta 200 filas: 1.000 filas, ~8.200 nodos, y
-- para cada lead `_lead_motivo_de_restaurar` (que verifica su teléfono). Ahora la lista trae los primeros 20 de cada lote
-- (`p_primeros`, acotado con `_acotar_pagina` a 200) y cuántos quedan en la papelera (`en_papelera`, exacto: a lo sumo 200);
-- «Mostrar los N» pide ese lote entero desde el navegador (`leads_papelera_lote`, `vehiculos_papelera_lote`), que devuelve
-- nulo si el lote ya no está. La papelera no entra al selector de «Ítems por página»: su unidad es el lote, y 5 lotes de 20
-- son 100 filas, el máximo de una página.

drop function if exists public.leads_papelera_listar(timestamptz, uuid, boolean, int);
drop function if exists public.vehiculos_papelera_listar(timestamptz, uuid, boolean, int);
drop function if exists public._leads_papelera_lote_json(public.lotes_papelera, int, uuid);
drop function if exists public._vehiculos_papelera_lote_json(public.lotes_papelera, int, uuid);
drop function if exists public.leads_papelera_listar(timestamptz, uuid, boolean, int, int);
drop function if exists public.vehiculos_papelera_listar(timestamptz, uuid, boolean, int, int);
drop function if exists public._leads_papelera_lote_json(public.lotes_papelera, int, uuid, int);
drop function if exists public._vehiculos_papelera_lote_json(public.lotes_papelera, int, uuid, int);

create function public._leads_papelera_lote_json(p_lote public.lotes_papelera, p_dias int, p_yo uuid, p_primeros int)
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
      from public.leads x
      where x.id = any (array(select x0.id from public.leads x0
                                where x0.lote_papelera_id = p_lote.id and x0.eliminado_en is not null
                                order by x0.numero limit p_primeros))),
    -- Cuántos quedan en la papelera, exacto: un lote tiene a lo sumo 200 (contado sobre 201 para la guarda de escala).
    'en_papelera', (select count(*) from (select 1 from public.leads x where x.lote_papelera_id = p_lote.id
                                           and x.eliminado_en is not null limit 201) c));
$$;
revoke all on function public._leads_papelera_lote_json(public.lotes_papelera, int, uuid, int) from public, anon, authenticated;

create function public._vehiculos_papelera_lote_json(p_lote public.lotes_papelera, p_dias int, p_yo uuid, p_primeros int)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p_lote.id, 'actualizado_en', p_lote.actualizado_en, 'creado_en', p_lote.creado_en,
    'creado_por_nombre', (select nullif(btrim(p.nombre), '') from public.perfiles p where p.id = p_lote.creado_por),
    'es_mio', p_lote.creado_por is not distinct from p_yo,
    'es_limpieza', p_lote.es_limpieza,
    'purga_el', p_lote.creado_en + make_interval(days => p_dias),
    'enviados', coalesce((p_lote.resumen ->> 'cantidad')::int, 0),
    -- Un lote tiene a lo sumo 200; las fotos de un vehículo, a lo sumo 24 (`vehiculo_imagenes_tope`).
    'vehiculos', (
      select jsonb_agg(jsonb_build_object(
        'id', v.id, 'numero', v.numero, 'titulo', v.titulo, 'origen_id', v.origen_id,
        'miniatura', (select i.ruta_miniatura from public.vehiculos_imagenes i where i.vehiculo_id = v.id and i.es_portada),
        'fotos', (select count(*) from public.vehiculos_imagenes i where i.vehiculo_id = v.id),
        'motivo_de_bloqueo', public._vehiculo_motivo_de_bloqueo(v, false)) order by v.numero)
      from public.vehiculos v
      where v.id = any (array(select v0.id from public.vehiculos v0
                                where v0.lote_papelera_id = p_lote.id and v0.eliminado_en is not null
                                order by v0.numero limit p_primeros))),
    -- Cuántos quedan en la papelera, exacto: un lote tiene a lo sumo 200 (contado sobre 201 para la guarda de escala).
    'en_papelera', (select count(*) from (select 1 from public.vehiculos v where v.lote_papelera_id = p_lote.id
                                           and v.eliminado_en is not null limit 201) c));
$$;
revoke all on function public._vehiculos_papelera_lote_json(public.lotes_papelera, int, uuid, int) from public, anon, authenticated;

create function public.leads_papelera_listar(
  p_antes_en timestamptz default null, p_antes_id uuid default null,
  p_hacia_atras boolean default false, p_tope int default 6, p_primeros int default 20)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_dias int; v_todo boolean; v_yo uuid := (select auth.uid()); v_n int := public._acotar_pagina(p_tope, 6, 51);
        v_primeros int := public._acotar_pagina(p_primeros, 20, 200); v_ids uuid[];
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
    select jsonb_agg(public._leads_papelera_lote_json(l, v_dias, v_yo, v_primeros) order by o.ord)
    from unnest(v_ids) with ordinality o (id, ord) join public.lotes_papelera l on l.id = o.id), '[]'::jsonb);
end;
$$;
revoke all on function public.leads_papelera_listar(timestamptz, uuid, boolean, int, int) from public, anon;
grant execute on function public.leads_papelera_listar(timestamptz, uuid, boolean, int, int) to authenticated;

create function public.vehiculos_papelera_listar(
  p_antes_en timestamptz default null, p_antes_id uuid default null,
  p_hacia_atras boolean default false, p_tope int default 6, p_primeros int default 20)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_dias int; v_todo boolean; v_yo uuid := (select auth.uid()); v_n int := public._acotar_pagina(p_tope, 6, 51);
        v_primeros int := public._acotar_pagina(p_primeros, 20, 200); v_ids uuid[];
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
    select jsonb_agg(public._vehiculos_papelera_lote_json(l, v_dias, v_yo, v_primeros) order by o.ord)
    from unnest(v_ids) with ordinality o (id, ord) join public.lotes_papelera l on l.id = o.id), '[]'::jsonb);
end;
$$;
revoke all on function public.vehiculos_papelera_listar(timestamptz, uuid, boolean, int, int) from public, anon;
grant execute on function public.vehiculos_papelera_listar(timestamptz, uuid, boolean, int, int) to authenticated;

-- Un lote entero (hasta 200), para «Mostrar los N»: el mismo filtro que la lista (lo propio o, con `leads.papelera.purgar`,
-- todo), o nulo si ya no está (se purgó o se restauró mientras se miraba) o no se ve.
create or replace function public.leads_papelera_lote(p_lote uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_dias int; v_todo boolean; v_yo uuid := (select auth.uid()); l public.lotes_papelera;
begin
  perform public.assert_activo();
  select e.papelera_dias into v_dias from public.ajustes_empresa e where e.id = 1;
  v_todo := public.tiene_permiso('leads.papelera.purgar');
  select * into l from public.lotes_papelera x
   where x.id = p_lote and x.tipo = 'leads' and x.purgado_en is null and x.restaurado_en is null
     and (v_todo or x.creado_por = v_yo)
     and exists (select 1 from public.leads y where y.lote_papelera_id = x.id and y.eliminado_en is not null);
  if not found then
    return null;
  end if;
  return public._leads_papelera_lote_json(l, v_dias, v_yo, null);
end;
$$;
revoke all on function public.leads_papelera_lote(uuid) from public, anon;
grant execute on function public.leads_papelera_lote(uuid) to authenticated;

-- Un lote entero (hasta 200), para «Mostrar los N»: el mismo filtro que la lista (lo propio o, con `vehiculos.papelera.purgar`,
-- todo), o nulo si ya no está (se purgó o se restauró mientras se miraba) o no se ve.
create or replace function public.vehiculos_papelera_lote(p_lote uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_dias int; v_todo boolean; v_yo uuid := (select auth.uid()); l public.lotes_papelera;
begin
  perform public.assert_activo();
  select e.papelera_dias into v_dias from public.ajustes_empresa e where e.id = 1;
  v_todo := public.tiene_permiso('vehiculos.papelera.purgar');
  select * into l from public.lotes_papelera x
   where x.id = p_lote and x.tipo = 'vehiculos' and x.purgado_en is null and x.restaurado_en is null
     and (v_todo or x.creado_por = v_yo)
     and exists (select 1 from public.vehiculos y where y.lote_papelera_id = x.id and y.eliminado_en is not null);
  if not found then
    return null;
  end if;
  return public._vehiculos_papelera_lote_json(l, v_dias, v_yo, null);
end;
$$;
revoke all on function public.vehiculos_papelera_lote(uuid) from public, anon;
grant execute on function public.vehiculos_papelera_lote(uuid) to authenticated;
