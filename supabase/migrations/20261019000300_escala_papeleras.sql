-- Escala (9e): las dos papeleras por páginas de lotes.
--
-- Medido con 60 lotes de 200 leads (12.000) y 60 de 50 vehículos: `leads_papelera_listar()` tardaba
-- 597 ms y `vehiculos_papelera_listar()` 115 ms, leían **todos** los lotes con **todos** sus ítems en
-- un solo jsonb, y la pantalla dibujaba todo. Un lote ya está acotado por construcción (de 1 a 200:
-- `leads_papelera_enviar`, `vehiculos_papelera_enviar`); lo que crece es la cantidad de lotes.
--
-- Ahora cada listado lee una página de lotes por keyset `(creado_en, id)`, del más nuevo al más
-- viejo, con las mismas dos direcciones que el resto de las listas (`armarPagina`): el llamador pide
-- `tamaño + 1`. Con y sin cursor son consultas distintas. Lo que se ve de cada lote no cambia.
-- `lotes_papelera_tipo_idx (tipo, creado_en desc, id desc)` los sostiene (parcial: sólo los que
-- todavía no se cerraron por restaurar o por purgar, que es lo único que se lista). La firma cambia:
-- se borran las anteriores, sin argumentos.
--
-- `storage_gc_pendiente()` deja de contar la cola entera: cuenta hasta 1.001 y dice si hay más.

create index if not exists lotes_papelera_tipo_idx
  on public.lotes_papelera (tipo, creado_en desc, id desc)
  where purgado_en is null and restaurado_en is null;

drop function if exists public.leads_papelera_listar();
drop function if exists public.vehiculos_papelera_listar();

-- --- Leads ---------------------------------------------------------------------------------------------
create or replace function public._leads_papelera_lote_json(p_lote public.lotes_papelera, p_dias int, p_yo uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p_lote.id, 'actualizado_en', p_lote.actualizado_en, 'creado_en', p_lote.creado_en,
    'creado_por_nombre', (select nullif(btrim(p.nombre), '') from public.perfiles p where p.id = p_lote.creado_por),
    'es_mio', p_lote.creado_por is not distinct from p_yo,
    'purga_el', p_lote.creado_en + make_interval(days => p_dias),
    'enviados', coalesce((p_lote.resumen ->> 'cantidad')::int, 0),
    -- Un lote tiene a lo sumo 200 (índice `leads_lote_papelera_id_idx`).
    'leads', (
      select jsonb_agg(jsonb_build_object(
        'id', x.id, 'numero', x.numero, 'nombre', x.nombre,
        'motivo_de_bloqueo', public._lead_motivo_de_bloqueo(x, false),
        'motivo_de_restaurar', public._lead_motivo_de_restaurar(x)) order by x.numero)
      from public.leads x where x.lote_papelera_id = p_lote.id and x.eliminado_en is not null));
$$;
revoke all on function public._leads_papelera_lote_json(public.lotes_papelera, int, uuid) from public, anon, authenticated;

-- Una página de lotes de la papelera de leads (`p_tope` filas, que el llamador arma como tamaño + 1).
-- Sin cursor: los más nuevos. Con `p_antes_*`: los que vienen después (más viejos), o, con
-- `p_hacia_atras`, los anteriores (más nuevos, de la más vieja a la más nueva: `armarPagina` los da vuelta).
-- Índice: `lotes_papelera_tipo_idx`.
create or replace function public.leads_papelera_listar(
  p_antes_en timestamptz default null, p_antes_id uuid default null,
  p_hacia_atras boolean default false, p_tope int default 6)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_dias int; v_todo boolean; v_yo uuid := (select auth.uid()); v_n int := least(greatest(coalesce(p_tope, 6), 1), 51); v_ids uuid[];
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
revoke all on function public.leads_papelera_listar(timestamptz, uuid, boolean, int) from public, anon;
grant execute on function public.leads_papelera_listar(timestamptz, uuid, boolean, int) to authenticated;

-- --- Vehículos -----------------------------------------------------------------------------------------
create or replace function public._vehiculos_papelera_lote_json(p_lote public.lotes_papelera, p_dias int, p_yo uuid)
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
      from public.vehiculos v where v.lote_papelera_id = p_lote.id and v.eliminado_en is not null));
$$;
revoke all on function public._vehiculos_papelera_lote_json(public.lotes_papelera, int, uuid) from public, anon, authenticated;

create or replace function public.vehiculos_papelera_listar(
  p_antes_en timestamptz default null, p_antes_id uuid default null,
  p_hacia_atras boolean default false, p_tope int default 6)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_dias int; v_todo boolean; v_yo uuid := (select auth.uid()); v_n int := least(greatest(coalesce(p_tope, 6), 1), 51); v_ids uuid[];
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
revoke all on function public.vehiculos_papelera_listar(timestamptz, uuid, boolean, int) from public, anon;
grant execute on function public.vehiculos_papelera_listar(timestamptz, uuid, boolean, int) to authenticated;

-- --- Lo que espera la cola de Storage: hasta 1.001, no el total -------------------------------------------
create or replace function public.storage_gc_pendiente()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  perform public.assert_activo();
  if not public.tiene_permiso('vehiculos.papelera.purgar') then
    return null;
  end if;
  -- Índice: `cola_gc_storage_edad_idx (encolado_en)`.
  select jsonb_build_object('objetos', least(count(*), 1000), 'hay_mas', count(*) > 1000,
                            'desde', min(q.encolado_en) + public._gracia_de_storage()) into v
  from (select c.encolado_en from public.cola_gc_storage c
         where c.encolado_en < now() - public._gracia_de_storage() - interval '3 hours'
         order by c.encolado_en limit 1001) q;
  return v;
end;
$$;
revoke all on function public.storage_gc_pendiente() from public, anon;
grant execute on function public.storage_gc_pendiente() to authenticated;
