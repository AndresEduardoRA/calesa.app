-- Exportar todo (9.05-1): el punto de enforcement de `datos.exportar.todo`. Antes de mandar el primer byte, el route handler llama esta función
-- con la entidad, cuántas filas lleva el archivo y sus filtros: pide el permiso, limita a 3 por hora por persona y por entidad (con un candado por
-- persona, el patrón de `leads_exportacion_registrar`) y deja la constancia `datos.exportado` en `actividad`, sin datos de nadie. La lectura no pasa
-- por aquí: sale por lo que quien exporta ya ve con su sesión («lo que no ves no sale»).

create or replace function public.datos_exportacion_registrar(p_entidad text, p_filas integer, p_filtros jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_entrada jsonb := coalesce(p_filtros, '{}'::jsonb);
  v_filtros jsonb := '{}'::jsonb;
  v_clave text;
  v_texto text;
  v_desde date;
  v_hasta date;
  v_origen uuid;
  v_recientes timestamptz[];
  v_hechas integer;
begin
  perform public.assert_permiso('datos.exportar.todo');

  if p_entidad is null or p_entidad not in ('leads', 'vehiculos', 'cotizaciones') then
    raise exception 'No se puede exportar eso.' using errcode = '22023', hint = 'p_entidad';
  end if;
  if p_filas is null or p_filas < 0 or p_filas > 250000 then
    raise exception 'Un archivo lleva hasta 250.000 filas: pide un rango de fechas.' using errcode = '22023', hint = 'p_filas';
  end if;

  -- Los filtros: sólo desde, hasta (fechas) y origen (un origen que existe). Se guardan normalizados, sólo las claves presentes.
  if jsonb_typeof(v_entrada) <> 'object' then
    raise exception 'Los filtros no se entienden.' using errcode = '22023', hint = 'p_filtros';
  end if;
  for v_clave in select k from jsonb_object_keys(v_entrada) k loop
    if v_clave not in ('desde', 'hasta', 'origen') then
      raise exception 'Ese filtro no se puede usar: «%».', left(v_clave, 40) using errcode = '22023', hint = 'p_filtros';
    end if;
  end loop;
  foreach v_clave in array array['desde', 'hasta'] loop
    if v_entrada ? v_clave then
      v_texto := case when jsonb_typeof(v_entrada -> v_clave) = 'string' then v_entrada ->> v_clave end;
      if v_texto is null or v_texto !~ '^\d{4}-\d{2}-\d{2}$' then
        raise exception 'Una fecha del rango no es válida.' using errcode = '22023', hint = 'p_filtros';
      end if;
      begin
        if v_clave = 'desde' then v_desde := v_texto::date; else v_hasta := v_texto::date; end if;
      exception when others then
        raise exception 'Una fecha del rango no es válida.' using errcode = '22023', hint = 'p_filtros';
      end;
      v_filtros := v_filtros || jsonb_build_object(v_clave, v_texto);
    end if;
  end loop;
  if v_desde is not null and v_hasta is not null and v_desde > v_hasta then
    raise exception 'El rango está al revés: la fecha final es anterior a la inicial.' using errcode = '22023', hint = 'p_filtros';
  end if;
  if v_entrada ? 'origen' then
    v_texto := case when jsonb_typeof(v_entrada -> 'origen') = 'string' then v_entrada ->> 'origen' end;
    if v_texto is null or v_texto !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Ese origen no existe.' using errcode = '22023', hint = 'p_filtros';
    end if;
    v_origen := v_texto::uuid;
    if not exists (select 1 from public.origenes o where o.id = v_origen) then
      raise exception 'Ese origen no existe.' using errcode = '22023', hint = 'p_filtros';
    end if;
    v_filtros := v_filtros || jsonb_build_object('origen', v_origen::text);
  end if;
  if p_entidad = 'vehiculos' and v_origen is null then
    raise exception 'Elige el origen: los vehículos se exportan de a un origen.' using errcode = '22023', hint = 'p_filtros';
  end if;
  if p_entidad = 'leads' and v_origen is not null then
    raise exception 'Los leads no se filtran por origen.' using errcode = '22023', hint = 'p_filtros';
  end if;

  -- Dos exportaciones a la vez de la misma persona no se cuelan juntas por debajo del tope: el candado va antes de leer actividad.
  perform pg_advisory_xact_lock(hashtext('datos_exportacion'), hashtext(v_yo::text));
  -- Las 3 más recientes de la última hora (por actividad_actor_accion_idx, sin contar todo): con 3, la más vieja dice cuándo se libera.
  v_recientes := array(
    select a.creado_en
      from public.actividad a
     where a.actor_id = v_yo and a.accion = 'datos.exportado' and a.tabla = p_entidad and a.creado_en > now() - interval '1 hour'
     order by a.creado_en desc
     limit 3);
  v_hechas := cardinality(v_recientes);
  if v_hechas >= 3 then
    return jsonb_build_object('ok', false, 'libre_en', v_recientes[3] + interval '1 hour');
  end if;

  -- La constancia: la entidad, cuántas filas y los filtros. Ni ids, ni nombres, ni teléfonos.
  perform public.registrar_actividad('datos.exportado', p_entidad, null, null, null,
    jsonb_build_object('entidad', p_entidad, 'filas', p_filas, 'filtros', v_filtros));
  return jsonb_build_object('ok', true, 'restantes', 2 - v_hechas);
end;
$$;

revoke all on function public.datos_exportacion_registrar(text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.datos_exportacion_registrar(text, integer, jsonb) to authenticated, service_role;
comment on function public.datos_exportacion_registrar(text, integer, jsonb) is
  'Enforcement de datos.exportar.todo (9.05): pide el permiso, hasta 250.000 filas por archivo y 3 exportaciones por hora por persona y por entidad (leads, vehiculos, cotizaciones), y deja la constancia datos.exportado sin datos de nadie. La lectura sale con la sesión de quien exporta.';

-- El permiso gana su punto de enforcement (antes: «UI + queries», sin enforcement en la base).
insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden)
values ('datos.exportar.todo', 'datos', 'Exportar todo', 'Exportar los datos de todos', false, false, 'datos_exportacion_registrar', 670)
on conflict (clave) do update set aplicado_en = excluded.aplicado_en;
