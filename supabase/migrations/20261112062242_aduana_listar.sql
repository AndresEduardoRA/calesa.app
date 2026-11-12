-- Aduana: la lista de declaraciones por cursor, con «pagada» derivada (paso 6.07-3, C1–C11, D31–D34). `pagada` nunca es columna: se calcula de los
-- gastos de tributos de los vehículos vivos de la declaración (`aduana.tributos_pagados`). Definer porque `pagada` y `hay_ocultos` miran vehículos que
-- quien llama no ve; de ellos sólo sale un sí o no, nunca una fila (D31).

-- C1 · el orden de la lista.
create index declaraciones_aduana_creado_idx on public.declaraciones_aduana (creado_en desc, id desc);

-- C2 · los filtros, lista cerrada: canal, pagada y q (prefijo del número). Un valor mal escrito da 22023 con la clave en el hint (nunca 22P02).
create function public._declaraciones_filtros(p_filtros jsonb, out canal public.canal_aforo, out pagada boolean, out q text)
language plpgsql stable
set search_path = ''
as $$
declare k text;
begin
  if p_filtros is null or p_filtros = '{}'::jsonb then
    return;
  end if;
  if jsonb_typeof(p_filtros) <> 'object' then
    raise exception 'Los filtros no se entienden.' using errcode = '22023', hint = 'filtros';
  end if;
  for k in select x from jsonb_object_keys(p_filtros) x order by x loop
    case k
      when 'canal' then
        if jsonb_typeof(p_filtros -> k) <> 'string' or not pg_input_is_valid(p_filtros ->> k, 'public.canal_aforo') then
          raise exception 'Ese canal de aforo no existe.' using errcode = '22023', hint = k;
        end if;
        canal := (p_filtros ->> k)::public.canal_aforo;
      when 'pagada' then
        if jsonb_typeof(p_filtros -> k) <> 'boolean' then
          raise exception 'El filtro «pagada» es sí o no.' using errcode = '22023', hint = k;
        end if;
        pagada := (p_filtros -> k)::boolean;
      when 'q' then
        q := case when jsonb_typeof(p_filtros -> k) = 'string' then btrim(p_filtros ->> k) end;
        if q is null or q !~ '[[:alnum:]]{3}' then
          raise exception 'Escribe al menos 3 letras o dígitos del número.' using errcode = '22023', hint = k;
        end if;
      else
        raise exception 'No se filtra por «%».', k using errcode = '22023', hint = k;
    end case;
  end loop;
end;
$$;

comment on function public._declaraciones_filtros(jsonb) is 'Lee los filtros de declaraciones_listar: canal, pagada y q; otra clave o un valor mal escrito da 22023 con la clave en el hint (6.07-3, C2).';
revoke all on function public._declaraciones_filtros(jsonb) from public, anon, authenticated;
grant execute on function public._declaraciones_filtros(jsonb) to service_role;

-- C5 · un vehículo vivo que quien llama ve con logistica.ver: la condición de puede_vehiculo con los orígenes resueltos una vez (p_todos con alcance
-- todos, p_algun con propios o todos).
create function public._aduana_vehiculo_visible(p_origen uuid, p_creado_por uuid, p_lead uuid, p_todos uuid[], p_algun uuid[], p_yo uuid)
returns boolean
language sql stable
set search_path = ''
as $$
  select p_origen = any (p_algun)
     and (p_origen = any (p_todos) or p_creado_por = p_yo or (p_lead is not null and public.en_cartera(p_lead)));
$$;

comment on function public._aduana_vehiculo_visible(uuid, uuid, uuid, uuid[], uuid[], uuid) is 'Lo de puede_vehiculo(v, logistica.ver) con los orígenes ya resueltos (origenes_con_alcance), para no resolverlos por fila (6.07-3, C5).';
revoke all on function public._aduana_vehiculo_visible(uuid, uuid, uuid, uuid[], uuid[], uuid) from public, anon, authenticated;
grant execute on function public._aduana_vehiculo_visible(uuid, uuid, uuid, uuid[], uuid[], uuid) to service_role;

-- C8–C11 · el resumen de una declaración para quien mira. Vivo = en la composición (removido_en nulo). Visto = vivo, en un vehículo fuera de la papelera
-- y visible (C5). Por declaraciones_vehiculos_pkey (declaracion_id, vehiculo_id) y gastos_vehiculo_idx; cada conteo sobre limit 201 (201 = más de 200).
--   vehiculos: los vistos. hay_ocultos: hay un vivo que no se ve. faltan: los vistos sin tributo.
--   pagada (D31): hay un vivo y ningún vivo sin un gasto vivo de tributos, los vea o no quien mira (es un hecho de la declaración).
create function public._declaracion_resumen(p_id uuid, p_todos uuid[], p_algun uuid[], p_yo uuid,
  out vehiculos integer, out hay_ocultos boolean, out pagada boolean, out faltan integer)
language sql stable
-- Su costo verdadero (escala.md): cuatro subconsultas por declaración.
cost 1000
set search_path = ''
as $$
  with vivos as (
    select dv.vehiculo_id,
           coalesce(v.eliminado_en is null
                    and public._aduana_vehiculo_visible(v.origen_id, v.creado_por, v.lead_id, p_todos, p_algun, p_yo), false) as visto,
           exists (select 1 from public.gastos g join public.categorias_gasto cg on cg.id = g.categoria_id
                    where g.vehiculo_id = dv.vehiculo_id and g.eliminado_en is null and cg.proposito = 'tributos') as tributo
      from public.declaraciones_vehiculos dv
      left join public.vehiculos v on v.id = dv.vehiculo_id
     where dv.declaracion_id = p_id and dv.removido_en is null
  )
  select (select count(*)::integer from (select 1 from vivos where visto limit 201) x),
         exists (select 1 from vivos where not visto),
         exists (select 1 from vivos) and not exists (select 1 from vivos where not tributo),
         (select count(*)::integer from (select 1 from vivos where visto and not tributo limit 201) x);
$$;

comment on function public._declaracion_resumen(uuid, uuid[], uuid[], uuid) is 'Para declaraciones_listar y declaracion_leer: vehiculos y faltan (de los que se ven, acotados a 201), hay_ocultos y pagada (de todos los vivos, D31). 6.07-3.';
revoke all on function public._declaracion_resumen(uuid, uuid[], uuid[], uuid) from public, anon, authenticated;
grant execute on function public._declaracion_resumen(uuid, uuid[], uuid[], uuid) to service_role;

-- C3–C7 · la lista. Con logistica.aduana.gestionar, toda declaración; con logistica.ver, las que tienen un vehículo vivo que se ve (D32); sin ninguna de
-- las dos, 42501 antes de leer.
create function public.declaraciones_listar(p_desde timestamptz, p_id uuid, p_tope integer, p_filtros jsonb)
returns table (id uuid, numero text, canal text, aceptada_el date, vence_tributos_el date, despachante text, deposito text, creado_en timestamptz,
               actualizado_en timestamptz, vehiculos integer, hay_ocultos boolean, pagada boolean, faltan integer)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  -- TAMANO_DE_PAGINA_POR_DEFECTO (50), máximo 100, más una para saber si hay otra.
  v_n integer := public._acotar_pagina(p_tope, 50, 100) + 1;
  v_lote constant integer := 200;
  v_yo uuid := (select auth.uid());
  v_gestiona boolean;
  f record;
  v_todos uuid[]; v_algun uuid[];
  v_desde timestamptz; v_id uuid;
  d public.declaraciones_aduana; s record;
  v_leidas integer; v_hallados integer := 0;
begin
  perform public.assert_activo();
  v_gestiona := public.tiene_permiso('logistica.aduana.gestionar');
  if not (v_gestiona or public.tiene_permiso('logistica.ver')) then
    raise exception 'No tienes permiso para ver las declaraciones.' using errcode = '42501';
  end if;
  select * into f from public._declaraciones_filtros(p_filtros);
  if (p_desde is null) <> (p_id is null) then
    raise exception 'El cursor de la lista está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  v_todos := public.origenes_con_alcance('logistica.ver', 'todos');
  v_algun := public.origenes_con_alcance('logistica.ver', 'propios');
  -- Sin cursor, uno que va antes de toda fila (creado_en nunca es infinity): una sola consulta y el cursor sigue siendo condición de índice.
  v_desde := coalesce(p_desde, 'infinity'::timestamptz);
  v_id := coalesce(p_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid);
  -- Por lotes de 200 sobre declaraciones_aduana_creado_idx (creado_en desc, id desc), sin filtros en la consulta: con ellos, el plan genérico los
  -- creía selectivos y ordenaba toda la tabla. Los filtros y la visibilidad sin gestionar descartan filas del índice: la tabla es de volumen bajo (D34).
  loop
    v_leidas := 0;
    for d in
      select x.* from public.declaraciones_aduana x
       where (x.creado_en, x.id) < (v_desde, v_id)
       order by x.creado_en desc, x.id desc
       limit v_lote
    loop
      v_leidas := v_leidas + 1;
      v_desde := d.creado_en;
      v_id := d.id;
      continue when f.canal is not null and d.canal is distinct from f.canal;
      continue when f.q is not null and not starts_with(upper(d.numero), upper(f.q));
      select * into s from public._declaracion_resumen(d.id, v_todos, v_algun, v_yo);
      continue when not v_gestiona and s.vehiculos = 0;
      continue when f.pagada is not null and s.pagada is distinct from f.pagada;
      id := d.id; numero := d.numero; canal := d.canal::text; aceptada_el := d.aceptada_el; vence_tributos_el := d.vence_tributos_el;
      despachante := d.despachante; deposito := d.deposito; creado_en := d.creado_en; actualizado_en := d.actualizado_en;
      vehiculos := s.vehiculos; hay_ocultos := s.hay_ocultos; pagada := s.pagada; faltan := s.faltan;
      return next;
      v_hallados := v_hallados + 1;
      exit when v_hallados >= v_n;
    end loop;
    exit when v_hallados >= v_n or v_leidas < v_lote;
  end loop;
end;
$$;

comment on function public.declaraciones_listar(timestamptz, uuid, integer, jsonb) is 'Las declaraciones de aduana que quien llama ve (con logistica.aduana.gestionar, todas; con logistica.ver, las que tienen un vehículo vivo que ve), por cursor (creado_en desc, id desc) sobre declaraciones_aduana_creado_idx, con filtros canal, pagada y q. Por fila: vehiculos y faltan (de los que ve), hay_ocultos, pagada (de todos los vivos, D31). Hasta el tope más una. Sin total (6.07-3).';
revoke all on function public.declaraciones_listar(timestamptz, uuid, integer, jsonb) from public, anon;
grant execute on function public.declaraciones_listar(timestamptz, uuid, integer, jsonb) to authenticated, service_role;
