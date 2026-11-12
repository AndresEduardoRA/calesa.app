-- La coherencia de `fase_desde` (paso 6.02-2, D5).
-- `fase_desde` existe si y sólo si hay fase. La cadena lo da por hecho: una fila en una fase con `fase_desde` nulo, o sin fase con `fase_desde`, no
-- saldría en ninguna columna (la de la fase pide `fase_desde < corte`; «Sin fase» pide `fase_desde is null`). `cambiar_fase` y `vehiculo_crear` ya los
-- escriben juntos; este trigger completa a quien inserta o cambia sólo `fase_id` (los fixtures de las pruebas, una carga a mano) y el check lo asegura.
create function public.vehiculo_fase_desde_coherente() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  if new.fase_id is null then
    new.fase_desde := null;
  elsif new.fase_desde is null then
    new.fase_desde := now();
  end if;
  return new;
end;
$$;

revoke all on function public.vehiculo_fase_desde_coherente() from public, anon, authenticated;

-- `trg_0_…`: antes que los demás `before` de `vehiculos` (se disparan por nombre), para que vean `fase_desde` ya completo.
create trigger trg_0_fase_desde_coherente before insert or update of fase_id, fase_desde on public.vehiculos for each row
  execute function public.vehiculo_fase_desde_coherente();

-- Lo cargado. Cambiar `fase_desde` ya no mueve la versión de la ficha ni audita (6.02-1, `20261111232044_fases_mover_sin_version.sql`). Efecto: una
-- unidad con fase y sin `fase_desde` no entraba en `alertas_demora()` (pide `fase_desde < …`); desde aquí cuenta desde su última edición y puede alertar.
update public.vehiculos set fase_desde = coalesce(actualizado_en, creado_en) where fase_id is not null and fase_desde is null;
update public.vehiculos set fase_desde = null where fase_id is null and fase_desde is not null;

alter table public.vehiculos add constraint vehiculos_fase_desde_coherente check ((fase_id is null) = (fase_desde is null));
