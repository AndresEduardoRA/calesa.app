-- RPC de leads: teléfono único/enmascarado, creación con verificación, cartera, limbo, portal,
-- papelera genérica (leads, vehículos, cotizaciones).

-- ---------------------------------------------------------------------------
-- Teléfono: completo sólo para la cartera
-- ---------------------------------------------------------------------------
create or replace function public.telefono_lead(p_lead uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case when public.en_cartera(l.id) then l.telefono_principal else public.enmascarar_telefono(l.telefono_principal) end
  from public.leads l where l.id = p_lead;
$$;
revoke all on function public.telefono_lead(uuid) from public, anon;
grant execute on function public.telefono_lead(uuid) to authenticated;

-- La vista que lee la app. security_invoker: la RLS de leads sigue mandando.
create or replace view public.leads_vista with (security_invoker = true) as
select l.id, l.numero, l.nombre, l.telefono_cc,
       public.telefono_lead(l.id) as telefono_principal,
       public.en_cartera(l.id) as telefono_visible,
       l.tipo, l.origen_lead_id, l.edad, l.ciudad, l.pais, l.direccion, l.genero, l.notas,
       l.creado_por, l.ultimo_seguimiento_en, l.creado_en, l.actualizado_en,
       exists (select 1 from public.leads_favoritos f where f.lead_id = l.id and f.usuario_id = (select auth.uid())) as es_favorito,
       exists (select 1 from public.leads_tachados t where t.lead_id = l.id and t.usuario_id = (select auth.uid())) as esta_tachado,
       (select la.usuario_id from public.leads_asesores la where la.lead_id = l.id and la.tipo_acceso = 'dueno' and la.revocado_en is null) as dueno_id,
       (select count(*) from public.cotizaciones c where c.lead_id = l.id and c.eliminado_en is null) as cotizaciones_count
from public.leads l;
grant select on public.leads_vista to authenticated;

-- ---------------------------------------------------------------------------
-- Verificar teléfono mientras se tipea: existe / es mío / de quién / en limbo
-- ---------------------------------------------------------------------------
create or replace function public.verificar_telefono(p_cc text, p_tel text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tel text; l record; v_dueno text;
begin
  perform public.assert_activo();
  v_tel := public.normalizar_telefono(p_cc, p_tel);
  select id, nombre, tipo into l from public.leads where telefono_principal = v_tel and eliminado_en is null;
  if not found then return jsonb_build_object('estado', 'libre'); end if;
  if public.lead_en_limbo(l.id) then
    return jsonb_build_object('estado', 'limbo', 'lead_id', l.id);
  end if;
  if public.puede_lead(l.id, 'leads.ver') then
    return jsonb_build_object('estado', 'existe', 'lead_id', l.id, 'nombre', l.nombre, 'tipo', l.tipo, 'es_mio', public.en_cartera(l.id));
  end if;
  select p.nombre into v_dueno from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
   where la.lead_id = l.id and la.tipo_acceso = 'dueno' and la.revocado_en is null;
  -- Fuera de alcance: sólo «número tomado» y de quién, nunca el lead.
  return jsonb_build_object('estado', 'de_otro', 'dueno', v_dueno,
    'dueno_id', (select la.usuario_id from public.leads_asesores la where la.lead_id = l.id and la.tipo_acceso = 'dueno' and la.revocado_en is null));
end;
$$;
revoke all on function public.verificar_telefono(text, text) from public, anon;
grant execute on function public.verificar_telefono(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Crear lead: la única puerta de INSERT. Si el teléfono está en limbo, lo adopta.
-- ---------------------------------------------------------------------------
create or replace function public.crear_lead(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_tel text; v_id uuid; v_existente uuid;
begin
  perform public.assert_permiso('leads.crear');
  v_tel := public.normalizar_telefono(p ->> 'telefono_cc', p ->> 'telefono_principal');
  select id into v_existente from public.leads where telefono_principal = v_tel and eliminado_en is null;
  if v_existente is not null then
    if public.lead_en_limbo(v_existente) then
      insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso) values (v_existente, (select auth.uid()), 'adoptado');
      update public.leads set nombre = coalesce(nullif(p ->> 'nombre', ''), nombre), creado_por = (select auth.uid()) where id = v_existente;
      perform public.registrar_actividad('lead.adoptado_del_limbo', 'leads', v_existente::text, null, jsonb_build_object('telefono', public.enmascarar_telefono(v_tel)));
      return v_existente;
    end if;
    raise exception 'Ese teléfono ya pertenece a otro lead.' using errcode = '23505';
  end if;
  insert into public.leads (nombre, telefono_cc, telefono_principal, tipo, origen_lead_id, edad, ciudad, pais, direccion, genero, notas, creado_por)
  values (p ->> 'nombre', coalesce(p ->> 'telefono_cc', '+591'), v_tel,
          coalesce((p ->> 'tipo')::public.tipo_lead, 'prospecto'), (p ->> 'origen_lead_id')::uuid, (p ->> 'edad')::smallint,
          p ->> 'ciudad', coalesce(p ->> 'pais', (select pais from public.ajustes_empresa where id = 1)), p ->> 'direccion',
          coalesce((p ->> 'genero')::public.genero_persona, 'sin_especificar'), p ->> 'notas', (select auth.uid()))
  returning id into v_id;
  perform public.registrar_actividad('lead.creado', 'leads', v_id::text, null, jsonb_build_object('nombre', p ->> 'nombre'));
  return v_id;
end;
$$;
revoke all on function public.crear_lead(jsonb) from public, anon;
grant execute on function public.crear_lead(jsonb) to authenticated;

create or replace function public.cambiar_telefono_lead(p_lead uuid, p_cc text, p_tel text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tel text;
begin
  if not public.puede_lead(p_lead, 'leads.editar') then raise exception 'Sin acceso al lead.' using errcode = '42501'; end if;
  v_tel := public.normalizar_telefono(p_cc, p_tel);
  if exists (select 1 from public.leads where telefono_principal = v_tel and eliminado_en is null and id <> p_lead) then
    raise exception 'Ese teléfono ya pertenece a otro lead.' using errcode = '23505';
  end if;
  update public.leads set telefono_cc = p_cc, telefono_principal = v_tel where id = p_lead;
end;
$$;
revoke all on function public.cambiar_telefono_lead(uuid, text, text) from public, anon;
grant execute on function public.cambiar_telefono_lead(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Compartir / transferir / dar de baja (limbo)
-- ---------------------------------------------------------------------------
create or replace function public.compartir_lead(p_lead uuid, p_usuario uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permiso('leads.compartir');
  if not public.en_cartera(p_lead) and public.alcance_de('leads.editar') <> 'todos' then raise exception 'Sólo quien tiene el lead lo comparte.' using errcode = '42501'; end if;
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por) values (p_lead, p_usuario, 'compartido', (select auth.uid()))
  on conflict (lead_id, usuario_id) do update set revocado_en = null, revocado_por = null, compartido_por = excluded.compartido_por, desde = now();
  perform public.registrar_actividad('lead.compartido', 'leads', p_lead::text, null, jsonb_build_object('con', p_usuario));
end;
$$;

create or replace function public.transferir_lead(p_lead uuid, p_destino uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_dueno uuid;
begin
  perform public.assert_permiso('leads.transferir');
  select usuario_id into v_dueno from public.leads_asesores where lead_id = p_lead and tipo_acceso = 'dueno' and revocado_en is null;
  if v_dueno is distinct from (select auth.uid()) and public.alcance_de('leads.transferir') <> 'todos' then
    raise exception 'Sólo el dueño del lead lo transfiere.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.perfiles where id = p_destino and activo and not bloqueado) then raise exception 'El destino no está activo.' using errcode = '23514'; end if;
  -- el saliente conserva acceso compartido
  update public.leads_asesores set tipo_acceso = 'compartido' where lead_id = p_lead and tipo_acceso = 'dueno' and revocado_en is null;
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso) values (p_lead, p_destino, 'dueno')
  on conflict (lead_id, usuario_id) do update set tipo_acceso = 'dueno', revocado_en = null, revocado_por = null, desde = now();
  update public.oportunidades set usuario_id = p_destino where lead_id = p_lead and estado = 'abierta' and usuario_id = v_dueno;
  perform public.registrar_actividad('lead.transferido', 'leads', p_lead::text, jsonb_build_object('de', v_dueno), jsonb_build_object('a', p_destino));
end;
$$;

create or replace function public.revocar_acceso_lead(p_lead uuid, p_usuario uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permiso('leads.compartir');
  if exists (select 1 from public.leads_asesores where lead_id = p_lead and usuario_id = p_usuario and tipo_acceso = 'dueno' and revocado_en is null) then
    raise exception 'Al dueño no se le revoca: transferí el lead.' using errcode = '23514';
  end if;
  update public.leads_asesores set revocado_en = now(), revocado_por = (select auth.uid()) where lead_id = p_lead and usuario_id = p_usuario and revocado_en is null;
end;
$$;

-- Los leads que quedarían sin nadie si esa persona saliera ahora: vivos (fuera de la papelera),
-- con ella como asesora vigente y sin ninguna otra vigente. Es `lead_en_limbo()` aplicada por
-- adelantado. La usan la vista previa y la baja: no pueden decir números distintos. Un lead que
-- además está compartido con otra persona no cae al limbo, y no se cuenta.
create or replace function public._leads_al_limbo_de(p_usuario uuid)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.leads l
  where l.eliminado_en is null
    and exists (select 1 from public.leads_asesores a where a.lead_id = l.id and a.usuario_id = p_usuario and a.revocado_en is null)
    and not exists (select 1 from public.leads_asesores a where a.lead_id = l.id and a.usuario_id <> p_usuario and a.revocado_en is null);
$$;
revoke all on function public._leads_al_limbo_de(uuid) from public, anon, authenticated;

-- Lo que hay que saber ANTES de dar de baja a alguien. Sólo lectura y sólo conteos: es DEFINER
-- porque quien gestiona personas no necesariamente ve los leads ajenos, y no devuelve ninguno.
create or replace function public.equipo_vista_previa_baja(p_usuario uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_permiso('equipo.usuarios.gestionar');
  return jsonb_build_object(
    'leads_al_limbo', public._leads_al_limbo_de(p_usuario),
    'oportunidades_abiertas', (select count(*) from public.oportunidades o where o.usuario_id = p_usuario and o.estado = 'abierta'));
end;
$$;

-- Dar de baja: sus leads quedan en el LIMBO (sin asesores vigentes, invisibles) hasta que
-- alguien registre ese teléfono y los adopte. Queda registro de todo. Devuelve cuántos leads
-- fueron al limbo, con la misma cuenta que mostró la vista previa.
create or replace function public.equipo_dar_de_baja(p_usuario uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare n int; v_activo boolean; v_nombre text;
begin
  perform public.assert_permiso('equipo.usuarios.gestionar');
  if p_usuario = (select auth.uid()) then raise exception 'No puedes darte de baja a ti mismo.' using errcode = '42501'; end if;
  select activo, coalesce(nullif(nombre, ''), email::text) into v_activo, v_nombre
  from public.perfiles where id = p_usuario for update;
  if not found then raise exception 'Esa persona ya no está en el equipo.' using errcode = 'PT409'; end if;
  if not v_activo then raise exception '% ya no forma parte del equipo.', v_nombre using errcode = 'PT409'; end if;
  n := public._leads_al_limbo_de(p_usuario);
  update public.perfiles set activo = false, baja_en = now(), baja_por = (select auth.uid()), publico_web = false where id = p_usuario;
  update public.cola_web_asesores set habilitado = false, disponible = false where usuario_id = p_usuario;
  update public.leads_asesores set revocado_en = now(), revocado_por = (select auth.uid())
  where usuario_id = p_usuario and revocado_en is null;
  update public.oportunidades set estado = 'cancelada' where usuario_id = p_usuario and estado = 'abierta';
  perform public.registrar_actividad('usuario.baja', 'perfiles', p_usuario::text, null, jsonb_build_object('leads_al_limbo', n));
  return n;
end;
$$;

do $$
declare f text;
begin
  for f in select unnest(array['compartir_lead(uuid,uuid)', 'transferir_lead(uuid,uuid)', 'revocar_acceso_lead(uuid,uuid)', 'equipo_dar_de_baja(uuid)', 'equipo_vista_previa_baja(uuid)']) loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Portal del cliente
-- ---------------------------------------------------------------------------
create or replace function public.otorgar_portal(p_lead uuid, p_clave text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_codigo text; v_prefijo text;
begin
  if not public.puede_lead(p_lead, 'leads.portal.gestionar') then raise exception 'Sin acceso al lead.' using errcode = '42501'; end if;
  if length(coalesce(p_clave, '')) < 8 then raise exception 'La clave necesita al menos 8 caracteres.' using errcode = '22023'; end if;
  v_prefijo := upper(left(regexp_replace((select nombre from public.ajustes_empresa where id = 1), '[^A-Za-z]', '', 'g'), 3));
  if length(v_prefijo) < 2 then v_prefijo := 'CL'; end if;
  loop
    v_codigo := v_prefijo || '-' || public.codigo_dictable(5);
    exit when not exists (select 1 from public.accesos_portal where codigo = v_codigo);
  end loop;
  insert into public.accesos_portal (lead_id, codigo, clave_hash, otorgado_por)
  values (p_lead, v_codigo, extensions.crypt(p_clave, extensions.gen_salt('bf')), (select auth.uid()))
  on conflict (lead_id) do update set codigo = excluded.codigo, clave_hash = excluded.clave_hash, habilitado = true, debe_cambiar_clave = true,
    intentos_fallidos = 0, bloqueado_hasta = null, otorgado_por = excluded.otorgado_por, otorgado_en = now(), revocado_por = null, revocado_en = null;
  perform public.registrar_actividad('portal.otorgado', 'accesos_portal', p_lead::text, null, jsonb_build_object('codigo', v_codigo));
  return v_codigo;
end;
$$;

create or replace function public.revocar_portal(p_lead uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.puede_lead(p_lead, 'leads.portal.gestionar') then raise exception 'Sin acceso al lead.' using errcode = '42501'; end if;
  update public.accesos_portal set habilitado = false, revocado_por = (select auth.uid()), revocado_en = now() where lead_id = p_lead;
  perform public.registrar_actividad('portal.revocado', 'accesos_portal', p_lead::text, null, null);
end;
$$;
revoke all on function public.otorgar_portal(uuid, text) from public, anon;
revoke all on function public.revocar_portal(uuid) from public, anon;
grant execute on function public.otorgar_portal(uuid, text), public.revocar_portal(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Papelera genérica: enviar, listar, restaurar, purgar (30 días por cron o a mano)
-- ---------------------------------------------------------------------------
create or replace function public.papelera_enviar(p_tipo public.tipo_lote_papelera, p_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_lote uuid; n int; v_id uuid;
begin
  perform public.assert_activo();
  if coalesce(array_length(p_ids, 1), 0) = 0 then raise exception 'Nada que enviar.' using errcode = '22023'; end if;
  if array_length(p_ids, 1) > 200 then raise exception 'Máximo 200 por lote.' using errcode = '22023'; end if;
  insert into public.lotes_papelera (tipo, creado_por, resumen) values (p_tipo, (select auth.uid()), jsonb_build_object('cantidad', array_length(p_ids, 1))) returning id into v_lote;
  if p_tipo = 'leads' then
    foreach v_id in array p_ids loop
      if not public.puede_lead(v_id, 'leads.eliminar') then raise exception 'Sin permiso para eliminar el lead %', v_id using errcode = '42501'; end if;
    end loop;
    update public.leads set eliminado_en = now(), eliminado_por = (select auth.uid()), lote_papelera_id = v_lote where id = any (p_ids) and eliminado_en is null;
  elsif p_tipo = 'vehiculos' then
    foreach v_id in array p_ids loop
      if not public.puede_vehiculo(v_id, 'vehiculos.eliminar') then raise exception 'Sin permiso para eliminar el vehículo %', v_id using errcode = '42501'; end if;
      if exists (select 1 from public.comprobantes cp join public.cotizaciones c on c.id = cp.cotizacion_id where c.vehiculo_id = v_id and cp.anulado_en is null) then
        raise exception 'El vehículo % tiene un comprobante emitido: no va a la papelera.', v_id using errcode = '23514';
      end if;
    end loop;
    update public.vehiculos set eliminado_en = now(), eliminado_por = (select auth.uid()), lote_papelera_id = v_lote where id = any (p_ids) and eliminado_en is null;
    -- sus cotizaciones viajan con él
    update public.cotizaciones set eliminado_en = now(), eliminado_por = (select auth.uid()), lote_papelera_id = v_lote where vehiculo_id = any (p_ids) and eliminado_en is null;
  else
    foreach v_id in array p_ids loop
      if not public.puede_cotizacion(v_id, 'cotizaciones.editar') and not public.tiene_permiso('cotizaciones.moderar') then raise exception 'Sin permiso para eliminar la cotización %', v_id using errcode = '42501'; end if;
    end loop;
    update public.cotizaciones set eliminado_en = now(), eliminado_por = (select auth.uid()), lote_papelera_id = v_lote where id = any (p_ids) and eliminado_en is null;
  end if;
  get diagnostics n = row_count;
  perform public.registrar_actividad('papelera.enviado', 'lotes_papelera', v_lote::text, null, jsonb_build_object('tipo', p_tipo, 'cantidad', n));
  return v_lote;
end;
$$;

create or replace function public.papelera_listar(p_tipo public.tipo_lote_papelera)
returns table (registro_id uuid, titulo text, borrado_en timestamptz, borrado_por uuid, lote_id uuid, purga_el timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare v_dias int;
begin
  perform public.assert_activo();
  select papelera_dias into v_dias from public.ajustes_empresa where id = 1;
  if p_tipo = 'leads' then
    return query select l.id, l.nombre, l.eliminado_en, l.eliminado_por, l.lote_papelera_id, l.eliminado_en + make_interval(days => v_dias)
      from public.leads l where l.eliminado_en is not null and (l.eliminado_por = (select auth.uid()) or public.tiene_permiso('vehiculos.papelera.purgar'));
  elsif p_tipo = 'vehiculos' then
    return query select v.id, v.titulo, v.eliminado_en, v.eliminado_por, v.lote_papelera_id, v.eliminado_en + make_interval(days => v_dias)
      from public.vehiculos v where v.eliminado_en is not null and (v.eliminado_por = (select auth.uid()) or public.tiene_permiso('vehiculos.papelera.purgar'));
  else
    return query select c.id, coalesce(c.titulo, 'Cotización #' || c.numero), c.eliminado_en, c.eliminado_por, c.lote_papelera_id, c.eliminado_en + make_interval(days => v_dias)
      from public.cotizaciones c where c.eliminado_en is not null and (c.eliminado_por = (select auth.uid()) or public.tiene_permiso('vehiculos.papelera.purgar'));
  end if;
end;
$$;

create or replace function public.papelera_restaurar(p_lote uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare v_tipo public.tipo_lote_papelera; v_por uuid; n int := 0;
begin
  perform public.assert_activo();
  select tipo, creado_por into v_tipo, v_por from public.lotes_papelera where id = p_lote and purgado_en is null;
  if not found then raise exception 'Lote inexistente o ya purgado.' using errcode = '22023'; end if;
  if v_por <> (select auth.uid()) and not public.tiene_permiso('vehiculos.papelera.purgar') then raise exception 'Sólo quien lo envió (o quien purga) lo restaura.' using errcode = '42501'; end if;
  if v_tipo = 'leads' then
    update public.leads set eliminado_en = null, eliminado_por = null, lote_papelera_id = null where lote_papelera_id = p_lote;
  elsif v_tipo = 'vehiculos' then
    update public.vehiculos set eliminado_en = null, eliminado_por = null, lote_papelera_id = null where lote_papelera_id = p_lote;
    update public.cotizaciones set eliminado_en = null, eliminado_por = null, lote_papelera_id = null where lote_papelera_id = p_lote;
  else
    update public.cotizaciones set eliminado_en = null, eliminado_por = null, lote_papelera_id = null where lote_papelera_id = p_lote;
  end if;
  get diagnostics n = row_count;
  update public.lotes_papelera set restaurado_en = now(), restaurado_por = (select auth.uid()) where id = p_lote;
  perform public.registrar_actividad('papelera.restaurado', 'lotes_papelera', p_lote::text, null, jsonb_build_object('cantidad', n));
  return n;
end;
$$;

-- Purga real. Encola los objetos de storage; borra las filas. La llama el cron (service_role)
-- o quien tiene vehiculos.papelera.purgar.
create or replace function public.papelera_purgar(p_lote uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare v_tipo public.tipo_lote_papelera; n int := 0;
begin
  if (select auth.uid()) is not null and not public.tiene_permiso('vehiculos.papelera.purgar') then raise exception 'Sin permiso para purgar.' using errcode = '42501'; end if;
  select tipo into v_tipo from public.lotes_papelera where id = p_lote and purgado_en is null and restaurado_en is null;
  if not found then return 0; end if;
  if v_tipo = 'vehiculos' then
    insert into public.cola_gc_storage (bucket, ruta) select 'vehiculos', i.ruta from public.vehiculos_imagenes i join public.vehiculos v on v.id = i.vehiculo_id where v.lote_papelera_id = p_lote on conflict do nothing;
    insert into public.cola_gc_storage (bucket, ruta) select 'documentos', d.ruta from public.documentos d join public.vehiculos v on v.id = d.vehiculo_id where v.lote_papelera_id = p_lote and d.ruta is not null on conflict do nothing;
    insert into public.cola_gc_storage (bucket, ruta) select 'cotizaciones', a.ruta from public.cotizaciones_adjuntos a join public.cotizaciones c on c.id = a.cotizacion_id where c.lote_papelera_id = p_lote on conflict do nothing;
    delete from public.cotizaciones where lote_papelera_id = p_lote;
    delete from public.vehiculos where lote_papelera_id = p_lote;
  elsif v_tipo = 'leads' then
    delete from public.leads where lote_papelera_id = p_lote;
  else
    insert into public.cola_gc_storage (bucket, ruta) select 'cotizaciones', a.ruta from public.cotizaciones_adjuntos a join public.cotizaciones c on c.id = a.cotizacion_id where c.lote_papelera_id = p_lote on conflict do nothing;
    delete from public.cotizaciones where lote_papelera_id = p_lote;
  end if;
  get diagnostics n = row_count;
  update public.lotes_papelera set purgado_en = now() where id = p_lote;
  perform public.registrar_actividad('papelera.purgado', 'lotes_papelera', p_lote::text, null, jsonb_build_object('cantidad', n));
  return n;
end;
$$;

create or replace function public.papelera_purgar_vencidos()
returns int language plpgsql security definer set search_path = '' as $$
declare v_dias int; r record; total int := 0;
begin
  select papelera_dias into v_dias from public.ajustes_empresa where id = 1;
  for r in select id from public.lotes_papelera where purgado_en is null and restaurado_en is null and creado_en < now() - make_interval(days => v_dias) loop
    total := total + public.papelera_purgar(r.id);
  end loop;
  return total;
end;
$$;

do $$
declare f text;
begin
  for f in select unnest(array['papelera_enviar(public.tipo_lote_papelera,uuid[])', 'papelera_listar(public.tipo_lote_papelera)', 'papelera_restaurar(uuid)', 'papelera_purgar(uuid)']) loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  revoke all on function public.papelera_purgar_vencidos() from public, anon, authenticated;
  grant execute on function public.papelera_purgar_vencidos() to service_role;
end $$;
