-- Transporte: no se vacía un dato que la fase actual de la unidad exige como bloqueante (paso 6.07-1, C10–C12). Está en la tabla, no en la RPC: vale
-- para `transporte_guardar`, `transporte_grupo_aplicar`, `service_role` y el `on delete set null` de una naviera (D17: no se borra una naviera que una
-- fase exige). Toma la unidad `for share`: un vaciado y un `cambiar_fase` de la misma unidad (que la toma `for no key update`) se esperan, y el segundo
-- ve lo que dejó el primero. Un repuesto que sigue a su vehículo sale: sus datos son los del vehículo (D10, el aviso al vehículo queda para 8.08).

create or replace function public.transporte_exigido() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare v_fase uuid; v_nombre text; r record; v_antes boolean; v_despues boolean; v_col text; v_dato text;
begin
  if old.sigue_al_vehiculo then
    return new;
  end if;
  if old.vehiculo_id is not null then
    select v.fase_id into v_fase from public.vehiculos v where v.id = old.vehiculo_id for share;
  else
    select i.fase_id into v_fase from public.repuestos_items i where i.id = old.repuesto_id for share;
  end if;
  if v_fase is null then
    return new;
  end if;
  -- Por fases_requisitos_fase_id_idx.
  for r in
    select distinct q.clave_dato from public.fases_requisitos q
     where q.fase_id = v_fase and q.tipo = 'dato' and q.bloqueante
       and q.clave_dato = any (array['transporte.naviera', 'transporte.contenedor', 'transporte.booking', 'transporte.zarpe', 'transporte.eta',
                                     'transporte.arribo'])
  loop
    -- El mismo criterio que `_requisito_dato_cumplido()`: contenedor y booking vacíos = ''.
    case r.clave_dato
      when 'transporte.naviera' then
        v_antes := old.naviera_id is not null; v_despues := new.naviera_id is not null; v_col := 'naviera_id'; v_dato := 'la naviera';
      when 'transporte.contenedor' then
        v_antes := coalesce(old.contenedor, '') <> ''; v_despues := coalesce(new.contenedor, '') <> ''; v_col := 'contenedor'; v_dato := 'el contenedor';
      when 'transporte.booking' then
        v_antes := coalesce(old.booking, '') <> ''; v_despues := coalesce(new.booking, '') <> ''; v_col := 'booking'; v_dato := 'el booking';
      when 'transporte.zarpe' then
        v_antes := old.zarpe_el is not null; v_despues := new.zarpe_el is not null; v_col := 'zarpe_el'; v_dato := 'el zarpe';
      when 'transporte.eta' then
        v_antes := old.eta_el is not null; v_despues := new.eta_el is not null; v_col := 'eta_el'; v_dato := 'la ETA';
      else
        v_antes := old.arribo_el is not null; v_despues := new.arribo_el is not null; v_col := 'arribo_el'; v_dato := 'el arribo';
    end case;
    if v_antes and not v_despues then
      select f.nombre into v_nombre from public.fases f where f.id = v_fase;
      raise exception 'La fase «%» exige %: no se puede vaciar.', v_nombre, v_dato using errcode = '23514', hint = v_col;
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.transporte_exigido() from public, anon, authenticated;
grant execute on function public.transporte_exigido() to service_role;

create trigger trg_transporte_exigido
  before update of naviera_id, contenedor, booking, zarpe_el, eta_el, arribo_el on public.transportes
  for each row execute function public.transporte_exigido();
