-- Importar todo (9.06-2, parte 2 de 5): deshacer una importación total de leads con lo que ya existe (D1 de 9.06-1). Hasta ahora
-- `leads_importacion_deshacer` medía «intacto» contra quien llama (en una total con destino, todo quedaba `otra_persona`) y podía marcar
-- deshecha y dejar `terminada` una total en curso, lo que cortaba el proceso. Ahora: sólo quien la hizo, sólo terminada o fallida, con
-- `datos.importar.todo` vigente si tuvo destino, a lo sumo 2.000 leads, e «intacto» contra el destino. Para una de `/leads` nada cambia.
-- `create or replace` desde su definición vigente (la base).

CREATE OR REPLACE FUNCTION "public"."leads_importacion_deshacer"("p_importacion" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_yo uuid := (select auth.uid());
  v_orden constant text[] := array['papelera', 'otra_persona', 'compartido', 'editado', 'seguimientos',
    'recordatorios', 'telefonos', 'vehiculos', 'oportunidades', 'portal', 'otros'];
  i public.importaciones;
  r record;
  v_motivo text;
  v_movidos uuid[] := '{}'::uuid[];
  v_quedan jsonb := '[]'::jsonb;
  v_quedaron jsonb;
  v_por_motivo jsonb;
  v_vinculos integer;
  v_purgados integer;
  v_lote uuid;
  v_resultado jsonb;
  v_dueno uuid;
begin
  perform public.assert_activo();
  if p_importacion is null then
    raise exception 'Falta el identificador de la importación.' using errcode = '22023';
  end if;
  -- Primero se mira sin bloquear: a una importación ajena no se le toma el candado. Ajena, inexistente o
  -- de otra cosa que leads dicen lo mismo.
  if not exists (select 1 from public.importaciones x where x.id = p_importacion and x.usuario_id = v_yo and x.entidad = 'leads') then
    raise exception 'No encontramos esta importación.' using errcode = '42501';
  end if;
  select * into i from public.importaciones x where x.id = p_importacion for update;
  if i.usuario_id is distinct from v_yo or i.entidad <> 'leads' then
    raise exception 'No encontramos esta importación.' using errcode = '42501';
  end if;
  -- Ya deshecha: lo mismo que la primera vez (un doble clic o un reintento tardío no son un error).
  if i.deshecha_en is not null then
    return i.deshecha_resultado || jsonb_build_object('repetido', true);
  end if;
  -- Una importación total (9.06): sólo cuando ya no está en curso (deshacer nunca corta el proceso), con datos.importar.todo vigente si
  -- tuvo destino (mueve leads de otra persona) y con a lo sumo 2.000 leads creados.
  if i.archivo_ruta is not null then
    if i.estado in ('pendiente', 'procesando') then
      raise exception 'Esta importación sigue en curso: espera a que termine para deshacerla.' using errcode = '22023';
    end if;
    if i.con_destino and not (select public.tiene_permiso('datos.importar.todo')) then
      raise exception 'Ya no tienes el permiso para deshacer esta importación.' using errcode = '42501';
    end if;
    if coalesce(i.filas_ok, 0) > 2000 then
      raise exception 'Esta importación creó más de 2.000 leads: no se puede deshacer de una vez.' using errcode = '22023', hint = 'importacion';
    end if;
  end if;
  -- «Intacto» se mide contra quien recibió los leads: el destino de una total (nulo si su perfil se borró: nada se mueve), si no quien importó.
  v_dueno := case when i.con_destino then i.asignar_a else i.usuario_id end;
  if now() >= public._importacion_vence_en(i) then
    raise exception 'Pasaron más de 24 horas desde esta importación: ya no se puede deshacer.' using errcode = '22023';
  end if;

  -- Los leads, bloqueados en orden; con el candado, cada uno se mira de nuevo (pudo cambiar mientras tanto).
  perform 1 from public.leads x
   where x.id in (select il.lead_id from public.importaciones_leads il where il.importacion_id = i.id)
   order by x.id for update;
  for r in select il.lead_id, il.fila from public.importaciones_leads il where il.importacion_id = i.id order by il.fila loop
    v_motivo := public._lead_motivo_para_deshacer(r.lead_id, v_dueno);
    if v_motivo is null then
      v_movidos := v_movidos || r.lead_id;
    else
      v_quedan := v_quedan || jsonb_build_object('motivo', v_motivo, 'fila', r.fila);
    end if;
  end loop;
  v_vinculos := (select count(*) from public.importaciones_leads il where il.importacion_id = i.id);
  -- Lo que ya se purgó de la papelera se fue con su vínculo (cascada).
  v_purgados := greatest(coalesce(i.filas_ok, 0) - v_vinculos, 0);

  if cardinality(v_movidos) > 0 then
    v_lote := gen_random_uuid();
    insert into public.lotes_papelera (id, tipo, creado_por, resumen)
    values (v_lote, 'leads', v_yo, jsonb_build_object('cantidad', cardinality(v_movidos), 'restaurados', 0, 'purgados', 0,
                                                      'importacion', i.id));
    update public.leads x set eliminado_en = now(), eliminado_por = v_yo, lote_papelera_id = v_lote
     where x.id = any (v_movidos);
    perform public._lote_papelera_tocar(v_lote);
    perform public.registrar_actividad('papelera.enviado', 'lotes_papelera', v_lote::text, null, null,
      jsonb_build_object('tipo', 'leads', 'cantidad', cardinality(v_movidos), 'portal_revocados', 0, 'desde', 'importacion'));
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('motivo', m.motivo, 'cantidad', m.cantidad, 'filas', m.filas)
                            order by array_position(v_orden, m.motivo)), '[]'::jsonb),
         coalesce(jsonb_object_agg(m.motivo, m.cantidad), '{}'::jsonb)
    into v_quedaron, v_por_motivo
    from (select e ->> 'motivo' as motivo, count(*)::int as cantidad,
                 jsonb_agg((e ->> 'fila')::int order by (e ->> 'fila')::int) as filas
            from jsonb_array_elements(v_quedan) e group by 1) m;
  v_resultado := jsonb_build_object('importacion', i.id, 'movidos', cardinality(v_movidos),
    'quedaron', v_quedaron, 'purgados', v_purgados);

  -- Queda marcada; si seguía abierta, se cierra (un lote tardío de otra pestaña ya no crea nada; sólo una de `/leads`: la total en curso
  -- ya salió arriba). Sin
  -- `terminada_en`: su plazo y su fecha siguen siendo las del último lote.
  update public.importaciones x
     set deshecha_en = now(), deshecha_lote = v_lote, deshecha_resultado = v_resultado,
         estado = case when x.estado = 'procesando' then 'terminada'::public.estado_importacion else x.estado end
   where x.id = i.id;
  perform public.registrar_actividad('leads.importacion_deshecha', 'importaciones', i.id::text, null, null,
    jsonb_build_object('movidos', cardinality(v_movidos), 'quedaron', jsonb_array_length(v_quedan),
                       'por_motivo', v_por_motivo, 'purgados', v_purgados));
  return v_resultado || jsonb_build_object('repetido', false);
end;
$$;

revoke all on function public.leads_importacion_deshacer(uuid) from public, anon;
grant execute on function public.leads_importacion_deshacer(uuid) to authenticated, service_role;

-- El permiso gana un punto de enforcement (catálogo: la nube no vuelve a correr el seed).
insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden)
values ('datos.importar.todo', 'datos', 'Importar para todos', 'Importar datos asignándolos a cualquiera', false, false,
        'importacion_crear, _importacion_autorizar, leads_importacion_deshacer, policy importaciones', 680)
on conflict (clave) do update set aplicado_en = excluded.aplicado_en;
