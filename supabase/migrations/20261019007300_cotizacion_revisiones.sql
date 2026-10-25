-- Las revisiones de una cotización se leen recortadas por nodo (paso 4.10, prompt 1; D7: «lo que no se ve no viaja»).
--
-- `cotizaciones_revisiones.diff` guarda, por cada columna que cambió, `{de, a}`: para `valores`, `fuentes`, `totales` y `tipos_cambio` son dos snapshots enteros. `…006800` cerró su lectura
-- directa; `cotizacion_revisiones()` es el camino que queda, una página a la vez, con el mismo recorte que `cotizacion_leer()`:
--   - las columnas legibles de la fila (`has_column_privilege`: el grant es la única fuente) viajan tal cual;
--   - `valores` y `fuentes`, sólo los nodos que se ven (y el total y lo aparte), tanto en `de` como en `a`; `totales` y `tipos_cambio`, con la regla de `_cotizacion_recorte()`;
--   - si lo que cambió son sólo nodos que no se ven, la columna no figura (que figure delataría que algo cambió); una revisión que sólo cambió lo oculto viaja con `diff: {}`: se sabe
--     quién y cuándo, no qué;
--   - cualquier otra clave del `diff` no viaja (falla cerrada).
-- Se lee con la visibilidad de la versión de la fórmula de LA COTIZACIÓN, igual que `cotizacion_leer()`, y `_nodos_visibles()` se llama una vez por llamada.
--
-- Paginada por cursor sobre el id (los más nuevos primero): `p_tamano` pasa por `_acotar_pagina()` (20 por omisión, 100 como máximo) y `p_antes` es el id de la última revisión de la página
-- anterior. Dos consultas, con cursor y sin él (`.claude/rules/escala.md`), por el índice nuevo `cotizaciones_revisiones_cotizacion_idx`: la FK no tenía ninguno.

create index if not exists cotizaciones_revisiones_cotizacion_idx on public.cotizaciones_revisiones (cotizacion_id, id desc);

-- El recorte de UN diff: puro y de nadie. `p_ctx` es el de `_cotizacion_contexto()` (se arma una vez por llamada) y `p_legibles`, las columnas de la fila que `authenticated` lee.
create or replace function public._cotizacion_diff_recortado(p_diff jsonb, p_ctx jsonb, p_legibles text[])
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_out jsonb := '{}'::jsonb; e record; v_de jsonb; v_a jsonb;
begin
  if jsonb_typeof(p_diff) is distinct from 'object' then return '{}'::jsonb; end if;
  for e in select d.key, d.value from jsonb_each(p_diff) d loop
    if e.key = any (p_legibles) then
      v_out := v_out || jsonb_build_object(e.key, e.value);
    elsif e.key in ('valores', 'fuentes', 'totales', 'tipos_cambio') and jsonb_typeof(e.value) = 'object' then
      v_de := public._cotizacion_recorte(jsonb_build_object(e.key, e.value -> 'de'), p_ctx) -> e.key;
      v_a := public._cotizacion_recorte(jsonb_build_object(e.key, e.value -> 'a'), p_ctx) -> e.key;
      if v_de is distinct from v_a then
        v_out := v_out || jsonb_build_object(e.key, jsonb_build_object('de', v_de, 'a', v_a));
      end if;
    end if;
  end loop;
  return v_out;
end $$;
revoke all on function public._cotizacion_diff_recortado(jsonb, jsonb, text[]) from public, anon, authenticated;
comment on function public._cotizacion_diff_recortado(jsonb, jsonb, text[]) is
  'El diff de una revisión sin lo que quien lee no ve (las columnas legibles tal cual; valores, fuentes, totales y tipos_cambio por _cotizacion_recorte; si sólo cambió lo oculto, la columna no figura). De nadie.';

create or replace function public.cotizacion_revisiones(p_cotizacion uuid, p_antes bigint default null, p_tamano int default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
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
  if p_antes is null then
    select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'usuario_id', r.usuario_id, 'creado_en', r.creado_en,
                                                 'diff', public._cotizacion_diff_recortado(r.diff, v_ctx, v_legibles)) order by r.id desc), '[]'::jsonb),
           coalesce(count(*) > v_n, false)
      into v_filas, v_hay
      from (select x.id, x.usuario_id, x.creado_en, x.diff from public.cotizaciones_revisiones x where x.cotizacion_id = p_cotizacion order by x.id desc limit v_n + 1) r;
  else
    select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'usuario_id', r.usuario_id, 'creado_en', r.creado_en,
                                                 'diff', public._cotizacion_diff_recortado(r.diff, v_ctx, v_legibles)) order by r.id desc), '[]'::jsonb),
           coalesce(count(*) > v_n, false)
      into v_filas, v_hay
      from (select x.id, x.usuario_id, x.creado_en, x.diff from public.cotizaciones_revisiones x where x.cotizacion_id = p_cotizacion and x.id < p_antes order by x.id desc limit v_n + 1) r;
  end if;
  -- La de más no viaja: es sólo el aviso de que hay otra página.
  if v_hay then v_filas := v_filas - v_n; end if;
  return jsonb_build_object('revisiones', v_filas, 'hay_mas', v_hay,
                            'siguiente', case when v_hay then (v_filas -> (jsonb_array_length(v_filas) - 1) ->> 'id')::bigint end);
end $$;
revoke all on function public.cotizacion_revisiones(uuid, bigint, int) from public, anon;
grant execute on function public.cotizacion_revisiones(uuid, bigint, int) to authenticated;
comment on function public.cotizacion_revisiones(uuid, bigint, int) is
  'Una página de revisiones de una cotización, de la más nueva a la más vieja, con cada diff recortado por nodo (la visibilidad de SU versión). El cursor es el id de la última de la página anterior. docs/COTIZADOR.md › «En la base (4.10-1)».';
