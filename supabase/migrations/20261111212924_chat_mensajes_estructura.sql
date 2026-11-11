-- La tabla de mensajes lista para el chat por RPC (paso 7.08-2, C1–C3).
--
--   - C1 · El hilo se lee por cursor `(creado_en, id)` dentro de una conversación: `mensajes_hilo_idx` reemplaza a `mensajes_conversacion_fecha_idx`
--     (era su prefijo, D15). `mensajes` entra a la publicación de realtime (la RLS de `select`, `es_miembro`, filtra lo que llega).
--   - C2 · Un mensaje eliminado no guarda cuerpo (RLS no esconde columnas, D9). El orden importa (auditoría del plan): primero el trigger (C3), para que
--     vaciar los borrados de antes no pise `editado_en`; después el check que admite el texto borrado; recién ahí se vacían; al final el check nuevo.
--   - C3 · `mensaje_editar_validar` actúa sólo al cambiar el cuerpo de un mensaje vivo: autor o 42501, y `editado_en`. El borrado (de quien modera
--     también) no pasa por ahí (D10).

-- C3
create or replace function public.mensaje_editar_validar() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  if new.eliminado_en is null and new.cuerpo is distinct from old.cuerpo then
    if old.autor_id <> (select auth.uid()) then raise exception 'Sólo el autor edita un mensaje.' using errcode = '42501'; end if;
    new.editado_en := clock_timestamp();
  end if;
  return new;
end;
$$;

-- C2
alter table public.mensajes drop constraint mensajes_check;
alter table public.mensajes add constraint mensajes_check check (
     (tipo = 'texto' and (cuerpo is not null or eliminado_en is not null))
  or (tipo = 'evento' and evento_id is not null)
  or (tipo = 'tarea' and tarea_id is not null)
  or (tipo = 'vehiculo' and vehiculo_id is not null)
  or (tipo = 'lead' and lead_id is not null)
  or (tipo = 'cotizacion' and cotizacion_id is not null)
);
update public.mensajes set cuerpo = null where eliminado_en is not null and cuerpo is not null;
alter table public.mensajes add constraint mensajes_eliminado_sin_cuerpo check (eliminado_en is null or cuerpo is null);

-- C1
drop index if exists public.mensajes_conversacion_fecha_idx;
create index mensajes_hilo_idx on public.mensajes (conversacion_id, creado_en desc, id desc);

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_catalog.pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mensajes'
     ) then
    alter publication supabase_realtime add table public.mensajes;
  end if;
end;
$$;
