-- La auditoría de una cotización no copia el snapshot (paso 4.10, prompt 1; D7: lo que no se ve no viaja).
--
-- `auditar()` copiaba la fila ENTERA de `cotizaciones` a `actividad.antes/despues` en cada insert, update y delete: `valores`, `fuentes`, `totales` y
-- `tipos_cambio` incluidos, o sea los nodos de «costos» que ahora sólo lee quien tiene el nivel. Hoy la API no lee esas dos columnas
-- (`…20261014000900`: `authenticated` sólo lee id, accion, actor, tabla, registro, detalle y fecha), pero la pantalla de Actividad (Fase 9) las va a
-- leer, y copiar un snapshot de 100 a 2.000 nodos dos veces por edición es plata tirada: ya pasó con las fórmulas (`formula_auditar()`, `…005900`).
--
-- `cotizacion_auditar()` registra la fila sin esas cuatro columnas: quedan el total, el modo, el título, la clase, el estado, el lead, el vehículo y
-- quién y cuándo. Qué cambió dentro del snapshot lo guardan las revisiones (`cotizaciones_revisiones.diff`), que se leen recortadas por nodo
-- (`cotizacion_revisiones()`). Las filas que ya estaban se limpian en esta misma migración.

create or replace function public.cotizacion_auditar()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id text;
begin
  v_id := coalesce(to_jsonb(coalesce(new, old)) ->> 'id', '');
  insert into public.actividad (accion, actor_id, tabla, registro_id, antes, despues)
  values (tg_table_name || '.' || lower(tg_op), (select auth.uid()), tg_table_name, v_id,
          case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'valores' - 'fuentes' - 'totales' - 'tipos_cambio' end,
          case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'valores' - 'fuentes' - 'totales' - 'tipos_cambio' end);
  return null;
end;
$$;
revoke all on function public.cotizacion_auditar() from public, anon, authenticated;
comment on function public.cotizacion_auditar() is
  'Trigger de auditoría de cotizaciones: la fila sin valores, fuentes, totales ni tipos_cambio (el snapshot lo ven las revisiones, recortado por nivel). Paso 4.10-1.';

drop trigger if exists trg_auditar on public.cotizaciones;
create trigger trg_auditar after insert or update or delete on public.cotizaciones
  for each row execute function public.cotizacion_auditar();

-- Lo que ya se copió.
update public.actividad
   set antes = antes - 'valores' - 'fuentes' - 'totales' - 'tipos_cambio',
       despues = despues - 'valores' - 'fuentes' - 'totales' - 'tipos_cambio'
 where tabla = 'cotizaciones'
   and (antes ?| array['valores', 'fuentes', 'totales', 'tipos_cambio'] or despues ?| array['valores', 'fuentes', 'totales', 'tipos_cambio']);
