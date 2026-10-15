-- Auditoría de leads (Fase 3, parte 6a). Escrito a mano.
--
-- Toda RPC que recibe un lead cae en una de tres clases (docs/DECISIONES.md, 2026-10-15):
--   1. CONTENIDO Y DATOS PRIVADOS (editar, teléfonos, seguimientos, recordatorios, portal, vínculo a
--      vehículos, interesados): exige la CARTERA **y** el permiso. «Todos» no basta.
--   2. MOVER QUIÉN TIENE EL LEAD (compartir, transferir, revocar, salir): lo hace el dueño; quien tiene
--      el permiso en «todos» también, pero nadie se concede acceso a sí mismo. El destino es una
--      persona activa, no bloqueada y con `leads.ver`.
--   3. PAPELERA (enviar, restaurar, purgar): vale el permiso con su alcance; no abre datos privados.
-- Más dos que no mueven nada: lecturas (ver alcanza; la base recorta) y las marcas de quien mira.
--
-- Lo que no se ve —ajeno, limbo, papelera o inexistente— responde siempre
-- «No encontramos este lead o no tienes acceso.» (42501): sin oráculo.
--
-- Toda firma que se reemplaza con otra distinta se `drop`ea: si no, la vieja sigue llamable como
-- sobrecarga. `supabase/tests/auditoria-leads.sql` (db:probar) lo vigila.

-- ---------------------------------------------------------------------------
-- Permisos: `leads.compartir` gana alcance y la papelera de leads tiene su propio purgar
-- ---------------------------------------------------------------------------
-- «Propios» = los leads de los que soy dueño; «todos» = cualquiera que veo (supervisión).
update public.permisos set con_alcance = true,
  descripcion = 'Dar y quitar acceso compartido (propios = los leads de los que soy dueño; todos = cualquiera que veo)',
  aplicado_en = 'lead_compartir, lead_revocar_acceso, lead_cartera_candidatos'
where clave = 'leads.compartir';
update public.permisos set aplicado_en = 'lead_transferir, lead_cartera_candidatos' where clave = 'leads.transferir';
update public.permisos set descripcion = 'Enviar leads a la papelera (propios = los míos como dueño)',
  aplicado_en = 'leads_papelera_enviar' where clave = 'leads.eliminar';
update public.permisos set aplicado_en = 'otorgar_portal, revocar_portal, policy accesos_portal' where clave = 'leads.portal.gestionar';
update public.permisos set aplicado_en = 'vehiculos_papelera_*, papelera_* (cotizaciones), policy lotes_papelera' where clave = 'vehiculos.papelera.purgar';

insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden) values
  ('leads.papelera.purgar', 'leads', 'Vaciar la papelera de leads', 'Ver toda la papelera de leads, restaurar y purgar antes de tiempo', false, false, 'leads_papelera_*, policy lotes_papelera', 195)
on conflict (clave) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, por_origen = excluded.por_origen,
  con_alcance = excluded.con_alcance, aplicado_en = excluded.aplicado_en, modulo = excluded.modulo, orden = excluded.orden;

-- Quien ya vaciaba la papelera la sigue vaciando.
insert into public.roles_permisos (rol_id, permiso_clave, alcance)
select rp.rol_id, 'leads.papelera.purgar', 'todos'
from public.roles_permisos rp where rp.permiso_clave = 'vehiculos.papelera.purgar'
on conflict do nothing;

-- Quien compartía sin alcance (todos) conserva «todos» sólo si ya ve a todos; el resto, «propios».
update public.roles_permisos c set alcance = 'propios'
where c.permiso_clave = 'leads.compartir' and c.alcance = 'todos'
  and not exists (select 1 from public.roles_permisos v
                  where v.rol_id = c.rol_id and v.permiso_clave = 'leads.ver' and v.alcance = 'todos');

-- ---------------------------------------------------------------------------
-- Ayudantes
-- ---------------------------------------------------------------------------
-- `puede_lead()` queda como estaba: es para LEER (ver alcanza y la base recorta). Para ACTUAR sobre
-- el contenido de un lead se usa esta: lo ve, está en su cartera y tiene el permiso.
create or replace function public.puede_actuar_lead(p_lead uuid, p_clave text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_lead is not null and p_clave is not null
    and public.puede_lead(p_lead, 'leads.ver')
    and public.en_cartera(p_lead)
    and public.alcance_de(p_clave) is not null;
$$;
revoke all on function public.puede_actuar_lead(uuid, text) from public, anon;
grant execute on function public.puede_actuar_lead(uuid, text) to authenticated;

-- Una sola puerta para la clase 1. Reemplaza a `_lead_de_cartera()` (4b) y a `_lead_mio(uuid)` (5a).
drop function if exists public._lead_mio(uuid);
drop function if exists public._lead_de_cartera(uuid);
create or replace function public._lead_mio(p_lead uuid, p_clave text default 'leads.editar', p_bloquear boolean default false)
returns public.leads language plpgsql security definer set search_path = '' as $$
declare l public.leads;
begin
  perform public.assert_activo();
  if not public.puede_actuar_lead(p_lead, p_clave) then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  if p_bloquear then
    select * into l from public.leads x where x.id = p_lead and x.eliminado_en is null for update;
  else
    select * into l from public.leads x where x.id = p_lead and x.eliminado_en is null;
  end if;
  if not found then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  return l;
end;
$$;
revoke all on function public._lead_mio(uuid, text, boolean) from public, anon, authenticated;

-- Para la clase 2: el lead que se ve, bloqueado (serializa dos movimientos a la vez; no mueve la versión).
create or replace function public._lead_para_mover(p_lead uuid)
returns public.leads language plpgsql security definer set search_path = '' as $$
declare l public.leads;
begin
  perform public.assert_activo();
  if p_lead is null or not public.puede_lead(p_lead, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  select * into l from public.leads x where x.id = p_lead and x.eliminado_en is null for update;
  if not found then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  return l;
end;
$$;
revoke all on function public._lead_para_mover(uuid) from public, anon, authenticated;

create or replace function public._lead_dueno(p_lead uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select a.usuario_id from public.leads_asesores a
  where a.lead_id = p_lead and a.tipo_acceso = 'dueno' and a.revocado_en is null;
$$;
revoke all on function public._lead_dueno(uuid) from public, anon, authenticated;

-- Quién tiene un lead: nombres y tipo de acceso. Nada de correo ni teléfono.
create or replace function public._lead_cartera_json(p_lead uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'usuario_id', a.usuario_id,
      'nombre', coalesce(nullif(btrim(p.nombre), ''), 'Sin nombre'),
      'tipo_acceso', a.tipo_acceso,
      'desde', a.desde,
      'compartido_por', nullif(btrim(q.nombre), ''),
      'es_yo', a.usuario_id = (select auth.uid()))
    order by (a.tipo_acceso = 'dueno') desc, a.desde, a.usuario_id), '[]'::jsonb)
  from public.leads_asesores a
  join public.perfiles p on p.id = a.usuario_id
  left join public.perfiles q on q.id = a.compartido_por
  where a.lead_id = p_lead and a.revocado_en is null;
$$;
revoke all on function public._lead_cartera_json(uuid) from public, anon, authenticated;

-- El destino de compartir o transferir: existe, activo, no bloqueado y con `leads.ver`.
create or replace function public._lead_destino_validar(p_usuario uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if p_usuario is null or not exists (select 1 from public.perfiles p where p.id = p_usuario) then
    raise exception 'No encontramos a esa persona.' using errcode = '22023', hint = 'usuario';
  end if;
  if not exists (select 1 from public.perfiles p where p.id = p_usuario and p.activo and not p.bloqueado) then
    raise exception 'Esa persona no está activa en el equipo.' using errcode = '22023', hint = 'usuario';
  end if;
  if not public.usuario_tiene_permiso(p_usuario, 'leads.ver') then
    raise exception 'Esa persona no puede ver leads.' using errcode = '22023', hint = 'usuario';
  end if;
end;
$$;
revoke all on function public._lead_destino_validar(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Clase 1: lo que ya estaba por cartera pasa por la misma puerta
-- ---------------------------------------------------------------------------
-- lead_guardar: «todos» sin cartera ya no edita contenido (antes editaba lo no privado).
create or replace function public.lead_guardar(p_lead uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_permitidas constant text[] := array['nombre', 'tipo', 'origen_lead_id', 'atributos'];
  v_k text;
  l public.leads;
  n public.leads;
  v_nombre text;
  v_tipo public.tipo_lead;
  v_origen uuid;
  v_atributos jsonb;
  e record;
begin
  perform public.assert_activo();
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios de un lead tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_cambios) loop
    if not (v_k = any (v_permitidas)) then
      raise exception 'El dato «%» no va suelto: los campos del lead se mandan dentro de «atributos».', v_k
        using errcode = '22023', hint = v_k;
    end if;
  end loop;

  -- Inexistente, limbo, papelera, ajeno y «lo veo pero no es mío»: la misma respuesta.
  l := public._lead_mio(p_lead, 'leads.editar', true);
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;

  v_nombre := l.nombre;
  v_tipo := l.tipo;
  v_origen := l.origen_lead_id;
  v_atributos := l.atributos;

  if p_cambios ? 'nombre' then
    if jsonb_typeof(p_cambios -> 'nombre') <> 'string' then
      raise exception 'Escribe el nombre.' using errcode = '22023', hint = 'nombre';
    end if;
    v_nombre := btrim(p_cambios ->> 'nombre');
    if v_nombre = '' then
      raise exception 'Escribe el nombre.' using errcode = '22023', hint = 'nombre';
    end if;
    if char_length(v_nombre) > 120 then
      raise exception 'El nombre admite hasta 120 caracteres.' using errcode = '22023', hint = 'nombre';
    end if;
  end if;

  if p_cambios ? 'tipo' then
    begin
      v_tipo := (p_cambios ->> 'tipo')::public.tipo_lead;
    exception when invalid_text_representation then
      raise exception 'El tipo de lead no es uno de los que hay.' using errcode = '22023', hint = 'tipo';
    end;
    if v_tipo is null then
      raise exception 'El tipo de lead no es uno de los que hay.' using errcode = '22023', hint = 'tipo';
    end if;
  end if;

  if p_cambios ? 'origen_lead_id' then
    begin
      v_origen := nullif(p_cambios ->> 'origen_lead_id', '')::uuid;
    exception when invalid_text_representation then
      raise exception 'Ese origen del lead no existe.' using errcode = '22023', hint = 'origen_lead_id';
    end;
    -- Sólo si cambia: uno desactivado que el lead ya tiene se conserva.
    if v_origen is distinct from l.origen_lead_id then
      if v_origen is not null then
        if not exists (select 1 from public.origenes_lead o where o.id = v_origen and o.activo) then
          raise exception 'Ese origen del lead está desactivado o ya no existe.' using errcode = '22023', hint = 'origen_lead_id';
        end if;
      elsif exists (select 1 from public.origenes_lead o where o.activo) then
        raise exception 'Elige de dónde viene el lead.' using errcode = '22023', hint = 'origen_lead_id';
      end if;
    end if;
  end if;

  if p_cambios ? 'atributos' then
    if jsonb_typeof(p_cambios -> 'atributos') <> 'object' then
      raise exception 'Los atributos de un lead tienen que ser un objeto.' using errcode = '22023';
    end if;
    for e in select x.key, x.value from jsonb_each(p_cambios -> 'atributos') x loop
      if e.value = 'null'::jsonb then
        v_atributos := v_atributos - e.key;
      else
        v_atributos := v_atributos || jsonb_build_object(e.key, e.value);
      end if;
    end loop;
  end if;

  -- Guardar lo que ya está guardado no es un conflicto: un reintento tras perder la respuesta no
  -- choca consigo mismo, y quien no cambió nada no pisa a nadie.
  if (v_nombre, v_tipo, v_origen, v_atributos) is not distinct from (l.nombre, l.tipo, l.origen_lead_id, l.atributos) then
    return jsonb_build_object('actualizado_en', l.actualizado_en);
  end if;
  if l.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._lead_conflicto(l.id, l.actualizado_en);
  end if;

  -- `atributos` va siempre en el SET: el trigger que valida el layout se dispara por columna
  -- nombrada, así que un lead al que le falta un requerido nuevo no se guarda ni cambiándole
  -- sólo el tipo.
  update public.leads x set
    nombre = v_nombre, tipo = v_tipo, origen_lead_id = v_origen, atributos = v_atributos
  where x.id = l.id
  returning * into n;
  return jsonb_build_object('actualizado_en', n.actualizado_en);
end;
$$;

-- Teléfonos: el mismo orden que antes, con la puerta única y el mismo mensaje.
create or replace function public.cambiar_telefono_lead(p_lead uuid, p_actualizado_en_esperado timestamptz, p_cc text, p_tel text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  l public.leads;
  v_cc text;
  v_cc_digitos text;
  v_tel text;
  v_verif jsonb;
  v_estado text;
begin
  l := public._lead_mio(p_lead, 'leads.editar', true);
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  v_cc := coalesce(nullif(btrim(p_cc), ''), (select e.telefono_cc from public.ajustes_empresa e where e.id = 1));
  v_tel := public.normalizar_telefono(v_cc, p_tel);
  -- El mismo número no es un conflicto aunque la versión sea otra: un reintento no choca consigo mismo.
  if v_tel = l.telefono_principal then
    return public._lead_telefonos_estado(l.id, 'sin_cambios');
  end if;
  v_verif := public._lead_verificar(v_tel, l.id);
  v_estado := v_verif ->> 'estado';
  if v_estado in ('existe', 'de_otro', 'limbo') then
    return jsonb_build_object('resultado', v_estado, 'verificacion', v_verif);
  end if;
  if l.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._lead_conflicto(l.id, l.actualizado_en);
  end if;

  v_cc_digitos := regexp_replace(coalesce(v_cc, ''), '\D', '', 'g');
  begin
    update public.leads x set
      telefono_cc = case when v_cc_digitos <> '' and v_tel like v_cc_digitos || '%' then '+' || v_cc_digitos end,
      telefono_principal = v_tel
    where x.id = l.id;
  exception when unique_violation then
    -- Otra persona tomó ese número justo ahora: se dice como valor, no como error.
    v_verif := public._lead_verificar(v_tel, l.id);
    v_estado := v_verif ->> 'estado';
    if v_estado in ('existe', 'de_otro', 'limbo') then
      return jsonb_build_object('resultado', v_estado, 'verificacion', v_verif);
    end if;
    raise exception 'Ese teléfono cambió mientras guardabas. Vuelve a intentarlo.' using errcode = 'PT409';
  end;

  delete from public.leads_telefonos t where t.lead_id = l.id and t.telefono = v_tel;
  insert into public.leads_telefonos (lead_id, telefono, etiqueta)
  values (l.id, l.telefono_principal, 'Anterior')
  on conflict (lead_id, telefono) do nothing;

  perform public.registrar_actividad('lead.telefono_cambiado', 'leads', l.id::text, null, null,
    jsonb_build_object('anterior', public.enmascarar_telefono(l.telefono_principal),
                       'nuevo', public.enmascarar_telefono(v_tel)));
  return public._lead_telefonos_estado(l.id, 'cambiado');
end;
$$;

create or replace function public.lead_telefono_guardar(p_lead uuid, p_id uuid, p_cc text, p_tel text, p_etiqueta text default null, p_creado_en timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  l public.leads;
  t public.leads_telefonos;
  v_cc text;
  v_tel text;
  v_etiqueta text;
  v_msg text;
begin
  l := public._lead_mio(p_lead, 'leads.editar', true);
  if p_id is null then
    raise exception 'Falta el identificador del teléfono.' using errcode = '22023';
  end if;
  v_etiqueta := nullif(btrim(coalesce(p_etiqueta, '')), '');
  if char_length(v_etiqueta) > 40 then
    raise exception 'La etiqueta admite hasta 40 caracteres.' using errcode = '22023', hint = 'etiqueta';
  end if;
  v_cc := coalesce(nullif(btrim(p_cc), ''), (select e.telefono_cc from public.ajustes_empresa e where e.id = 1));
  begin
    v_tel := public.normalizar_telefono(v_cc, p_tel);
  exception when sqlstate '22023' then
    get stacked diagnostics v_msg = message_text;
    raise exception '%', v_msg using errcode = '22023', hint = 'telefono';
  end;

  select * into t from public.leads_telefonos x where x.id = p_id;
  if found then
    if t.lead_id <> l.id then
      raise exception 'No pudimos guardar este teléfono. Vuelve a intentarlo.' using errcode = '22023';
    end if;
    if t.telefono <> v_tel then
      raise exception 'Para cambiar el número, quita este teléfono y agrega el nuevo.'
        using errcode = '22023', hint = 'telefono';
    end if;
    if t.etiqueta is distinct from v_etiqueta then
      update public.leads_telefonos x set etiqueta = v_etiqueta where x.id = t.id;
      perform public.registrar_actividad('lead.telefono_extra_rotulado', 'leads', l.id::text, null, null,
        jsonb_build_object('telefono', public.enmascarar_telefono(v_tel)));
      return public._lead_telefonos_estado(l.id, 'rotulado');
    end if;
    return public._lead_telefonos_estado(l.id, 'sin_cambios');
  end if;

  if v_tel = l.telefono_principal
     or exists (select 1 from public.leads_telefonos x where x.lead_id = l.id and x.telefono = v_tel) then
    raise exception 'Ese número ya está en este lead.' using errcode = '22023', hint = 'telefono';
  end if;
  if (select count(*) from public.leads_telefonos x where x.lead_id = l.id) >= 10 then
    raise exception 'Un lead admite hasta 10 teléfonos extra. Quita uno para agregar otro.'
      using errcode = '22023', hint = 'telefono';
  end if;
  insert into public.leads_telefonos (id, lead_id, telefono, etiqueta, creado_en)
  values (p_id, l.id, v_tel, v_etiqueta, least(coalesce(p_creado_en, now()), now()));
  perform public.registrar_actividad('lead.telefono_extra_agregado', 'leads', l.id::text, null, null,
    jsonb_build_object('telefono', public.enmascarar_telefono(v_tel)));
  return public._lead_telefonos_estado(l.id, 'agregado');
end;
$$;

create or replace function public.lead_telefono_quitar(p_lead uuid, p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  l public.leads;
  t public.leads_telefonos;
begin
  l := public._lead_mio(p_lead, 'leads.editar', true);
  delete from public.leads_telefonos x where x.id = p_id and x.lead_id = l.id returning * into t;
  if not found then
    return public._lead_telefonos_estado(l.id, 'sin_cambios') || jsonb_build_object('quitado', null);
  end if;
  perform public.registrar_actividad('lead.telefono_extra_quitado', 'leads', l.id::text, null, null,
    jsonb_build_object('telefono', public.enmascarar_telefono(t.telefono)));
  return public._lead_telefonos_estado(l.id, 'quitado') || jsonb_build_object('quitado',
    jsonb_build_object('id', t.id, 'telefono', t.telefono, 'etiqueta', t.etiqueta, 'creado_en', t.creado_en));
end;
$$;

create or replace function public.verificar_telefono_de_lead(p_lead uuid, p_cc text, p_tel text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare l public.leads; v_tel text; v jsonb;
begin
  perform public.assert_activo();
  if not public.puede_actuar_lead(p_lead, 'leads.editar') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  select * into l from public.leads x where x.id = p_lead and x.eliminado_en is null;
  if not found then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  v_tel := public.normalizar_telefono(
    coalesce(nullif(btrim(p_cc), ''), (select e.telefono_cc from public.ajustes_empresa e where e.id = 1)), p_tel);
  if v_tel = l.telefono_principal then
    return jsonb_build_object('estado', 'mismo');
  end if;
  v := public._lead_verificar(v_tel, l.id);
  if (v ->> 'estado') = 'libre'
     and exists (select 1 from public.leads_telefonos t where t.lead_id = l.id and t.telefono = v_tel) then
    v := v || jsonb_build_object('es_extra', true);
  end if;
  return v;
end;
$$;

-- Portal: cartera + permiso, el mismo mensaje y tuteo. Revocar lo que no está vigente no deja constancia.
create or replace function public.otorgar_portal(p_lead uuid, p_clave text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_codigo text; v_prefijo text;
begin
  perform public._lead_mio(p_lead, 'leads.portal.gestionar', true);
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
  perform public._lead_mio(p_lead, 'leads.portal.gestionar', true);
  update public.accesos_portal set habilitado = false, revocado_por = (select auth.uid()), revocado_en = now()
  where lead_id = p_lead and habilitado;
  if found then
    perform public.registrar_actividad('portal.revocado', 'accesos_portal', p_lead::text, null, null);
  end if;
end;
$$;

-- Editar o eliminar un seguimiento: su autor, con el lead en la cartera y `leads.editar`.
create or replace function public._seguimiento_mio(p_id uuid)
returns public.seguimientos language plpgsql security definer set search_path = '' as $$
declare s public.seguimientos;
begin
  perform public.assert_activo();
  select * into s from public.seguimientos x where x.id = p_id for update;
  if not found
     or s.usuario_id <> (select auth.uid())
     or not public.puede_actuar_lead(s.lead_id, 'leads.editar') then
    raise exception 'No encontramos este seguimiento o no tienes acceso.' using errcode = '42501';
  end if;
  return s;
end;
$$;
revoke all on function public._seguimiento_mio(uuid) from public, anon, authenticated;

-- Vínculo e interesados (la interfaz es de la 6b): sólo se cierra el hueco de permiso.
create or replace function public.vehiculo_vincular(p_vehiculo uuid, p_actualizado_en_esperado timestamptz, p_lead uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.vehiculos; v_version timestamptz;
begin
  perform public.assert_activo();
  select * into v from public.vehiculos x where x.id = p_vehiculo and x.eliminado_en is null for update;
  if not found then
    raise exception 'Ese vehículo ya no existe o está en la papelera.' using errcode = 'PT409';
  end if;
  if not public.puede_vehiculo(v.id, 'vehiculos.editar') then
    raise exception 'No tienes permiso para vincular este vehículo.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  -- Ya está como se lo pidió: un reintento no choca consigo mismo.
  if v.lead_id is not distinct from p_lead then
    return jsonb_build_object('actualizado_en', v.actualizado_en);
  end if;
  -- Vincular le da el vehículo a la cartera de ese lead: exige tenerlo en la propia, con `leads.editar`.
  -- Desvincular (p_lead nulo) es una acción sobre el vehículo y no entrega nada del lead.
  if p_lead is not null and not public.puede_actuar_lead(p_lead, 'leads.editar') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  if v.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('vehiculos', v.id, v.actualizado_en, 'este vehículo');
  end if;
  update public.vehiculos x set lead_id = p_lead where x.id = v.id returning x.actualizado_en into v_version;
  return jsonb_build_object('actualizado_en', v_version);
end;
$$;

create or replace function public.vehiculo_interesado_marcar(p_vehiculo uuid, p_lead uuid, p_nota text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_nota text := nullif(btrim(p_nota), '');
begin
  perform public.assert_activo();
  if not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
    raise exception 'Ese vehículo no existe o no tienes acceso.' using errcode = '42501';
  end if;
  if not public.puede_actuar_lead(p_lead, 'leads.editar') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  if char_length(v_nota) > 500 then
    raise exception 'La nota no puede pasar de 500 caracteres.' using errcode = '22023', hint = 'nota';
  end if;
  insert into public.vehiculos_interesados (vehiculo_id, lead_id, usuario_id, nota)
  values (p_vehiculo, p_lead, (select auth.uid()), v_nota)
  on conflict (vehiculo_id, lead_id) do nothing;
end;
$$;

create or replace function public.vehiculo_interesado_quitar(p_vehiculo uuid, p_lead uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_activo();
  if not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
    raise exception 'Ese vehículo no existe o no tienes acceso.' using errcode = '42501';
  end if;
  if not public.puede_actuar_lead(p_lead, 'leads.editar') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  delete from public.vehiculos_interesados i where i.vehiculo_id = p_vehiculo and i.lead_id = p_lead;
end;
$$;

-- ---------------------------------------------------------------------------
-- Clase 2: quién tiene el lead
-- ---------------------------------------------------------------------------
drop function if exists public.compartir_lead(uuid, uuid);
drop function if exists public.transferir_lead(uuid, uuid);
drop function if exists public.revocar_acceso_lead(uuid, uuid);

create or replace function public.lead_compartir(p_lead uuid, p_usuario uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare l public.leads; v_dueno uuid; v_alcance public.alcance_permiso; v_yo uuid := (select auth.uid());
begin
  l := public._lead_para_mover(p_lead);
  v_dueno := public._lead_dueno(l.id);
  v_alcance := public.alcance_de('leads.compartir');
  if v_alcance is null then
    raise exception 'No tienes permiso para compartir este lead.' using errcode = '42501';
  end if;
  if v_alcance <> 'todos' and v_dueno is distinct from v_yo then
    raise exception 'Sólo quien es dueño del lead lo comparte.' using errcode = '42501';
  end if;
  -- Nadie se da acceso a sí mismo: si ya lo tiene no pasa nada, si no, no se lo puede dar.
  if p_usuario = v_yo then
    if public.en_cartera(l.id) then
      return jsonb_build_object('resultado', 'sin_cambios', 'cartera', public._lead_cartera_json(l.id));
    end if;
    raise exception 'No puedes darte acceso a un lead que no tienes.' using errcode = '42501', hint = 'usuario';
  end if;
  perform public._lead_destino_validar(p_usuario);
  if exists (select 1 from public.leads_asesores a where a.lead_id = l.id and a.usuario_id = p_usuario and a.revocado_en is null) then
    return jsonb_build_object('resultado', 'sin_cambios', 'cartera', public._lead_cartera_json(l.id));
  end if;
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por)
  values (l.id, p_usuario, 'compartido', v_yo)
  on conflict (lead_id, usuario_id) do update set tipo_acceso = 'compartido', revocado_en = null, revocado_por = null,
    compartido_por = excluded.compartido_por, desde = now();
  perform public.registrar_actividad('lead.compartido', 'leads', l.id::text, null, jsonb_build_object('con', p_usuario));
  return jsonb_build_object('resultado', 'compartido', 'cartera', public._lead_cartera_json(l.id));
end;
$$;

create or replace function public.lead_transferir(p_lead uuid, p_destino uuid, p_dueno_esperado uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare l public.leads; v_dueno uuid; v_alcance public.alcance_permiso; v_yo uuid := (select auth.uid()); v_nombre text;
begin
  l := public._lead_para_mover(p_lead);
  v_dueno := public._lead_dueno(l.id);
  v_alcance := public.alcance_de('leads.transferir');
  if v_alcance is null then
    raise exception 'No tienes permiso para transferir este lead.' using errcode = '42501';
  end if;
  -- Ya está como se pidió: un reintento tras perder la respuesta no choca consigo mismo.
  if v_dueno is not null and v_dueno = p_destino then
    return jsonb_build_object('resultado', 'sin_cambios', 'dueno', v_dueno, 'cartera', public._lead_cartera_json(l.id));
  end if;
  if v_alcance <> 'todos' and v_dueno is distinct from v_yo then
    raise exception 'Sólo quien es dueño del lead lo transfiere.' using errcode = '42501';
  end if;
  -- Nadie se concede un lead que no es suyo, ni como destino: ni la supervisión ni un compartido.
  if p_destino = v_yo then
    raise exception 'No puedes transferirte un lead que no es tuyo.' using errcode = '42501', hint = 'usuario';
  end if;
  perform public._lead_destino_validar(p_destino);
  if p_dueno_esperado is distinct from v_dueno then
    select nullif(btrim(p.nombre), '') into v_nombre from public.perfiles p where p.id = v_dueno;
    raise exception 'Este lead cambió de dueño: ahora lo tiene %. Recarga para ver quién lo tiene.',
      case when v_dueno = v_yo then 'tú' else coalesce(v_nombre, 'otra persona') end
      using errcode = 'PT409';
  end if;

  -- El saliente conserva acceso compartido.
  update public.leads_asesores set tipo_acceso = 'compartido'
  where lead_id = l.id and tipo_acceso = 'dueno' and revocado_en is null;
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso) values (l.id, p_destino, 'dueno')
  on conflict (lead_id, usuario_id) do update set tipo_acceso = 'dueno', revocado_en = null, revocado_por = null, desde = now();
  update public.oportunidades set usuario_id = p_destino
  where lead_id = l.id and estado = 'abierta' and usuario_id is not distinct from v_dueno;
  perform public.registrar_actividad('lead.transferido', 'leads', l.id::text,
    jsonb_build_object('de', v_dueno), jsonb_build_object('a', p_destino));
  return jsonb_build_object('resultado', 'transferido', 'dueno', p_destino, 'cartera', public._lead_cartera_json(l.id));
end;
$$;

create or replace function public.lead_revocar_acceso(p_lead uuid, p_usuario uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare l public.leads; v_dueno uuid; v_alcance public.alcance_permiso; v_yo uuid := (select auth.uid());
begin
  l := public._lead_para_mover(p_lead);
  v_dueno := public._lead_dueno(l.id);
  v_alcance := public.alcance_de('leads.compartir');
  if v_alcance is null then
    raise exception 'No tienes permiso para quitar el acceso a este lead.' using errcode = '42501';
  end if;
  if p_usuario is not null and p_usuario = v_dueno then
    raise exception 'Al dueño no se le quita el acceso: transfiere el lead.' using errcode = '23514', hint = 'usuario';
  end if;
  if p_usuario = v_yo then
    raise exception 'Para dejar este lead usa «Salir de este lead».' using errcode = '23514', hint = 'usuario';
  end if;
  if v_alcance <> 'todos' and v_dueno is distinct from v_yo then
    raise exception 'Sólo quien es dueño del lead quita accesos.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.leads_asesores a where a.lead_id = l.id and a.usuario_id = p_usuario and a.revocado_en is null) then
    return jsonb_build_object('resultado', 'sin_cambios', 'cartera', public._lead_cartera_json(l.id));
  end if;
  -- El limbo sólo nace de una baja: nadie deja un lead sin ninguna persona.
  if not exists (select 1 from public.leads_asesores a where a.lead_id = l.id and a.usuario_id <> p_usuario and a.revocado_en is null) then
    raise exception 'Es la única persona que lo tiene: transfiérelo antes de quitarle el acceso.'
      using errcode = '23514', hint = 'usuario';
  end if;
  update public.leads_asesores set revocado_en = now(), revocado_por = v_yo
  where lead_id = l.id and usuario_id = p_usuario and revocado_en is null;
  perform public.registrar_actividad('lead.acceso_revocado', 'leads', l.id::text, jsonb_build_object('a', p_usuario), null);
  return jsonb_build_object('resultado', 'revocado', 'cartera', public._lead_cartera_json(l.id));
end;
$$;

-- «Salir de este lead»: un compartido se quita a sí mismo, y nada más. No pide permiso: es renunciar.
create or replace function public.lead_salir(p_lead uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare l public.leads; v_yo uuid := (select auth.uid()); a public.leads_asesores;
begin
  perform public.assert_activo();
  if p_lead is null then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  select * into l from public.leads x
   where x.id = p_lead and x.eliminado_en is null and public.en_cartera(x.id) and not public.lead_en_limbo(x.id)
   for update;
  if not found then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  select * into a from public.leads_asesores x where x.lead_id = l.id and x.usuario_id = v_yo and x.revocado_en is null;
  if a.tipo_acceso = 'dueno' then
    raise exception 'Eres quien tiene este lead: transfiérelo para dejarlo.' using errcode = '23514';
  end if;
  if not exists (select 1 from public.leads_asesores x where x.lead_id = l.id and x.usuario_id <> v_yo and x.revocado_en is null) then
    raise exception 'Eres la única persona que lo tiene: transfiérelo antes de salir.' using errcode = '23514';
  end if;
  update public.leads_asesores set revocado_en = now(), revocado_por = v_yo
  where lead_id = l.id and usuario_id = v_yo and revocado_en is null;
  perform public.registrar_actividad('lead.salio', 'leads', l.id::text, null, null);
  return jsonb_build_object('resultado', 'salio');
end;
$$;

-- Quién lo tiene: para quien ve el lead (también la supervisión sin cartera). Nombres, nada de contacto.
create or replace function public.lead_cartera(p_lead uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if p_lead is null or not public.puede_lead(p_lead, 'leads.ver') then
    return null;
  end if;
  return public._lead_cartera_json(p_lead);
end;
$$;

-- A quién se le puede dar el lead: activas, con `leads.ver`, que no lo tienen ni son quien pregunta.
create or replace function public.lead_cartera_candidatos(p_lead uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if p_lead is null or not public.puede_lead(p_lead, 'leads.ver')
     or (public.alcance_de('leads.compartir') is null and public.alcance_de('leads.transferir') is null) then
    return '[]'::jsonb;
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'nombre', x.nombre) order by lower(x.nombre), x.id)
    from (
      select p.id, coalesce(nullif(btrim(p.nombre), ''), 'Sin nombre') as nombre
      from public.perfiles p
      where p.activo and not p.bloqueado and p.id <> (select auth.uid())
        and public.usuario_tiene_permiso(p.id, 'leads.ver')
        and not exists (select 1 from public.leads_asesores a
                        where a.lead_id = p_lead and a.usuario_id = p.id and a.revocado_en is null)
      order by lower(coalesce(nullif(btrim(p.nombre), ''), 'Sin nombre')), p.id
      limit 500
    ) x), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- Clase 3: la papelera de leads
-- ---------------------------------------------------------------------------
-- Qué impide enviar (p_al_enviar) o purgar un lead. Una sola lista, como `_vehiculo_motivo_de_bloqueo`.
create or replace function public._lead_motivo_de_bloqueo(l public.leads, p_al_enviar boolean)
returns text language plpgsql stable security definer set search_path = '' as $$
begin
  if exists (select 1 from public.vehiculos v where v.lead_id = l.id and (not p_al_enviar or v.eliminado_en is null)) then
    return case when p_al_enviar then 'Tiene un vehículo vinculado: desvincúlalo antes de enviarlo.'
                else 'Tiene un vehículo vinculado: desvincúlalo antes de purgarlo.' end;
  end if;
  if not p_al_enviar then
    if exists (select 1 from public.pagos p where p.lead_id = l.id) then
      return 'Tiene pagos registrados.';
    end if;
    if exists (select 1 from public.accesos_portal a where a.lead_id = l.id and a.habilitado) then
      return 'Tiene el acceso al portal vigente.';
    end if;
  end if;
  return null;
end;
$$;
revoke all on function public._lead_motivo_de_bloqueo(public.leads, boolean) from public, anon, authenticated;

-- Por qué un lead de la papelera no puede volver: su teléfono ya lo tiene otro lead vivo. Dice lo mismo
-- que dice el alta (`_lead_verificar`): a quien ve ese lead, cuál es; a quien no, de quién.
create or replace function public._lead_motivo_de_restaurar(l public.leads)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  v := public._lead_verificar(l.telefono_principal, l.id);
  return case v ->> 'estado'
    when 'existe' then format('«%s» (#%s) ya tiene este teléfono.', v ->> 'nombre', v ->> 'numero')
    when 'de_otro' then format('Ese teléfono ya lo tiene un lead de %s.', coalesce(v ->> 'dueno', 'otra persona'))
    when 'limbo' then 'Ese teléfono ya lo tiene un lead sin dueño.'
    else null end;
end;
$$;
revoke all on function public._lead_motivo_de_restaurar(public.leads) from public, anon, authenticated;

-- Enviar: todo o nada, hasta 200, idempotente por el lote que trae el cliente. Sin versión por lead: no
-- pisa nada (lo restaurado vuelve intacto) y la versión de cada uno rechazaría un lote entero porque
-- alguien anotó un dato. Revoca el portal vigente; las oportunidades quedan.
create or replace function public.leads_papelera_enviar(p_lote uuid, p_leads uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_ids uuid[]; v_id uuid; v_n int; v_alcance public.alcance_permiso; v_lote public.lotes_papelera;
  v_yo uuid := (select auth.uid()); l public.leads; v_motivo text; v_portal int; v_version timestamptz;
begin
  perform public.assert_activo();
  if p_lote is null then
    raise exception 'Falta el identificador del envío.' using errcode = '22023';
  end if;
  if coalesce(array_length(p_leads, 1), 0) = 0 then
    raise exception 'Nada que enviar.' using errcode = '22023';
  end if;
  if array_length(p_leads, 1) > 200 then
    raise exception 'Máximo 200 por lote.' using errcode = '22023';
  end if;
  if array_position(p_leads, null) is not null then
    raise exception 'Uno de los leads llegó incompleto. Recarga e intenta de nuevo.' using errcode = '22023';
  end if;
  select array_agg(distinct x order by x) into v_ids from unnest(p_leads) x;

  -- Un reintento con el mismo lote no manda dos veces: devuelve lo que ya se mandó.
  select * into v_lote from public.lotes_papelera x where x.id = p_lote;
  if found then
    if v_lote.tipo <> 'leads' or v_lote.creado_por is distinct from v_yo then
      raise exception 'No pudimos enviar estos leads. Vuelve a intentarlo.' using errcode = '22023';
    end if;
    return jsonb_build_object('lote', v_lote.id, 'actualizado_en', v_lote.actualizado_en, 'repetido', true,
      'portal_revocados', 0,
      'enviados', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'numero', x.numero, 'nombre', x.nombre) order by x.numero)
                            from public.leads x where x.lote_papelera_id = v_lote.id and x.eliminado_en is not null), '[]'::jsonb));
  end if;

  v_alcance := public.alcance_de('leads.eliminar');
  if v_alcance is null then
    raise exception 'No tienes permiso para enviar leads a la papelera.' using errcode = '42501';
  end if;
  -- Primero se mira, sin bloquear: lo que no se ve da el mensaje de siempre y no dice cuál falló.
  foreach v_id in array v_ids loop
    if not public.puede_lead(v_id, 'leads.ver') then
      raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
    end if;
    if v_alcance <> 'todos' and public._lead_dueno(v_id) is distinct from v_yo then
      raise exception 'Sólo quien es dueño de un lead lo envía a la papelera.' using errcode = '42501';
    end if;
  end loop;
  -- Después se bloquea lo que se ve, en orden, y se vuelve a mirar: algo pudo irse mientras tanto.
  select count(*) into v_n from (
    select x.id from public.leads x where x.id = any (v_ids) and x.eliminado_en is null order by x.id for update) s;
  if v_n <> array_length(v_ids, 1) then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  for l in select * from public.leads x where x.id = any (v_ids) order by x.numero loop
    v_motivo := public._lead_motivo_de_bloqueo(l, true);
    if v_motivo is not null then
      raise exception 'No se envió nada. «%»: %', l.nombre, v_motivo using errcode = '23514';
    end if;
  end loop;

  begin
    insert into public.lotes_papelera (id, tipo, creado_por, resumen)
    values (p_lote, 'leads', v_yo, jsonb_build_object('cantidad', v_n, 'restaurados', 0, 'purgados', 0));
  exception when unique_violation then
    raise exception 'Ese envío ya se estaba procesando. Vuelve a intentarlo.' using errcode = 'PT409';
  end;
  update public.leads x set eliminado_en = now(), eliminado_por = v_yo, lote_papelera_id = p_lote
  where x.id = any (v_ids) and x.eliminado_en is null;
  update public.accesos_portal a set habilitado = false, revocado_por = v_yo, revocado_en = now()
  where a.lead_id = any (v_ids) and a.habilitado;
  get diagnostics v_portal = row_count;
  v_version := public._lote_papelera_tocar(p_lote);
  perform public.registrar_actividad('papelera.enviado', 'lotes_papelera', p_lote::text, null, null,
    jsonb_build_object('tipo', 'leads', 'cantidad', v_n, 'portal_revocados', v_portal));
  return jsonb_build_object('lote', p_lote, 'actualizado_en', v_version, 'repetido', false, 'portal_revocados', v_portal,
    'enviados', (select jsonb_agg(jsonb_build_object('id', x.id, 'numero', x.numero, 'nombre', x.nombre) order by x.numero)
                 from public.leads x where x.lote_papelera_id = p_lote));
end;
$$;

-- Los lotes que quien llama puede ver: los suyos, o todos si puede vaciar la papelera de leads. El
-- nombre del lead sale sólo por acá y sólo para esas personas: nunca el teléfono ni los privados.
create or replace function public.leads_papelera_listar()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_dias int; v_todo boolean; v_yo uuid := (select auth.uid());
begin
  perform public.assert_activo();
  select e.papelera_dias into v_dias from public.ajustes_empresa e where e.id = 1;
  v_todo := public.tiene_permiso('leads.papelera.purgar');
  return coalesce((
    select jsonb_agg(x.lote order by x.creado_en desc, x.id)
    from (
      select l.id, l.creado_en, jsonb_build_object(
        'id', l.id, 'actualizado_en', l.actualizado_en, 'creado_en', l.creado_en,
        'creado_por_nombre', nullif(btrim(p.nombre), ''), 'es_mio', l.creado_por is not distinct from v_yo,
        'purga_el', l.creado_en + make_interval(days => v_dias),
        'enviados', coalesce((l.resumen ->> 'cantidad')::int, 0),
        'leads', (
          select jsonb_agg(jsonb_build_object(
            'id', x.id, 'numero', x.numero, 'nombre', x.nombre,
            'motivo_de_bloqueo', public._lead_motivo_de_bloqueo(x, false),
            'motivo_de_restaurar', public._lead_motivo_de_restaurar(x)) order by x.numero)
          from public.leads x where x.lote_papelera_id = l.id and x.eliminado_en is not null)) as lote
      from public.lotes_papelera l left join public.perfiles p on p.id = l.creado_por
      where l.tipo = 'leads'
        and (v_todo or l.creado_por = v_yo)
        and exists (select 1 from public.leads x where x.lote_papelera_id = l.id and x.eliminado_en is not null)
    ) x), '[]'::jsonb);
end;
$$;

create or replace function public.leads_papelera_restaurar(p_lote uuid, p_actualizado_en_esperado timestamptz, p_leads uuid[] default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  l public.lotes_papelera; x public.leads; v_motivo text; v_quedan int; v_version timestamptz;
  v_restaurados jsonb := '[]'::jsonb; v_pendientes jsonb := '[]'::jsonb;
begin
  perform public.assert_activo();
  select * into l from public.lotes_papelera y where y.id = p_lote and y.tipo = 'leads' for update;
  if not found then
    raise exception 'Ese lote ya no está en la papelera.' using errcode = 'PT409';
  end if;
  if l.creado_por is distinct from (select auth.uid()) and not public.tiene_permiso('leads.papelera.purgar') then
    raise exception 'Sólo lo restaura quien lo envió o quien puede vaciar la papelera.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if l.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('lotes_papelera', l.id, l.actualizado_en, 'este lote de la papelera');
  end if;

  for x in
    select * from public.leads y
    where y.lote_papelera_id = l.id and y.eliminado_en is not null and (p_leads is null or y.id = any (p_leads))
    order by y.id for update
  loop
    v_motivo := public._lead_motivo_de_restaurar(x);
    if v_motivo is null then
      begin
        update public.leads y set eliminado_en = null, eliminado_por = null, lote_papelera_id = null where y.id = x.id;
        v_restaurados := v_restaurados || jsonb_build_object('id', x.id, 'numero', x.numero, 'nombre', x.nombre);
      exception when unique_violation then
        -- Otra persona tomó ese teléfono justo ahora.
        v_motivo := coalesce(public._lead_motivo_de_restaurar(x), 'Ese teléfono ya lo tiene otro lead.');
      end;
    end if;
    if v_motivo is not null then
      v_pendientes := v_pendientes || jsonb_build_object('id', x.id, 'numero', x.numero, 'nombre', x.nombre, 'motivo', v_motivo);
    end if;
  end loop;

  select count(*) into v_quedan from public.leads y where y.lote_papelera_id = l.id and y.eliminado_en is not null;
  if jsonb_array_length(v_restaurados) = 0 then
    return jsonb_build_object('actualizado_en', l.actualizado_en, 'restaurados', v_restaurados, 'pendientes', v_pendientes, 'quedan', v_quedan);
  end if;
  update public.lotes_papelera y
  set resumen = y.resumen || jsonb_build_object('restaurados', coalesce((y.resumen ->> 'restaurados')::int, 0) + jsonb_array_length(v_restaurados)),
      restaurado_en = case when v_quedan = 0 then now() else y.restaurado_en end,
      restaurado_por = case when v_quedan = 0 then (select auth.uid()) else y.restaurado_por end
  where y.id = l.id;
  v_version := public._lote_papelera_tocar(l.id);
  perform public.registrar_actividad('papelera.restaurado', 'lotes_papelera', l.id::text, null, null,
    jsonb_build_object('tipo', 'leads', 'cantidad', jsonb_array_length(v_restaurados)));
  return jsonb_build_object('actualizado_en', v_version, 'restaurados', v_restaurados, 'pendientes', v_pendientes, 'quedan', v_quedan);
end;
$$;

-- La purga manual y la automática son la misma función (como en vehículos): lo que la manual bloquea,
-- la automática tampoco lo purga.
create or replace function public._papelera_purgar_leads(p_lote uuid, p_leads uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  x public.leads; v_motivo text; v_quedan int; v_version timestamptz;
  v_purgados jsonb := '[]'::jsonb; v_bloqueados jsonb := '[]'::jsonb;
begin
  for x in
    select * from public.leads y
    where y.lote_papelera_id = p_lote and y.eliminado_en is not null and (p_leads is null or y.id = any (p_leads))
    order by y.id for update
  loop
    v_motivo := public._lead_motivo_de_bloqueo(x, false);
    if v_motivo is null then
      begin
        delete from public.leads y where y.id = x.id;
        v_purgados := v_purgados || jsonb_build_object('id', x.id, 'numero', x.numero, 'nombre', x.nombre);
      exception when foreign_key_violation then
        v_motivo := 'Otros registros dependen de él.';
      end;
    end if;
    if v_motivo is not null then
      v_bloqueados := v_bloqueados || jsonb_build_object('id', x.id, 'numero', x.numero, 'nombre', x.nombre, 'motivo', v_motivo);
    end if;
  end loop;

  select count(*) into v_quedan from public.leads y where y.lote_papelera_id = p_lote and y.eliminado_en is not null;
  if jsonb_array_length(v_purgados) = 0 then
    return jsonb_build_object('actualizado_en', (select z.actualizado_en from public.lotes_papelera z where z.id = p_lote),
      'purgados', v_purgados, 'bloqueados', v_bloqueados, 'quedan', v_quedan);
  end if;
  update public.lotes_papelera z
  set resumen = z.resumen || jsonb_build_object('purgados', coalesce((z.resumen ->> 'purgados')::int, 0) + jsonb_array_length(v_purgados)),
      purgado_en = case when v_quedan = 0 then now() else z.purgado_en end
  where z.id = p_lote;
  v_version := public._lote_papelera_tocar(p_lote);
  perform public.registrar_actividad('papelera.purgado', 'lotes_papelera', p_lote::text, null, null,
    jsonb_build_object('tipo', 'leads', 'cantidad', jsonb_array_length(v_purgados), 'automatica', (select auth.uid()) is null));
  return jsonb_build_object('actualizado_en', v_version, 'purgados', v_purgados, 'bloqueados', v_bloqueados, 'quedan', v_quedan);
end;
$$;
revoke all on function public._papelera_purgar_leads(uuid, uuid[]) from public, anon, authenticated;

create or replace function public.leads_papelera_purgar(p_lote uuid, p_actualizado_en_esperado timestamptz, p_leads uuid[] default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare l public.lotes_papelera;
begin
  perform public.assert_activo();
  if not public.tiene_permiso('leads.papelera.purgar') then
    raise exception 'No tienes permiso para purgar la papelera de leads.' using errcode = '42501';
  end if;
  select * into l from public.lotes_papelera x where x.id = p_lote and x.tipo = 'leads' for update;
  if not found then
    raise exception 'Ese lote ya no está en la papelera.' using errcode = 'PT409';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if l.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('lotes_papelera', l.id, l.actualizado_en, 'este lote de la papelera');
  end if;
  return public._papelera_purgar_leads(l.id, p_leads);
end;
$$;

-- El job de purga: ahora también los lotes de leads (antes quedaban en la papelera para siempre).
create or replace function public.papelera_purgar_vencidos()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_dias int; r record; v_resultado jsonb; total int := 0;
begin
  select e.papelera_dias into v_dias from public.ajustes_empresa e where e.id = 1;
  for r in
    select l.id, l.tipo from public.lotes_papelera l
    where l.tipo in ('vehiculos', 'leads') and l.creado_en < now() - make_interval(days => v_dias)
      and ((l.tipo = 'vehiculos' and exists (select 1 from public.vehiculos v where v.lote_papelera_id = l.id and v.eliminado_en is not null))
        or (l.tipo = 'leads' and exists (select 1 from public.leads x where x.lote_papelera_id = l.id and x.eliminado_en is not null)))
    order by l.creado_en
  loop
    begin
      perform 1 from public.lotes_papelera l where l.id = r.id for update;
      if r.tipo = 'vehiculos' then
        v_resultado := public._papelera_purgar_vehiculos(r.id, null);
      else
        v_resultado := public._papelera_purgar_leads(r.id, null);
      end if;
      total := total + jsonb_array_length(v_resultado -> 'purgados');
    exception when others then
      raise warning 'papelera: no se pudo purgar el lote %: %', r.id, sqlerrm;
    end;
  end loop;
  return total;
end;
$$;

-- Las genéricas quedan para las cotizaciones (Fase 4): vehículos y leads tienen la suya.
create or replace function public._papelera_solo_cotizaciones(p_tipo public.tipo_lote_papelera)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if p_tipo = 'vehiculos' then
    raise exception 'Los vehículos tienen su propia papelera: usa vehiculos_papelera_*().' using errcode = '22023';
  elsif p_tipo = 'leads' then
    raise exception 'Los leads tienen su propia papelera: usa leads_papelera_*().' using errcode = '22023';
  end if;
end;
$$;
revoke all on function public._papelera_solo_cotizaciones(public.tipo_lote_papelera) from public, anon, authenticated;

create or replace function public.papelera_enviar(p_tipo public.tipo_lote_papelera, p_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_lote uuid; n int; v_id uuid;
begin
  perform public.assert_activo();
  perform public._papelera_solo_cotizaciones(p_tipo);
  if coalesce(array_length(p_ids, 1), 0) = 0 then raise exception 'Nada que enviar.' using errcode = '22023'; end if;
  if array_length(p_ids, 1) > 200 then raise exception 'Máximo 200 por lote.' using errcode = '22023'; end if;
  insert into public.lotes_papelera (tipo, creado_por, resumen) values (p_tipo, (select auth.uid()), jsonb_build_object('cantidad', array_length(p_ids, 1))) returning id into v_lote;
  foreach v_id in array p_ids loop
    if not public.puede_cotizacion(v_id, 'cotizaciones.editar') and not public.tiene_permiso('cotizaciones.moderar') then raise exception 'Sin permiso para eliminar la cotización %', v_id using errcode = '42501'; end if;
  end loop;
  update public.cotizaciones set eliminado_en = now(), eliminado_por = (select auth.uid()), lote_papelera_id = v_lote where id = any (p_ids) and eliminado_en is null;
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
  perform public._papelera_solo_cotizaciones(p_tipo);
  select papelera_dias into v_dias from public.ajustes_empresa where id = 1;
  return query select c.id, coalesce(c.titulo, 'Cotización #' || c.numero), c.eliminado_en, c.eliminado_por, c.lote_papelera_id, c.eliminado_en + make_interval(days => v_dias)
    from public.cotizaciones c where c.eliminado_en is not null and (c.eliminado_por = (select auth.uid()) or public.tiene_permiso('vehiculos.papelera.purgar'));
end;
$$;

create or replace function public.papelera_restaurar(p_lote uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_tipo public.tipo_lote_papelera; v_por uuid; n int := 0;
begin
  perform public.assert_activo();
  select tipo, creado_por into v_tipo, v_por from public.lotes_papelera where id = p_lote and purgado_en is null;
  if not found then raise exception 'Lote inexistente o ya purgado.' using errcode = '22023'; end if;
  perform public._papelera_solo_cotizaciones(v_tipo);
  if v_por <> (select auth.uid()) and not public.tiene_permiso('vehiculos.papelera.purgar') then raise exception 'Sólo quien lo envió (o quien purga) lo restaura.' using errcode = '42501'; end if;
  update public.cotizaciones set eliminado_en = null, eliminado_por = null, lote_papelera_id = null where lote_papelera_id = p_lote;
  get diagnostics n = row_count;
  update public.lotes_papelera set restaurado_en = now(), restaurado_por = (select auth.uid()) where id = p_lote;
  perform public.registrar_actividad('papelera.restaurado', 'lotes_papelera', p_lote::text, null, jsonb_build_object('cantidad', n));
  return n;
end;
$$;

create or replace function public.papelera_purgar(p_lote uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_tipo public.tipo_lote_papelera; n int := 0;
begin
  if (select auth.uid()) is not null and not public.tiene_permiso('vehiculos.papelera.purgar') then raise exception 'Sin permiso para purgar.' using errcode = '42501'; end if;
  select tipo into v_tipo from public.lotes_papelera where id = p_lote and purgado_en is null and restaurado_en is null;
  if not found then return 0; end if;
  perform public._papelera_solo_cotizaciones(v_tipo);
  insert into public.cola_gc_storage (bucket, ruta) select 'cotizaciones', a.ruta from public.cotizaciones_adjuntos a join public.cotizaciones c on c.id = a.cotizacion_id where c.lote_papelera_id = p_lote on conflict do nothing;
  delete from public.cotizaciones where lote_papelera_id = p_lote;
  get diagnostics n = row_count;
  update public.lotes_papelera set purgado_en = now() where id = p_lote;
  perform public.registrar_actividad('papelera.purgado', 'lotes_papelera', p_lote::text, null, jsonb_build_object('cantidad', n));
  return n;
end;
$$;
drop function if exists public._papelera_sin_vehiculos(public.tipo_lote_papelera);

-- Lo que ya estaba en la papelera con el portal vigente deja de tenerlo: ya no se puede revocar a mano.
update public.accesos_portal a set habilitado = false, revocado_en = now()
where a.habilitado and exists (select 1 from public.leads l where l.id = a.lead_id and l.eliminado_en is not null);

-- ---------------------------------------------------------------------------
-- Grants de las RPC nuevas y reemplazadas
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  for f in select unnest(array[
    'lead_guardar(uuid, timestamptz, jsonb)',
    'cambiar_telefono_lead(uuid, timestamptz, text, text)',
    'lead_telefono_guardar(uuid, uuid, text, text, text, timestamptz)',
    'lead_telefono_quitar(uuid, uuid)',
    'verificar_telefono_de_lead(uuid, text, text)',
    'otorgar_portal(uuid, text)', 'revocar_portal(uuid)',
    'vehiculo_vincular(uuid, timestamptz, uuid)', 'vehiculo_interesado_marcar(uuid, uuid, text)', 'vehiculo_interesado_quitar(uuid, uuid)',
    'lead_compartir(uuid, uuid)', 'lead_transferir(uuid, uuid, uuid)', 'lead_revocar_acceso(uuid, uuid)', 'lead_salir(uuid)',
    'lead_cartera(uuid)', 'lead_cartera_candidatos(uuid)',
    'leads_papelera_enviar(uuid, uuid[])', 'leads_papelera_listar()',
    'leads_papelera_restaurar(uuid, timestamptz, uuid[])', 'leads_papelera_purgar(uuid, timestamptz, uuid[])',
    'papelera_enviar(tipo_lote_papelera, uuid[])', 'papelera_listar(tipo_lote_papelera)',
    'papelera_restaurar(uuid)', 'papelera_purgar(uuid)'
  ]) loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke all on function public.papelera_purgar_vencidos() from public, anon, authenticated;

-- Las funciones de trigger no se llaman: sólo las dispara la tabla, y el permiso de ejecución no se
-- mira al dispararlas. Las de las tablas de leads (y la de vehículos, que lleva `lead_id`) pierden el
-- que tenían por omisión.
do $$
declare f oid;
begin
  for f in
    select distinct t.tgfoid from pg_trigger t join pg_class c on c.oid = t.tgrelid
    where not t.tgisinternal and c.relnamespace = 'public'::regnamespace
      and c.relname in ('leads', 'leads_asesores', 'leads_telefonos', 'accesos_portal', 'oportunidades', 'oportunidades_historial',
        'lotes_papelera', 'vehiculos_interesados', 'vehiculos_vinculos', 'seguimientos', 'recordatorios', 'leads_favoritos',
        'leads_tachados', 'etiquetas', 'leads_etiquetas', 'leads_campos', 'vehiculos')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f::regprocedure);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Tablas: lo que `authenticated` todavía escribía directo
-- ---------------------------------------------------------------------------
-- Oportunidades: ninguna pantalla las escribe todavía (la parte 7 trae sus RPC). El INSERT repetía el
-- hueco de «todos» sin cartera y el UPDATE dejaba mover una oportunidad propia a cualquier lead.
drop policy if exists "oportunidades: crear" on public.oportunidades;
drop policy if exists "oportunidades: editar" on public.oportunidades;
revoke insert, update, delete on table public.oportunidades from anon, authenticated;

-- Cotizaciones: colgar una de un lead se la hace aparecer a su cartera. Sólo de uno que se ve, y sólo
-- al crearla; después, por la RPC de la Fase 4.
drop policy if exists "cotizaciones: crear" on public.cotizaciones;
create policy "cotizaciones: crear" on public.cotizaciones for insert to authenticated with check (
  creado_por = (select auth.uid())
  and (select public.tiene_permiso('cotizaciones.crear', origen_id))
  and clase = 'preventa'
  and (lead_id is null or (select public.puede_lead(lead_id, 'leads.ver'))));
revoke update (lead_id) on table public.cotizaciones from authenticated;

-- Portal: lo lee quien lo gestiona, con la cartera (antes «todos» leía el código de cualquiera).
drop policy if exists "accesos_portal: leer" on public.accesos_portal;
create policy "accesos_portal: leer" on public.accesos_portal for select to authenticated
  using ((select public.puede_actuar_lead(lead_id, 'leads.portal.gestionar')));

-- La papelera de leads la ve quien puede vaciarla; la de vehículos y cotizaciones, quien vacía la suya.
drop policy if exists "lotes_papelera: leer" on public.lotes_papelera;
create policy "lotes_papelera: leer" on public.lotes_papelera for select to authenticated using (
  creado_por = (select auth.uid())
  or (select public.tiene_permiso(case tipo when 'leads' then 'leads.papelera.purgar' else 'vehiculos.papelera.purgar' end)));
