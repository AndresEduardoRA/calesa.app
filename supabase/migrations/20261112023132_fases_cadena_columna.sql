-- Una columna de la cadena de logística por cursor (paso 6.02-2, C2–C6). `security definer` y no invocadora: las policies de `transportes` y
-- `documentos` preguntan `puede_vehiculo` por fila, y una invocadora que filtra por naviera, contenedor, booking o «por aprobar» pagaría eso por cada fila
-- recorrida. Aquí el alcance se resuelve una vez por origen (`_logistica_alcance`: el menor de `logistica.ver` y `vehiculos.ver`, lo mismo que vería la
-- invocadora bajo la policy de `vehiculos`) y se aplica a la fila con el predicado de esa policy. Toda consulta empieza por el origen y fuera de la papelera.

-- El alcance de quien mira sobre la logística de un origen: nulo (no la ve), `propios` o `todos`.
create function public._logistica_alcance(p_origen uuid) returns public.alcance_permiso
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select case when p_origen is null or x.l is null or x.v is null then null
              when x.l = 'todos' and x.v = 'todos' then 'todos'::public.alcance_permiso
              else 'propios'::public.alcance_permiso end
    from (select public.alcance_de('logistica.ver', p_origen) as l, public.alcance_de('vehiculos.ver', p_origen) as v) x;
$$;

revoke all on function public._logistica_alcance(uuid) from public, anon, authenticated;
grant execute on function public._logistica_alcance(uuid) to service_role;

-- Los días de demora de una fase, con el mismo criterio que `alertas_demora()`: nulo si la fase no alerta (no es de logística, es la final, la
-- regla `alerta_demora` del flujo está apagada o los días son 0).
create function public._logistica_dias(p_fase uuid) returns integer
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select case when f.es_logistica and not f.es_final and public.flujo_regla_activa(f.flujo_id, 'alerta_demora')
                   and coalesce(f.demora_dias, a.demora_dias_default) > 0
              then coalesce(f.demora_dias, a.demora_dias_default) end
    from public.fases f
    left join public.ajustes_empresa a on a.id = 1
   where f.id = p_fase;
$$;

revoke all on function public._logistica_dias(uuid) from public, anon, authenticated;
grant execute on function public._logistica_dias(uuid) to service_role;

-- Los filtros de la cadena, validados y normalizados: `{patron, prefijo, contenedor, booking, demoradas, por_aprobar, naviera}`. `q` sólo cuenta con
-- 3 letras o dígitos seguidos (como `equipo_lista`): contiene en título, VIN y lote, y es prefijo en contenedor y booking.
create function public._logistica_filtros(p jsonb) returns jsonb
  language plpgsql
  stable
  set search_path = ''
as $$
declare
  v jsonb := coalesce(p, '{}'::jsonb);
  k text;
  q text;
  v_mal boolean;
begin
  if jsonb_typeof(v) = 'null' then
    v := '{}'::jsonb;
  end if;
  if jsonb_typeof(v) <> 'object' then
    raise exception 'Los filtros no son válidos.' using errcode = '22023', hint = 'filtros';
  end if;
  for k in select jsonb_object_keys(v) loop
    v_mal := k not in ('q', 'demoradas', 'por_aprobar', 'contenedor', 'booking', 'naviera')
      or (k in ('q', 'contenedor', 'booking') and jsonb_typeof(v -> k) not in ('string', 'null'))
      or (k in ('q', 'contenedor', 'booking') and coalesce(char_length(v ->> k), 0) > 100)
      or (k in ('demoradas', 'por_aprobar') and jsonb_typeof(v -> k) not in ('boolean', 'null'))
      or (k = 'naviera' and jsonb_typeof(v -> k) not in ('string', 'null'))
      or (k = 'naviera' and jsonb_typeof(v -> k) = 'string' and not pg_input_is_valid(v ->> k, 'uuid'));
    if v_mal then
      raise exception 'Los filtros no son válidos.' using errcode = '22023', hint = 'filtros';
    end if;
  end loop;
  q := replace(replace(replace(btrim(v ->> 'q'), '\', '\\'), '%', '\%'), '_', '\_');
  if not public._equipo_lista_indexable(v ->> 'q') then
    q := null;
  end if;
  return jsonb_build_object(
    'patron', '%' || q || '%',
    'prefijo', q || '%',
    'contenedor', upper(nullif(btrim(v ->> 'contenedor'), '')),
    'booking', upper(nullif(btrim(v ->> 'booking'), '')),
    'demoradas', coalesce((v ->> 'demoradas')::boolean, false),
    'por_aprobar', coalesce((v ->> 'por_aprobar')::boolean, false),
    'naviera', (v ->> 'naviera')::uuid);
end;
$$;

revoke all on function public._logistica_filtros(jsonb) from public, anon, authenticated;
grant execute on function public._logistica_filtros(jsonb) to service_role;

-- Una columna: `p_n + 1` ids por una de cuatro consultas fijas (fase o «Sin fase», sin o con cursor), todas sobre `vehiculos_cadena_idx` con su
-- `order by fase_id, fase_desde, id limit`; después una sola proyección de los primeros `p_n`. «Propios» y los filtros son de fila sobre ese recorrido.
-- `demoradas` es rango del índice (`fase_desde < corte`). Sin validar: lo llaman `logistica_cadena_columna` y `logistica_cadena`, ya con el acceso visto.
create function public._logistica_columna(p_origen uuid, p_fase uuid, p_desde timestamptz, p_id uuid, p_n integer, p_f jsonb, p_todos boolean,
                                          p_dias integer) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_patron text := p_f ->> 'patron';
  v_prefijo text := p_f ->> 'prefijo';
  v_cont text := p_f ->> 'contenedor';
  v_book text := p_f ->> 'booking';
  v_nav uuid := (p_f ->> 'naviera')::uuid;
  v_apr boolean := coalesce((p_f ->> 'por_aprobar')::boolean, false);
  v_trans boolean := (p_f ->> 'naviera') is not null or (p_f ->> 'contenedor') is not null or (p_f ->> 'booking') is not null;
  v_corte timestamptz := 'infinity'::timestamptz;
  v_ids uuid[];
  v_tarjetas jsonb;
begin
  if coalesce((p_f ->> 'demoradas')::boolean, false) then
    if p_fase is null or p_dias is null then
      return jsonb_build_object('tarjetas', '[]'::jsonb, 'hay_mas', false);
    end if;
    v_corte := now() - make_interval(days => p_dias);
  end if;

  if p_fase is not null and p_id is null then
    -- vehiculos_cadena_idx: (origen_id, fase_id) fijos, rango de fase_desde.
    v_ids := array(
      select v.id from public.vehiculos v
       where v.origen_id = p_origen and v.eliminado_en is null and v.fase_id = p_fase and v.fase_desde < v_corte
         and (p_todos or v.creado_por = v_uid or (v.lead_id is not null and public.en_cartera(v.lead_id)))
         and (not v_trans or exists (select 1 from public.transportes t where t.vehiculo_id = v.id
               and (v_nav is null or t.naviera_id = v_nav) and (v_cont is null or upper(t.contenedor) = v_cont)
               and (v_book is null or upper(t.booking) = v_book)))
         and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
         and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
              or exists (select 1 from public.transportes t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
       order by v.fase_id, v.fase_desde, v.id
       limit p_n + 1);
  elsif p_fase is not null then
    -- vehiculos_cadena_idx: (origen_id, fase_id) fijos, desde el cursor (fase_desde, id).
    v_ids := array(
      select v.id from public.vehiculos v
       where v.origen_id = p_origen and v.eliminado_en is null and v.fase_id = p_fase and v.fase_desde < v_corte
         and (v.fase_desde, v.id) > (p_desde, p_id)
         and (p_todos or v.creado_por = v_uid or (v.lead_id is not null and public.en_cartera(v.lead_id)))
         and (not v_trans or exists (select 1 from public.transportes t where t.vehiculo_id = v.id
               and (v_nav is null or t.naviera_id = v_nav) and (v_cont is null or upper(t.contenedor) = v_cont)
               and (v_book is null or upper(t.booking) = v_book)))
         and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
         and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
              or exists (select 1 from public.transportes t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
       order by v.fase_id, v.fase_desde, v.id
       limit p_n + 1);
  elsif p_id is null then
    -- vehiculos_cadena_idx: origen_id fijo, fase_id is null (fase_desde también es nulo: check vehiculos_fase_desde_coherente), por id.
    v_ids := array(
      select v.id from public.vehiculos v
       where v.origen_id = p_origen and v.eliminado_en is null and v.fase_id is null and v.fase_desde is null
         and (p_todos or v.creado_por = v_uid or (v.lead_id is not null and public.en_cartera(v.lead_id)))
         and (not v_trans or exists (select 1 from public.transportes t where t.vehiculo_id = v.id
               and (v_nav is null or t.naviera_id = v_nav) and (v_cont is null or upper(t.contenedor) = v_cont)
               and (v_book is null or upper(t.booking) = v_book)))
         and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
         and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
              or exists (select 1 from public.transportes t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
       order by v.fase_id, v.fase_desde, v.id
       limit p_n + 1);
  else
    -- vehiculos_cadena_idx: origen_id fijo, fase_id is null, desde el cursor id.
    v_ids := array(
      select v.id from public.vehiculos v
       where v.origen_id = p_origen and v.eliminado_en is null and v.fase_id is null and v.fase_desde is null
         and v.id > p_id
         and (p_todos or v.creado_por = v_uid or (v.lead_id is not null and public.en_cartera(v.lead_id)))
         and (not v_trans or exists (select 1 from public.transportes t where t.vehiculo_id = v.id
               and (v_nav is null or t.naviera_id = v_nav) and (v_cont is null or upper(t.contenedor) = v_cont)
               and (v_book is null or upper(t.booking) = v_book)))
         and (not v_apr or exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.estado = 'subido' and d.eliminado_en is null))
         and (v_patron is null or v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron
              or exists (select 1 from public.transportes t where t.vehiculo_id = v.id and (t.contenedor ilike v_prefijo or t.booking ilike v_prefijo)))
       order by v.fase_id, v.fase_desde, v.id
       limit p_n + 1);
  end if;

  -- La tarjeta, sobre las filas ya leídas (por su clave primaria y `transportes_vehiculo_id_key`).
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', v.id, 'titulo', v.titulo, 'vin', v.vin, 'lote', v.lote, 'fase_desde', v.fase_desde,
           'demorada', coalesce(p_dias > 0 and v.fase_desde < now() - make_interval(days => p_dias), false),
           'contenedor', t.contenedor, 'booking', t.booking, 'eta_el', t.eta_el) order by u.k), '[]'::jsonb)
    into v_tarjetas
    from unnest(v_ids[1:p_n]) with ordinality as u(id, k)
    join public.vehiculos v on v.id = u.id
    left join public.transportes t on t.vehiculo_id = v.id;

  return jsonb_build_object('tarjetas', v_tarjetas, 'hay_mas', coalesce(cardinality(v_ids), 0) > p_n);
end;
$$;

revoke all on function public._logistica_columna(uuid, uuid, timestamptz, uuid, integer, jsonb, boolean, integer) from public, anon, authenticated;
grant execute on function public._logistica_columna(uuid, uuid, timestamptz, uuid, integer, jsonb, boolean, integer) to service_role;

-- «Ver más» de una columna de la cadena. `p_fase` nulo = «Sin fase». Cursor: la última tarjeta recibida (`fase_desde`, `id`); sin `p_id`, la primera página.
create function public.logistica_cadena_columna(p_origen uuid, p_fase uuid, p_desde timestamptz default null, p_id uuid default null,
                                                p_tope integer default 50, p_filtros jsonb default '{}'::jsonb) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_n integer := public._acotar_pagina(p_tope, 50, 100);
  v_f jsonb;
  v_alcance public.alcance_permiso;
  v_dias integer;
begin
  if p_origen is null then
    raise exception 'Falta el origen.' using errcode = '22023', hint = 'p_origen';
  end if;
  v_f := public._logistica_filtros(p_filtros);
  v_alcance := public._logistica_alcance(p_origen);
  if v_alcance is null then
    raise exception 'No tienes acceso a la logística de este origen.' using errcode = '42501', hint = 'acceso';
  end if;
  if p_fase is not null and p_id is not null and p_desde is null then
    raise exception 'El cursor de la columna no es válido.' using errcode = '22023', hint = 'cursor';
  end if;
  if p_fase is not null then
    perform 1 from public.fases f join public.flujos fl on fl.id = f.flujo_id
     where f.id = p_fase and f.es_logistica and fl.ambito = 'vehiculos' and fl.origen_id = p_origen;
    if not found then
      raise exception 'Esa fase no es de la cadena de este origen.' using errcode = '22023', hint = 'p_fase';
    end if;
    v_dias := public._logistica_dias(p_fase);
  end if;
  return public._logistica_columna(p_origen, p_fase, p_desde, p_id, v_n, v_f, v_alcance = 'todos', v_dias);
end;
$$;

revoke all on function public.logistica_cadena_columna(uuid, uuid, timestamptz, uuid, integer, jsonb) from public, anon;
grant execute on function public.logistica_cadena_columna(uuid, uuid, timestamptz, uuid, integer, jsonb) to authenticated, service_role;

comment on function public.logistica_cadena_columna(uuid, uuid, timestamptz, uuid, integer, jsonb) is
  'Una columna de la cadena de logística (6.02-2): {tarjetas: [{id, titulo, vin, lote, fase_desde, demorada, contenedor, booking, eta_el}], hay_mas}, '
  'por cursor (fase_desde, id) sobre vehiculos_cadena_idx; p_fase nulo = «Sin fase» (por id). Definer: el alcance es el menor de logistica.ver y '
  'vehiculos.ver del origen, resuelto una vez (42501 hint acceso si no lo hay). Filtros: q, demoradas, por_aprobar, contenedor, booking, naviera '
  '(22023 hint filtros); fase ajena o sin es_logistica, 22023 hint p_fase; cursor sin p_desde, 22023 hint cursor.';
