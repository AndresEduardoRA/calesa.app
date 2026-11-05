-- La última cotización de un vehículo (paso 4.14-1): `vehiculos.cotizado_en`, la que ordena «Últ. cotización» en el panel del vehículo. La escribe sólo el trigger
-- `trg_vehiculo_cotizado` de `cotizaciones`: al crear una cotización con ese vehículo (también «cargar a mano») y al guardar una que pasa a él. Nunca retrocede: la papelera,
-- restaurar y purgar no la tocan (P3). Cotizar no edita el vehículo (P1): cuando lo único que cambia es `cotizado_en`, ni se mueve la versión de la ficha (`actualizado_en`, la
-- que pide `vehiculo_guardar`) ni se escribe la fila en `actividad` (la cotización ya consta como `cotizaciones.insert`). La ve quien ve el vehículo (P2): sólo cuándo, no quién
-- ni cuánto. El relleno toma la cotización más nueva de cada vehículo, también las de la papelera, y queda como función para que la prueba corra la misma sentencia.

alter table public.vehiculos add column cotizado_en timestamptz;

comment on column public.vehiculos.cotizado_en is
  'Cuándo se cotizó por última vez este vehículo: lo escribe sólo trg_vehiculo_cotizado (crear con él, o pasarle una cotización); nunca retrocede. No mueve actualizado_en ni se audita.';
comment on table public.vehiculos is 'Inventario. De sólo lectura para la app: se escribe por vehiculo_crear() y vehiculo_guardar(). fase_id lo escriben cambiar_fase() y, sólo al nacer, vehiculo_crear() (entrada a la única fase inicial). publicado_web lo escribe vehiculo_vitrina(); que además se vea en la web lo decide interno.vitrina_vehiculos (fase activa que publica, origen activo y visible, integración web activa). cotizado_en lo escribe sólo el trigger trg_vehiculo_cotizado de cotizaciones, sin mover la versión ni auditar. Papelera: eliminado_en + lote; una policy RESTRICTIVE esconde lo borrado a todos.';

-- Cotizar no edita el vehículo: la versión y la auditoría de una actualización corren salvo que cambie `cotizado_en`, que sólo cambia sola (nadie más la escribe).
-- `trg_auditar` se parte en dos: un `when` que nombra `old` no puede ir en un trigger que también es de `insert`. Siguen en el mismo orden (por nombre) antes que los `trg_vehiculo_*`.
drop trigger trg_actualizado_en on public.vehiculos;
create trigger trg_actualizado_en before update on public.vehiculos for each row
  when (old.cotizado_en is not distinct from new.cotizado_en) execute function public.set_actualizado_en();

drop trigger trg_auditar on public.vehiculos;
create trigger trg_auditar after insert or delete on public.vehiculos for each row execute function public.auditar();
create trigger trg_auditar_cambio after update on public.vehiculos for each row
  when (old.cotizado_en is not distinct from new.cotizado_en) execute function public.auditar();

-- Quien escribe la columna. No es `security definer`: corre dentro de cotizacion_crear() y cotizacion_guardar(), que ya lo son, y nadie de la app la ejecuta.
-- «Sólo si es mayor»: no reescribe la fila si no cambia, y dos cotizaciones a la vez del mismo vehículo esperan la fila y vuelven a evaluar el `where` sobre la confirmada.
create function public._vehiculo_cotizado() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  if new.vehiculo_id is not null and (tg_op = 'INSERT' or new.vehiculo_id is distinct from old.vehiculo_id) then
    update public.vehiculos set cotizado_en = now()
     where id = new.vehiculo_id and (cotizado_en is null or cotizado_en < now());
  end if;
  return null;
end;
$$;

revoke all on function public._vehiculo_cotizado() from public, anon, authenticated;

create trigger trg_vehiculo_cotizado after insert or update of vehiculo_id on public.cotizaciones for each row execute function public._vehiculo_cotizado();

-- El relleno: el `creado_en` más nuevo de las cotizaciones de cada vehículo, también las de la papelera (la papelera no hace retroceder la columna). Como el trigger, sólo si es
-- mayor: llamada otra vez no cambia nada. No ve lo ya purgado ni cuándo una cotización pasó a otro vehículo (usa su `creado_en`). Devuelve cuántos vehículos movió.
create function public._vehiculos_cotizado_rellenar() returns integer
  language plpgsql
  set search_path = ''
as $$
declare n integer;
begin
  update public.vehiculos v set cotizado_en = m.ultima
    from (select c.vehiculo_id, max(c.creado_en) as ultima from public.cotizaciones c where c.vehiculo_id is not null group by c.vehiculo_id) m
   where v.id = m.vehiculo_id and (v.cotizado_en is null or v.cotizado_en < m.ultima);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public._vehiculos_cotizado_rellenar() from public, anon, authenticated;

comment on function public._vehiculos_cotizado_rellenar() is
  'Relleno de vehiculos.cotizado_en (paso 4.14-1) con la cotización más nueva de cada vehículo, también las de la papelera; sólo si es mayor. La llama la migración una vez.';

select public._vehiculos_cotizado_rellenar();
