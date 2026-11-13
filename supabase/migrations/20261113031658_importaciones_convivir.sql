-- Importar todo (9.06-2, parte 2 de 5): `/leads` no toma una importación total. Hasta ahora `leads_importar_lote` y
-- `leads_importacion_terminar` aceptaban una total propia (se le podían sumar filas o terminarla por fuera del proceso) y
-- `leads_importaciones_recientes` la listaba en el panel de `/leads`. Las tres la tratan como inexistente: 42501 «No encontramos esta
-- importación.», o no la listan. `create or replace` desde su definición vigente (la base), cambiando sólo esa condición.
-- Deshacer una total va en la migración siguiente.

CREATE OR REPLACE FUNCTION "public"."leads_importar_lote"("p_importacion" "uuid", "p_total" integer, "p_filas" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_yo uuid := (select auth.uid());
  v_cc text := (select e.telefono_cc from public.ajustes_empresa e where e.id = 1);
  v_dueno uuid;
  v_estado public.estado_importacion;
  v_fila record;
  v_lead jsonb;
  v_res jsonb;
  v_salida jsonb := '[]'::jsonb;
  v_numero_de_fila integer;
  v_sqlstate text;
  v_mensaje text;
  v_hint text;
  v_permitidas constant text[] := array['nombre', 'telefono_principal', 'tipo_lead_id', 'origen_lead_id', 'atributos'];
  v_k text;
  v_ids uuid[] := '{}';
  v_filas integer[] := '{}';
  v_ve boolean := public.tiene_permiso('leads.numero_global.ver');
begin
  perform public.assert_permiso('leads.crear');
  perform public.assert_activo();
  if p_importacion is null then
    raise exception 'Falta el identificador de la importación.' using errcode = '22023';
  end if;
  if p_total is null or p_total < 1 or p_total > 500 then
    raise exception 'Una importación lleva de 1 a 500 filas.' using errcode = '22023';
  end if;
  if p_filas is null or jsonb_typeof(p_filas) <> 'array' or jsonb_array_length(p_filas) < 1 or jsonb_array_length(p_filas) > 50 then
    raise exception 'Un lote lleva de 1 a 50 filas.' using errcode = '22023';
  end if;

  -- La importación es de quien la empieza: retomarla con el mismo id es lo que hace un reintento.
  insert into public.importaciones (id, usuario_id, entidad, archivo_ruta, estado, filas_total, iniciada_en)
  values (p_importacion, v_yo, 'leads', null, 'procesando', p_total, now())
  on conflict (id) do nothing;
  select i.usuario_id, i.estado into v_dueno, v_estado from public.importaciones i where i.id = p_importacion for update;
  -- Una importación total (`archivo_ruta`, 9.06) no es de `/leads`: para aquí no existe.
  if v_dueno is distinct from v_yo
     or not exists (select 1 from public.importaciones i where i.id = p_importacion and i.entidad = 'leads' and i.archivo_ruta is null) then
    raise exception 'No encontramos esta importación.' using errcode = '42501';
  end if;
  if v_estado <> 'procesando' then
    raise exception 'Esta importación ya terminó.' using errcode = '22023';
  end if;

  -- Cada elemento, validado antes de tocar nada: una forma rota es un error del cliente, no de una fila.
  for v_fila in select e.value as v from jsonb_array_elements(p_filas) e loop
    if jsonb_typeof(v_fila.v) <> 'object' or jsonb_typeof(v_fila.v -> 'lead') is distinct from 'object'
       or jsonb_typeof(v_fila.v -> 'id') is distinct from 'string'
       or jsonb_typeof(v_fila.v -> 'fila') is distinct from 'number' then
      raise exception 'Una fila del lote no tiene la forma esperada.' using errcode = '22023';
    end if;
  end loop;

  -- En el orden del teléfono: dos lotes de dos personas que se cruzan toman los candados en el mismo
  -- orden y no se bloquean entre sí.
  for v_fila in
    select e.value as v, e.ordinality as ord
    from jsonb_array_elements(p_filas) with ordinality e
    order by public._telefono_o_nulo(v_cc, e.value -> 'lead' ->> 'telefono_principal') nulls first, e.ordinality
  loop
    v_numero_de_fila := (v_fila.v ->> 'fila')::integer;
    begin
      v_lead := v_fila.v -> 'lead';
      -- Sólo viajan las claves conocidas: `adoptar` y cualquier otra se rechazan, no se ignoran.
      for v_k in select jsonb_object_keys(v_lead) loop
        if not (v_k = any (v_permitidas)) then
          raise exception 'El dato «%» no se puede importar.', v_k using errcode = '22023', hint = v_k;
        end if;
      end loop;
      v_res := public._lead_crear((v_fila.v ->> 'id')::uuid, v_lead, null, null, false);
      if (v_res ->> 'resultado') = 'creado' then
        insert into public.importaciones_leads (importacion_id, lead_id, fila)
        values (p_importacion, (v_res ->> 'id')::uuid, v_numero_de_fila)
        on conflict do nothing;
        -- Los que ya existían (un reintento) conservan el número que tienen: sólo se reparten los de ahora.
        if not coalesce((v_res ->> 'repetido')::boolean, false) then
          v_ids := v_ids || (v_res ->> 'id')::uuid;
          v_filas := v_filas || v_numero_de_fila;
        end if;
        v_salida := v_salida || jsonb_build_array(jsonb_build_object(
          'id', v_fila.v ->> 'id', 'fila', v_numero_de_fila, 'resultado', 'creado',
          'repetido', coalesce((v_res ->> 'repetido')::boolean, false)));
      else
        -- existe, de_otro y limbo se dicen igual: en masa sólo se sabe que el número ya está.
        v_salida := v_salida || jsonb_build_array(jsonb_build_object(
          'id', v_fila.v ->> 'id', 'fila', v_numero_de_fila, 'resultado', 'ya_existe'));
      end if;
    exception when others then
      get stacked diagnostics v_sqlstate = returned_sqlstate, v_mensaje = message_text, v_hint = pg_exception_hint;
      -- Lo que levantan nuestras reglas es humano; lo inesperado no se cuenta.
      if v_sqlstate not in ('22023', '23502', '23514', 'PT409') then
        v_mensaje := 'No pudimos importar esta fila. Inténtalo de nuevo.';
        v_hint := null;
      end if;
      v_salida := v_salida || jsonb_build_array(jsonb_build_object(
        'id', v_fila.v ->> 'id', 'fila', v_numero_de_fila, 'resultado', 'error',
        'campo', nullif(v_hint, ''), 'motivo', v_mensaje));
    end;
  end loop;

  -- Los números propios de lo que entró ahora, repartidos por orden de fila (el menor, a la primera del archivo).
  if cardinality(v_ids) > 1 then
    perform set_config('importadora.numerar_lote', 'si', true);
    with a as (select t.id, row_number() over (order by t.fila) as rn from unnest(v_ids, v_filas) as t(id, fila)),
         n as (select l.numero_propio, row_number() over (order by l.numero_propio) as rn
                 from public.leads l where l.id = any (v_ids)),
         m as (select a.id, n.numero_propio from a join n using (rn))
    update public.leads l set numero_propio = m.numero_propio
      from m where l.id = m.id and l.numero_propio is distinct from m.numero_propio;
    perform set_config('importadora.numerar_lote', 'no', true);
  end if;

  -- Lo que vuelve por fila lleva los números que se ven, con el reparto por fila ya hecho.
  v_salida := coalesce((
    select jsonb_agg(case when t.e ->> 'resultado' = 'creado' then t.e || public._lead_numeros(l, v_ve) else t.e end order by t.ord)
      from jsonb_array_elements(v_salida) with ordinality as t (e, ord)
      left join public.leads l on l.id = case when t.e ->> 'resultado' = 'creado' then (t.e ->> 'id')::uuid end), '[]'::jsonb);

  update public.importaciones i set filas_ok = (select count(*) from public.importaciones_leads x where x.importacion_id = i.id)
   where i.id = p_importacion;
  return jsonb_build_object('importacion', p_importacion, 'filas', v_salida);
end;
$$;

CREATE OR REPLACE FUNCTION "public"."leads_importacion_terminar"("p_importacion" "uuid", "p_ya_existian" integer, "p_rechazadas" integer, "p_origen" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_yo uuid := (select auth.uid());
  v_dueno uuid;
  v_estado public.estado_importacion;
  v_creadas integer;
begin
  perform public.assert_permiso('leads.crear');
  perform public.assert_activo();
  if p_ya_existian is null or p_ya_existian < 0 or p_ya_existian > 500 or p_rechazadas is null or p_rechazadas < 0 or p_rechazadas > 500 then
    raise exception 'Las cuentas de la importación no son válidas.' using errcode = '22023';
  end if;
  select i.usuario_id, i.estado into v_dueno, v_estado
    from public.importaciones i where i.id = p_importacion and i.entidad = 'leads' and i.archivo_ruta is null for update;
  if not found or v_dueno is distinct from v_yo then
    raise exception 'No encontramos esta importación.' using errcode = '42501';
  end if;
  select count(*) into v_creadas from public.importaciones_leads x where x.importacion_id = p_importacion;
  if v_estado = 'terminada' then
    return jsonb_build_object('importacion', p_importacion, 'creadas', v_creadas, 'repetido', true);
  end if;
  update public.importaciones set estado = 'terminada', terminada_en = now(), filas_ok = v_creadas
   where id = p_importacion;
  perform public.registrar_actividad('leads.importado', 'importaciones', p_importacion::text, null, null,
    jsonb_build_object('creadas', v_creadas, 'ya_existian', p_ya_existian, 'rechazadas', p_rechazadas));
  if p_origen is not null and exists (select 1 from public.origenes_lead o where o.id = p_origen and o.activo) then
    insert into public.preferencias_usuario (usuario_id, clave, valor)
    values (v_yo, 'leads.ultimo_origen_lead', to_jsonb(p_origen::text))
    on conflict (usuario_id, clave) do update set valor = excluded.valor, actualizado_en = now();
  end if;
  return jsonb_build_object('importacion', p_importacion, 'creadas', v_creadas, 'repetido', false);
end;
$$;

CREATE OR REPLACE FUNCTION "public"."leads_importaciones_recientes"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_yo uuid := (select auth.uid());
begin
  perform public.assert_activo();
  return coalesce((
    select jsonb_agg(x.fila order by x.vence_en desc, x.id)
    from (
      select i.id, v.vence_en, jsonb_build_object(
        'id', i.id,
        'fecha', v.vence_en - interval '24 hours',
        'vence_en', v.vence_en,
        'estado', case when i.deshecha_en is not null then 'deshecha'
                       when i.estado = 'terminada' then 'terminada' else 'abierta' end,
        'creadas', coalesce(i.filas_ok, 0),
        'ya_existian', (a.detalle ->> 'ya_existian')::int,
        'rechazadas', (a.detalle ->> 'rechazadas')::int,
        'intactos', case when i.deshecha_en is null then (
          select count(*)::int from public.importaciones_leads il
           where il.importacion_id = i.id and public._lead_motivo_para_deshacer(il.lead_id, v_yo) is null) end,
        'deshecha_en', i.deshecha_en,
        'resultado', i.deshecha_resultado) as fila
      from public.importaciones i
      cross join lateral (select public._importacion_vence_en(i) as vence_en) v
      left join lateral (
        select y.detalle from public.actividad y
         where y.tabla = 'importaciones' and y.registro_id = i.id::text and y.accion = 'leads.importado'
         order by y.id desc limit 1) a on true
      where i.usuario_id = v_yo and i.entidad = 'leads' and i.archivo_ruta is null
        and (i.deshecha_en > now() - interval '24 hours' or (i.deshecha_en is null and v.vence_en > now()))
      order by v.vence_en desc, i.id
      limit 20
    ) x), '[]'::jsonb);
end;
$$;

revoke all on function public.leads_importar_lote(uuid, integer, jsonb) from public, anon;
grant execute on function public.leads_importar_lote(uuid, integer, jsonb) to authenticated, service_role;
revoke all on function public.leads_importacion_terminar(uuid, integer, integer, uuid) from public, anon;
grant execute on function public.leads_importacion_terminar(uuid, integer, integer, uuid) to authenticated, service_role;
revoke all on function public.leads_importaciones_recientes() from public, anon;
grant execute on function public.leads_importaciones_recientes() to authenticated, service_role;
