-- La papelera propia de cotizaciones: la lista de lotes por cursor y un lote (4.24-1a), como `vehiculos_papelera_listar|lote`.
--
-- Sólo lotes `tipo = 'cotizaciones'` (las que se fueron con su vehículo vuelven al restaurar el vehículo, en su papelera: P8 a), pendientes y con algo en la
-- papelera; quien tiene `cotizaciones.papelera.purgar` ve todos, quien no, los que envió. Son `security definer` (se saltean la RLS): de cada cotización sólo
-- sale lo que la RLS no le esconde a quien tiene la clave y no la ve (número, título, clase, origen y fecha: P6 a), nunca `valores`, `fuentes`, `totales`,
-- `tipos_cambio` ni `total_base`. La lista acota la página con `_acotar_pagina` (5 lotes por omisión de la pantalla, hasta 51; 20 cotizaciones por lote, hasta
-- 200) y la registra el 4.24-2, que la llama (`scripts/guardas/paginas-en-la-base-papelera.ts`). La mide `supabase/tests/medir-escala.sql`.
-- Pruebas: `supabase/tests/areas/papelera/listar.sql`.

create function public._cotizaciones_papelera_lote_json(p_lote public.lotes_papelera, p_dias integer, p_yo uuid, p_primeros integer) returns jsonb
  language sql stable security definer
  set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_lote.id, 'actualizado_en', p_lote.actualizado_en, 'creado_en', p_lote.creado_en,
    'creado_por_nombre', (select nullif(btrim(p.nombre), '') from public.perfiles p where p.id = p_lote.creado_por),
    'es_mio', p_lote.creado_por is not distinct from p_yo,
    'purga_el', p_lote.creado_en + make_interval(days => p_dias),
    'enviados', coalesce((p_lote.resumen ->> 'cantidad')::int, 0),
    -- Un lote tiene a lo sumo 200 (por `cotizaciones_lote_papelera_idx`); sin `p_primeros`, todas.
    'cotizaciones', (
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'numero', c.numero, 'titulo', coalesce(c.titulo, 'Cotización #' || c.numero), 'clase', c.clase, 'origen_id', c.origen_id,
        'creado_en', c.creado_en) order by c.numero)
      from public.cotizaciones c
      where c.id = any (array(select c0.id from public.cotizaciones c0
                                where c0.lote_papelera_id = p_lote.id and c0.eliminado_en is not null
                                order by c0.numero limit p_primeros))),
    -- Cuántas quedan en la papelera, exacto: un lote tiene a lo sumo 200 (contado sobre 201 para la guarda de escala).
    'en_papelera', (select count(*) from (select 1 from public.cotizaciones c where c.lote_papelera_id = p_lote.id
                                           and c.eliminado_en is not null limit 201) n));
$$;

comment on function public._cotizaciones_papelera_lote_json(public.lotes_papelera, integer, uuid, integer) is 'Un lote de la papelera de cotizaciones como lo dibuja la pantalla: el lote y sus primeras p_primeros cotizaciones en la papelera (todas si es nulo), cada una con id, numero, titulo, clase, origen_id y creado_en (nada que la RLS esconda). De nadie: la llaman cotizaciones_papelera_listar y cotizaciones_papelera_lote.';
revoke all on function public._cotizaciones_papelera_lote_json(public.lotes_papelera, integer, uuid, integer) from public, anon, authenticated;
grant execute on function public._cotizaciones_papelera_lote_json(public.lotes_papelera, integer, uuid, integer) to service_role;

create function public.cotizaciones_papelera_listar(p_antes_en timestamptz default null, p_antes_id uuid default null, p_hacia_atras boolean default false,
                                                    p_tope integer default 6, p_primeros integer default 20) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare v_dias int; v_todo boolean; v_yo uuid := (select auth.uid()); v_n int := public._acotar_pagina(p_tope, 6, 51);
        v_primeros int := public._acotar_pagina(p_primeros, 20, 200); v_ids uuid[];
begin
  perform public.assert_activo();
  select e.papelera_dias into v_dias from public.ajustes_empresa e where e.id = 1;
  v_todo := public.tiene_permiso('cotizaciones.papelera.purgar');
  -- Las tres por `lotes_papelera_tipo_idx` (tipo, creado_en desc, id desc) where pendientes: sin cursor, hacia adelante y hacia atrás. «Le queda alguna en
  -- la papelera» es una sonda por lote (`cotizaciones_lote_papelera_idx`, `limit 1`) y no un `exists`: con pocas en la papelera, el `exists` del plan genérico
  -- se vuelve un semi join que lee entero ese índice (crece con la papelera, no con la página; medido en el 4.24-1a, `medir-escala.sql`).
  if p_antes_en is null then
    v_ids := array(select l.id from public.lotes_papelera l
      where l.tipo = 'cotizaciones' and l.purgado_en is null and l.restaurado_en is null
        and (v_todo or l.creado_por = v_yo)
        and (select true from public.cotizaciones c where c.lote_papelera_id = l.id and c.eliminado_en is not null limit 1)
      order by l.creado_en desc, l.id desc limit v_n);
  elsif not coalesce(p_hacia_atras, false) then
    v_ids := array(select l.id from public.lotes_papelera l
      where l.tipo = 'cotizaciones' and l.purgado_en is null and l.restaurado_en is null
        and (v_todo or l.creado_por = v_yo)
        and (l.creado_en, l.id) < (p_antes_en, p_antes_id)
        and (select true from public.cotizaciones c where c.lote_papelera_id = l.id and c.eliminado_en is not null limit 1)
      order by l.creado_en desc, l.id desc limit v_n);
  else
    v_ids := array(select l.id from public.lotes_papelera l
      where l.tipo = 'cotizaciones' and l.purgado_en is null and l.restaurado_en is null
        and (v_todo or l.creado_por = v_yo)
        and (l.creado_en, l.id) > (p_antes_en, p_antes_id)
        and (select true from public.cotizaciones c where c.lote_papelera_id = l.id and c.eliminado_en is not null limit 1)
      order by l.creado_en, l.id limit v_n);
  end if;
  return coalesce((
    select jsonb_agg(public._cotizaciones_papelera_lote_json(l, v_dias, v_yo, v_primeros) order by o.ord)
    from unnest(v_ids) with ordinality o (id, ord) join public.lotes_papelera l on l.id = o.id), '[]'::jsonb);
end;
$$;

comment on function public.cotizaciones_papelera_listar(timestamptz, uuid, boolean, integer, integer) is 'Los lotes pendientes de la papelera de cotizaciones con algo en la papelera, por cursor (creado_en, id) desc; hacia atrás, del más cercano al más lejano. Con cotizaciones.papelera.purgar, todos; sin ella, los de quien llama. p_tope hasta 51 lotes, p_primeros hasta 200 cotizaciones por lote (_acotar_pagina).';
revoke all on function public.cotizaciones_papelera_listar(timestamptz, uuid, boolean, integer, integer) from public, anon;
grant execute on function public.cotizaciones_papelera_listar(timestamptz, uuid, boolean, integer, integer) to authenticated, service_role;

create function public.cotizaciones_papelera_lote(p_lote uuid) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare v_dias int; v_todo boolean; v_yo uuid := (select auth.uid()); l public.lotes_papelera;
begin
  perform public.assert_activo();
  select e.papelera_dias into v_dias from public.ajustes_empresa e where e.id = 1;
  v_todo := public.tiene_permiso('cotizaciones.papelera.purgar');
  select * into l from public.lotes_papelera x
   where x.id = p_lote and x.tipo = 'cotizaciones' and x.purgado_en is null and x.restaurado_en is null
     and (v_todo or x.creado_por = v_yo)
     and exists (select 1 from public.cotizaciones y where y.lote_papelera_id = x.id and y.eliminado_en is not null);
  if not found then
    return null;
  end if;
  return public._cotizaciones_papelera_lote_json(l, v_dias, v_yo, null);
end;
$$;

comment on function public.cotizaciones_papelera_lote(uuid) is 'Un lote de la papelera de cotizaciones entero, si es de cotizaciones, pendiente, con algo en la papelera y de quien llama (o con cotizaciones.papelera.purgar); si no, nulo, sin decir por qué.';
revoke all on function public.cotizaciones_papelera_lote(uuid) from public, anon;
grant execute on function public.cotizaciones_papelera_lote(uuid) to authenticated, service_role;
