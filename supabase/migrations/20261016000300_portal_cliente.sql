-- El acceso del cliente del lado del equipo y el endurecimiento de `web.portal_*` (Fase 3, parte 7b).
-- Escrito a mano. Lo del esquema (las FK con `set null`, el índice sin guion, `direccion_publica` y
-- `codigo_dictable` con bytes criptográficos) está en `schemas/`.
--
-- Leído contra la base viva antes de escribir esto:
-- 1. `accesos_portal` se leía directo (policy + grant por columnas, `codigo` incluido) y su
--    `trg_auditar` dejaba en `actividad` cada login del cliente. Ahora el equipo lee sólo por
--    `portal_estado` y la constancia son los eventos `portal.*` de las RPC del equipo.
-- 2. `otorgar_portal` reemplazaba sin versión: ahora lleva `p_otorgado_en_esperado` (PT409 con quién y
--    cuándo) y puede generar la clave (`p_clave` nulo), que devuelve una sola vez.
-- 3. `web.portal_login` era un oráculo (el bloqueo lanzaba un error, lo inexistente no pagaba el hash) y
--    el bloqueo se alargaba. Ahora: una sola respuesta, siempre un `crypt`, y el bloqueo de 15 min no
--    cuenta ni se alarga.
-- 4. Revocar no cortaba la sesión: las `web.portal_*` que consume el portal reciben ahora el
--    `otorgado_en` que devolvió el login y no entregan nada si ya no es el vigente.
-- 5. `portal_snapshot` suma las «novedades»: lo «Visible para el cliente» que no cuelga de un vehículo
--    vinculado al lead (sin vehículo, o de uno que no es suyo), sin nombrar el vehículo.
-- El contrato con la Fase 8 está en `docs/DECISIONES.md` («Contrato del portal para la Fase 8»).

-- ---------------------------------------------------------------------------------------------------
-- La tabla: sólo por RPC, sin el trigger genérico.
-- ---------------------------------------------------------------------------------------------------
drop policy if exists "accesos_portal: leer" on public.accesos_portal;
revoke all on table public.accesos_portal from anon, authenticated;
drop trigger if exists trg_auditar on public.accesos_portal;

-- Lo arman las funciones «definer»: nadie más lo necesita.
revoke all on function public.codigo_dictable(int) from public, anon, authenticated;

update public.permisos
set descripcion = 'Otorgar, revocar y desbloquear el acceso del cliente al portal',
    aplicado_en = 'portal_estado, otorgar_portal, revocar_portal, portal_desbloquear'
where clave = 'leads.portal.gestionar';

-- ---------------------------------------------------------------------------------------------------
-- Ayudas internas (sin grant para nadie).
-- ---------------------------------------------------------------------------------------------------

-- Lo que teclea el cliente, como se guarda sin el guion: sin espacios ni signos, en mayúsculas, y 0 y 1
-- leídos como O e I (la parte al azar no tiene ninguno de los cuatro y el prefijo es sólo letras: no
-- hay ambigüedad, y el prefijo sí puede llevar I u O).
create or replace function public._portal_codigo_normal(p_codigo text)
returns text language sql immutable set search_path = '' as $$
  select translate(upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g')), '01', 'OI');
$$;
revoke all on function public._portal_codigo_normal(text) from public, anon, authenticated;

-- Un hash bcrypt del mismo costo que los reales (10), de un texto que no es la clave de nadie: el login
-- y el cambio de clave lo comparan cuando no hay acceso, para gastar lo mismo que cuando lo hay.
create or replace function public._portal_hash_falso()
returns text language sql immutable set search_path = '' as $$
  select '$2a$10$S/ve9jaSjV6oflW1OIYsmONm/Gpslm7YUB5APetHCBKRAbHQC.XTe'::text;
$$;
revoke all on function public._portal_hash_falso() from public, anon, authenticated;

-- La regla de la clave (la escrita en la ficha y la nueva del cliente): de 8 a 64 caracteres, hasta 72
-- bytes (bcrypt ignora lo que sigue: dos claves con los mismos 72 primeros bytes valdrían lo mismo) y sin
-- caracteres de control. Distingue mayúsculas y no se recorta. El mensaje nunca la repite.
create or replace function public._portal_clave_validar(p_clave text)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if length(coalesce(p_clave, '')) < 8 then
    raise exception 'La clave necesita al menos 8 caracteres.' using errcode = '22023', hint = 'clave';
  end if;
  if length(p_clave) > 64 then
    raise exception 'La clave puede tener hasta 64 caracteres.' using errcode = '22023', hint = 'clave';
  end if;
  if octet_length(p_clave) > 72 then
    raise exception 'La clave es demasiado larga: usa menos tildes o símbolos.' using errcode = '22023', hint = 'clave';
  end if;
  if p_clave ~ '[[:cntrl:]]' then
    raise exception 'La clave no puede llevar saltos de línea ni tabulaciones.' using errcode = '22023', hint = 'clave';
  end if;
end;
$$;
revoke all on function public._portal_clave_validar(text) from public, anon, authenticated;

-- La sesión del portal vale si el acceso sigue habilitado, es el mismo que se otorgó (`otorgado_en`) y
-- el lead está vivo. Devuelve la fila, o una vacía (todo nulo).
create or replace function public._portal_vigente(p_lead uuid, p_otorgado_en timestamptz)
returns public.accesos_portal language sql stable set search_path = '' as $$
  select a.* from public.accesos_portal a join public.leads l on l.id = a.lead_id
  where a.lead_id = p_lead and a.habilitado and a.otorgado_en = p_otorgado_en and l.eliminado_en is null;
$$;
revoke all on function public._portal_vigente(uuid, timestamptz) from public, anon, authenticated;

-- Una persona como la ve la sección: su nombre y si ya no está en el equipo. Nunca su contacto. Nula si
-- la cuenta se borró (la FK quedó en nulo).
create or replace function public._portal_persona(p_id uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('nombre', coalesce(nullif(btrim(p.nombre), ''), 'Sin nombre'), 'de_baja', p.baja_en is not null)
  from public.perfiles p where p.id = p_id;
$$;
revoke all on function public._portal_persona(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------
-- El equipo (clase 1: la cartera del lead y `leads.portal.gestionar`; lo ajeno, lo que está en la
-- papelera y lo inexistente dan el mismo 42501 de `_lead_mio`).
-- ---------------------------------------------------------------------------------------------------

-- El estado del acceso: nunca el hash ni la clave. El código sí (sin la clave no abre nada, y sirve
-- cuando el cliente lo pierde).
create or replace function public.portal_estado(p_lead uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.accesos_portal;
begin
  perform public._lead_mio(p_lead, 'leads.portal.gestionar', false);
  select * into a from public.accesos_portal x where x.lead_id = p_lead;
  if not found then
    return jsonb_build_object('estado', 'sin_acceso');
  end if;
  return jsonb_build_object(
    'estado', case when not a.habilitado then 'revocado'
                   when a.bloqueado_hasta > now() then 'bloqueado'
                   else 'activo' end,
    'codigo', a.codigo,
    'otorgado_en', a.otorgado_en,
    'otorgado_por', public._portal_persona(a.otorgado_por),
    'ultimo_ingreso_en', a.ultimo_ingreso_en,
    'debe_cambiar_clave', a.debe_cambiar_clave,
    'bloqueado_hasta', case when a.habilitado and a.bloqueado_hasta > now() then a.bloqueado_hasta end,
    'revocado_en', case when not a.habilitado then a.revocado_en end,
    'revocado_por', case when not a.habilitado then public._portal_persona(a.revocado_por) end);
end;
$$;
revoke all on function public.portal_estado(uuid) from public, anon;
grant execute on function public.portal_estado(uuid) to authenticated;

-- Otorgar o volver a otorgar. Siempre un código nuevo: el anterior y su clave dejan de valer, y la
-- sesión abierta con ellos también (cambia `otorgado_en`). Con `p_clave` nulo la genera la base y la
-- devuelve en `clave` (una sola vez: no se guarda en claro ni se escribe en `actividad`).
-- `p_otorgado_en_esperado`: el `otorgado_en` que la persona ve (nulo = cree que no hay acceso). Otro
-- es PT409 con quién lo otorgó y cuándo.
drop function if exists public.otorgar_portal(uuid, text);
create or replace function public.otorgar_portal(p_lead uuid, p_clave text, p_otorgado_en_esperado timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a public.accesos_portal; v_yo uuid := (select auth.uid()); v_clave text; v_codigo text; v_prefijo text;
  v_en timestamptz; v_nombre text; v_intento int := 0; v_listo boolean := false;
begin
  perform public._lead_mio(p_lead, 'leads.portal.gestionar', true);
  select * into a from public.accesos_portal x where x.lead_id = p_lead for update;
  if a.lead_id is null and p_otorgado_en_esperado is not null then
    raise exception 'El acceso cambió mientras lo mirabas. Recarga para ver cómo está.' using errcode = 'PT409';
  end if;
  if a.lead_id is not null and a.otorgado_en is distinct from p_otorgado_en_esperado then
    if a.otorgado_por = v_yo then
      raise exception 'Ya lo otorgaste % desde otra ventana. Recarga para ver el código nuevo.', public._hace(a.otorgado_en)
        using errcode = 'PT409';
    end if;
    select nullif(btrim(p.nombre), '') into v_nombre from public.perfiles p where p.id = a.otorgado_por;
    raise exception 'Ya lo otorgó % %. Recarga para ver el código nuevo.', coalesce(v_nombre, 'otra persona'),
      public._hace(a.otorgado_en) using errcode = 'PT409';
  end if;

  if p_clave is null then
    v_clave := public.codigo_dictable(10);
  else
    perform public._portal_clave_validar(p_clave);
    v_clave := p_clave;
  end if;

  -- El prefijo sale del nombre de la empresa (sin tildes ni signos); el código se cambia siempre.
  v_prefijo := upper(left(regexp_replace(translate((select e.nombre from public.ajustes_empresa e where e.id = 1),
    'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'), '[^A-Za-z]', '', 'g'), 3));
  if length(v_prefijo) < 2 then v_prefijo := 'CL'; end if;
  -- Siempre posterior al anterior y en milisegundos: así sobrevive a un `Date` de JS en la cookie.
  v_en := greatest(date_trunc('milliseconds', clock_timestamp()), a.otorgado_en + interval '1 millisecond');

  while not v_listo loop
    v_intento := v_intento + 1;
    if v_intento > 20 then
      raise exception 'No pudimos generar un código. Vuelve a intentarlo.' using errcode = 'P0001';
    end if;
    v_codigo := v_prefijo || '-' || public.codigo_dictable(5);
    continue when v_codigo = a.codigo
      or exists (select 1 from public.accesos_portal x where replace(x.codigo, '-', '') = replace(v_codigo, '-', ''));
    begin
      insert into public.accesos_portal as x (lead_id, codigo, clave_hash, otorgado_por, otorgado_en)
      values (p_lead, v_codigo, extensions.crypt(v_clave, extensions.gen_salt('bf', 10)), v_yo, v_en)
      on conflict (lead_id) do update set codigo = excluded.codigo, clave_hash = excluded.clave_hash, habilitado = true,
        debe_cambiar_clave = true, intentos_fallidos = 0, bloqueado_hasta = null, otorgado_por = excluded.otorgado_por,
        otorgado_en = excluded.otorgado_en, revocado_por = null, revocado_en = null;
      v_listo := true;
    exception when unique_violation then
      -- Otro otorgar (de otro lead) se quedó con el mismo código entre la mirada y el insert.
      null;
    end;
  end loop;

  perform public.registrar_actividad(case when a.lead_id is null then 'portal.otorgado' else 'portal.reotorgado' end,
    'accesos_portal', p_lead::text, null, null,
    jsonb_strip_nulls(jsonb_build_object('codigo', v_codigo, 'codigo_anterior', a.codigo)));
  return jsonb_strip_nulls(jsonb_build_object('codigo', v_codigo, 'otorgado_en', v_en,
    'clave', case when p_clave is null then v_clave end));
end;
$$;
revoke all on function public.otorgar_portal(uuid, text, timestamptz) from public, anon;
grant execute on function public.otorgar_portal(uuid, text, timestamptz) to authenticated;

-- Revocar: inmediato e idempotente. La sesión abierta deja de valer (`_portal_vigente` mira
-- `habilitado`). Sólo deja constancia si cambió algo.
create or replace function public.revocar_portal(p_lead uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_codigo text;
begin
  perform public._lead_mio(p_lead, 'leads.portal.gestionar', true);
  update public.accesos_portal x set habilitado = false, revocado_por = (select auth.uid()), revocado_en = now()
  where x.lead_id = p_lead and x.habilitado
  returning x.codigo into v_codigo;
  if v_codigo is not null then
    perform public.registrar_actividad('portal.revocado', 'accesos_portal', p_lead::text, null, null,
      jsonb_build_object('codigo', v_codigo));
  end if;
end;
$$;
revoke all on function public.revocar_portal(uuid) from public, anon;
grant execute on function public.revocar_portal(uuid) to authenticated;

-- Desbloquear: limpia el bloqueo y los intentos de un acceso habilitado. Idempotente; deja constancia
-- sólo si había algo que limpiar. No le avisa al cliente: lo hace la persona.
create or replace function public.portal_desbloquear(p_lead uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_codigo text;
begin
  perform public._lead_mio(p_lead, 'leads.portal.gestionar', true);
  update public.accesos_portal x set intentos_fallidos = 0, bloqueado_hasta = null
  where x.lead_id = p_lead and x.habilitado and (x.intentos_fallidos > 0 or x.bloqueado_hasta is not null)
  returning x.codigo into v_codigo;
  if v_codigo is not null then
    perform public.registrar_actividad('portal.desbloqueado', 'accesos_portal', p_lead::text, null, null,
      jsonb_build_object('codigo', v_codigo));
  end if;
end;
$$;
revoke all on function public.portal_desbloquear(uuid) from public, anon;
grant execute on function public.portal_desbloquear(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- La web (sólo `service_role`). Las firmas cambian: nadie las llamaba todavía.
-- ---------------------------------------------------------------------------------------------------
drop function if exists web.portal_login(text, text);
drop function if exists web.portal_snapshot(uuid);
drop function if exists web.portal_documento_ruta(uuid, uuid);
drop function if exists web.portal_cambiar_clave(uuid, text, text);

-- Ingreso. Una sola respuesta (vacía) para el código inexistente, el revocado, el bloqueado, el de un
-- lead en la papelera y la clave errónea, y siempre un `crypt` del mismo costo. Un fallo sobre un acceso
-- vigente y no bloqueado suma; al quinto bloquea 15 min y vuelve a cero, y mientras dura el bloqueo no
-- cuenta ni se alarga. `for update`: los intentos en paralelo sobre un código se cuentan de a uno.
-- `otorgado_en` es la versión del acceso: la cookie de la Fase 8 lo guarda y lo pasa a lo demás.
create or replace function web.portal_login(p_codigo text, p_clave text)
returns table (lead_id uuid, nombre text, debe_cambiar_clave boolean, otorgado_en timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_codigo text := public._portal_codigo_normal(left(p_codigo, 40));
  a public.accesos_portal; v_nombre text; v_ok boolean;
begin
  if length(v_codigo) between 7 and 9 then
    select * into a from public.accesos_portal x where replace(x.codigo, '-', '') = v_codigo for update;
  end if;
  v_ok := coalesce(a.clave_hash, public._portal_hash_falso())
          = extensions.crypt(coalesce(p_clave, ''), coalesce(a.clave_hash, public._portal_hash_falso()));
  if a.lead_id is null or not a.habilitado or a.bloqueado_hasta > now() then
    return;
  end if;
  select l.nombre into v_nombre from public.leads l where l.id = a.lead_id and l.eliminado_en is null;
  if not found then
    return;
  end if;
  if not v_ok then
    update public.accesos_portal x
    set intentos_fallidos = case when x.intentos_fallidos + 1 >= 5 then 0 else x.intentos_fallidos + 1 end,
        bloqueado_hasta = case when x.intentos_fallidos + 1 >= 5 then now() + interval '15 minutes' end
    where x.lead_id = a.lead_id;
    return;
  end if;
  update public.accesos_portal x set intentos_fallidos = 0, bloqueado_hasta = null, ultimo_ingreso_en = now()
  where x.lead_id = a.lead_id;
  return query select a.lead_id, v_nombre, a.debe_cambiar_clave, a.otorgado_en;
end;
$$;

-- Lo que ve el cliente. `null` (ni esqueleto ni vehículos) si la sesión ya no vale: revocado, vuelto a
-- otorgar o el lead en la papelera. Nunca costos, proveedores, rutas privadas, el VIN completo, lo
-- privado, los campos del lead, oportunidades, etiquetas ni marcas.
create or replace function web.portal_snapshot(p_lead uuid, p_otorgado_en timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if (public._portal_vigente(p_lead, p_otorgado_en)).lead_id is null then
    return null;
  end if;
  return jsonb_build_object(
    'cliente', (select jsonb_build_object('nombre', l.nombre) from public.leads l where l.id = p_lead),
    'asesor', (select jsonb_build_object('nombre', p.nombre, 'whatsapp', p.whatsapp_web, 'avatar', p.avatar_ruta) from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id where la.lead_id = p_lead and la.tipo_acceso = 'dueno' and la.revocado_en is null),
    'vehiculos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', v.id, 'titulo', v.titulo, 'anio', v.anio, 'vin_parcial', case when v.vin is not null then left(v.vin, 3) || '•••••' || right(v.vin, 4) end,
        'imagenes', (select coalesce(jsonb_agg(i.ruta order by i.es_portada desc, i.orden), '[]'::jsonb) from public.vehiculos_imagenes i where i.vehiculo_id = v.id),
        'fase', case when f.visible_portal then jsonb_build_object('nombre', f.alias_portal, 'descripcion', f.descripcion_portal, 'desde', v.fase_desde) end,
        'linea_tiempo', (select coalesce(jsonb_agg(jsonb_build_object('nombre', fz.alias_portal, 'en', h.creado_en) order by h.creado_en), '[]'::jsonb) from public.historial_fases h join public.fases fz on fz.id = h.a_fase_id where h.vehiculo_id = v.id and fz.visible_portal),
        'embarque', (select jsonb_build_object('zarpe', t.zarpe_el, 'eta', t.eta_el, 'arribo', t.arribo_el) from public.transportes t where t.vehiculo_id = v.id),
        'documentos', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'tipo', td.nombre, 'estado', d.estado, 'fecha', d.creado_en)), '[]'::jsonb) from public.documentos d join public.tipos_documento td on td.id = d.tipo_documento_id where d.vehiculo_id = v.id and d.visible_portal and d.estado <> 'rechazado' and d.eliminado_en is null),
        'seguimientos', (select coalesce(jsonb_agg(jsonb_build_object('titulo', s.titulo, 'detalle', s.detalle_texto, 'en', s.ocurrido_en) order by s.ocurrido_en desc), '[]'::jsonb) from public.seguimientos s where s.lead_id = p_lead and s.vehiculo_id = v.id and s.visibilidad = 'publico' and s.eliminado_en is null),
        'pagos', (select coalesce(jsonb_agg(jsonb_build_object('concepto', pg.concepto, 'monto', pg.monto, 'moneda', pg.moneda, 'fecha', pg.fecha, 'confirmado', pg.confirmado) order by pg.fecha), '[]'::jsonb) from public.pagos pg where pg.vehiculo_id = v.id and pg.eliminado_en is null)
      )) from public.vehiculos v left join public.fases f on f.id = v.fase_id where v.lead_id = p_lead and v.eliminado_en is null), '[]'::jsonb),
    -- Lo «Visible para el cliente» que no sale con un vehículo suyo: sin vehículo, o de uno que no está
    -- vinculado a este lead (un interés, uno que se desvinculó). No se nombra el vehículo. Las 30 más nuevas.
    'novedades', coalesce((select jsonb_agg(jsonb_build_object('titulo', n.titulo, 'detalle', n.detalle_texto, 'en', n.ocurrido_en) order by n.ocurrido_en desc, n.id)
      from (select s.id, s.titulo, s.detalle_texto, s.ocurrido_en from public.seguimientos s
            where s.lead_id = p_lead and s.visibilidad = 'publico' and s.eliminado_en is null
              and (s.vehiculo_id is null or not exists (
                select 1 from public.vehiculos v where v.id = s.vehiculo_id and v.lead_id = p_lead and v.eliminado_en is null))
            order by s.ocurrido_en desc, s.id limit 30) n), '[]'::jsonb)
  );
end;
$$;

-- La ruta de un documento visible, para que el handler la firme o la sirva: nunca llega al navegador.
create or replace function web.portal_documento_ruta(p_lead uuid, p_otorgado_en timestamptz, p_documento uuid)
returns text language sql stable security definer set search_path = '' as $$
  select d.ruta from public.documentos d join public.vehiculos v on v.id = d.vehiculo_id
  where d.id = p_documento and v.lead_id = p_lead and d.visible_portal and d.estado <> 'rechazado'
    and d.eliminado_en is null and v.eliminado_en is null
    and (public._portal_vigente(p_lead, p_otorgado_en)).lead_id is not null;
$$;

-- El cliente cambia su clave. `false` si la sesión no vale, si está bloqueado o si la actual no es; un
-- fallo cuenta como en el login. La nueva sigue la regla de la clave (22023). No cambia `otorgado_en`:
-- la sesión sigue; la que corta todas es «Volver a otorgar».
create or replace function web.portal_cambiar_clave(p_lead uuid, p_otorgado_en timestamptz, p_actual text, p_nueva text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare a public.accesos_portal; v_ok boolean;
begin
  select x.* into a from public.accesos_portal x join public.leads l on l.id = x.lead_id
  where x.lead_id = p_lead and x.habilitado and x.otorgado_en = p_otorgado_en and l.eliminado_en is null
  for update of x;
  v_ok := coalesce(a.clave_hash, public._portal_hash_falso())
          = extensions.crypt(coalesce(p_actual, ''), coalesce(a.clave_hash, public._portal_hash_falso()));
  if a.lead_id is null or a.bloqueado_hasta > now() then
    return false;
  end if;
  if not v_ok then
    update public.accesos_portal x
    set intentos_fallidos = case when x.intentos_fallidos + 1 >= 5 then 0 else x.intentos_fallidos + 1 end,
        bloqueado_hasta = case when x.intentos_fallidos + 1 >= 5 then now() + interval '15 minutes' end
    where x.lead_id = a.lead_id;
    return false;
  end if;
  perform public._portal_clave_validar(p_nueva);
  update public.accesos_portal x
  set clave_hash = extensions.crypt(p_nueva, extensions.gen_salt('bf', 10)), debe_cambiar_clave = false,
      intentos_fallidos = 0, bloqueado_hasta = null
  where x.lead_id = a.lead_id;
  return true;
end;
$$;

revoke all on function web.portal_login(text, text) from public, anon, authenticated;
revoke all on function web.portal_snapshot(uuid, timestamptz) from public, anon, authenticated;
revoke all on function web.portal_documento_ruta(uuid, timestamptz, uuid) from public, anon, authenticated;
revoke all on function web.portal_cambiar_clave(uuid, timestamptz, text, text) from public, anon, authenticated;
grant execute on function web.portal_login(text, text) to service_role;
grant execute on function web.portal_snapshot(uuid, timestamptz) to service_role;
grant execute on function web.portal_documento_ruta(uuid, timestamptz, uuid) to service_role;
grant execute on function web.portal_cambiar_clave(uuid, timestamptz, text, text) to service_role;
