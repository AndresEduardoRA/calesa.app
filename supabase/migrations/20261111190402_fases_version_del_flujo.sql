-- La versión de un flujo (paso 5.01-1): la versión de toda la configuración de un flujo (sus fases y, desde el 5.05, 5.07 y 5.10, sus
-- transiciones, requisitos y reglas) es `flujos.actualizado_en`. Toda RPC de configuración pasa por `_flujo_para_editar()` antes de leer o
-- escribir y por `_flujo_tocar()` al final, y devuelve lo que éste devuelve.
--
-- El trigger genérico (`set_actualizado_en`, `now()`) daría la misma hora a dos toques en una transacción: lo reemplaza `flujo_version()`,
-- que la mueve siempre hacia adelante (`greatest(clock_timestamp(), anterior + 1 µs)`, como `cotizacion_version()`).

drop trigger if exists trg_actualizado_en on public.flujos;

create or replace function public.flujo_version() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  return new;
end $$;

revoke all on function public.flujo_version() from public, anon, authenticated;
grant execute on function public.flujo_version() to service_role;

create trigger trg_flujo_version before update on public.flujos for each row execute function public.flujo_version();

-- El candado y la versión de un flujo. Firma estable: la usan las RPC de fases (5.01), transiciones (5.05), requisitos (5.07) y reglas (5.10).
create or replace function public._flujo_para_editar(p_flujo uuid, p_actualizado_en_esperado timestamptz) returns public.flujos
language plpgsql
set search_path = ''
as $$
declare
  v public.flujos;
begin
  if p_flujo is null or not exists (select 1 from public.flujos where id = p_flujo) then
    raise exception 'Este flujo ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  -- El permiso antes del candado: quien no puede no espera ni hace esperar (el ámbito y el origen de un flujo no se editan).
  if not public.puede_configurar_flujo(p_flujo) then
    raise exception 'No tienes permiso para configurar este flujo.' using errcode = '42501';
  end if;
  select * into v from public.flujos where id = p_flujo for update;
  if not found then
    raise exception 'Este flujo ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(v.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este flujo mientras lo editabas.');
  return v;
end $$;

comment on function public._flujo_para_editar(uuid, timestamptz) is
  'Contrato de la configuración de un flujo (5.01). Orden: inexistente → PT409; sin puede_configurar_flujo → 42501 (antes del candado); '
  'for update de la fila de flujos; _exigir_version contra flujos.actualizado_en → PT409. Devuelve la fila bloqueada. Sólo para RPC security definer.';

-- Mueve la versión del flujo (el trigger `flujo_version`) y la devuelve. Se llama después de escribir.
create or replace function public._flujo_tocar(p_flujo uuid) returns timestamptz
language sql
set search_path = ''
as $$
  update public.flujos set actualizado_en = actualizado_en where id = p_flujo returning actualizado_en;
$$;

comment on function public._flujo_tocar(uuid) is
  'Contrato de la configuración de un flujo (5.01): mueve flujos.actualizado_en y devuelve la versión nueva; toda RPC de configuración la devuelve.';

revoke all on function public._flujo_para_editar(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public._flujo_tocar(uuid) from public, anon, authenticated;
grant execute on function public._flujo_para_editar(uuid, timestamptz) to service_role;
grant execute on function public._flujo_tocar(uuid) to service_role;
