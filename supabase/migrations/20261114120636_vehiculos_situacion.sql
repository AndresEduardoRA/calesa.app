-- La situación real de un vehículo: una sola columna que calcula la base (`vehiculos.situacion`), con cuatro valores:
--   en_subasta   su subasta está viva (abierta o en vivo, sin cierre o con el cierre en el futuro) dentro del tramo de subasta;
--   sin_resolver la subasta cerró (terminada, vendida, o viva con el cierre pasado) y sigue en el tramo sin resultado;
--   no_ganada    alguien la marcó «No la ganamos» (`subasta_resultado`): deja de contar;
--   fase         en cualquier otro caso, la situación es su fase.
-- El tramo de subasta: estar en una fase con `es_subasta`, o no tener fase en un origen cuyo flujo tiene alguna (aunque esté jubilada).
-- Nada se mueve solo: el resultado («La ganamos» / «No la ganamos») lo escriben RPC aparte, con constancia en `actividad`.
-- La calcula el trigger `trg_0_situacion` (antes de `trg_actualizado_en`, que ya ve el valor final); cambiar la situación o el resultado sin tocar
-- la subasta no mueve la versión ni se audita. El tiempo lo cubre el job `situacion-al-cerrar` (cada 10 min); cambiar `es_subasta` lo cubre
-- `trg_fase_situacion`. Si la subasta vuelve a estar viva (refrescar trae una nueva), el resultado anterior se limpia.
-- Pruebas: supabase/tests/areas/situacion/regla.sql, vehiculos-inventario-forma.sql, vehiculos-inventario-filtros.sql; medición: medir-jobs.sql y
-- medir-vehiculos-inventario.sql.

-- 1. Columnas.
alter table public.vehiculos
  add column situacion text not null default 'fase',
  add column subasta_resultado text,
  add column subasta_resuelta_por uuid references public.perfiles (id) on delete set null,
  add column subasta_resuelta_en timestamp with time zone,
  add constraint vehiculos_situacion_check check (situacion in ('en_subasta', 'sin_resolver', 'no_ganada', 'fase')),
  add constraint vehiculos_subasta_resultado_check check (subasta_resultado in ('ganada', 'no_ganada')),
  add constraint vehiculos_subasta_resuelta_coherente check ((subasta_resultado is null) = (subasta_resuelta_en is null));

comment on column public.vehiculos.situacion is 'La situación real: en_subasta | sin_resolver | no_ganada | fase. La calcula trg_0_situacion con _vehiculo_situacion() (y el job situacion-al-cerrar cuando vence el cierre): nadie la escribe a mano. Cambiarla sin tocar la subasta no mueve actualizado_en ni se audita.';
comment on column public.vehiculos.subasta_resultado is 'ganada | no_ganada: lo escriben vehiculo_subasta_ganada() y vehiculo_subasta_no_ganada() (constancia en actividad). Nunca se infiere de apibara («vendida» no es ganada). Se limpia si la subasta vuelve a estar viva.';
comment on column public.vehiculos.subasta_resuelta_por is 'Quién resolvió la subasta (nulo si se borró su perfil).';
comment on column public.vehiculos.subasta_resuelta_en is 'Cuándo se resolvió la subasta: existe si y sólo si hay subasta_resultado.';

create index vehiculos_subasta_resuelta_por_idx on public.vehiculos (subasta_resuelta_por) where subasta_resuelta_por is not null;

-- 2. La regla, con escalares (una fila como único argumento la expondría PostgREST como columna calculada).
create or replace function public._vehiculo_situacion(p_origen uuid, p_fase uuid, p_estado public.estado_subasta, p_cierre timestamp with time zone,
  p_resultado text) returns text
    language plpgsql stable security definer
    set search_path = ''
    as $$
declare
  v_tramo boolean;
  v_viva boolean := coalesce(p_estado in ('abierta', 'en_vivo'), false);
begin
  if p_resultado = 'no_ganada' then
    return 'no_ganada';
  end if;
  if p_fase is not null then
    v_tramo := coalesce((select f.es_subasta from public.fases f where f.id = p_fase), false);
  else
    v_tramo := exists (select 1 from public.flujos fl join public.fases f on f.flujo_id = fl.id
                        where fl.ambito = 'vehiculos' and fl.origen_id = p_origen and f.es_subasta);
  end if;
  if not v_tramo then
    return 'fase';
  end if;
  if v_viva and (p_cierre is null or p_cierre > now()) then
    return 'en_subasta';
  end if;
  if p_resultado = 'ganada' then
    return 'fase';
  end if;
  if v_viva or coalesce(p_estado in ('terminada', 'vendida'), false) then
    return 'sin_resolver';
  end if;
  return 'fase';
end $$;

revoke all on function public._vehiculo_situacion(uuid, uuid, public.estado_subasta, timestamp with time zone, text) from public, anon, authenticated;
grant execute on function public._vehiculo_situacion(uuid, uuid, public.estado_subasta, timestamp with time zone, text) to service_role;

comment on function public._vehiculo_situacion(uuid, uuid, public.estado_subasta, timestamp with time zone, text) is 'La situación real de un vehículo (en orden): no_ganada si se marcó así; fase fuera del tramo de subasta (fase con es_subasta, o sin fase en un origen cuyo flujo tiene alguna); en_subasta con la subasta viva y el cierre en el futuro o sin cierre; fase si se ganó; sin_resolver con la subasta cerrada (terminada, vendida o viva con el cierre pasado); fase en lo demás. p_cierre es coalesce(subasta_fin_en, subasta_en).';

-- 3. Las guardas antes que el trigger y el relleno: cambiar la situación o el resultado sin tocar la subasta (apibara_sync_en, estado_subasta,
-- subasta_en, subasta_fin_en) no mueve la versión ni se audita (como mover). El refresco (siempre cambia apibara_sync_en) y editar las fechas
-- de la subasta en la ficha (vehiculo_guardar) siguen moviendo la versión y auditando.
create or replace trigger trg_actualizado_en before update on public.vehiculos for each row
  when (not (old.cotizado_en is distinct from new.cotizado_en) and not (old.fase_id is distinct from new.fase_id)
        and not (old.fase_desde is distinct from new.fase_desde)
        and not ((old.situacion is distinct from new.situacion or old.subasta_resultado is distinct from new.subasta_resultado)
                 and not (old.apibara_sync_en is distinct from new.apibara_sync_en) and not (old.estado_subasta is distinct from new.estado_subasta)
                 and not (old.subasta_en is distinct from new.subasta_en) and not (old.subasta_fin_en is distinct from new.subasta_fin_en)))
  execute function public.set_actualizado_en();

create or replace trigger trg_auditar_cambio after update on public.vehiculos for each row
  when (not (old.cotizado_en is distinct from new.cotizado_en) and not (old.fase_id is distinct from new.fase_id)
        and not (old.fase_desde is distinct from new.fase_desde)
        and not ((old.situacion is distinct from new.situacion or old.subasta_resultado is distinct from new.subasta_resultado)
                 and not (old.apibara_sync_en is distinct from new.apibara_sync_en) and not (old.estado_subasta is distinct from new.estado_subasta)
                 and not (old.subasta_en is distinct from new.subasta_en) and not (old.subasta_fin_en is distinct from new.subasta_fin_en)))
  execute function public.auditar();

-- 4. El trigger que la calcula. `trg_0_situacion` corre después de `trg_0_fase_desde_coherente` y antes de `trg_actualizado_en` (orden alfabético).
-- `cierre_subasta_en` es generada y en un BEFORE todavía no existe: se calcula de subasta_fin_en y subasta_en.
create or replace function public.vehiculo_situacion_calcular() returns trigger
    language plpgsql security definer
    set search_path = ''
    as $$
declare
  v_cierre timestamp with time zone := coalesce(new.subasta_fin_en, new.subasta_en);
begin
  -- Vuelta a subasta: con la subasta viva otra vez, el resultado anterior ya no vale.
  if new.subasta_resultado is not null and coalesce(new.estado_subasta in ('abierta', 'en_vivo'), false)
     and (v_cierre is null or v_cierre > now()) then
    new.subasta_resultado := null;
    new.subasta_resuelta_por := null;
    new.subasta_resuelta_en := null;
  end if;
  new.situacion := public._vehiculo_situacion(new.origen_id, new.fase_id, new.estado_subasta, v_cierre, new.subasta_resultado);
  return new;
end $$;

revoke all on function public.vehiculo_situacion_calcular() from public, anon, authenticated;
grant execute on function public.vehiculo_situacion_calcular() to service_role;

create trigger trg_0_situacion before insert or update of origen_id, fase_id, estado_subasta, subasta_en, subasta_fin_en, subasta_resultado, situacion
  on public.vehiculos for each row execute function public.vehiculo_situacion_calcular();

-- 5. Cambiar qué fase es la subasta recalcula los vehículos de esa fase y los «sin fase» del origen (también los de la papelera). Las condiciones
-- van adentro: un trigger de insert no puede nombrar `old` en su WHEN. Sólo cambia `situacion`: el WHEN del paso 3 lo deja sin versión ni auditoría.
create or replace function public.fase_situacion_recalcular() returns trigger
    language plpgsql security definer
    set search_path = ''
    as $$
declare
  v_fase uuid;
  v_flujo uuid;
  v_origen uuid;
begin
  if tg_op = 'INSERT' then
    if not new.es_subasta then return null; end if;
    v_fase := new.id; v_flujo := new.flujo_id;
  elsif tg_op = 'UPDATE' then
    if new.es_subasta = old.es_subasta then return null; end if;
    v_fase := new.id; v_flujo := new.flujo_id;
  else
    if not old.es_subasta then return null; end if;
    v_flujo := old.flujo_id;
  end if;
  select fl.origen_id into v_origen from public.flujos fl where fl.id = v_flujo and fl.ambito = 'vehiculos';
  if v_origen is null then
    return null;
  end if;
  if v_fase is not null then
    -- vehiculos_fase_id_idx.
    update public.vehiculos v
       set situacion = public._vehiculo_situacion(v.origen_id, v.fase_id, v.estado_subasta, coalesce(v.subasta_fin_en, v.subasta_en), v.subasta_resultado)
     where v.fase_id = v_fase
       and public._vehiculo_situacion(v.origen_id, v.fase_id, v.estado_subasta, coalesce(v.subasta_fin_en, v.subasta_en), v.subasta_resultado)
           is distinct from v.situacion;
  end if;
  -- vehiculos_cadena_idx: origen_id fijo, fase_id is null.
  update public.vehiculos v
     set situacion = public._vehiculo_situacion(v.origen_id, v.fase_id, v.estado_subasta, coalesce(v.subasta_fin_en, v.subasta_en), v.subasta_resultado)
   where v.origen_id = v_origen and v.fase_id is null
     and public._vehiculo_situacion(v.origen_id, v.fase_id, v.estado_subasta, coalesce(v.subasta_fin_en, v.subasta_en), v.subasta_resultado)
         is distinct from v.situacion;
  return null;
end $$;

revoke all on function public.fase_situacion_recalcular() from public, anon, authenticated;
grant execute on function public.fase_situacion_recalcular() to service_role;

create trigger trg_fase_situacion after insert or update of es_subasta or delete on public.fases
  for each row execute function public.fase_situacion_recalcular();

-- 6. Contar y filtrar por situación en un origen (el job; el filtro del listado): sólo lo que no es su fase.
create index vehiculos_situacion_idx on public.vehiculos (origen_id, situacion, creado_en desc, id desc)
  where eliminado_en is null and situacion <> 'fase';

comment on index public.vehiculos_situacion_idx is 'La situación por origen, sin las que son su fase: el job situacion-al-cerrar recorre las en_subasta de un origen.';

-- 7. El tiempo: una subasta en_subasta cuyo cierre ya pasó pasa a sin_resolver (o a fase) sin que nadie la toque. De a un origen de subasta,
-- hasta 500 por corrida, sin esperar a quien tiene una fila tomada. Sin candidatas no escribe (el trigger por sentencia de la vitrina no se despierta).
create or replace function public.vehiculos_situacion_al_cerrar() returns integer
    language plpgsql security definer
    set search_path = ''
    as $$
declare
  v_resto integer := 500;
  v_total integer := 0;
  v_n integer;
  v_ids uuid[];
  v_origen uuid;
begin
  for v_origen in select o.id from public.origenes o where o.tipo = 'subasta' order by o.id loop
    exit when v_resto <= 0;
    -- vehiculos_situacion_idx: (origen_id, situacion) fijos.
    select array_agg(x.id) into v_ids
      from (select v.id from public.vehiculos v
             where v.origen_id = v_origen and v.situacion = 'en_subasta' and v.eliminado_en is null
               and coalesce(v.subasta_fin_en, v.subasta_en) <= now()
             limit v_resto for no key update skip locked) x;
    continue when v_ids is null;
    update public.vehiculos v
       set situacion = public._vehiculo_situacion(v.origen_id, v.fase_id, v.estado_subasta, coalesce(v.subasta_fin_en, v.subasta_en), v.subasta_resultado)
     where v.id = any (v_ids);
    get diagnostics v_n = row_count;
    v_total := v_total + v_n;
    v_resto := v_resto - v_n;
  end loop;
  return v_total;
end $$;

revoke all on function public.vehiculos_situacion_al_cerrar() from public, anon, authenticated;
grant execute on function public.vehiculos_situacion_al_cerrar() to service_role;

comment on function public.vehiculos_situacion_al_cerrar() is 'Job situacion-al-cerrar (cada 10 min): recalcula hasta 500 vehículos en_subasta cuyo cierre ya pasó, origen de subasta por origen sobre vehiculos_situacion_idx, con skip locked. Devuelve cuántos recalculó.';

select cron.schedule('situacion-al-cerrar', '*/10 * * * *', 'select public.vehiculos_situacion_al_cerrar()');

-- 8. Limpieza: una subasta sin resolver o ganada es un ancla.
CREATE OR REPLACE FUNCTION "public"."_limpieza_ancla"("v" "public"."vehiculos") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if exists (select 1 from public.vehiculos_conservados c where c.vehiculo_id = v.id) then return 'conservar'; end if;
  if v.lead_id is not null then return 'vinculo'; end if;
  -- Una subasta sin resolver o ganada no se limpia por error: alguien tiene que decidir (o ya decidió que es nuestra).
  if v.situacion = 'sin_resolver' then return 'sin_resolver'; end if;
  if v.subasta_resultado = 'ganada' then return 'ganada'; end if;
  if v.fase_id is not null and exists (select 1 from public.fases f where f.id = v.fase_id and not f.es_inicial) then
    return 'fase';
  end if;
  -- Cuentan todas las filas, también las borradas: la purga las llevaría en cascada.
  if exists (select 1 from public.documentos d where d.vehiculo_id = v.id) then return 'documentos'; end if;
  if exists (select 1 from public.gastos g where g.vehiculo_id = v.id) then return 'gastos'; end if;
  if exists (select 1 from public.pagos p where p.vehiculo_id = v.id) then return 'pagos'; end if;
  if v.publicado_web then return 'vitrina'; end if;
  -- Una cotización final activa y viva (el predicado de `cotizaciones_final_por_vehiculo`, que la sostiene).
  if exists (select 1 from public.cotizaciones c
              where c.vehiculo_id = v.id and c.clase = 'final' and c.estado = 'activa' and c.eliminado_en is null) then
    return 'cotizacion_final';
  end if;
  -- Lo demás que la papelera manual rechaza (comprobante, declaración aduanera, repuestos): la
  -- limpieza nunca intenta lo que la puerta de siempre cerraría.
  if public._vehiculo_motivo_de_bloqueo(v, true) is not null then return 'bloqueo'; end if;
  return null;
end;
$$;

revoke all on function public._limpieza_ancla(public.vehiculos) from public, anon, authenticated;
grant execute on function public._limpieza_ancla(public.vehiculos) to service_role;

-- 9. Inventario: la condición situacion_fuera_de (sus dos copias: ésta y aplicarCondiciones de src/modules/vehiculos/infra/queries/condiciones.ts) y la columna.
CREATE OR REPLACE FUNCTION "public"."_vehiculos_inventario_validar"("p_filtros" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $_$
declare
  c jsonb; v_t text; v_ok boolean; v_total integer := 0; v_arr text;
  v_uuid constant text := '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$';
  v_clave constant text := '^[a-z][a-z0-9_]{1,40}$';
begin
  -- Un `or` o un `and` de SQL no fija el orden: lo que sólo vale tras comprobar el tipo va en un `case`.
  v_ok := case when jsonb_typeof(p_filtros) = 'array' then jsonb_array_length(p_filtros) <= 100 else false end;
  for c in select x from jsonb_array_elements(case when v_ok then p_filtros else '[]' end) x loop
    exit when not v_ok;
    v_t := case when jsonb_typeof(c) = 'object' then c ->> 'tipo' end;
    v_ok := case v_t
      when 'busqueda' then jsonb_typeof(c -> 'texto') = 'string'
      when 'columna_en' then c ->> 'columna' in ('fase_id', 'categoria_id') and jsonb_typeof(c -> 'valores') = 'array' and jsonb_typeof(c -> 'incluirNulo') = 'boolean'
      when 'columna_rango' then c ->> 'columna' = 'anio' and jsonb_typeof(coalesce(c -> 'min', 'null')) in ('number', 'null') and jsonb_typeof(coalesce(c -> 'max', 'null')) in ('number', 'null')
      when 'en_vitrina' then jsonb_typeof(c -> 'valor') = 'boolean' and jsonb_typeof(c -> 'fases') = 'array'
      when 'por_limpiar' then jsonb_typeof(c -> 'valor') = 'boolean' and jsonb_typeof(c -> 'hasta') = 'string' and c ->> 'hasta' ~ '^\d{4}-\d{2}-\d{2}$'
      when 'atributos_contienen' then jsonb_typeof(c -> 'alternativas') = 'array'
      when 'atributo_rango_numero' then c ->> 'clave' ~ v_clave and jsonb_typeof(c -> 'clave') = 'string'
        and jsonb_typeof(coalesce(c -> 'min', 'null')) in ('number', 'null') and jsonb_typeof(coalesce(c -> 'max', 'null')) in ('number', 'null')
      when 'atributo_rango_texto' then c ->> 'clave' ~ v_clave and jsonb_typeof(c -> 'clave') = 'string'
        and jsonb_typeof(coalesce(c -> 'desde', 'null')) in ('string', 'null') and jsonb_typeof(coalesce(c -> 'antesDe', 'null')) in ('string', 'null')
      when 'atributo_texto' then c ->> 'clave' ~ v_clave and jsonb_typeof(c -> 'clave') = 'string' and jsonb_typeof(c -> 'texto') = 'string'
      -- Entre 1 y 4 situaciones conocidas (SITUACIONES de src/modules/vehiculos/entities/situacion.ts).
      when 'situacion_fuera_de' then case when jsonb_typeof(c -> 'valores') = 'array' then jsonb_array_length(c -> 'valores') between 1 and 4
        and (select coalesce(bool_and(jsonb_typeof(u) = 'string' and u #>> '{}' in ('en_subasta', 'sin_resolver', 'no_ganada', 'fase')), false)
               from jsonb_array_elements(c -> 'valores') u) else false end
      else false end;
    exit when not coalesce(v_ok, false);
    -- Los textos (≤ 1.000 caracteres), el año (un entero de smallint) y la fecha (un día que existe).
    v_ok := (select coalesce(bool_and(length(c ->> k) <= 1000), true) from unnest(array['texto', 'desde', 'antesDe']) k where jsonb_typeof(c -> k) = 'string');
    if v_ok and v_t = 'columna_rango' then
      -- Entero también en su forma (`2010.0` no lo es: `::integer` caería con 22P02 al leer una fila).
      v_ok := (select coalesce(bool_and(case when (c ->> k) ~ '^-?[0-9]{1,5}$' then abs((c ->> k)::integer) <= 32767 else false end), true)
                 from unnest(array['min', 'max']) k where jsonb_typeof(c -> k) = 'number');
    end if;
    if v_ok and v_t = 'por_limpiar' then
      v_ok := to_char(to_date(c ->> 'hasta', 'YYYY-MM-DD'), 'YYYY-MM-DD') = c ->> 'hasta';
    end if;
    -- Los arreglos: a lo sumo 500 elementos; los ids, uuids; cada alternativa, un objeto de una clave del layout cuyo valor es texto, booleano o lista de textos.
    v_arr := case v_t when 'columna_en' then 'valores' when 'en_vitrina' then 'fases' when 'atributos_contienen' then 'alternativas' end;
    if v_ok and v_arr is not null then
      v_ok := jsonb_array_length(c -> v_arr) <= 500;
      v_total := v_total + jsonb_array_length(c -> v_arr);
      if v_ok and v_arr = 'alternativas' then
        -- Una sola clave: sin la menor, el objeto queda vacío.
        v_ok := (select coalesce(bool_and(case when jsonb_typeof(a) = 'object' and a <> '{}' and length(a::text) <= 1000
                   then a - (select min(k) from jsonb_object_keys(a) k) = '{}'
                        and (select bool_and(k ~ v_clave and case jsonb_typeof(w) when 'string' then true when 'boolean' then true
                               when 'array' then (select coalesce(bool_and(jsonb_typeof(z) = 'string'), true) from jsonb_array_elements(w) z) else false end)
                               from jsonb_each(a) e (k, w))
                   else false end), true)
                   from jsonb_array_elements(c -> v_arr) a);
      elsif v_ok then
        v_ok := (select coalesce(bool_and(jsonb_typeof(u) = 'string' and u #>> '{}' ~ v_uuid), true) from jsonb_array_elements(c -> v_arr) u);
      end if;
    end if;
    exit when not v_ok;
  end loop;
  if not coalesce(v_ok, false) or v_total > 1000 then
    raise exception 'Los filtros del inventario no son válidos.' using errcode = '22023', hint = 'filtros';
  end if;
exception when invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
  raise exception 'Los filtros del inventario no son válidos.' using errcode = '22023', hint = 'filtros';
end $_$;

revoke all on function public._vehiculos_inventario_validar(jsonb) from public, anon;
grant execute on function public._vehiculos_inventario_validar(jsonb) to authenticated, service_role;

CREATE OR REPLACE FUNCTION "public"."_vehiculos_inventario_condicion"("p_tipo" "text", "p_columna" "text", "p_i" integer) RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $_$
declare
  c constant text := format('($1 -> %s)', p_i);
  v_col text;
  v_clave constant text := format('(%s ->> ''clave'')', c);
  v_fases constant text := format('array(select jsonb_array_elements_text(%s -> ''fases''))::uuid[]', c);
  v_hasta constant text := format('(%s ->> ''hasta'')::date', c);
begin
  if p_i is null or p_i < 0 then
    raise exception 'La forma del inventario no es válida.' using errcode = '22023', hint = 'forma';
  end if;
  v_col := case p_tipo when 'columna_en' then case p_columna when 'fase_id' then 'v.fase_id' when 'categoria_id' then 'v.categoria_id' end
                       when 'columna_rango' then case p_columna when 'anio' then 'v.anio' end end;
  if p_tipo in ('columna_en', 'columna_rango') and v_col is null then
    raise exception 'La forma del inventario no es válida.' using errcode = '22023', hint = 'forma';
  end if;
  case p_tipo
    when 'busqueda' then
      return format('(v.titulo ilike %1$s or v.vin ilike %1$s or v.lote ilike %1$s)', public._vehiculos_inventario_patron(p_i));
    when 'columna_en' then
      return format('((%1$s ->> ''incluirNulo'')::boolean and %2$s is null or %2$s = any (array(select jsonb_array_elements_text(%1$s -> ''valores''))::uuid[]))', c, v_col);
    when 'columna_rango' then
      return format('((%1$s ->> ''min'') is null or %2$s >= (%1$s ->> ''min'')::integer) and ((%1$s ->> ''max'') is null or %2$s <= (%1$s ->> ''max'')::integer)', c, v_col);
    when 'en_vitrina' then
      return format('(case when (%1$s ->> ''valor'')::boolean then v.publicado_web = true and v.fase_id = any (%2$s) '
        || 'else (cardinality(%2$s) = 0 or v.publicado_web is false or v.fase_id is null or not (v.fase_id = any (%2$s))) end)', c, v_fases);
    when 'por_limpiar' then
      return format('(case when (%1$s ->> ''valor'')::boolean then v.importado_apibara = true and public.limpieza_el(v) <= %2$s '
        || 'else (v.importado_apibara is false or public.limpieza_el(v) is null or public.limpieza_el(v) > %2$s) end)', c, v_hasta);
    when 'atributos_contienen' then
      return format('(jsonb_array_length(%1$s -> ''alternativas'') = 0 or v.atributos @> any (array(select jsonb_array_elements(%1$s -> ''alternativas''))))', c);
    when 'atributo_rango_numero' then
      return format('((%1$s ->> ''min'') is null or v.atributos -> %2$s >= %1$s -> ''min'') and ((%1$s ->> ''max'') is null or v.atributos -> %2$s <= %1$s -> ''max'')', c, v_clave);
    when 'atributo_rango_texto' then
      return format('((%1$s ->> ''desde'') is null or v.atributos ->> %2$s >= (%1$s ->> ''desde'')) and ((%1$s ->> ''antesDe'') is null or v.atributos ->> %2$s < (%1$s ->> ''antesDe''))', c, v_clave);
    when 'atributo_texto' then
      return format('(v.atributos ->> %s ilike %s)', v_clave, public._vehiculos_inventario_patron(p_i));
    when 'situacion_fuera_de' then
      return format('(v.situacion <> all (array(select jsonb_array_elements_text(%1$s -> ''valores''))))', c);
    else
      raise exception 'La forma del inventario no es válida.' using errcode = '22023', hint = 'forma';
  end case;
end $_$;

revoke all on function public._vehiculos_inventario_condicion(text, text, integer) from public, anon;
grant execute on function public._vehiculos_inventario_condicion(text, text, integer) to authenticated, service_role;

CREATE OR REPLACE FUNCTION "public"."_vehiculos_inventario_sql"("p_filtros" "jsonb", "p_rutas" "text", "p_sentido" "text") RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $_$
declare
  v_cols constant text := 'v.id, v.numero, v.origen_id, v.titulo, v.marca, v.modelo, v.anio, v.vin, v.lote, v.plataforma, v.url_origen, v.precio, v.precio_negociable, '
    || 'v.acepta_permuta, v.placado, v.kilometraje, v.categoria_id, v.fase_id, v.atributos, v.lead_id, v.publicado_web, v.destacado_web, v.precio_web, v.precio_web_hasta, '
    || 'v.precio_web_nota, v.creado_por, v.creado_en, v.actualizado_en, v.estado_subasta, v.situacion';
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

revoke all on function public._vehiculos_inventario_sql(jsonb, text, text) from public, anon;
grant execute on function public._vehiculos_inventario_sql(jsonb, text, text) to authenticated, service_role;

drop function public.vehiculos_inventario(uuid, integer, jsonb, timestamp with time zone, uuid, boolean);

CREATE FUNCTION "public"."vehiculos_inventario"("p_origen" "uuid", "p_tamano" integer DEFAULT NULL::integer, "p_filtros" "jsonb" DEFAULT '[]'::"jsonb", "p_cursor_en" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_cursor_id" "uuid" DEFAULT NULL::"uuid", "p_hacia_atras" boolean DEFAULT false) RETURNS TABLE("id" "uuid", "numero" bigint, "origen_id" "uuid", "titulo" "text", "marca" "text", "modelo" "text", "anio" smallint, "vin" "text", "lote" "text", "plataforma" "text", "url_origen" "text", "precio" numeric, "precio_negociable" boolean, "acepta_permuta" boolean, "placado" boolean, "kilometraje" integer, "categoria_id" "uuid", "fase_id" "uuid", "atributos" "jsonb", "lead_id" "uuid", "publicado_web" boolean, "destacado_web" boolean, "precio_web" numeric, "precio_web_hasta" numeric, "precio_web_nota" "text", "creado_por" "uuid", "creado_en" timestamp with time zone, "actualizado_en" timestamp with time zone, "estado_subasta" "public"."estado_subasta", "situacion" "text", "limpieza_el" "date", "portada_ruta" "text")
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

comment on function public.vehiculos_inventario(uuid, integer, jsonb, timestamp with time zone, uuid, boolean) is 'Una página del inventario de un origen, de lo más nuevo a lo más viejo (creado_en desc, id desc), por cursor (hacia atrás, en orden ascendente), con los filtros del layout (Condicion[]) y, por fila, limpieza_el, la portada, el estado de la subasta y la situación. Corre como quien la llama: la RLS decide qué se ve; cada ruta (el origen, lo creado, la cartera de mis_leads()) va por su índice con su propio limit. Lo mide supabase/tests/medir-vehiculos-inventario.sql.';

revoke all on function public.vehiculos_inventario(uuid, integer, jsonb, timestamp with time zone, uuid, boolean) from public, anon;
grant execute on function public.vehiculos_inventario(uuid, integer, jsonb, timestamp with time zone, uuid, boolean) to authenticated, service_role;

-- 10. Relleno: sólo lo que difiere del default 'fase' (agregar una columna con un default constante no reescribe la tabla). Las guardas del paso 3 ya
-- están: no mueve versiones ni escribe en actividad.
update public.vehiculos v
   set situacion = public._vehiculo_situacion(v.origen_id, v.fase_id, v.estado_subasta, coalesce(v.subasta_fin_en, v.subasta_en), v.subasta_resultado)
 where public._vehiculo_situacion(v.origen_id, v.fase_id, v.estado_subasta, coalesce(v.subasta_fin_en, v.subasta_en), v.subasta_resultado)
       is distinct from v.situacion;
