-- La puerta de `notificaciones` (paso 7.01-1): toda fila entra por aquí, la inserte `notificar()` o un insert directo de otra fase
-- (`alertas_demora`, los turnos web), sin editar esas funciones. Si el destinatario está de baja, bloqueado o no tiene perfil, la fila
-- no entra y la operación que avisa sigue sin error. Las preferencias no apagan la campana: gobiernan sólo el push (7.03).

create or replace function public.notificaciones_puerta() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  if not exists (select 1 from public.perfiles p where p.id = new.usuario_id and p.activo and not p.bloqueado) then
    return null;
  end if;
  return new;
end;
$$;

revoke all on function public.notificaciones_puerta() from public, anon, authenticated;

comment on function public.notificaciones_puerta() is
  'Puerta de notificaciones (7.01): before insert; descarta en silencio la fila de un destinatario de baja, bloqueado o sin perfil. Cubre a notificar() y a los inserts directos de otras fases.';

create trigger trg_notificaciones_puerta
  before insert on public.notificaciones
  for each row execute function public.notificaciones_puerta();
