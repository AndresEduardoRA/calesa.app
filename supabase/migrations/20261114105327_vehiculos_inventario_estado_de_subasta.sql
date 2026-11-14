-- La vista del inventario (B2, `docs/TANDA.md`): en un origen de subasta, la columna «Precio» muestra la puja (`atributos.puja_actual`) y la
-- marca «final» cuando la subasta terminó o se vendió. Para eso cada fila del inventario trae `estado_subasta`, como ya la trae la lectura
-- directa de la tabla. Es una columna más de la fila que la ruta ya leyó: ni un índice ni una lectura más.

CREATE OR REPLACE FUNCTION "public"."_vehiculos_inventario_sql"("p_filtros" "jsonb", "p_rutas" "text", "p_sentido" "text") RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $_$
declare
  v_cols constant text := 'v.id, v.numero, v.origen_id, v.titulo, v.marca, v.modelo, v.anio, v.vin, v.lote, v.plataforma, v.url_origen, v.precio, v.precio_negociable, '
    || 'v.acepta_permuta, v.placado, v.kilometraje, v.categoria_id, v.fase_id, v.atributos, v.lead_id, v.publicado_web, v.destacado_web, v.precio_web, v.precio_web_hasta, '
    || 'v.precio_web_nota, v.creado_por, v.creado_en, v.actualizado_en, v.estado_subasta';
  v_f jsonb := coalesce(p_filtros, '[]'::jsonb);
  v_d text; v_cursor text; v_pred text := ''; v_rutas text;
begin
  if p_rutas is null or p_rutas not in ('origen', 'propios') or p_sentido is null or p_sentido not in ('primera', 'siguiente', 'anterior') then
    raise exception 'La forma del inventario no es válida.' using errcode = '22023', hint = 'forma';
  end if;
  perform public._vehiculos_inventario_validar(v_f);
  for i in 0 .. jsonb_array_length(v_f) - 1 loop
    v_pred := v_pred || ' and ' || public._vehiculos_inventario_condicion(v_f -> i ->> 'tipo', v_f -> i ->> 'columna', i);
  end loop;
  v_d := case p_sentido when 'anterior' then 'asc' else 'desc' end;
  v_cursor := case p_sentido when 'siguiente' then ' and (v.creado_en, v.id) < ($5, $6)' when 'anterior' then ' and (v.creado_en, v.id) > ($5, $6)' else '' end;
  if p_rutas = 'origen' then
    -- R1: vehiculos_origen_listado_idx.
    v_rutas := format('(select %s, public.limpieza_el(v) as limpieza_el, false as releer from public.vehiculos v where v.origen_id = $2 and v.eliminado_en is null%s%s '
      || 'order by v.creado_en %s, v.id %s limit $3)', v_cols, v_cursor, v_pred, v_d, v_d);
  else
    -- R2: lo que creó quien mira, vehiculos_creador_idx. R3: su cartera que crearon otros (o nadie: `creado_por` admite nulo), un lateral por lead sobre vehiculos_lead_id_idx.
    v_rutas := format('(select %1$s, public.limpieza_el(v) as limpieza_el, false as releer from public.vehiculos v where v.creado_por = $4 and v.origen_id = $2 '
      || 'and v.eliminado_en is null%2$s%3$s order by v.creado_en %4$s, v.id %4$s limit $3) '
      || 'union all (select x.* from public.mis_leads() m (lead_id) cross join lateral (select %1$s, null::date as limpieza_el, true as releer from public.vehiculos v '
      || 'where v.lead_id = m.lead_id and v.origen_id = $2 '
      || 'and v.creado_por is distinct from $4 and v.eliminado_en is null%2$s%3$s order by v.creado_en %4$s, v.id %4$s limit $3) x)', v_cols, v_cursor, v_pred, v_d);
  end if;
  -- `limpieza_el` se calcula sobre la fila que la ruta ya leyó bajo la RLS: releerla por id paga otra pasada de la policy (sus InitPlans y un en_cartera por fila; Beto
  -- 10,3 → 8,6 ms, S0'' del 4.16-2a). R1 y R2 cortan en n + 1 antes de proyectar; R3 emite lo de toda la cartera, así que relee sólo las filas de la página, con una
  -- subconsulta escalar dentro de un `case` (sólo se evalúa si `releer`; una lateral con `where f.releer` relee igual). La portada, sólo para la página.
  return format('select %3$s, case when f.releer then (select public.limpieza_el(w) from public.vehiculos w where w.id = f.id) else f.limpieza_el end, p.ruta_miniatura '
    || 'from (select * from (%1$s) u order by u.creado_en %2$s, u.id %2$s limit $3) f '
    || 'left join lateral (select i.ruta_miniatura from public.vehiculos_imagenes i where i.vehiculo_id = f.id and i.es_portada limit 1) p on true '
    || 'order by f.creado_en %2$s, f.id %2$s', v_rutas, v_d, replace(v_cols, 'v.', 'f.'));
end $_$;
;

drop function public.vehiculos_inventario(uuid, integer, jsonb, timestamp with time zone, uuid, boolean);

CREATE FUNCTION "public"."vehiculos_inventario"("p_origen" "uuid", "p_tamano" integer DEFAULT NULL::integer, "p_filtros" "jsonb" DEFAULT '[]'::"jsonb", "p_cursor_en" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_cursor_id" "uuid" DEFAULT NULL::"uuid", "p_hacia_atras" boolean DEFAULT false) RETURNS TABLE("id" "uuid", "numero" bigint, "origen_id" "uuid", "titulo" "text", "marca" "text", "modelo" "text", "anio" smallint, "vin" "text", "lote" "text", "plataforma" "text", "url_origen" "text", "precio" numeric, "precio_negociable" boolean, "acepta_permuta" boolean, "placado" boolean, "kilometraje" integer, "categoria_id" "uuid", "fase_id" "uuid", "atributos" "jsonb", "lead_id" "uuid", "publicado_web" boolean, "destacado_web" boolean, "precio_web" numeric, "precio_web_hasta" numeric, "precio_web_nota" "text", "creado_por" "uuid", "creado_en" timestamp with time zone, "actualizado_en" timestamp with time zone, "estado_subasta" "public"."estado_subasta", "limpieza_el" "date", "portada_ruta" "text")
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
declare
  -- MAXIMO_DE_PAGINA_DE_VEHICULOS (src/modules/vehiculos/entities/vehiculo.ts), más una para saber si hay otra.
  v_n integer := public._acotar_pagina(p_tamano, 100, 100) + 1;
  v_uid uuid := (select auth.uid());
  v_filtros jsonb := coalesce(p_filtros, '[]'::jsonb);
  v_rutas text; v_sentido text; v_sql text;
begin
  if p_origen is null then
    raise exception 'Falta el origen del inventario.' using errcode = '22023', hint = 'origen';
  end if;
  if (p_cursor_en is null) <> (p_cursor_id is null) then
    raise exception 'El cursor del inventario está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  v_sentido := case when p_cursor_en is null then 'primera' when p_hacia_atras then 'anterior' else 'siguiente' end;
  if p_origen = any (public.origenes_con_alcance('vehiculos.ver', 'todos')) then
    v_rutas := 'origen';
  elsif p_origen = any (public.origenes_con_alcance('vehiculos.ver', 'propios')) then
    -- Con más de 5.000 leads en la cartera, lo de hoy: el origen, y la RLS pregunta en_cartera() por fila.
    v_rutas := case when public.leads_cartera_corta() then 'propios' else 'origen' end;
  end if;
  -- Los filtros se validan también sin ruta: un pedido que no vale falla igual para todos.
  v_sql := public._vehiculos_inventario_sql(v_filtros, coalesce(v_rutas, 'origen'), v_sentido);
  if v_rutas is null then
    return;
  end if;
  return query execute v_sql using v_filtros, p_origen, v_n, v_uid, p_cursor_en, p_cursor_id;
end $$;
;

COMMENT ON FUNCTION "public"."vehiculos_inventario"("p_origen" "uuid", "p_tamano" integer, "p_filtros" "jsonb", "p_cursor_en" timestamp with time zone, "p_cursor_id" "uuid", "p_hacia_atras" boolean) IS 'Una página del inventario de un origen, de lo más nuevo a lo más viejo (creado_en desc, id desc), por cursor (hacia atrás, en orden ascendente), con los filtros del layout (Condicion[]) y, por fila, limpieza_el, la portada y el estado de la subasta. Corre como quien la llama: la RLS decide qué se ve; cada ruta (el origen, lo creado, la cartera de mis_leads()) va por su índice con su propio limit. Lo mide supabase/tests/medir-vehiculos-inventario.sql.';

revoke all on function public.vehiculos_inventario(uuid, integer, jsonb, timestamp with time zone, uuid, boolean) from public, anon;
grant execute on function public.vehiculos_inventario(uuid, integer, jsonb, timestamp with time zone, uuid, boolean) to authenticated, service_role;

-- La vista del inventario que eligió cada persona (`vehiculos.vista`): tabla o tarjetas. Como «ítems por página», la base valida el valor.
alter table public.preferencias_usuario
  add constraint preferencias_vista_de_vehiculos_valida
  check (clave <> 'vehiculos.vista' or valor in ('"tabla"'::jsonb, '"tarjetas"'::jsonb));
