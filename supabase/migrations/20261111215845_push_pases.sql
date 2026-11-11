-- Push web, el pase (paso 7.03-1, C7–C9, C14): push_disparar() crea un pase por notificación y se lo manda a la función `push`, que lo
-- canjea con push_abrir() (vale una vez y 10 minutos) y anota lo que pasó con push_resultado() (una vez por pase). La base no guarda
-- secretos: el pase es la credencial, atado a su notificación. Sólo service_role.

create table public.push_pases (
  pase uuid primary key default gen_random_uuid(),
  notificacion_id bigint not null references public.notificaciones (id) on delete cascade,
  creado_en timestamptz not null default now(),
  usado_en timestamptz,
  resultado_en timestamptz
);
create index push_pases_notificacion_idx on public.push_pases (notificacion_id);
create index push_pases_creado_en_idx on public.push_pases (creado_en);
alter table public.push_pases enable row level security;
revoke all on table public.push_pases from anon, authenticated;
grant all on table public.push_pases to service_role;
comment on table public.push_pases is
  'Pases de un solo uso del push web (7.03): push_disparar() crea uno por notificación y lo manda a la función push; push_abrir() lo quema (vale 10 minutos) y push_resultado() anota el envío una vez. Sin policies: sólo service_role.';

create or replace function public.push_abrir(p_pase uuid) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_notificacion bigint;
  n public.notificaciones;
begin
  -- Limpieza acotada de los pases viejos (por push_pases_creado_en_idx).
  delete from public.push_pases p
   where p.pase in (select q.pase from public.push_pases q where q.creado_en < now() - interval '1 day' order by q.creado_en limit 100);

  update public.push_pases p set usado_en = now()
   where p.pase = p_pase and p.usado_en is null and p.creado_en > now() - interval '10 minutes'
  returning p.notificacion_id into v_notificacion;
  if v_notificacion is null then
    return null;
  end if;

  select * into n from public.notificaciones x where x.id = v_notificacion;
  return jsonb_build_object(
    'titulo', n.titulo,
    'cuerpo', n.cuerpo,
    'ruta', n.ruta,
    'suscripciones', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'endpoint', s.endpoint, 'claves', s.claves) order by s.creado_en desc, s.id desc)
        from (select t.id, t.endpoint, t.claves, t.creado_en from public.suscripciones_push t where t.usuario_id = n.usuario_id
                 and public._push_endpoint_valido(t.endpoint)
               order by t.creado_en desc, t.id desc limit public._push_tope_por_persona()) s), '[]'::jsonb));
end;
$$;
revoke all on function public.push_abrir(uuid) from public, anon, authenticated;
grant execute on function public.push_abrir(uuid) to service_role;
comment on function public.push_abrir(uuid) is
  'Push web (7.03): canjea el pase (una vez, 10 minutos) y devuelve {titulo, cuerpo, ruta, suscripciones: [{id, endpoint, claves}]} del destinatario, o null. Sólo service_role (la función push).';

create or replace function public.push_resultado(p_pase uuid, p_resultados jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_usuario uuid;
  v_enviadas int := 0;
  v_caducadas int := 0;
  v_fallos int := 0;
begin
  if p_resultados is null or jsonb_typeof(p_resultados) <> 'array' or jsonb_array_length(p_resultados) > public._push_tope_por_persona()
     or exists (select 1 from jsonb_array_elements(p_resultados) e
                 where jsonb_typeof(e) <> 'object' or (e ->> 'estado') is null or (e ->> 'estado') not in ('enviada', 'caducada', 'fallo')) then
    raise exception 'Los resultados del push no son válidos.' using errcode = '22023', hint = 'resultados';
  end if;

  -- Una vez por pase, y sólo de uno abierto hace menos de 10 minutos.
  update public.push_pases p set resultado_en = now()
   where p.pase = p_pase and p.usado_en is not null and p.usado_en > now() - interval '10 minutes' and p.resultado_en is null
  returning (select x.usuario_id from public.notificaciones x where x.id = p.notificacion_id) into v_usuario;
  if v_usuario is null then
    return null;
  end if;

  -- Sólo las suscripciones del destinatario del pase: un id ajeno se ignora. Sin count: lo cuenta cada sentencia.
  update public.suscripciones_push s set ultimo_envio_en = now(), fallos = 0
    from jsonb_to_recordset(p_resultados) as r (id uuid, estado text)
   where r.estado = 'enviada' and s.id = r.id and s.usuario_id = v_usuario;
  get diagnostics v_enviadas = row_count;
  update public.suscripciones_push s set fallos = least(s.fallos + 1, 32767)
    from jsonb_to_recordset(p_resultados) as r (id uuid, estado text)
   where r.estado = 'fallo' and s.id = r.id and s.usuario_id = v_usuario;
  get diagnostics v_fallos = row_count;
  delete from public.suscripciones_push s
   using jsonb_to_recordset(p_resultados) as r (id uuid, estado text)
   where r.estado = 'caducada' and s.id = r.id and s.usuario_id = v_usuario;
  get diagnostics v_caducadas = row_count;

  return jsonb_build_object('enviadas', v_enviadas, 'caducadas', v_caducadas, 'fallos', v_fallos);
end;
$$;
revoke all on function public.push_resultado(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.push_resultado(uuid, jsonb) to service_role;
comment on function public.push_resultado(uuid, jsonb) is
  'Push web (7.03): anota lo que pasó con cada suscripción del pase ([{id, estado: enviada|caducada|fallo}], hasta 10): enviada sella ultimo_envio_en, fallo suma uno, caducada (404/410) la borra. Una vez por pase; null si el pase no está abierto o ya tiene resultado. Sólo service_role.';
