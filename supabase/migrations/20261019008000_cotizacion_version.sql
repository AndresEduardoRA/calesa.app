-- La versión de una cotización (`actualizado_en`) pasa a tener un trigger propio (paso 4.10, prompt 3; D7 y la regla de `.claude/rules/migraciones.md`).
--
-- `cotizacion_guardar()` (migraciones siguientes) edita con bloqueo optimista: `p_actualizado_en_esperado` contra `cotizaciones.actualizado_en`. El trigger genérico
-- (`trg_actualizado_en`, `now()`) no sirve a eso por dos razones:
--   1. Mueve la versión con cualquier `update`, también con el contador de favoritos o de reportes, que sube cuando CUALQUIERA que la lee marca un favorito: quien está editando
--      recibiría un PT409 por algo que no tocó, y `_conflicto_de_edicion()` nombraría a quien marcó el favorito. Un cambio sólo de `reportes_count` o `favoritos_count` no mueve la versión.
--   2. `now()` es la hora de inicio de la transacción: dos cambios en la misma transacción dejan la misma versión (en `db:probar`, que corre cada bloque en una transacción,
--      el PT409 de «la versión vieja» no se podría probar). La versión se sella con `greatest(clock_timestamp(), anterior + 1 µs)`, que se mueve siempre y es la regla de
--      las tablas que ya la tienen así (fotos, lotes de papelera).
-- La auditoría (`cotizacion_auditar()`) tampoco registra un cambio sólo de contadores: no es un cambio de la cotización.

create or replace function public.cotizacion_version()
returns trigger language plpgsql set search_path = '' as $$
declare
  v public.cotizaciones;
begin
  -- Una copia de la fila nueva con lo que no cuenta puesto como estaba: si queda igual a la vieja, sólo cambiaron los contadores.
  v := new;
  v.actualizado_en := old.actualizado_en;
  v.reportes_count := old.reportes_count;
  v.favoritos_count := old.favoritos_count;
  if v is not distinct from old then
    new.actualizado_en := old.actualizado_en;
    return new;
  end if;
  new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  return new;
end $$;
revoke all on function public.cotizacion_version() from public, anon, authenticated;
comment on function public.cotizacion_version() is
  'Trigger de cotizaciones: sella la versión (actualizado_en) con greatest(clock_timestamp(), anterior + 1 µs) y no la mueve si sólo cambian los contadores de reportes o favoritos. docs/COTIZADOR.md › «Cómo se guarda (4.10-3)».';

drop trigger if exists trg_actualizado_en on public.cotizaciones;
create trigger trg_cotizacion_version before update on public.cotizaciones for each row execute function public.cotizacion_version();

create or replace function public.cotizacion_auditar()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id text; v public.cotizaciones;
begin
  -- Un cambio sólo de los contadores de reportes o favoritos no es un cambio de la cotización.
  if tg_op = 'UPDATE' then
    v := new;
    v.actualizado_en := old.actualizado_en;
    v.reportes_count := old.reportes_count;
    v.favoritos_count := old.favoritos_count;
    if v is not distinct from old then return null; end if;
  end if;
  v_id := coalesce(to_jsonb(coalesce(new, old)) ->> 'id', '');
  insert into public.actividad (accion, actor_id, tabla, registro_id, antes, despues)
  values (tg_table_name || '.' || lower(tg_op), (select auth.uid()), tg_table_name, v_id,
          case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'valores' - 'fuentes' - 'totales' - 'tipos_cambio' end,
          case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'valores' - 'fuentes' - 'totales' - 'tipos_cambio' end);
  return null;
end;
$$;
comment on function public.cotizacion_auditar() is
  'Trigger de auditoría de cotizaciones: la fila sin valores, fuentes, totales ni tipos_cambio (el snapshot lo ven las revisiones, recortado por nivel); no registra un cambio sólo de contadores. Pasos 4.10-1 y 4.10-3.';
