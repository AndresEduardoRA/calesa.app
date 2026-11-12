-- Avisar los documentos por vencer una vez al día (paso 6.12-1, C6).
--
-- `documentos_vencimientos()`: los documentos aprobados y vivos de vehículos fuera de la papelera cuyo tipo vence (`renovar` o `solicitar`) y avisa
-- (`aviso_dias` no nulo), que todavía no vencieron y ya entraron en su ventana (`vence_el - aviso_dias <= hoy`, el día de la empresa). Un aviso
-- `documento_por_vencer` por persona y documento desde que empieza su ventana: si alguien corre la fecha y la ventana vuelve a abrirse, avisa otra vez.
-- Con `aviso_dias` mayor que 90, la purga diaria (`notificaciones_purgar`: leídas o accionadas de más de 90 días) puede borrar el aviso y se avisa dos
-- veces: se acepta. A quién: `logistica.documentos.subir` del origen con `logistica.ver` y `vehiculos.ver` (el menor alcance, `_alertas_destinatarios`).

-- Un aviso de vencimiento para una persona y un documento: nada si ya hay uno suyo desde el inicio de la ventana; si hay uno abierto más viejo, lo
-- reabre; si no, uno nuevo por `notificar()`. Devuelve 1 si lo intentó. Por `notificaciones_referencia_idx`.
create function public._documento_vencimiento_avisar(
  p_documento uuid, p_vehiculo uuid, p_titulo text, p_cuerpo text, p_desde timestamptz, p_usuario uuid
) returns integer
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if exists (select 1 from public.notificaciones n
              where n.referencia_id = p_documento and n.tipo = 'documento_por_vencer' and n.usuario_id = p_usuario and n.creado_en >= p_desde) then
    return 0;
  end if;
  update public.notificaciones n
     set leida_en = null, creado_en = now(), titulo = p_titulo, cuerpo = p_cuerpo
   where n.referencia_id = p_documento and n.tipo = 'documento_por_vencer' and n.usuario_id = p_usuario and n.accionada_en is null;
  if found then
    return 1;
  end if;
  perform public.notificar(p_usuario, 'documento_por_vencer', p_titulo, p_cuerpo, 'documento', p_documento, '/logistica/vehiculo/' || p_vehiculo, true);
  return 1;
end;
$$;

revoke all on function public._documento_vencimiento_avisar(uuid, uuid, text, text, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public._documento_vencimiento_avisar(uuid, uuid, text, text, timestamptz, uuid) to service_role;

create function public.documentos_vencimientos() returns integer
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  c_lote constant int := 200;
  c_tope constant int := 2000;
  c_meses constant text[] := array['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  v_hoy date; v_zona text; v_max int;
  v_ids uuid[]; v_vence date; v_id uuid; d record;
  v_origen uuid; v_usuarios uuid[]; v_todos boolean[];
  v_vistos int := 0; v_n int := 0; v_cuerpo text;
  -- Quien está en una baja en curso deja de contar su cartera (la unidad propia, sí).
  v_fuera constant uuid[] := public._bajas_en_curso();
begin
  select (now() at time zone e.zona_horaria)::date, e.zona_horaria into v_hoy, v_zona from public.ajustes_empresa e where e.id = 1;
  select max(t.aviso_dias) into v_max from public.tipos_documento t where t.modo_vencimiento in ('renovar', 'solicitar') and t.aviso_dias is not null;
  if v_hoy is null or v_max is null then
    return 0;
  end if;
  loop
    -- documentos_vencen_idx (vence_el) where aprobado y vivo: rango [hoy, hoy + el mayor aviso]; el cursor (vence_el, id) ordena parcial por id y
    -- recorre también los de repuestos (cuentan para el tope).
    if v_id is null then
      v_ids := array(select x.id from public.documentos x
                      where x.estado = 'aprobado' and x.eliminado_en is null and x.vence_el is not null and x.vence_el between v_hoy and v_hoy + v_max
                      order by x.vence_el, x.id limit least(c_lote, c_tope - v_vistos));
    else
      v_ids := array(select x.id from public.documentos x
                      where x.estado = 'aprobado' and x.eliminado_en is null and x.vence_el is not null and x.vence_el between v_hoy and v_hoy + v_max
                        and (x.vence_el, x.id) > (v_vence, v_id)
                      order by x.vence_el, x.id limit least(c_lote, c_tope - v_vistos));
    end if;
    exit when cardinality(v_ids) = 0;
    v_vistos := v_vistos + cardinality(v_ids);
    select x.vence_el, x.id into v_vence, v_id from public.documentos x where x.id = any (v_ids) order by x.vence_el desc, x.id desc limit 1;
    for d in
      select doc.id, doc.vehiculo_id, doc.vence_el, v.origen_id, v.titulo, v.creado_por, v.lead_id, t.nombre as tipo, t.modo_vencimiento, t.aviso_dias
        from public.documentos doc
        join public.tipos_documento t on t.id = doc.tipo_documento_id
        join public.vehiculos v on v.id = doc.vehiculo_id
       where doc.id = any (v_ids) and v.eliminado_en is null
         and t.modo_vencimiento in ('renovar', 'solicitar') and t.aviso_dias is not null and doc.vence_el - t.aviso_dias <= v_hoy
       order by v.origen_id, doc.vence_el, doc.id
    loop
      if v_origen is distinct from d.origen_id then
        v_origen := d.origen_id;
        select coalesce(array_agg(x.usuario_id order by x.usuario_id), '{}'), coalesce(array_agg(x.todos order by x.usuario_id), '{}')
          into v_usuarios, v_todos from public._alertas_destinatarios('logistica.documentos.subir', d.origen_id) x;
      end if;
      v_cuerpo := d.titulo || ' · vence el ' || extract(day from d.vence_el)::int || ' ' || c_meses[extract(month from d.vence_el)::int] || ' '
                  || extract(year from d.vence_el)::int || '. '
                  || case when d.modo_vencimiento = 'renovar' then 'Sube el nuevo para renovarlo.' else 'Pide uno nuevo antes de que venza.' end;
      for i in 1 .. cardinality(v_usuarios) loop
        if v_todos[i] or d.creado_por = v_usuarios[i]
           or (d.lead_id is not null and v_usuarios[i] <> all (v_fuera) and exists (select 1 from public.leads_asesores la
                where la.lead_id = d.lead_id and la.usuario_id = v_usuarios[i] and la.revocado_en is null)) then
          v_n := v_n + public._documento_vencimiento_avisar(d.id, d.vehiculo_id, 'Documento por vencer: «' || d.tipo || '»', v_cuerpo,
                                                            ((d.vence_el - d.aviso_dias)::timestamp at time zone v_zona), v_usuarios[i]);
        end if;
      end loop;
    end loop;
    exit when cardinality(v_ids) < c_lote or v_vistos >= c_tope;
  end loop;
  return v_n;
end;
$$;

revoke all on function public.documentos_vencimientos() from public, anon, authenticated;
grant execute on function public.documentos_vencimientos() to service_role;

comment on function public.documentos_vencimientos() is
  'Alertas (6.12): job documentos-vencimientos diario. Avisa documento_por_vencer una vez por persona y documento desde que empieza su ventana (vence_el - aviso_dias) a quien tiene logistica.documentos.subir del origen; el texto cambia con modo_vencimiento. De a 200 y hasta 2.000 documentos por corrida. Devuelve los intentos.';

-- 11:15 UTC = 07:15 en America/La_Paz.
select cron.schedule('documentos-vencimientos', '15 11 * * *', 'select public.documentos_vencimientos()');
