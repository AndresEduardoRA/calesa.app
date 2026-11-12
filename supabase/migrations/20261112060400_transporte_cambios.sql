-- Transporte: la lista cerrada de cambios, la validación de una unidad y su candado (paso 6.07-1, C1–C3). Las comparten `transporte_guardar` y
-- `transporte_grupo_aplicar`; ninguna se llama desde afuera.

-- C1 · aplica `p_cambios` sobre `o`: sólo las claves de `p_claves`; JSON null = vaciar, clave ausente = no cambia. Contenedor y booking en mayúsculas y
-- sin espacios (D5). Un valor que no se convierte da 22023 con la clave en `hint`, nunca 22P02.
create or replace function public._transporte_cambios(o public.transportes, p_cambios jsonb, p_claves text[]) returns public.transportes
language plpgsql stable
set search_path = ''
as $$
declare n public.transportes := o; k text; v text; tipo text;
begin
  if p_cambios is null then
    return n;
  end if;
  if jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios van como un objeto.' using errcode = '22023', hint = 'cambios';
  end if;
  for k in select x from jsonb_object_keys(p_cambios) x order by x loop
    if k <> all (p_claves) then
      raise exception 'No se cambia «%».', k using errcode = '22023', hint = k;
    end if;
    tipo := jsonb_typeof(p_cambios -> k);
    if tipo not in ('string', 'null') then
      raise exception 'El valor de «%» no es válido.', k using errcode = '22023', hint = k;
    end if;
    v := p_cambios ->> k;
    if k in ('naviera_id', 'puerto_origen_id', 'puerto_destino_id') then
      if v is not null and not pg_input_is_valid(v, 'uuid') then
        raise exception 'El valor de «%» no es válido.', k using errcode = '22023', hint = k;
      end if;
      case k
        when 'naviera_id' then n.naviera_id := v::uuid;
        when 'puerto_origen_id' then n.puerto_origen_id := v::uuid;
        else n.puerto_destino_id := v::uuid;
      end case;
    elsif k in ('contenedor', 'booking') then
      v := nullif(upper(regexp_replace(v, '\s', '', 'g')), '');
      if v is not null and v !~ '^[A-Z0-9./-]{1,40}$' then
        raise exception 'El % lleva sólo letras, dígitos, punto, barra o guion (hasta 40).', k using errcode = '22023', hint = k;
      end if;
      if k = 'contenedor' then n.contenedor := v; else n.booking := v; end if;
    elsif k in ('zarpe_el', 'eta_el', 'arribo_el') then
      -- Sólo AAAA-MM-DD: `date` acepta también 'today', 'epoch' o 'infinity'.
      if v is not null and (v !~ '^\d{4}-\d{2}-\d{2}$' or not pg_input_is_valid(v, 'date')) then
        raise exception 'La fecha de «%» no es válida.', k using errcode = '22023', hint = k;
      end if;
      case k
        when 'zarpe_el' then n.zarpe_el := v::date;
        when 'eta_el' then n.eta_el := v::date;
        else n.arribo_el := v::date;
      end case;
    elsif k = 'notas' then
      v := nullif(btrim(v), '');
      if length(v) > 2000 then
        raise exception 'Las notas llevan hasta 2.000 caracteres.' using errcode = '22023', hint = 'notas';
      end if;
      n.notas := v;
    end if;
  end loop;
  return n;
end;
$$;

-- C2 · valida el transporte que resulta (`n`) contra el de antes (`o`). Sólo frena lo nuevo: lo guardado se conserva aunque salga de la oferta (D7).
-- Usa flujos_transporte_oferta_flujo_id_idx.
create or replace function public._transporte_validar(p_flujo uuid, p_fase uuid, o public.transportes, n public.transportes, p_titulo text)
returns void
language plpgsql stable
set search_path = ''
as $$
declare
  pre text := coalesce('«' || p_titulo || '»: ', '');
  f public.fases;
  c record;
begin
  if not public.flujo_regla_activa(p_flujo, 'transporte') then
    raise exception '%El transporte está apagado en el flujo de esta unidad.', pre using errcode = '23514', hint = 'transporte';
  end if;
  -- D9 · un repuesto que sigue a su vehículo usa los datos del vehículo.
  if o.sigue_al_vehiculo then
    if n.naviera_id is not null then
      raise exception '%Este repuesto sigue a su vehículo: la naviera es la del vehículo.', pre using errcode = '23514', hint = 'naviera_id';
    end if;
    if n.contenedor is not null then
      raise exception '%Este repuesto sigue a su vehículo: el contenedor es el del vehículo.', pre using errcode = '23514', hint = 'contenedor';
    end if;
    if n.booking is not null then
      raise exception '%Este repuesto sigue a su vehículo: el booking es el del vehículo.', pre using errcode = '23514', hint = 'booking';
    end if;
  end if;
  if n.contenedor is not null and n.contenedor is distinct from o.contenedor then
    if not public.flujo_regla_activa(p_flujo, 'contenedor') then
      raise exception '%El contenedor está apagado en el flujo de esta unidad.', pre using errcode = '23514', hint = 'contenedor';
    end if;
    select * into f from public.fases x where x.id = p_fase;
    if f.id is null then
      raise exception '%Una unidad sin fase no recibe contenedor.', pre using errcode = '23514', hint = 'contenedor';
    end if;
    if not f.permite_contenedor then
      raise exception '%La fase «%» no permite asignar contenedor.', pre, f.nombre using errcode = '23514', hint = 'contenedor';
    end if;
  end if;
  -- D7 · naviera y puertos nuevos: existen, activos y, si la oferta de su tipo no está vacía, ofrecidos.
  for c in
    select * from (values
      ('naviera_id', 'naviera', n.naviera_id, o.naviera_id, 'Esa naviera'),
      ('puerto_origen_id', 'puerto_origen', n.puerto_origen_id, o.puerto_origen_id, 'Ese puerto de origen'),
      ('puerto_destino_id', 'puerto_destino', n.puerto_destino_id, o.puerto_destino_id, 'Ese puerto de destino')
    ) x (campo, tipo, nuevo, viejo, sujeto)
    where x.nuevo is not null and x.nuevo is distinct from x.viejo
  loop
    if c.tipo = 'naviera' then
      if not exists (select 1 from public.navieras v where v.id = c.nuevo and v.activo) then
        raise exception '% no existe o está inactiva.', pre || c.sujeto using errcode = '22023', hint = c.campo;
      end if;
      if exists (select 1 from public.flujos_transporte_oferta t where t.flujo_id = p_flujo and t.tipo = 'naviera')
         and not exists (select 1 from public.flujos_transporte_oferta t where t.flujo_id = p_flujo and t.tipo = 'naviera' and t.naviera_id = c.nuevo) then
        raise exception '% no se ofrece en este flujo.', pre || c.sujeto using errcode = '23514', hint = c.campo;
      end if;
    else
      if not exists (select 1 from public.puertos v where v.id = c.nuevo and v.activo) then
        raise exception '% no existe o está inactivo.', pre || c.sujeto using errcode = '22023', hint = c.campo;
      end if;
      if exists (select 1 from public.flujos_transporte_oferta t where t.flujo_id = p_flujo and t.tipo = c.tipo)
         and not exists (select 1 from public.flujos_transporte_oferta t where t.flujo_id = p_flujo and t.tipo = c.tipo and t.puerto_id = c.nuevo) then
        raise exception '% no se ofrece en este flujo.', pre || c.sujeto using errcode = '23514', hint = c.campo;
      end if;
    end if;
  end loop;
  -- D8 · las fechas, sólo si cambia alguna.
  if (n.zarpe_el, n.eta_el, n.arribo_el) is distinct from (o.zarpe_el, o.eta_el, o.arribo_el) then
    if n.eta_el < n.zarpe_el then
      raise exception '%La ETA no puede ser antes del zarpe.', pre using errcode = '22023', hint = 'eta_el';
    end if;
    if n.arribo_el < n.zarpe_el then
      raise exception '%El arribo no puede ser antes del zarpe.', pre using errcode = '22023', hint = 'arribo_el';
    end if;
  end if;
end;
$$;

-- C3 · el flujo, la fase y el título de una unidad viva. Con `p_bloquear`, la toma `for share` (espera y hace esperar a `cambiar_fase`, que la toma
-- `for no key update`); si tras esperar ya no está viva, PT409.
create or replace function public._transporte_unidad(p_vehiculo uuid, p_repuesto uuid, p_bloquear boolean,
  out flujo uuid, out fase_id uuid, out titulo text)
language plpgsql
set search_path = ''
as $$
begin
  if p_vehiculo is not null then
    if p_bloquear then
      select f.id, v.fase_id, v.titulo into flujo, fase_id, titulo
        from public.vehiculos v left join public.flujos f on f.origen_id = v.origen_id
       where v.id = p_vehiculo and v.eliminado_en is null
         for share of v;
    else
      select f.id, v.fase_id, v.titulo into flujo, fase_id, titulo
        from public.vehiculos v left join public.flujos f on f.origen_id = v.origen_id
       where v.id = p_vehiculo and v.eliminado_en is null;
    end if;
  elsif p_bloquear then
    select f.id, i.fase_id, i.descripcion into flujo, fase_id, titulo
      from public.repuestos_items i left join public.flujos f on f.ambito = 'repuestos'
     where i.id = p_repuesto and i.eliminado_en is null
       for share of i;
  else
    select f.id, i.fase_id, i.descripcion into flujo, fase_id, titulo
      from public.repuestos_items i left join public.flujos f on f.ambito = 'repuestos'
     where i.id = p_repuesto and i.eliminado_en is null;
  end if;
  if not found then
    raise exception 'Esa unidad ya no existe o está en la papelera. Recarga.' using errcode = 'PT409';
  end if;
end;
$$;

revoke all on function public._transporte_cambios(public.transportes, jsonb, text[]) from public, anon, authenticated;
revoke all on function public._transporte_validar(uuid, uuid, public.transportes, public.transportes, text) from public, anon, authenticated;
revoke all on function public._transporte_unidad(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public._transporte_cambios(public.transportes, jsonb, text[]) to service_role;
grant execute on function public._transporte_validar(uuid, uuid, public.transportes, public.transportes, text) to service_role;
grant execute on function public._transporte_unidad(uuid, uuid, boolean) to service_role;
