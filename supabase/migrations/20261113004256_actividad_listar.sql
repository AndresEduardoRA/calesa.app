-- Actividad: la página de `/actividad` por cursor sobre `id` y por filtro (paso 9.01-1). Una ruta por filtro, cada una con su `order by id desc
-- limit n + 1` y su índice: registro (tabla, registro_id, id desc), persona (actor_id, id desc), acción (accion, id desc), tabla (tabla, id desc) y
-- sin filtro (la PK). Combinados, va la ruta más selectiva (registro > persona > acción > tabla) y el resto filtra sobre ella: el descarte lo acota
-- la retención (`actividad_dias`, máx. 365). «Ir a una fecha» ancla por `actividad_fecha_idx`. Cada fila trae la cabecera, si se ve y, de un
-- cambio que se ve, los nombres de hasta 5 campos que cambiaron (con `_actividad_recortar`, sobre la fila ya leída): nunca un valor ni `detalle`.

create index actividad_actor_id_idx on public.actividad (actor_id, id desc);
create index actividad_tabla_id_idx on public.actividad (tabla, id desc);
create index actividad_accion_id_idx on public.actividad (accion, id desc);
-- Sirve su prefijo (tabla, registro_id) a quien lo usaba y además el `order by id desc limit 1` de las que buscan el último cambio de un registro.
create index actividad_registro_id_idx on public.actividad (tabla, registro_id, id desc);
drop index public.actividad_registro_idx;

create function public.actividad_listar(
  p_antes_id bigint default null,
  p_tamano int default null,
  p_actor uuid default null,
  p_tabla text default null,
  p_registro text default null,
  p_hasta timestamptz default null,
  p_accion text default null
) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_n int := public._acotar_pagina(p_tamano, 20, 100);
  v_antes bigint := p_antes_id;
  v_t timestamptz;
  v_filas public.actividad[];
  v_salida jsonb;
begin
  if not public.tiene_permiso('actividad.ver') then
    raise exception 'No tienes permiso para ver la actividad.' using errcode = '42501';
  end if;
  if p_registro is not null and p_tabla is null then
    raise exception 'Para filtrar por un registro hace falta su entidad.' using errcode = '22023', hint = 'registro';
  end if;
  if v_antes is null and p_hasta is not null then
    -- actividad_fecha_idx: la última fila antes de esa hora y, de las que comparten su hora (una transacción escribe varias con el mismo now()),
    -- la de id mayor, para no perder ninguna.
    select a.creado_en into v_t from public.actividad a where a.creado_en < p_hasta order by a.creado_en desc limit 1;
    if v_t is null then
      return jsonb_build_object('hay_mas', false, 'filas', '[]'::jsonb);
    end if;
    select a.id + 1 into v_antes from public.actividad a where a.creado_en = v_t order by a.id desc limit 1;
  end if;
  v_antes := coalesce(v_antes, 9223372036854775807);

  if p_registro is not null then
    -- actividad_registro_id_idx (tabla, registro_id, id desc)
    v_filas := array(
      select a from public.actividad a
       where a.tabla = p_tabla and a.registro_id = p_registro and a.id < v_antes
         and (p_actor is null or a.actor_id = p_actor) and (p_accion is null or a.accion = p_accion)
       order by a.id desc limit v_n + 1);
  elsif p_actor is not null then
    -- actividad_actor_id_idx (actor_id, id desc)
    v_filas := array(
      select a from public.actividad a
       where a.actor_id = p_actor and a.id < v_antes
         and (p_tabla is null or a.tabla = p_tabla) and (p_accion is null or a.accion = p_accion)
       order by a.id desc limit v_n + 1);
  elsif p_accion is not null then
    -- actividad_accion_id_idx (accion, id desc)
    v_filas := array(
      select a from public.actividad a
       where a.accion = p_accion and a.id < v_antes and (p_tabla is null or a.tabla = p_tabla)
       order by a.id desc limit v_n + 1);
  elsif p_tabla is not null then
    -- actividad_tabla_id_idx (tabla, id desc)
    v_filas := array(
      select a from public.actividad a
       where a.tabla = p_tabla and a.id < v_antes
       order by a.id desc limit v_n + 1);
  else
    -- actividad_pkey
    v_filas := array(
      select a from public.actividad a
       where a.id < v_antes
       order by a.id desc limit v_n + 1);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', f.id, 'accion', f.accion, 'tabla', f.tabla, 'registro_id', f.registro_id, 'actor_id', f.actor_id,
           'actor_nombre', nullif(btrim(p.nombre), ''), 'creado_en', f.creado_en,
           'visible', r.visible,
           'campos', to_jsonb(coalesce(c.claves[1:5], '{}'::text[])),
           'mas_campos', coalesce(cardinality(c.claves), 0) > 5
         ) order by f.id desc), '[]'::jsonb)
    into v_salida
    from unnest(v_filas[1:v_n]) f
    left join public.perfiles p on p.id = f.actor_id
   cross join lateral (select public._actividad_recortar(f.tabla, f.registro_id, f.antes, f.despues) as v) x
   cross join lateral (select coalesce((x.v ->> 'visible')::boolean, false) as visible) r
   cross join lateral (
     select case when r.visible and f.accion like '%.update'
                 then array(select k from jsonb_object_keys(x.v -> 'cambios') k order by k limit 6)
                 else '{}'::text[] end as claves
   ) c;

  return jsonb_build_object('hay_mas', coalesce(cardinality(v_filas), 0) > v_n, 'filas', v_salida);
end;
$$;

revoke all on function public.actividad_listar(bigint, int, uuid, text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.actividad_listar(bigint, int, uuid, text, text, timestamptz, text) to authenticated, service_role;

comment on function public.actividad_listar(bigint, int, uuid, text, text, timestamptz, text) is
  'La página de /actividad (9.01-1): por cursor sobre id, una ruta por filtro con su índice, tamaño por _acotar_pagina (20, máx. 100), «Ir a una fecha» por actividad_fecha_idx. Pide actividad.ver (42501). Cada fila: cabecera, visible y hasta 5 campos que cambiaron; nunca un valor ni detalle.';
