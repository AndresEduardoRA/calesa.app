-- La lista de niveles con su uso (paso 4.09, prompt 2): lo que necesita la pantalla Configuración › Cotización › Niveles.
--
--  - `_nivel_motivo_de_uso(clave)`: el texto «Está en N celdas de M orígenes…» o nulo. Un solo punto: lo dicen `nivel_eliminar()` y la lista, para que la
--    pantalla muestre lo mismo que la base respondería. Sólo cuenta cuando `_nivel_en_uso()` ya dijo que hay uso (la cuenta es la cara).
--  - `_niveles_lista()` suma a cada nivel lo que admite (`se_renombra`, `se_retira`, `se_elimina`: la misma regla que `_nivel_protegido()` y las RPC; «todos» no se
--    toca y «costos» no se elimina) y su `motivo_de_uso`. Como la devuelve cada RPC de escritura, la pantalla nunca pierde el motivo al escribir: hasta 10 niveles,
--    una sonda por `formulas_niveles_idx` cada uno.
--  - `niveles_con_uso()`: esa lista para quien lee roles (`equipo.roles.ver`) o los gestiona. El uso de un nivel no es de toda sesión.

create or replace function public._nivel_motivo_de_uso(p_clave text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_uso jsonb; v_celdas int; v_secciones int; v_origenes int; v_retirado boolean;
begin
  if public._nivel_en_uso(p_clave) is null then
    return null;
  end if;
  v_uso := public._nivel_uso(p_clave);
  v_celdas := (v_uso ->> 'celdas')::int; v_secciones := (v_uso ->> 'secciones')::int; v_origenes := (v_uso ->> 'origenes')::int;
  select n.retirado_en is not null into v_retirado from public.cotizaciones_niveles n where n.clave = p_clave;
  -- «Puedes retirarlo» sólo si falta: uno ya retirado no tiene qué más ofrecer.
  return format('Está en %s de %s (en alguna versión de su fórmula): no se elimina.%s',
    case when v_celdas > 0 then v_celdas || case when v_celdas = 1 then ' celda' else ' celdas' end
         else v_secciones || case when v_secciones = 1 then ' sección' else ' secciones' end end,
    v_origenes || case when v_origenes = 1 then ' origen' else ' orígenes' end,
    case when coalesce(v_retirado, false) then ''
         else ' Puedes retirarlo: deja de ofrecerse y lo que ya lo usa se sigue filtrando igual.' end);
end;
$$;
revoke all on function public._nivel_motivo_de_uso(text) from public, anon, authenticated;

create or replace function public._niveles_lista()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'tope', public._niveles_tope(),
    'niveles', coalesce((select jsonb_agg(jsonb_build_object(
        'id', n.id, 'clave', n.clave, 'nombre', n.nombre, 'retirado_en', n.retirado_en, 'actualizado_en', n.actualizado_en,
        'se_renombra', n.clave <> 'todos', 'se_retira', n.clave <> 'todos', 'se_elimina', n.clave not in ('todos', 'costos'),
        'motivo_de_uso', case when n.clave <> 'todos' then public._nivel_motivo_de_uso(n.clave) end)
        order by (n.clave <> 'todos'), n.nombre)
      from (select x.* from public.cotizaciones_niveles x order by (x.clave <> 'todos'), x.nombre limit public._niveles_tope()) n), '[]'::jsonb));
$$;
revoke all on function public._niveles_lista() from public, anon, authenticated;

-- Eliminar: el texto del uso sale de `_nivel_motivo_de_uso()`; lo demás es lo de …006100.
create or replace function public.nivel_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.cotizaciones_niveles; v_motivo text; v_roles uuid[]; v_rol uuid; v_concesiones int;
  v_ver text; v_editar text;
begin
  perform public.assert_permiso('equipo.roles.gestionar');
  select * into o from public.cotizaciones_niveles x where x.id = p_id for update;
  if not found then
    raise exception 'Ese nivel ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este nivel mientras lo editabas.');
  if o.clave = 'todos' then
    raise exception 'El nivel «Todos» no se elimina.' using errcode = '22023';
  end if;
  if o.clave = 'costos' then
    raise exception 'El nivel «%» lo traen las hojas de fábrica: no se elimina. Puedes retirarlo.', o.nombre using errcode = '22023';
  end if;
  v_motivo := public._nivel_motivo_de_uso(o.clave);
  if v_motivo is not null then
    raise exception '%', v_motivo using errcode = '23503', detail = 'nivel_en_uso', hint = 'retirar';
  end if;
  v_ver := 'cotizaciones.nivel.' || o.clave || '.ver';
  v_editar := 'cotizaciones.nivel.' || o.clave || '.editar';
  select coalesce(array_agg(r.id order by r.id), '{}') into v_roles from public.roles r
   where r.id in (select rp.rol_id from public.roles_permisos rp where rp.permiso_clave in (v_ver, v_editar));
  perform 1 from public.roles r where r.id = any (v_roles) order by r.id for update;
  select count(*) into v_concesiones from (select 1 from public.roles_permisos rp where rp.permiso_clave in (v_ver, v_editar) limit 1000) x;
  -- Las concesiones caen con sus permisos (la FK de roles_permisos es `on delete cascade`).
  delete from public.permisos where nivel_clave = o.clave;
  delete from public.cotizaciones_niveles where id = p_id;
  foreach v_rol in array v_roles loop
    perform public._rol_tocar(v_rol);
  end loop;
  perform public.registrar_actividad('nivel.eliminar', 'cotizaciones_niveles', p_id::text, jsonb_build_object('clave', o.clave, 'nombre', o.nombre), null,
                                     jsonb_build_object('concesiones', v_concesiones));
  return jsonb_build_object('lista', public._niveles_lista());
end;
$$;
revoke all on function public.nivel_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.nivel_eliminar(uuid, timestamptz) to authenticated;

create or replace function public.niveles_con_uso()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.tiene_permiso('equipo.roles.gestionar') then
    perform public.assert_permiso('equipo.roles.ver');
  end if;
  return public._niveles_lista();
end;
$$;
revoke all on function public.niveles_con_uso() from public, anon;
grant execute on function public.niveles_con_uso() to authenticated;

-- `equipo.roles.ver` deja de ser sólo de la interfaz: `niveles_con_uso()` lo exige (o `equipo.roles.gestionar`). La base viva recibe el texto nuevo de
-- `aplicado_en`; el seed (`seed.sql`) dice lo mismo.
update public.permisos set aplicado_en = 'UI; niveles_con_uso()' where clave = 'equipo.roles.ver';
