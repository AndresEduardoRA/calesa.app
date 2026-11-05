-- Las revisiones nombran a su autor y a lo que cambió (paso 4.15-2): `cotizacion_revisiones` suma, en cada fila, `autor: {id, nombre}` (de
-- `perfiles`, que lee todo usuario activo; nulo sin `usuario_id`, el nombre nulo si queda vacío) y, en la respuesta, `etiquetas: {nodos, grupos}`
-- de SU versión, sólo de los ids que figuran en los diffs YA recortados de esa página (`valores` y `fuentes`, `de` y `a`; `totales.de|a.grupos`):
-- lo que no viaja no tiene etiqueta. Lo demás no cambia (firma, cursor, una lectura de la definición y una llamada a `_nodos_visibles`, grants:
-- `create or replace`). docs/COTIZADOR.md › «Cómo se guarda (4.10-3)».

-- Las etiquetas de lo que nombran unos diffs (ya recortados): id → etiqueta de la definición, o el id si no tiene. Pura y de nadie.
create function public._revision_etiquetas(p_def jsonb, p_filas jsonb) returns jsonb
  language sql immutable
  set search_path = ''
as $$
  with d as (select f -> 'diff' as diff from jsonb_array_elements(coalesce(p_filas, '[]'::jsonb)) f),
  nodos as (
    select distinct k.key as id
      from d cross join lateral (values ('valores'), ('fuentes')) c (col) cross join lateral (values ('de'), ('a')) l (lado)
     cross join lateral jsonb_each(case when jsonb_typeof(d.diff -> c.col -> l.lado) = 'object' then d.diff -> c.col -> l.lado else '{}'::jsonb end) k
  ),
  grupos as (
    select distinct k.key as id
      from d cross join lateral (values ('de'), ('a')) l (lado)
     cross join lateral jsonb_each(case when jsonb_typeof(d.diff -> 'totales' -> l.lado -> 'grupos') = 'object' then d.diff -> 'totales' -> l.lado -> 'grupos' else '{}'::jsonb end) k
  )
  select jsonb_build_object(
    'nodos', coalesce((select jsonb_object_agg(n.id, coalesce((select x ->> 'etiqueta' from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) x where x ->> 'id' = n.id limit 1), n.id))
                         from nodos n), '{}'::jsonb),
    'grupos', coalesce((select jsonb_object_agg(g.id, coalesce((select x ->> 'etiqueta' from jsonb_array_elements(coalesce(p_def -> 'grupos', '[]'::jsonb)) x where x ->> 'id' = g.id limit 1), g.id))
                          from grupos g), '{}'::jsonb));
$$;

revoke all on function public._revision_etiquetas(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public._revision_etiquetas(jsonb, jsonb) to service_role;

comment on function public._revision_etiquetas(jsonb, jsonb) is 'Las etiquetas de los nodos y los grupos que nombran los diffs de unas revisiones ya recortadas ({nodos: {id: etiqueta}, grupos: {id: etiqueta}}; sin etiqueta, el id). Pura y de nadie: la llama cotizacion_revisiones con la página que va a devolver.';

create or replace function public.cotizacion_revisiones(p_cotizacion uuid, p_antes bigint default null, p_tamano integer default null) returns jsonb
    language plpgsql stable security definer
    set search_path = ''
    as $$
declare
  v_formula uuid; v_def jsonb; v_vis jsonb; v_visibles text[]; v_ctx jsonb; v_legibles text[];
  v_n int := public._acotar_pagina(p_tamano, 20, 100);
  v_filas jsonb; v_hay boolean;
begin
  perform public.assert_activo();
  if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select c.formula_id into v_formula from public.cotizaciones c where c.id = p_cotizacion;
  select f.definicion, coalesce(f.visibilidad, '{}'::jsonb) into v_def, v_vis from public.formulas f where f.id = v_formula;
  v_visibles := coalesce(array(select n.nodo from public._nodos_visibles(v_formula) n), '{}');
  v_ctx := public._cotizacion_contexto(v_visibles, v_def, v_vis);
  v_legibles := coalesce(array(select a.attname::text from pg_attribute a
                                where a.attrelid = 'public.cotizaciones'::regclass and a.attnum > 0 and not a.attisdropped and has_column_privilege('authenticated', a.attrelid, a.attnum, 'select')), '{}');
  -- Una página y una de más, para saber si hay otra (cotizaciones_revisiones_cotizacion_idx). Con cursor y sin cursor son dos consultas.
  -- El autor, por la clave de `perfiles` (una fila por revisión de la página; `left join`: una revisión sin usuario sigue).
  if p_antes is null then
    select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'usuario_id', r.usuario_id, 'creado_en', r.creado_en,
                                                 'autor', case when r.usuario_id is not null then jsonb_build_object('id', r.usuario_id, 'nombre', nullif(btrim(p.nombre), '')) end,
                                                 'diff', public._cotizacion_diff_recortado(r.diff, v_ctx, v_legibles)) order by r.id desc), '[]'::jsonb),
           coalesce(count(*) > v_n, false)
      into v_filas, v_hay
      from (select x.id, x.usuario_id, x.creado_en, x.diff from public.cotizaciones_revisiones x where x.cotizacion_id = p_cotizacion order by x.id desc limit v_n + 1) r
      left join public.perfiles p on p.id = r.usuario_id;
  else
    select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'usuario_id', r.usuario_id, 'creado_en', r.creado_en,
                                                 'autor', case when r.usuario_id is not null then jsonb_build_object('id', r.usuario_id, 'nombre', nullif(btrim(p.nombre), '')) end,
                                                 'diff', public._cotizacion_diff_recortado(r.diff, v_ctx, v_legibles)) order by r.id desc), '[]'::jsonb),
           coalesce(count(*) > v_n, false)
      into v_filas, v_hay
      from (select x.id, x.usuario_id, x.creado_en, x.diff from public.cotizaciones_revisiones x where x.cotizacion_id = p_cotizacion and x.id < p_antes order by x.id desc limit v_n + 1) r
      left join public.perfiles p on p.id = r.usuario_id;
  end if;
  -- La de más no viaja: es sólo el aviso de que hay otra página.
  if v_hay then v_filas := v_filas - v_n; end if;
  -- Las etiquetas, de lo que ya viaja recortado en esta página.
  return jsonb_build_object('revisiones', v_filas, 'hay_mas', v_hay,
                            'siguiente', case when v_hay then (v_filas -> (jsonb_array_length(v_filas) - 1) ->> 'id')::bigint end,
                            'etiquetas', public._revision_etiquetas(v_def, v_filas));
end $$;

comment on function public.cotizacion_revisiones(uuid, bigint, integer) is 'Una página de revisiones de una cotización, de la más nueva a la más vieja, con cada diff recortado por nodo (la visibilidad de SU versión) y su autor ({id, nombre}); etiquetas de los nodos y grupos que nombran los diffs de la página. El cursor es el id de la última de la página anterior. docs/COTIZADOR.md › «En la base (4.10-1)».';
