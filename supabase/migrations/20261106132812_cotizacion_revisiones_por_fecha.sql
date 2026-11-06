-- Las revisiones de una cotización desde una fecha (paso 4.17-5a, 4-75): `cotizacion_revisiones()` suma `p_hasta timestamptz` al final. Es un instante
-- EXCLUSIVO que sólo elige desde qué revisión empieza la página: la más nueva de ESA cotización con `creado_en < p_hasta` (el ancla); de ahí, la misma
-- página por id de siempre (`id <= ancla`, y `< p_antes` si llegó: gana el menor), con su `hay_mas`, `siguiente`, autor, recorte por nivel y etiquetas.
-- «Ver más» sigue con `p_antes = siguiente` y sin `p_hasta`. Sin ancla (nada antes de la fecha) la respuesta va vacía, sin leer la página. La base no
-- conoce zonas ni días: «ese día y lo anterior» lo arma la pantalla (4.17-5c) con el inicio del día siguiente en la zona de la empresa.
--
-- La guarda va primero, con o sin `p_hasta` (`assert_activo()` y `puede_cotizacion(…, 'cotizaciones.ver')`): ningún camino lee una revisión antes de ella,
-- el ancla incluida; quien no ve la cotización recibe el 42501 de una que no existe. `p_hasta` no abre ni cierra nada que `p_antes` no abriera.
--
-- Lo sostiene `cotizaciones_revisiones_cotizacion_creado_idx (cotizacion_id, creado_en desc, id desc)`: el ancla es un solo salto por el índice, a cualquier
-- profundidad; la página sigue por `cotizaciones_revisiones_cotizacion_idx`.
--
-- Se supone que, por cotización, el orden por `id` es el de `creado_en` (`cotizacion_guardar` toma la fila con candado antes de comparar la versión: dos
-- guardados que se cruzan no dejan dos revisiones). No vale para los caminos que escriben sin versión (`cotizacion_moderar`, `cotizacion_marcar_final`,
-- `papelera_enviar`, `papelera_restaurar`, `_vehiculo_a_lote`, `vehiculos_papelera_restaurar`): `creado_en` es el `now()` del inicio de la transacción y
-- una que espera el candado puede dejar un id mayor con una hora menor, a lo sumo por lo que dura. Con `p_hasta`, una revisión de esa ventana puede quedar
-- del otro lado del salto; ninguna se pierde ni se repite (la página va por id). Es el abierto 4-95.
--
-- Una sola firma: se borra la de 3 argumentos y se crea la de 4 (un `create or replace` con otro argumento dejaría dos sobrecargas). Definidora, con
-- `search_path` vacío y los mismos grants.

create index cotizaciones_revisiones_cotizacion_creado_idx on public.cotizaciones_revisiones (cotizacion_id, creado_en desc, id desc);

drop function public.cotizacion_revisiones(uuid, bigint, integer);

create function public.cotizacion_revisiones(p_cotizacion uuid, p_antes bigint default null, p_tamano integer default null, p_hasta timestamptz default null) returns jsonb
    language plpgsql stable security definer
    set search_path = ''
    as $$
declare
  v_formula uuid; v_def jsonb; v_vis jsonb; v_visibles text[]; v_ctx jsonb; v_legibles text[];
  v_n int := public._acotar_pagina(p_tamano, 20, 100);
  v_filas jsonb; v_hay boolean;
  v_ancla bigint; v_tope bigint := p_antes;
begin
  perform public.assert_activo();
  if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  -- El ancla (cotizaciones_revisiones_cotizacion_creado_idx): la más nueva de ESTA cotización antes del instante. Sin ella no hay nada que leer.
  if p_hasta is not null then
    select x.id into v_ancla from public.cotizaciones_revisiones x
     where x.cotizacion_id = p_cotizacion and x.creado_en < p_hasta order by x.creado_en desc, x.id desc limit 1;
    if v_ancla is null then
      return jsonb_build_object('revisiones', '[]'::jsonb, 'hay_mas', false, 'siguiente', null,
                                'etiquetas', jsonb_build_object('nodos', '{}'::jsonb, 'grupos', '{}'::jsonb));
    end if;
    -- La página empieza en el ancla (inclusive) y, si llegó un cursor, en el menor de los dos.
    v_tope := least(coalesce(p_antes, v_ancla + 1), v_ancla + 1);
  end if;
  select c.formula_id into v_formula from public.cotizaciones c where c.id = p_cotizacion;
  select f.definicion, coalesce(f.visibilidad, '{}'::jsonb) into v_def, v_vis from public.formulas f where f.id = v_formula;
  v_visibles := coalesce(array(select n.nodo from public._nodos_visibles(v_formula) n), '{}');
  v_ctx := public._cotizacion_contexto(v_visibles, v_def, v_vis);
  v_legibles := coalesce(array(select a.attname::text from pg_attribute a
                                where a.attrelid = 'public.cotizaciones'::regclass and a.attnum > 0 and not a.attisdropped and has_column_privilege('authenticated', a.attrelid, a.attnum, 'select')), '{}');
  -- Una página y una de más, para saber si hay otra (cotizaciones_revisiones_cotizacion_idx). Con cursor y sin cursor son dos consultas.
  -- El autor, por la clave de `perfiles` (una fila por revisión de la página; `left join`: una revisión sin usuario sigue).
  if v_tope is null then
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
      from (select x.id, x.usuario_id, x.creado_en, x.diff from public.cotizaciones_revisiones x where x.cotizacion_id = p_cotizacion and x.id < v_tope order by x.id desc limit v_n + 1) r
      left join public.perfiles p on p.id = r.usuario_id;
  end if;
  -- La de más no viaja: es sólo el aviso de que hay otra página.
  if v_hay then v_filas := v_filas - v_n; end if;
  -- Las etiquetas, de lo que ya viaja recortado en esta página.
  return jsonb_build_object('revisiones', v_filas, 'hay_mas', v_hay,
                            'siguiente', case when v_hay then (v_filas -> (jsonb_array_length(v_filas) - 1) ->> 'id')::bigint end,
                            'etiquetas', public._revision_etiquetas(v_def, v_filas));
end $$;

revoke all on function public.cotizacion_revisiones(uuid, bigint, integer, timestamptz) from public, anon;
grant execute on function public.cotizacion_revisiones(uuid, bigint, integer, timestamptz) to authenticated, service_role;

comment on function public.cotizacion_revisiones(uuid, bigint, integer, timestamptz) is 'Una página de revisiones de una cotización, de la más nueva a la más vieja, con cada diff recortado por nodo (la visibilidad de SU versión) y su autor ({id, nombre}); etiquetas de los nodos y grupos que nombran los diffs de la página. El cursor es el id de la última de la página anterior. Con p_hasta (un instante, exclusivo) empieza en la más nueva de esa cotización con creado_en < p_hasta, por cotizaciones_revisiones_cotizacion_creado_idx; sin ninguna, va vacía. Supone que el id crece con creado_en (4-95: los caminos sin versión pueden invertirlo dentro de una ventana). docs/COTIZADOR.md › «En la base (4.10-1)».';
