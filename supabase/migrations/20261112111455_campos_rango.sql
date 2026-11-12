-- El rango de un campo numérico (9.04-2, 9-2): `minimo` y `maximo` en `leads_campos` y `origenes_campos`, nulos = sin límite, sólo en
-- `numero` y `moneda`. Los triggers de atributos de leads y de vehículos rechazan un valor fuera con 22023, el motivo y
-- `hint = 'atributos.<clave>'`. La regla es una sola (`_valor_fuera_de_rango`): la usan el rechazo y el impacto de las RPC de campos.
-- Un valor que ya estaba fuera no impide guardar: se valida un campo sólo si su valor cambió (cambiar un rango no revalida lo cargado).

alter table public.leads_campos
  add column minimo numeric,
  add column maximo numeric,
  add constraint leads_campos_rango_orden check (minimo is null or maximo is null or minimo <= maximo),
  add constraint leads_campos_rango_numerico check ((minimo is null and maximo is null) or tipo in ('numero', 'moneda'));

alter table public.origenes_campos
  add column minimo numeric,
  add column maximo numeric,
  add constraint origenes_campos_rango_orden check (minimo is null or maximo is null or minimo <= maximo),
  add constraint origenes_campos_rango_numerico check ((minimo is null and maximo is null) or tipo in ('numero', 'moneda'));

comment on column public.leads_campos.minimo is 'Rango (de un campo): el valor más chico que admite un número o un monto; null = sin límite.';
comment on column public.leads_campos.maximo is 'Rango (de un campo): el valor más grande que admite un número o un monto; null = sin límite.';
comment on column public.origenes_campos.minimo is 'Rango (de un campo): el valor más chico que admite un número o un monto; null = sin límite.';
comment on column public.origenes_campos.maximo is 'Rango (de un campo): el valor más grande que admite un número o un monto; null = sin límite.';

-- La única regla: true si el valor es un número de jsonb por debajo del mínimo o por encima del máximo (los nulos no limitan).
create function public._valor_fuera_de_rango(p_valor jsonb, p_minimo numeric, p_maximo numeric) returns boolean
    language sql immutable
    set search_path = ''
    as $$
  select coalesce(jsonb_typeof(p_valor) = 'number'
                  and ((p_minimo is not null and (p_valor #>> '{}')::numeric < p_minimo)
                       or (p_maximo is not null and (p_valor #>> '{}')::numeric > p_maximo)), false)
$$;

-- Rechaza el primer valor que cambió y quedó fuera del rango de su campo. `p_campos`: arreglo de {clave, etiqueta, minimo, maximo}.
create function public._atributos_rango(p_nuevos jsonb, p_anteriores jsonb, p_campos jsonb) returns void
    language plpgsql immutable
    set search_path = ''
    as $$
declare c record; v jsonb; v_motivo text;
begin
  for c in select x.clave, x.etiqueta, x.minimo, x.maximo
           from jsonb_to_recordset(coalesce(p_campos, '[]'::jsonb)) as x (clave text, etiqueta text, minimo numeric, maximo numeric)
           where x.minimo is not null or x.maximo is not null loop
    v := p_nuevos -> c.clave;
    continue when v is not distinct from coalesce(p_anteriores, '{}'::jsonb) -> c.clave;
    continue when not public._valor_fuera_de_rango(v, c.minimo, c.maximo);
    if c.minimo is not null and c.maximo is not null then
      v_motivo := format('«%s» va de %s a %s.', c.etiqueta, trim_scale(c.minimo), trim_scale(c.maximo));
    elsif c.minimo is not null then
      v_motivo := format('«%s» va desde %s.', c.etiqueta, trim_scale(c.minimo));
    else
      v_motivo := format('«%s» va hasta %s.', c.etiqueta, trim_scale(c.maximo));
    end if;
    raise exception '%', v_motivo using errcode = '22023', hint = 'atributos.' || c.clave;
  end loop;
end;
$$;

revoke all on function public._valor_fuera_de_rango(jsonb, numeric, numeric) from public, anon, authenticated;
revoke all on function public._atributos_rango(jsonb, jsonb, jsonb) from public, anon, authenticated;

-- Desde la base (`20261028180656_base.sql`): `v_activos` suma el rango y, tras el formato, `_atributos_rango` con los anteriores.
create or replace function public.lead_validar_atributos() returns trigger
    language plpgsql security definer
    set search_path = ''
    as $$
declare v_anteriores jsonb := '{}'::jsonb; v_fuera boolean; v_todos jsonb; v_activos jsonb; c record;
begin
  if jsonb_typeof(new.atributos) <> 'object' then
    raise exception 'Los atributos de un lead tienen que ser un objeto.' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' then
    v_anteriores := old.atributos;
  end if;
  v_fuera := tg_op = 'UPDATE' and (select auth.uid()) is not null and not public.en_cartera(new.id);
  if v_fuera then
    for c in select k.clave, k.etiqueta from public.leads_campos k where k.solo_cartera loop
      if new.atributos -> c.clave is distinct from v_anteriores -> c.clave then
        raise exception 'No tienes acceso a «%».', c.etiqueta using errcode = '42501', hint = 'atributos.' || c.clave;
      end if;
    end loop;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('clave', k.clave, 'etiqueta', k.etiqueta, 'tipo', k.tipo,
                                               'opciones', k.opciones, 'activo', k.activo)), '[]'::jsonb),
         coalesce(jsonb_agg(jsonb_build_object('clave', k.clave, 'etiqueta', k.etiqueta, 'tipo', k.tipo,
                                               'requerido', k.requerido and not (v_fuera and k.solo_cartera),
                                               'minimo', k.minimo, 'maximo', k.maximo))
                  filter (where k.activo), '[]'::jsonb)
    into v_todos, v_activos
  from public.leads_campos k;

  perform public._atributos_validar(new.atributos, v_activos, 'Los atributos de un lead tienen que ser un objeto.');
  perform public._lead_atributos_formato(new.atributos, v_anteriores, v_todos);
  perform public._atributos_rango(new.atributos, v_anteriores, v_activos);
  return new;
end;
$$;

-- Desde la base: los campos activos del origen con su rango, y los anteriores si el origen no cambió (si cambió, se valida todo:
-- los campos son otros). Rige para toda escritura que cambie el valor, también la de la subasta.
create or replace function public.vehiculo_validar_atributos() returns trigger
    language plpgsql security definer
    set search_path = ''
    as $$
declare v_anteriores jsonb := '{}'::jsonb; v_campos jsonb;
begin
  if tg_op = 'UPDATE' and old.origen_id = new.origen_id then
    v_anteriores := old.atributos;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('clave', c.clave, 'etiqueta', c.etiqueta, 'tipo', c.tipo, 'requerido', c.requerido,
                                               'minimo', c.minimo, 'maximo', c.maximo)), '[]'::jsonb)
    into v_campos
  from public.origenes_campos c where c.origen_id = new.origen_id and c.activo;
  perform public._atributos_validar(new.atributos, v_campos, 'Los atributos de un vehículo tienen que ser un objeto.');
  perform public._atributos_rango(new.atributos, v_anteriores, v_campos);
  return new;
end;
$$;
