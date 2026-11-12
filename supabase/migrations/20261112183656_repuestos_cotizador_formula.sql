-- El cotizador de repuestos: la fórmula en la base y los tramos sin solape (paso 8.12-1, C1–C3, C8).
--   La fórmula es la misma de `src/modules/repuestos/entities/cotizador/formula.ts`, y los dos lados corren los mismos casos
--   (`casos-del-cotizador.json`, copiado en `supabase/tests/areas/repuestos/cotizador.sql`). Por unidad, con L = la logística escrita o la sugerida:
--     importado = costo × factor_importado + L + caja · local = (costo + L + caja) × (1 + recargo_local)
--   El unitario va al múltiplo más cercano de `redondeo` (la mitad hacia arriba, con `div`: nunca `round(x / r)`), y el total es unitario × cantidad.
--   La logística sugerida es el monto del tramo con costo_min ≤ costo < costo_max (costo_max nulo = abierto): sin tramo, sin sugerencia (nunca 0).
--   Todo sale del `config_snapshot` de la cotización, nunca de la configuración vigente.

-- C3 · la logística sugerida del snapshot, o nula.
create or replace function public._repuesto_cotizacion_sugerida(p_snapshot jsonb, p_costo numeric) returns numeric
language sql immutable
set search_path = ''
as $$
  select (t ->> 'monto')::numeric
    from jsonb_array_elements(coalesce(p_snapshot -> 'tramos', '[]'::jsonb)) t
   where p_costo is not null
     and (t ->> 'costo_min')::numeric <= p_costo
     and (t ->> 'costo_max' is null or p_costo < (t ->> 'costo_max')::numeric)
   order by (t ->> 'costo_min')::numeric
   limit 1;
$$;

-- C1–C2 · una línea: {logistica_sugerida, unitario, total, falta}, montos como texto con dos decimales.
-- `falta`: 'costo' | 'logistica' | 'caja' (en ese orden) si no hay con qué calcular, 'no_cabe' si el total no entra en numeric(18,2).
create or replace function public._repuesto_cotizacion_linea(p_snapshot jsonb, p_bloque text, p_cantidad integer, p_costo numeric,
                                                             p_logistica numeric, p_caja numeric) returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  v_sug numeric := public._repuesto_cotizacion_sugerida(p_snapshot, p_costo);
  v_l numeric := coalesce(p_logistica, v_sug);
  v_red numeric; v_x numeric; v_q numeric; v_u numeric; v_t numeric; v_falta text;
begin
  if p_bloque is distinct from 'importado' and p_bloque is distinct from 'local' then
    raise exception 'El bloque es «importado» o «local».' using errcode = '22023', hint = 'bloque';
  end if;
  if p_costo is null then
    v_falta := 'costo';
  elsif v_l is null then
    v_falta := 'logistica';
  elsif p_caja is null then
    v_falta := 'caja';
  else
    if p_bloque = 'importado' then
      v_x := p_costo * (p_snapshot #>> '{config,factor_importado}')::numeric + v_l + p_caja;
    else
      v_x := (p_costo + v_l + p_caja) * (1 + (p_snapshot #>> '{config,recargo_local}')::numeric);
    end if;
    -- Un redondeo ≤ 0 (filas viejas sin el check) vale 0,01.
    v_red := (p_snapshot #>> '{config,redondeo}')::numeric;
    if v_red is null or v_red <= 0 then
      v_red := 0.01;
    end if;
    v_q := div(v_x, v_red);
    if 2 * (v_x - v_q * v_red) >= v_red then
      v_q := v_q + 1;
    end if;
    v_u := v_q * v_red;
    v_t := v_u * p_cantidad;
    if v_t >= 1e16 then
      v_falta := 'no_cabe';
      v_u := null;
      v_t := null;
    end if;
  end if;
  return jsonb_build_object('logistica_sugerida', round(v_sug, 2)::text, 'unitario', round(v_u, 2)::text, 'total', round(v_t, 2)::text,
                            'falta', v_falta);
end;
$$;

-- C8 · dos tramos activos de una misma moneda no se cruzan (contiguos sí: [0,100) y [100,500)). La fila de la moneda se toma
-- `for no key update` para serializar altas a la vez de la misma moneda sin chocar con el `for key share` de las FK que la nombran.
-- `security definer`: tomar ese candado pide UPDATE sobre `monedas`, que authenticated no tiene.
create or replace function public.trg_tramo_sin_solape() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare o public.repuestos_tramos_logistica;
begin
  if not new.activo then
    return new;
  end if;
  perform 1 from public.monedas m where m.codigo = new.moneda for no key update;
  select * into o
    from public.repuestos_tramos_logistica t
   where t.moneda = new.moneda and t.activo and t.id <> new.id
     and new.costo_min < coalesce(t.costo_max, 'infinity'::numeric)
     and t.costo_min < coalesce(new.costo_max, 'infinity'::numeric)
   order by t.costo_min
   limit 1;
  if found then
    raise exception 'Ese tramo se cruza con otro de % (%).', btrim(new.moneda),
      case when o.costo_max is null then 'de ' || replace(o.costo_min::text, '.', ',') || ' en adelante'
           else 'de ' || replace(o.costo_min::text, '.', ',') || ' a ' || replace(o.costo_max::text, '.', ',') end
      using errcode = '23P01', hint = 'costo_min';
  end if;
  return new;
end;
$$;

create trigger trg_tramo_sin_solape before insert or update of moneda, costo_min, costo_max, activo on public.repuestos_tramos_logistica
  for each row execute function public.trg_tramo_sin_solape();

-- D7 · `redondeo > 0` sin validar las filas viejas (la fórmula las toma como 0,01).
alter table public.repuestos_cotizador_config add constraint repuestos_cotizador_config_redondeo_check check (redondeo > 0) not valid;

revoke all on function public._repuesto_cotizacion_sugerida(jsonb, numeric) from public, anon, authenticated;
revoke all on function public._repuesto_cotizacion_linea(jsonb, text, integer, numeric, numeric, numeric) from public, anon, authenticated;
revoke all on function public.trg_tramo_sin_solape() from public, anon, authenticated;
grant execute on function public._repuesto_cotizacion_sugerida(jsonb, numeric) to service_role;
grant execute on function public._repuesto_cotizacion_linea(jsonb, text, integer, numeric, numeric, numeric) to service_role;
