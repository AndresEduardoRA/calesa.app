-- Push web, la base (paso 7.03-1, C1–C6, C14, C15): suscribir y desuscribir sólo por RPC. `notificaciones.push` gana enforcement aquí
-- (push_suscribir) y en push_disparar (otra migración). El endpoint tiene que ser de un servicio de push conocido, para que la función `push`
-- no sea un proxy abierto: sólo manda a lo que sale de esta tabla.

-- La lista de hosts de servicios de push: iguales exactos y sufijos con el punto delante (así `fcm.googleapis.com.ejemplo.com` no pasa).
create or replace function public._push_host_permitido(p_host text) returns boolean
  language sql immutable security definer
  set search_path = ''
as $$
  select p_host is not null and (
    p_host in ('fcm.googleapis.com', 'android.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com')
    or p_host like '%.push.services.mozilla.com'
    or p_host like '%.notify.windows.com'
    or p_host like '%.push.apple.com');
$$;
revoke all on function public._push_host_permitido(text) from public, anon, authenticated, service_role;
comment on function public._push_host_permitido(text) is
  'Push web (7.03): ¿el host es de un servicio de push? Iguales exactos y sufijos con punto. La usa _push_endpoint_valido; sin grant para nadie.';

-- El endpoint entero: https, sin `\`, espacios ni caracteres de control (el parser de URL de fetch lee `\` como `/`), y un host de la lista
-- justo después de `https://` (sin usuario, puerto ni IP).
create or replace function public._push_endpoint_valido(p_endpoint text) returns boolean
  language sql immutable security definer
  set search_path = ''
as $$
  select coalesce(p_endpoint is not null and length(p_endpoint) <= 2048 and p_endpoint !~ '[\\[:space:][:cntrl:]]'
    and public._push_host_permitido(lower(substring(p_endpoint from '^https://([A-Za-z0-9.-]+)(?:[/?#]|$)'))), false);
$$;
revoke all on function public._push_endpoint_valido(text) from public, anon, authenticated, service_role;
comment on function public._push_endpoint_valido(text) is
  'Push web (7.03): ¿el endpoint es https de un servicio de push? La usan push_suscribir y push_abrir; sin grant para nadie.';

create or replace function public._push_tope_por_persona() returns integer
  language sql immutable security definer
  set search_path = ''
as $$ select 10 $$;
revoke all on function public._push_tope_por_persona() from public, anon, authenticated, service_role;
comment on function public._push_tope_por_persona() is
  'Push web (7.03): cuántas suscripciones guarda una persona; al pasarse se borra la menos reciente. Sin grant para nadie.';

create or replace function public.push_suscribir(p_endpoint text, p_claves jsonb, p_user_agent text default null) returns uuid
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_id uuid;
begin
  perform public.assert_permiso('notificaciones.push');

  if not public._push_endpoint_valido(p_endpoint) then
    raise exception 'La dirección no es de un servicio de push.' using errcode = '22023', hint = 'endpoint';
  end if;

  if p_claves is null or jsonb_typeof(p_claves) <> 'object'
     or jsonb_typeof(p_claves -> 'p256dh') is distinct from 'string' or jsonb_typeof(p_claves -> 'auth') is distinct from 'string'
     or (p_claves ->> 'p256dh') !~ '^[A-Za-z0-9_-]{16,128}={0,2}$' or (p_claves ->> 'auth') !~ '^[A-Za-z0-9_-]{16,128}={0,2}$' then
    raise exception 'Las claves de la suscripción no son válidas.' using errcode = '22023', hint = 'claves';
  end if;

  -- Serializa las suscripciones de una misma persona: el tope no se pasa con dos a la vez.
  perform pg_advisory_xact_lock(hashtextextended('push_suscribir:' || v_yo::text, 0));

  -- Un endpoint que ya existe (de otra persona o de la misma) pasa a quien suscribe: lo conoce sólo quien usa ese navegador.
  insert into public.suscripciones_push as s (usuario_id, endpoint, claves, user_agent, creado_en)
  values (v_yo, p_endpoint, jsonb_build_object('p256dh', p_claves ->> 'p256dh', 'auth', p_claves ->> 'auth'),
          left(nullif(btrim(p_user_agent), ''), 512), clock_timestamp())
  on conflict (endpoint) do update
    set usuario_id = excluded.usuario_id, claves = excluded.claves, user_agent = excluded.user_agent,
        creado_en = excluded.creado_en, ultimo_envio_en = null, fallos = 0
  returning s.id into v_id;

  -- El tope: se va la menos reciente.
  delete from public.suscripciones_push s
   where s.usuario_id = v_yo
     and s.id not in (select t.id from public.suscripciones_push t where t.usuario_id = v_yo
                       order by t.creado_en desc, t.id desc limit public._push_tope_por_persona());
  return v_id;
end;
$$;
revoke all on function public.push_suscribir(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.push_suscribir(text, jsonb, text) to authenticated, service_role;
comment on function public.push_suscribir(text, jsonb, text) is
  'Push web (7.03): guarda la suscripción de este navegador. Exige notificaciones.push; el endpoint es https de un servicio de push (22023 hint endpoint) y las claves p256dh/auth en base64url (22023 hint claves). Un endpoint que ya existe pasa a quien suscribe; tope de 10 por persona (se borra la menos reciente).';

-- No exige el permiso: quien lo perdió tiene que poder quitar las suyas. Sin sesión, 42501.
create or replace function public.push_desuscribir(p_endpoint text) returns boolean
  language plpgsql security definer
  set search_path = ''
as $$
begin
  perform public.assert_activo();
  delete from public.suscripciones_push s where s.endpoint = p_endpoint and s.usuario_id = (select auth.uid());
  return found;
end;
$$;
revoke all on function public.push_desuscribir(text) from public, anon, authenticated;
grant execute on function public.push_desuscribir(text) to authenticated, service_role;
comment on function public.push_desuscribir(text) is
  'Push web (7.03): quita la suscripción propia de ese endpoint; false si no era tuya o no existía. No exige notificaciones.push.';

-- Sin escritura directa: quedan «leer» y «borrar» de la fila propia.
drop policy "suscripciones_push: crear" on public.suscripciones_push;
drop policy "suscripciones_push: editar" on public.suscripciones_push;
revoke insert, update on table public.suscripciones_push from authenticated;

-- Hasta aquí cualquiera podía insertar su fila con cualquier endpoint: las que no son de un servicio de push se van.
delete from public.suscripciones_push s where not public._push_endpoint_valido(s.endpoint);

comment on table public.suscripciones_push is
  'Suscripciones de push web, una por navegador (endpoint único). Se escribe sólo por push_suscribir / push_desuscribir; la función push anota con push_resultado. La persona lee y borra las suyas.';

-- El catálogo (la nube no corre el seed; el seed dice lo mismo).
insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden)
values ('notificaciones.push', 'notificaciones', 'Recibir push', 'Recibir notificaciones push', false, false, 'push_suscribir, push_disparar', 600)
on conflict (clave) do update set aplicado_en = excluded.aplicado_en;

insert into public.integraciones (clave, activa, config) values ('push_web', false, '{}') on conflict do nothing;
