-- Una subasta no ganada (`vehiculos.situacion = 'no_ganada'`) deja de contar en logística y en Inicio: no sale en la cadena (ni en «Sin
-- fase»), ni en las demoradas ni en «Por aprobar» de la bandeja, y `alertas_demora` no la avisa. La cadena se apoya en un índice parcial
-- sin las no ganadas, con el mismo nombre: cada consulta que lo usa lleva el literal `situacion <> 'no_ganada'` (sin él, el plan cae a
-- otro índice sin avisar). La tarjeta de la cadena y la fila de demoradas traen la situación.
-- Pruebas: supabase/tests/areas/situacion/cuenta.sql; medición: medir-escala.sql › «La cadena».

-- 1. El índice de la cadena, sin las no ganadas.
drop index public.vehiculos_cadena_idx;
create index vehiculos_cadena_idx on public.vehiculos (origen_id, fase_id, fase_desde, id) where eliminado_en is null and situacion <> 'no_ganada';
comment on index public.vehiculos_cadena_idx is 'La cadena de logística (6.02-2): una columna = (origen_id, fase_id) ordenada por (fase_desde, id); «Sin fase» = fase_id nulo, por id. Sin las no ganadas: cada consulta lleva el literal situacion <> ''no_ganada''.';

-- 2. Una columna de la cadena.
CREATE OR REPLACE FUNCTION "public"."_logistica_columna"("p_origen" "uuid", "p_fase" "uuid", "p_desde" timestamp with time zone, "p_id" "uuid", "p_n" integer, "p_f" "jsonb", "p_todos" boolean, "p_dias" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
    -- vehiculos_cadena_idx (parcial: sin las no ganadas): (origen_id, fase_id) fijos, rango de fase_desde.
    v_ids := array(
      select v.id from public.vehiculos v
       where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id = p_fase and v.fase_desde < v_corte
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
    -- vehiculos_cadena_idx (parcial: sin las no ganadas): (origen_id, fase_id) fijos, desde el cursor (fase_desde, id).
    v_ids := array(
      select v.id from public.vehiculos v
       where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id = p_fase and v.fase_desde < v_corte
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
    -- vehiculos_cadena_idx (parcial: sin las no ganadas): origen_id fijo, fase_id is null (fase_desde también es nulo: check vehiculos_fase_desde_coherente), por id.
    v_ids := array(
      select v.id from public.vehiculos v
       where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id is null and v.fase_desde is null
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
    -- vehiculos_cadena_idx (parcial: sin las no ganadas): origen_id fijo, fase_id is null, desde el cursor id.
    v_ids := array(
      select v.id from public.vehiculos v
       where v.origen_id = p_origen and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_id is null and v.fase_desde is null
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
           'id', v.id, 'titulo', v.titulo, 'vin', v.vin, 'lote', v.lote, 'fase_desde', v.fase_desde, 'situacion', v.situacion,
           'demorada', coalesce(p_dias > 0 and v.fase_desde < now() - make_interval(days => p_dias), false),
           'contenedor', t.contenedor, 'booking', t.booking, 'eta_el', t.eta_el) order by u.k), '[]'::jsonb)
    into v_tarjetas
    from unnest(v_ids[1:p_n]) with ordinality as u(id, k)
    join public.vehiculos v on v.id = u.id
    left join public.transportes t on t.vehiculo_id = v.id;

  return jsonb_build_object('tarjetas', v_tarjetas, 'hay_mas', coalesce(cardinality(v_ids), 0) > p_n);
end;
$$;

revoke all on function "public"."_logistica_columna"("p_origen" "uuid", "p_fase" "uuid", "p_desde" timestamp with time zone, "p_id" "uuid", "p_n" integer, "p_f" "jsonb", "p_todos" boolean, "p_dias" integer) from public, anon, authenticated;
grant execute on function "public"."_logistica_columna"("p_origen" "uuid", "p_fase" "uuid", "p_desde" timestamp with time zone, "p_id" "uuid", "p_n" integer, "p_f" "jsonb", "p_todos" boolean, "p_dias" integer) to service_role;

-- 3. Las demoradas de la bandeja: cambia su tabla de salida (suma la situación), así que se borra y se crea.
drop function public._bandeja_demoradas(integer);

CREATE FUNCTION "public"."_bandeja_demoradas"("p_n" integer) RETURNS TABLE("id" "uuid", "titulo" "text", "origen_id" "uuid", "fase_id" "uuid", "fase" "text", "fase_desde" timestamp with time zone, "dias" integer, "situacion" "text", "vence" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
declare v_uid uuid := (select auth.uid()); p record;
begin
  if v_uid is null then
    return;
  end if;
  for p in
    select fl.origen_id as o, f.id as f, f.nombre, x.dias, a.alc
      from public.flujos fl
      cross join lateral (select public._logistica_alcance(fl.origen_id) as alc) a
      join public.fases f on f.flujo_id = fl.id
      cross join lateral (select public._logistica_dias(f.id) as dias) x
     where fl.ambito = 'vehiculos' and fl.origen_id is not null and a.alc is not null and x.dias is not null
  loop
    return query
      -- vehiculos_cadena_idx (parcial: sin las no ganadas): (origen_id, fase_id) fijos, rango de fase_desde.
      select v.id, v.titulo, v.origen_id, v.fase_id, p.nombre, v.fase_desde, p.dias, v.situacion, v.fase_desde + make_interval(days => p.dias)
        from public.vehiculos v
       where v.origen_id = p.o and v.fase_id = p.f and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.fase_desde < now() - make_interval(days => p.dias)
         and (p.alc = 'todos' or v.creado_por = v_uid or (v.lead_id is not null and public.en_cartera(v.lead_id)))
       order by v.fase_desde, v.id
       limit p_n;
  end loop;
end;
$$;

revoke all on function public._bandeja_demoradas(integer) from public, anon, authenticated;
grant execute on function public._bandeja_demoradas(integer) to service_role;

-- 4. Por aprobar.
CREATE OR REPLACE FUNCTION "public"."_bandeja_por_aprobar"("p_n" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_uid uuid := (select auth.uid()); v_origenes uuid[]; v_todos uuid[]; v_filas jsonb;
begin
  select coalesce(array_agg(x.o), '{}'), coalesce(array_agg(x.o) filter (where x.alc = 'todos' and x.apr = 'todos'), '{}')
    into v_origenes, v_todos
    from (select fl.origen_id as o, public._logistica_alcance(fl.origen_id) as alc,
                 public.alcance_de('logistica.documentos.aprobar', fl.origen_id) as apr
            from public.flujos fl where fl.ambito = 'vehiculos' and fl.origen_id is not null) x
   where x.alc is not null and x.apr is not null;
  if v_uid is null or cardinality(v_origenes) = 0 then
    return jsonb_build_object('filas', '[]'::jsonb, 'hay_mas', false);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', y.id, 'vehiculo_id', y.vehiculo_id, 'titulo', y.titulo, 'tipo', y.tipo, 'creado_en', y.creado_en)
                            order by y.creado_en, y.id), '[]'::jsonb)
    into v_filas
    from (
      -- documentos_por_revisar_idx (creado_en, id) where subido y vivo: una cola corta.
      select d.id, d.vehiculo_id, v.titulo, t.nombre as tipo, d.creado_en
        from public.documentos d
        join public.vehiculos v on v.id = d.vehiculo_id
        join public.tipos_documento t on t.id = d.tipo_documento_id
       where d.estado = 'subido' and d.eliminado_en is null and v.eliminado_en is null and v.situacion <> 'no_ganada' and v.origen_id = any (v_origenes)
         and (v.origen_id = any (v_todos) or v.creado_por = v_uid or (v.lead_id is not null and public.en_cartera(v.lead_id)))
       order by d.creado_en, d.id
       limit p_n + 1
    ) y;
  return jsonb_build_object('filas', coalesce((select jsonb_agg(e order by i) from jsonb_array_elements(v_filas) with ordinality z(e, i) where i <= p_n),
                                              '[]'::jsonb),
                            'hay_mas', jsonb_array_length(v_filas) > p_n);
end;
$$;

revoke all on function public._bandeja_por_aprobar(integer) from public, anon, authenticated;
grant execute on function public._bandeja_por_aprobar(integer) to service_role;

-- 5. El job de las demoras.
CREATE OR REPLACE FUNCTION "public"."alertas_demora"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  c_lote constant int := 200;
  c_tope constant int := 2000;
  p record; w record;
  v_origen uuid; v_usuarios uuid[]; v_todos boolean[];
  v_ids uuid[]; v_desde timestamptz; v_id uuid;
  v_vistas int := 0; v_n int := 0;
  -- Quien está en una baja en curso deja de contar su cartera (la unidad propia, sí).
  v_fuera constant uuid[] := public._bajas_en_curso();
begin
  for p in
    select fl.origen_id, f.id as fase_id, f.nombre, x.dias, coalesce(f.alerta_cada_horas, 72) as horas
      from public.flujos fl
      join public.fases f on f.flujo_id = fl.id
      cross join lateral (select public._logistica_dias(f.id) as dias) x
     where fl.ambito = 'vehiculos' and fl.origen_id is not null and x.dias is not null
     order by fl.origen_id, f.orden, f.id
  loop
    exit when v_vistas >= c_tope;
    if v_origen is distinct from p.origen_id then
      v_origen := p.origen_id;
      select coalesce(array_agg(d.usuario_id order by d.usuario_id), '{}'), coalesce(array_agg(d.todos order by d.usuario_id), '{}')
        into v_usuarios, v_todos from public._alertas_destinatarios('flujos.mover', p.origen_id) d;
    end if;
    continue when cardinality(v_usuarios) = 0;
    v_id := null;
    loop
      -- vehiculos_cadena_idx (parcial: sin las no ganadas): (origen_id, fase_id) fijos, rango de fase_desde; con cursor, desde (fase_desde, id).
      if v_id is null then
        v_ids := array(select v.id from public.vehiculos v
                        where v.origen_id = p.origen_id and v.fase_id = p.fase_id and v.eliminado_en is null and v.situacion <> 'no_ganada'
                          and v.fase_desde < now() - make_interval(days => p.dias)
                        order by v.fase_desde, v.id limit least(c_lote, c_tope - v_vistas));
      else
        v_ids := array(select v.id from public.vehiculos v
                        where v.origen_id = p.origen_id and v.fase_id = p.fase_id and v.eliminado_en is null and v.situacion <> 'no_ganada'
                          and v.fase_desde < now() - make_interval(days => p.dias) and (v.fase_desde, v.id) > (v_desde, v_id)
                        order by v.fase_desde, v.id limit least(c_lote, c_tope - v_vistas));
      end if;
      exit when cardinality(v_ids) = 0;
      v_vistas := v_vistas + cardinality(v_ids);
      for w in select x.id, x.titulo, x.fase_desde, x.creado_por, x.lead_id from public.vehiculos x
                where x.id = any (v_ids) order by x.fase_desde, x.id loop
        for i in 1 .. cardinality(v_usuarios) loop
          if v_todos[i] or w.creado_por = v_usuarios[i]
             or (w.lead_id is not null and v_usuarios[i] <> all (v_fuera) and exists (select 1 from public.leads_asesores la
                  where la.lead_id = w.lead_id and la.usuario_id = v_usuarios[i] and la.revocado_en is null)) then
            v_n := v_n + public._alerta_demora_avisar(w.id, w.titulo, p.fase_id, p.nombre, w.fase_desde, p.dias, p.horas, v_usuarios[i]);
          end if;
        end loop;
        v_desde := w.fase_desde; v_id := w.id;
      end loop;
      exit when cardinality(v_ids) < c_lote or v_vistas >= c_tope;
    end loop;
  end loop;
  return v_n;
end;
$$;

revoke all on function public.alertas_demora() from public, anon, authenticated;
grant execute on function public.alertas_demora() to service_role;

comment on function public.alertas_demora() is 'Alertas (6.12): job alertas-demora cada hora. Por pares (origen, fase) que alertan, de a 200 y hasta 2.000 unidades por corrida, sin las no ganadas; avisa demora_fase a quien tiene flujos.mover, logistica.ver y vehiculos.ver del origen (el menor alcance) y reabre el mismo aviso pasado alerta_cada_horas (nulo = 72 h). Devuelve los intentos.';

comment on function public.logistica_cadena_columna(uuid, uuid, timestamp with time zone, uuid, integer, jsonb) is 'Una columna de la cadena de logística (6.02-2): {tarjetas: [{id, titulo, vin, lote, fase_desde, situacion, demorada, contenedor, booking, eta_el}], hay_mas}, por cursor (fase_desde, id) sobre vehiculos_cadena_idx (sin las no ganadas); p_fase nulo = «Sin fase» (por id). Definer: el alcance es el menor de logistica.ver y vehiculos.ver del origen, resuelto una vez (42501 hint acceso si no lo hay). Filtros: q, demoradas, por_aprobar, contenedor, booking, naviera (22023 hint filtros); fase ajena o sin es_logistica, 22023 hint p_fase; cursor sin p_desde, 22023 hint cursor.';
