-- Las fórmulas sólo las lee quien las configura (paso 4.08, prompt 2; D7: «la fórmula viaja sólo a quien tiene cotizaciones.configurar»).
--
--  1. La policy «formulas: leer» era `true`: cualquier sesión leía `definicion`, `params` y, desde …005800, `diseno` y `visibilidad`. Ahora la
--     lee quien tiene `cotizaciones.configurar` del origen de la fila. Todo lo demás que necesita una fórmula la lee por una función
--     `definer` (`cotizacion_validar`, `cotizacion_evaluar`, `origenes_resumen`, `_publicar_formula`…), que no pasa por la policy.
--     Es un InitPlan: el arreglo de orígenes se calcula una vez por sentencia y la fila se compara con él (`formulas_origen_id_version_key`).
--  2. La auditoría copiaba la fila ENTERA a `actividad`, que lee quien tiene `actividad.ver` sin filtro por origen: la fórmula salía por ahí.
--     `formula_auditar()` registra la fila sin el contenido (`definicion`, `params`, `diseno`, `visibilidad`); quedan versión, estado, nota,
--     quién y cuándo. No se pierde nada: las versiones son append-only y siguen en `formulas`. También abarata cada publicar: copiaba cuatro
--     veces un JSON de cientos de KB.

drop policy if exists "formulas: leer" on public.formulas;
create policy "formulas: leer" on public.formulas for select to authenticated
  using (origen_id = any ((select public.origenes_con_alcance('cotizaciones.configurar', 'propios'))::uuid[]));

create or replace function public.formula_auditar()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id text;
begin
  v_id := coalesce(to_jsonb(coalesce(new, old)) ->> 'id', '');
  insert into public.actividad (accion, actor_id, tabla, registro_id, antes, despues)
  values (tg_table_name || '.' || lower(tg_op), (select auth.uid()), tg_table_name, v_id,
          case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'definicion' - 'params' - 'diseno' - 'visibilidad' end,
          case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'definicion' - 'params' - 'diseno' - 'visibilidad' end);
  return null;
end;
$$;
revoke all on function public.formula_auditar() from public, anon, authenticated;
drop trigger if exists trg_auditar on public.formulas;
create trigger trg_auditar after insert or update or delete on public.formulas for each row execute function public.formula_auditar();
