-- Transporte: la lista de grupos (embarques por booking o contenedores) por cursor sobre la clave (paso 6.07-3, C16–C24, D35–D40). Definer como
-- transporte_grupo: dice `hay_ocultas` (sí o no) sin devolver nunca una unidad que quien mira no ve. El orden es el de la clave (D1 de 6.07-1): ordenar por
-- ETA pediría agrupar toda la tabla.

-- C16 · los filtros, lista cerrada: naviera, puerto_origen, puerto_destino (uuid), en_transito (sí o no: sin arribo o con arribo) y prefijo (normalizado
-- como la clave, con 3 letras o dígitos seguidos). Un valor mal escrito da 22023 con la clave en el hint, nunca 22P02.
create function public._transporte_grupos_filtros(p_filtros jsonb, out naviera uuid, out puerto_origen uuid, out puerto_destino uuid,
  out en_transito boolean, out prefijo text)
language plpgsql stable
set search_path = ''
as $$
declare k text; v jsonb;
begin
  if p_filtros is null or p_filtros = '{}'::jsonb then
    return;
  end if;
  if jsonb_typeof(p_filtros) <> 'object' then
    raise exception 'Los filtros no se entienden.' using errcode = '22023', hint = 'filtros';
  end if;
  for k in select x from jsonb_object_keys(p_filtros) x order by x loop
    v := p_filtros -> k;
    case k
      when 'naviera', 'puerto_origen', 'puerto_destino' then
        if jsonb_typeof(v) <> 'string' or not pg_input_is_valid(v #>> '{}', 'uuid') then
          raise exception 'El filtro «%» no tiene un valor válido.', k using errcode = '22023', hint = k;
        end if;
        case k
          when 'naviera' then naviera := (v #>> '{}')::uuid;
          when 'puerto_origen' then puerto_origen := (v #>> '{}')::uuid;
          else puerto_destino := (v #>> '{}')::uuid;
        end case;
      when 'en_transito' then
        if jsonb_typeof(v) <> 'boolean' then
          raise exception 'El filtro «en tránsito» es sí o no.' using errcode = '22023', hint = k;
        end if;
        en_transito := v::boolean;
      when 'prefijo' then
        prefijo := case when jsonb_typeof(v) = 'string' then upper(regexp_replace(v #>> '{}', '\s', '', 'g')) end;
        if prefijo is null or prefijo !~ '[A-Z0-9]{3}' then
          raise exception 'Escribe al menos 3 letras o dígitos de la clave.' using errcode = '22023', hint = k;
        end if;
      else
        raise exception 'No se filtra por «%».', k using errcode = '22023', hint = k;
    end case;
  end loop;
end;
$$;

comment on function public._transporte_grupos_filtros(jsonb) is 'Lee los filtros de transporte_grupos: naviera, puerto_origen, puerto_destino, en_transito y prefijo; otra clave o un valor mal escrito da 22023 con la clave en el hint (6.07-3, C16).';
revoke all on function public._transporte_grupos_filtros(jsonb) from public, anon, authenticated;
grant execute on function public._transporte_grupos_filtros(jsonb) to service_role;

-- C17–C24 · la lista. Devuelve {tipo, grupos, siguiente, cortada} (D35): con tope de recorrido una página puede venir corta o vacía y aun así necesita el
-- cursor. `p_desde` es opaco (la `siguiente` de la página anterior): se usa tal cual, sin normalizar (D39).
create function public.transporte_grupos(p_tipo text, p_desde text, p_tope integer, p_filtros jsonb) returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  -- TAMANO_DE_PAGINA_POR_DEFECTO (50), máximo 100.
  v_tope integer := public._acotar_pagina(p_tope, 50, 100);
  -- D35 · a lo sumo 2.000 filas de transportes por llamada; cada clave suma al menos 1 (también la que sólo tiene unidades en la papelera).
  v_recorrido constant integer := 2000;
  v_yo uuid := (select auth.uid());
  f record;
  v_todos uuid[]; v_algun uuid[]; v_repuestos boolean;
  v_ge text; v_gt text; v_k text;
  v_filas jsonb; g record;
  v_mirado integer := 0; v_n integer := 0;
  v_grupos jsonb := '[]'::jsonb; v_ultima text; v_siguiente text; v_cortada boolean := false;
  v_varios text[];
begin
  perform public.assert_activo();
  -- C17 · el tipo aquí, no con _transporte_clave: esa función lanza con la clave nula y el cursor vacío es válido.
  if p_tipo is null or p_tipo not in ('booking', 'contenedor') then
    raise exception 'El grupo es por booking o por contenedor.' using errcode = '22023', hint = 'tipo';
  end if;
  if not (public.tiene_permiso('logistica.ver') or public.tiene_permiso('repuestos.ver')) then
    raise exception 'No tienes permiso para ver la logística.' using errcode = '42501';
  end if;
  select * into f from public._transporte_grupos_filtros(p_filtros);
  -- D37 · la visibilidad resuelta una vez: los orígenes de logistica.ver (lo de puede_vehiculo) y repuestos.ver (lo de puede_repuesto).
  v_todos := public.origenes_con_alcance('logistica.ver', 'todos');
  v_algun := public.origenes_con_alcance('logistica.ver', 'propios');
  v_repuestos := public.tiene_permiso('repuestos.ver');
  -- C18, C23 · la clave siguiente es min(clave) con clave >= prefijo y clave > la última mirada ('' = desde el principio: ninguna clave es vacía).
  v_ge := coalesce(f.prefijo, '');
  v_gt := coalesce(nullif(btrim(p_desde), ''), '');
  loop
    -- Una sonda por el índice parcial de su tipo: transportes_booking_idx o transportes_contenedor_idx (clave > x implica not null).
    if p_tipo = 'booking' then
      select min(t.booking) into v_k from public.transportes t where t.booking >= v_ge and t.booking > v_gt;
    else
      select min(t.contenedor) into v_k from public.transportes t where t.contenedor >= v_ge and t.contenedor > v_gt;
    end if;
    -- Índice agotado, o fuera del bloque del prefijo (D39: se compara la forma normalizada, para que una clave vieja sin normalizar no corte).
    exit when v_k is null or (f.prefijo is not null and not starts_with(upper(regexp_replace(v_k, '\s', '', 'g')), f.prefijo));
    -- C19 · las filas de la clave, hasta 201, por el mismo índice; sin las de unidades en la papelera (D19, por las PK).
    if p_tipo = 'booking' then
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_filas from (
        select t.vehiculo_id, t.repuesto_id, t.naviera_id, t.puerto_origen_id, t.puerto_destino_id, t.zarpe_el, t.eta_el, t.arribo_el
          from public.transportes t
         where t.booking = v_k
           and (exists (select 1 from public.vehiculos v where v.id = t.vehiculo_id and v.eliminado_en is null)
                or exists (select 1 from public.repuestos_items i where i.id = t.repuesto_id and i.eliminado_en is null))
         limit 201) x;
    else
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_filas from (
        select t.vehiculo_id, t.repuesto_id, t.naviera_id, t.puerto_origen_id, t.puerto_destino_id, t.zarpe_el, t.eta_el, t.arribo_el
          from public.transportes t
         where t.contenedor = v_k
           and (exists (select 1 from public.vehiculos v where v.id = t.vehiculo_id and v.eliminado_en is null)
                or exists (select 1 from public.repuestos_items i where i.id = t.repuesto_id and i.eliminado_en is null))
         limit 201) x;
    end if;
    -- C20–C22 · por grupo, sobre las que se ven: cuántas, si alguna cumple los filtros (D36) y cada dato común o «varios».
    select count(*)::integer as filas,
           count(*) filter (where r.visible)::integer as unidades,
           coalesce(bool_or(not r.visible), false) as ocultas,
           coalesce(bool_or(r.visible
                            and (f.naviera is null or r.naviera_id = f.naviera)
                            and (f.puerto_origen is null or r.puerto_origen_id = f.puerto_origen)
                            and (f.puerto_destino is null or r.puerto_destino_id = f.puerto_destino)
                            and (f.en_transito is null or (r.arribo_el is null) = f.en_transito)), false) as cumple,
           count(distinct coalesce(r.naviera_id::text, '')) filter (where r.visible) as d_naviera, min(r.naviera_id::text) filter (where r.visible) as naviera,
           count(distinct coalesce(r.puerto_origen_id::text, '')) filter (where r.visible) as d_po, min(r.puerto_origen_id::text) filter (where r.visible) as po,
           count(distinct coalesce(r.puerto_destino_id::text, '')) filter (where r.visible) as d_pd, min(r.puerto_destino_id::text) filter (where r.visible) as pd,
           count(distinct coalesce(r.zarpe_el::text, '')) filter (where r.visible) as d_zarpe, min(r.zarpe_el) filter (where r.visible) as zarpe,
           count(distinct coalesce(r.eta_el::text, '')) filter (where r.visible) as d_eta, min(r.eta_el) filter (where r.visible) as eta,
           count(distinct coalesce(r.arribo_el::text, '')) filter (where r.visible) as d_arribo, min(r.arribo_el) filter (where r.visible) as arribo
      into g
      from (select x.*,
                   coalesce(case when x.vehiculo_id is not null
                                 then v.origen_id = any (v_algun)
                                      and (v.origen_id = any (v_todos) or v.creado_por = v_yo or (v.lead_id is not null and public.en_cartera(v.lead_id)))
                                 else v_repuestos end, false) as visible
              from jsonb_to_recordset(v_filas) as x (vehiculo_id uuid, repuesto_id uuid, naviera_id uuid, puerto_origen_id uuid, puerto_destino_id uuid,
                                                     zarpe_el date, eta_el date, arribo_el date)
              left join public.vehiculos v on v.id = x.vehiculo_id) r;
    v_mirado := v_mirado + greatest(g.filas, 1);
    if g.unidades > 0 and g.cumple then
      -- C24 · con la página llena, éste es el que dice que hay otra: la siguiente empieza después del último devuelto.
      if v_n = v_tope then
        v_siguiente := v_ultima;
        exit;
      end if;
      v_varios := array_remove(array[
        case when g.d_naviera > 1 then 'naviera_id' end, case when g.d_po > 1 then 'puerto_origen_id' end,
        case when g.d_pd > 1 then 'puerto_destino_id' end, case when g.d_zarpe > 1 then 'zarpe_el' end,
        case when g.d_eta > 1 then 'eta_el' end, case when g.d_arribo > 1 then 'arribo_el' end], null);
      v_grupos := v_grupos || jsonb_build_object(
        'clave', v_k, 'unidades', least(g.unidades, 200), 'hay_mas', g.filas > 200, 'hay_ocultas', g.ocultas,
        'naviera_id', case when g.d_naviera = 1 then g.naviera::uuid end,
        'puerto_origen_id', case when g.d_po = 1 then g.po::uuid end,
        'puerto_destino_id', case when g.d_pd = 1 then g.pd::uuid end,
        'zarpe_el', case when g.d_zarpe = 1 then g.zarpe end,
        'eta_el', case when g.d_eta = 1 then g.eta end,
        'arribo_el', case when g.d_arribo = 1 then g.arribo end,
        'varios', to_jsonb(v_varios));
      v_n := v_n + 1;
      v_ultima := v_k;
    end if;
    v_gt := v_k;
    -- D35 · el recorrido, mirado al cerrar cada grupo. Con la página llena, no se sabe si hay otra: se sigue desde el último devuelto. Si no, se
    -- sigue desde la última clave mirada y `cortada` le dice a la pantalla que ofrezca «Seguir buscando».
    if v_mirado >= v_recorrido then
      if v_n = v_tope then
        v_siguiente := v_ultima;
      else
        v_siguiente := v_k;
        v_cortada := true;
      end if;
      exit;
    end if;
  end loop;
  return jsonb_build_object('tipo', p_tipo, 'grupos', v_grupos, 'siguiente', v_siguiente, 'cortada', v_cortada);
end;
$$;

comment on function public.transporte_grupos(text, text, integer, jsonb) is 'Los grupos de transporte (p_tipo booking o contenedor) por cursor sobre la clave, con filtros naviera, puerto_origen, puerto_destino, en_transito y prefijo (6.07-3). Devuelve {tipo, grupos, siguiente, cortada}: por grupo clave, unidades que quien mira ve (hasta 200), hay_mas, hay_ocultas, naviera, puertos y fechas comunes y varios con las que difieren. Mira a lo sumo 2.000 filas por llamada; cortada si paró por eso antes de llenar la página. Pide logistica.ver o repuestos.ver.';
revoke all on function public.transporte_grupos(text, text, integer, jsonb) from public, anon;
grant execute on function public.transporte_grupos(text, text, integer, jsonb) to authenticated, service_role;
