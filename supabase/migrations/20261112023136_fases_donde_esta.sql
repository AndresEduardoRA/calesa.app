-- «Dónde está» (paso 6.02-3, C4–C7): hasta 10 unidades de todos los orígenes cuya logística veo, buscadas por título, VIN o lote, con su fase, desde
-- cuándo y la ETA. Sólo orígenes con la regla `logistica` activa (elegir un resultado cambia a la pestaña de su origen, y las pestañas son las de esa
-- regla). `security definer` con el modelo de `buscador_cotizaciones`: hasta 1.000 candidatas por los trigramas de los orígenes que veo, más las propias
-- por `vehiculos_creador_idx` donde sólo tengo «propios», y sobre las candidatas la regla de la fila otra vez (el alcance de la cadena, `_logistica_alcance`:
-- el menor de `logistica.ver` y `vehiculos.ver`, y el «propios» de «vehiculos: leer»). Un texto corto o sin orígenes: vacío, sin error.

create function public.logistica_donde_esta(p_buscar text, p_tope integer default 10) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_n integer := public._acotar_pagina(p_tope, 10, 10);
  v_yo uuid := (select auth.uid());
  v_exacto text := upper(btrim(p_buscar));
  v_patron text;
  v_t uuid[];
  v_p uuid[];
  v_ids uuid[];
  v_unidades jsonb;
begin
  if char_length(p_buscar) > 100 then
    raise exception 'El texto a buscar es demasiado largo.' using errcode = '22023', hint = 'p_buscar';
  end if;
  -- El mismo escape y el mismo mínimo (3 letras o dígitos seguidos) que `q` de la cadena; si no alcanza, no se busca.
  v_patron := public._logistica_filtros(jsonb_build_object('q', p_buscar)) ->> 'patron';
  if v_patron is null then
    return jsonb_build_object('unidades', '[]'::jsonb, 'hay_mas', false);
  end if;
  -- Los orígenes: los de `logistica.ver` con la regla `logistica` activa en su flujo de vehículos (`flujos_origen_unico`), por su alcance.
  select coalesce(array_agg(o.id) filter (where a.alcance = 'todos'), '{}'), coalesce(array_agg(o.id) filter (where a.alcance = 'propios'), '{}')
    into v_t, v_p
    from unnest(public.origenes_con_alcance('logistica.ver', 'propios')) as o(id)
    join public.flujos fl on fl.origen_id = o.id and fl.ambito = 'vehiculos'
    cross join lateral (select public._logistica_alcance(o.id) as alcance) a
   where public.flujo_regla_activa(fl.id, 'logistica');
  if cardinality(v_t) = 0 and cardinality(v_p) = 0 then
    return jsonb_build_object('unidades', '[]'::jsonb, 'hay_mas', false);
  end if;
  -- Candidatas por `vehiculos_titulo_trgm`, `vehiculos_vin_trgm` y `vehiculos_lote_trgm` (bitmap or): a lo sumo 1.000 de los orígenes que veo.
  v_ids := array(
    select v.id from public.vehiculos v
     where (v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron)
       and v.eliminado_en is null and v.origen_id = any (v_t || v_p)
     limit 1000);
  -- Las propias, por `vehiculos_creador_idx (creado_por, origen_id, creado_en desc, id desc)`, sólo donde tengo «propios»: encuentra las mías aunque el
  -- título lo compartan más de 1.000 ajenas. Una de un lead de mi cartera creada por otra persona no se rescata (el límite de `buscador_cotizaciones`).
  if cardinality(v_p) > 0 then
    v_ids := v_ids || array(
      select v.id from public.vehiculos v
       where v.creado_por = v_yo and v.origen_id = any (v_p) and v.eliminado_en is null
         and (v.titulo ilike v_patron or v.vin ilike v_patron or v.lote ilike v_patron)
       order by v.creado_en desc, v.id desc
       limit v_n + 1);
  end if;
  -- La regla de la fila sobre las candidatas (por la clave primaria); primero el VIN o el lote exactos, después lo más nuevo.
  v_ids := array(
    select v.id from public.vehiculos v
     where v.id = any (v_ids) and v.eliminado_en is null
       and (v.origen_id = any (v_t)
            or (v.origen_id = any (v_p) and (v.creado_por = v_yo or (v.lead_id is not null and public.en_cartera(v.lead_id)))))
     order by (upper(v.vin) = v_exacto or upper(v.lote) = v_exacto) is true desc, v.creado_en desc, v.id desc
     limit v_n + 1);
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', v.id, 'origen_id', v.origen_id, 'titulo', v.titulo, 'vin', v.vin, 'lote', v.lote, 'fase_id', v.fase_id, 'fase_nombre', f.nombre,
           'fase_color', f.color, 'fase_desde', v.fase_desde, 'eta_el', t.eta_el) order by u.k), '[]'::jsonb)
    into v_unidades
    from unnest(v_ids[1:v_n]) with ordinality as u(id, k)
    join public.vehiculos v on v.id = u.id
    left join public.fases f on f.id = v.fase_id
    left join public.transportes t on t.vehiculo_id = v.id;
  return jsonb_build_object('unidades', v_unidades, 'hay_mas', coalesce(cardinality(v_ids), 0) > v_n);
end;
$$;

revoke all on function public.logistica_donde_esta(text, integer) from public, anon;
grant execute on function public.logistica_donde_esta(text, integer) to authenticated, service_role;

comment on function public.logistica_donde_esta(text, integer) is
  '«Dónde está» (6.02-3): {unidades: [{id, origen_id, titulo, vin, lote, fase_id, fase_nombre, fase_color, fase_desde, eta_el}], hay_mas}, hasta '
  '_acotar_pagina(p_tope, 10, 10), de los orígenes con la regla logistica activa cuya logística veo. Por título, VIN o lote (vehiculos_*_trgm, hasta 1.000 '
  'candidatas, más las propias por vehiculos_creador_idx donde se tiene «propios»), con la regla de la fila de la cadena sobre las candidatas; VIN o lote '
  'exactos primero. Menos de 3 letras o dígitos seguidos, o ningún origen: vacío sin error; más de 100 caracteres: 22023 hint p_buscar. Sin lead_id.';
