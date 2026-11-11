-- Push web, el disparo (paso 7.03-1, C10–C14): cada notificación que entra (after insert, después de la puerta del 7.01 y del antispam)
-- dispara la función `push` con un pase de un uso, si `push_web` está activa, el destinatario tiene `notificaciones.push`, no apagó ese tipo
-- en su preferencia `notificaciones.push` ({ "<tipo>": false }; sin fila, todo encendido), tiene una suscripción y la base conoce la URL
-- del proyecto. Sin cola de reintentos: la campana es el registro. El push nunca rompe la operación que avisa.

create or replace function public.push_disparar() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_url text;
  v_pase uuid;
begin
  -- Fuera del bloque de excepción: con el push apagado no se abre una subtransacción por fila.
  if not exists (select 1 from public.integraciones i where i.clave = 'push_web' and i.activa) then
    return null;
  end if;

  begin
    if not public.usuario_tiene_permiso(new.usuario_id, 'notificaciones.push') then
      return null;
    end if;
    if exists (select 1 from public.preferencias_usuario pu
                where pu.usuario_id = new.usuario_id and pu.clave = 'notificaciones.push' and pu.valor -> new.tipo = 'false'::jsonb) then
      return null;
    end if;
    if not exists (select 1 from public.suscripciones_push s where s.usuario_id = new.usuario_id) then
      return null;
    end if;
    -- Sin la URL del proyecto no se manda nada, sin aviso: los jobs ya avisan de la falta y esto corre por cada notificación.
    v_url := public._url_del_proyecto();
    if v_url is null then
      return null;
    end if;

    insert into public.push_pases (notificacion_id) values (new.id) returning pase into v_pase;
    perform net.http_post(url := v_url || '/functions/v1/push', body := jsonb_build_object('pase', v_pase),
      headers := jsonb_build_object('Content-Type', 'application/json'), timeout_milliseconds := 30000);
  exception when others then
    -- Sólo el código: nada de datos de la persona en el log.
    raise warning 'push_disparar: no se disparó (%)', sqlstate;
  end;
  return null;
end;
$$;
revoke all on function public.push_disparar() from public, anon, authenticated, service_role;
comment on function public.push_disparar() is
  'Push web (7.03): after insert en notificaciones; con push_web activa, el permiso notificaciones.push del destinatario, el tipo encendido, una suscripción y url_proyecto, crea un pase y llama a la función push por pg_net. Nunca rompe el insert.';

create trigger trg_notificaciones_push
  after insert on public.notificaciones
  for each row execute function public.push_disparar();

-- La preferencia de push por tipo es un objeto { "<tipo>": false }: otra forma no entra. `not valid`: una fila previa (la preferencia se
-- escribía directo con cualquier clave) no frena la migración; push_disparar sólo mira `valor -> tipo = false`.
alter table public.preferencias_usuario
  add constraint preferencias_push_por_tipo check (clave <> 'notificaciones.push' or jsonb_typeof(valor) = 'object') not valid;
