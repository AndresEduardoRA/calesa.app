-- 9.07 · Tablero: cuándo pasó un lead a cliente.
-- `leads` no guardaba el momento de la conversión y `actividad` dura 14 días: sin esto el tablero no puede contar «Convertidos» de un período.
-- La pone un trigger mirando la **clase** del tipo (`tipos_lead.clase`), nunca su nombre ni su clave (9j): renombrar «Cliente» o crear otro tipo de
-- clase `cliente` no cambia nada. Decisiones del paso (docs/pasos/9.07/decisiones.md):
--   D3. Los clientes que ya existen quedan sin fecha: no se sabe cuándo pasaron y no se inventa. `_tablero_conversion_desde()` dice desde qué día se
--       registra (el de esta migración en cada entorno), para que la pantalla diga «Desde <fecha>».
--   D4. Un alta directa como cliente (también una importación) queda sin fecha: es un cliente cuya conversión no se vio.
--   D5. De un tipo cliente a otro conserva la fecha; volver a prospecto la vacía.

alter table public.leads add column cliente_desde timestamptz;

comment on column public.leads.cliente_desde is
  'Cuándo pasó de un tipo de clase prospecto a uno de clase cliente (9.07). La pone trg_lead_z_cliente_desde; nula en un alta directa como cliente y en los clientes anteriores a la migración. Sin grant: sólo la leen las RPC tablero_*.';

-- `leads` se lee por grants de columna: la columna nueva nace sin grant para `authenticated` y así queda.

create function public.lead_cliente_desde() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_cambio boolean;
  v_era_prospecto boolean;
  v_es_cliente boolean;
begin
  -- D4: un alta nunca trae fecha, venga como venga.
  if tg_op = 'INSERT' then
    new.cliente_desde := null;
    return new;
  end if;
  -- Nadie la escribe a mano: sin cambio de tipo, queda la que había.
  v_cambio := new.tipo_lead_id is distinct from old.tipo_lead_id;
  if not v_cambio then
    new.cliente_desde := old.cliente_desde;
    return new;
  end if;
  select coalesce(bool_or(t.clase = 'cliente'), false) into v_es_cliente from public.tipos_lead t where t.id = new.tipo_lead_id;
  select coalesce(bool_or(t.clase = 'prospecto'), false) into v_era_prospecto from public.tipos_lead t where t.id = old.tipo_lead_id;
  if not v_es_cliente then
    new.cliente_desde := null;
  elsif v_era_prospecto then
    new.cliente_desde := now();
  else
    -- D5: de cliente a cliente, la fecha de antes (nula si era un cliente sin fecha).
    new.cliente_desde := old.cliente_desde;
  end if;
  return new;
end;
$$;

revoke all on function public.lead_cliente_desde() from public, anon, authenticated;
grant execute on function public.lead_cliente_desde() to service_role;

-- El nombre empieza por «z» a propósito: Postgres dispara los BEFORE de una tabla por orden alfabético, y éste tiene que correr después de
-- `trg_lead_tipo_por_defecto` y `trg_lead_tipo_vigente`, con el tipo ya puesto y validado. Sólo cuando el update nombra el tipo o la fecha.
create trigger trg_lead_z_cliente_desde
  before insert or update of tipo_lead_id, cliente_desde on public.leads
  for each row execute function public.lead_cliente_desde();

-- «Convertidos» de un período recorre este índice por rango de fecha (tablero_leads).
create index leads_cliente_desde_idx on public.leads (cliente_desde) where eliminado_en is null and cliente_desde is not null;

-- D3: el día desde el que se registra la conversión, sellado al aplicar en cada entorno (en la zona de la empresa). La definición se arma aquí
-- con `format`: su cuerpo es `select '<día de la migración>'::date`.
do $do$
declare
  v_dia date := (now() at time zone coalesce((select e.zona_horaria from public.ajustes_empresa e where e.id = 1), 'America/La_Paz'))::date;
begin
  execute format($f$
    create function public._tablero_conversion_desde() returns date
      language sql immutable
      set search_path = ''
    as $b$ select %L::date $b$
  $f$, v_dia);
end
$do$;

comment on function public._tablero_conversion_desde() is
  'Día desde el que leads.cliente_desde se registra (9.07, D3): el de la migración tablero_cliente_desde en este entorno.';

revoke all on function public._tablero_conversion_desde() from public, anon, authenticated;
grant execute on function public._tablero_conversion_desde() to service_role;
