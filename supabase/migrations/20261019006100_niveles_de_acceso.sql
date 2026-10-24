-- Los niveles de acceso de la hoja del cotizador (D7, paso 4.09 prompt 1; docs/COTIZADOR.md › «Niveles de acceso» y «En la base (4.09-1)»). La tabla
-- `cotizaciones_niveles` y la columna `permisos.nivel_clave` viven en `schemas/`. Acá: la lectura, el tope, los permisos que genera cada nivel, las cuatro
-- RPC que los escriben, `_nodos_visibles()` (el enforcement) y los dos puntos que el 4.08 dejó enchufados (`_niveles_de_cotizacion()` y `_preparar_publicacion()`).
--
--  - Un nivel (salvo «todos») es un permiso de la matriz de Roles: `cotizaciones.nivel.<clave>.ver` y `….editar`, por origen. Nacen en la misma transacción que
--    el nivel y concedidos al rol `dueno` (la regla de siembra de docs/ESTADO.md). Es el único permiso que nace de la configuración: no rompe «un permiso existe
--    sólo si tiene su enforcement» porque el enforcement es estructural: `_nodos_visibles()` recorre la visibilidad, no una lista de claves, y el check, la FK y el
--    trigger diferido de abajo impiden un permiso de nivel sin nivel y un nivel sin sus permisos.
--  - Se crea, renombra, retira y elimina por RPC con `equipo.roles.gestionar`. La clave sale del nombre y no cambia. «todos» no genera permisos y no se toca;
--    «costos» se renombra y se retira, no se elimina. Retirar deja el nivel, sus permisos y sus concesiones: lo que ya lo usa se sigue filtrando igual.
--  - Eliminar sólo vale si ninguna versión de ninguna fórmula (borrador, publicada o archivada) lo nombra en su diseño (`_nivel_en_uso()`, 4.08-2).
--  - Los ayudantes no son de nadie (`revoke … from public, anon, authenticated`): una función nueva nace con EXECUTE para PUBLIC.

-- ---------------------------------------------------------------------------
-- Lectura para toda sesión; la escritura es sólo por RPC
-- ---------------------------------------------------------------------------
revoke all on table public.cotizaciones_niveles from anon, authenticated;
grant select, insert, update, delete on table public.cotizaciones_niveles to service_role;
grant select on table public.cotizaciones_niveles to authenticated;
drop policy if exists "niveles: leer" on public.cotizaciones_niveles;
create policy "niveles: leer" on public.cotizaciones_niveles for select to authenticated using (true);

-- La versión sólo se mueve si cambia algo que se ve.
create or replace function public.nivel_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.nombre, new.retirado_en) is distinct from (old.nombre, old.retirado_en) then
    new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  else
    new.actualizado_en := old.actualizado_en;
  end if;
  return new;
end;
$$;
revoke all on function public.nivel_version() from public, anon, authenticated;
drop trigger if exists trg_nivel_version on public.cotizaciones_niveles;
create trigger trg_nivel_version before update on public.cotizaciones_niveles for each row execute function public.nivel_version();

-- «todos» no se toca, la clave no cambia y «costos» no se borra (lo nombran los diseños de fábrica).
create or replace function public._nivel_protegido()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.clave in ('todos', 'costos') then
      raise exception 'El nivel «%» no se elimina.', old.nombre using errcode = '22023';
    end if;
    return old;
  end if;
  if old.clave = 'todos' then
    raise exception 'El nivel «Todos» no se cambia.' using errcode = '22023';
  end if;
  if new.clave is distinct from old.clave then
    raise exception 'La clave de un nivel no cambia.' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function public._nivel_protegido() from public, anon, authenticated;
drop trigger if exists trg_nivel_protegido on public.cotizaciones_niveles;
create trigger trg_nivel_protegido before update or delete on public.cotizaciones_niveles for each row execute function public._nivel_protegido();

create or replace function public._niveles_tope()
returns integer language sql immutable set search_path = '' as $$ select 10; $$;
revoke all on function public._niveles_tope() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Nombre y clave
-- ---------------------------------------------------------------------------
-- STABLE y no IMMUTABLE: lanza (la lección de …005100).
create or replace function public._nivel_nombre(p_texto text)
returns text language plpgsql stable set search_path = '' as $$
declare v text := btrim(regexp_replace(coalesce(p_texto, ''), '\s+', ' ', 'g'));
begin
  if v = '' then
    raise exception 'Escribe el nombre del nivel.' using errcode = '22023', hint = 'nombre';
  end if;
  if char_length(v) > 40 then
    raise exception 'El nombre del nivel admite hasta 40 caracteres.' using errcode = '22023', hint = 'nombre';
  end if;
  return v;
end;
$$;
revoke all on function public._nivel_nombre(text) from public, anon, authenticated;

-- La clave sale del nombre, sin tildes, y no cambia: la nombran los diseños y los permisos. No se desambigua: una clave repetida se rechaza.
create or replace function public._nivel_clave(p_nombre text)
returns text language plpgsql stable set search_path = '' as $$
declare v text;
begin
  v := btrim(regexp_replace(
         translate(lower(p_nombre), 'áàäâéèëêíìïîóòöôúùüûñ', 'aaaaeeeeiiiioooouuuun'),
         '[^a-z0-9]+', '_', 'g'), '_');
  if v ~ '^[0-9]' then
    v := 'n_' || v;
  end if;
  v := rtrim(left(v, 30), '_');
  if char_length(v) < 2 then
    raise exception 'El nombre del nivel necesita al menos dos letras o números.' using errcode = '22023', hint = 'nombre';
  end if;
  return v;
end;
$$;
revoke all on function public._nivel_clave(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Los dos permisos de un nivel, con su concesión al dueño
-- ---------------------------------------------------------------------------
-- Idempotente. Los llaman nivel_crear() y la siembra de «costos» (`p_conceder`: la concesión al dueño) y nivel_renombrar() (sólo el nombre: no le devuelve al
-- dueño lo que alguien le haya revocado). La concesión es de todos los orígenes (`origen_id` nulo) y de alcance «todos»; si el rol
-- `dueno` todavía no existe (un `db reset`: nace en el seed) la cubre el `cross join` del seed.
create or replace function public._nivel_permisos_crear(p_clave text, p_nombre text, p_conceder boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden, nivel_clave) values
    ('cotizaciones.nivel.' || p_clave || '.ver', 'cotizaciones', 'Ver el nivel «' || p_nombre || '»',
     'Ver las celdas y secciones de la hoja del cotizador que son del nivel «' || p_nombre || '» (por origen)',
     true, false, '_nodos_visibles (la leen cotizacion_leer y cotizacion_guardar, 4.10)', 700, p_clave),
    ('cotizaciones.nivel.' || p_clave || '.editar', 'cotizaciones', 'Editar el nivel «' || p_nombre || '»',
     'Editar las celdas y secciones de la hoja del cotizador que son del nivel «' || p_nombre || '» (por origen)',
     true, false, '_nodos_visibles (la leen cotizacion_leer y cotizacion_guardar, 4.10)', 701, p_clave)
  on conflict (clave) do update set nombre = excluded.nombre, descripcion = excluded.descripcion;
  if p_conceder then
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    select r.id, p.clave, 'todos' from public.roles r join public.permisos p on p.nivel_clave = p_clave where r.clave = 'dueno'
    on conflict do nothing;
  end if;
end;
$$;
revoke all on function public._nivel_permisos_crear(text, text, boolean) from public, anon, authenticated;

-- Al cerrar la transacción, todo nivel que existe (salvo «todos») tiene sus dos permisos. La FK y el check cubren el otro sentido.
create or replace function public._nivel_con_permisos()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_clave text;
begin
  if tg_table_name = 'cotizaciones_niveles' then v_clave := new.clave; else v_clave := old.nivel_clave; end if;
  if v_clave is null or v_clave = 'todos' then return null; end if;
  if not exists (select 1 from public.cotizaciones_niveles n where n.clave = v_clave) then return null; end if;
  if not (exists (select 1 from public.permisos p where p.clave = 'cotizaciones.nivel.' || v_clave || '.ver' and p.nivel_clave = v_clave)
          and exists (select 1 from public.permisos p where p.clave = 'cotizaciones.nivel.' || v_clave || '.editar' and p.nivel_clave = v_clave)) then
    raise exception 'El nivel «%» tiene que tener sus dos permisos, ver y editar.', v_clave using errcode = '23514';
  end if;
  return null;
end;
$$;
revoke all on function public._nivel_con_permisos() from public, anon, authenticated;
drop trigger if exists trg_nivel_con_permisos on public.cotizaciones_niveles;
create constraint trigger trg_nivel_con_permisos after insert or update of clave on public.cotizaciones_niveles
  deferrable initially deferred for each row execute function public._nivel_con_permisos();
drop trigger if exists trg_nivel_con_permisos_p on public.permisos;
create constraint trigger trg_nivel_con_permisos_p after delete or update of clave, nivel_clave on public.permisos
  deferrable initially deferred for each row execute function public._nivel_con_permisos();

-- ---------------------------------------------------------------------------
-- La siembra: «todos» y «costos» (los diseños de fábrica de subasta_usa y planilla_usa nombran «costos» en «Avanzado»)
-- ---------------------------------------------------------------------------
insert into public.cotizaciones_niveles (clave, nombre) values ('todos', 'Todos'), ('costos', 'Costos') on conflict (clave) do nothing;
do $$ begin perform public._nivel_permisos_crear('costos', (select n.nombre from public.cotizaciones_niveles n where n.clave = 'costos'), true); end $$;

-- ---------------------------------------------------------------------------
-- Lo que toda lectura del catálogo devuelve
-- ---------------------------------------------------------------------------
create or replace function public._niveles_lista()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'tope', public._niveles_tope(),
    'niveles', coalesce((select jsonb_agg(jsonb_build_object(
        'id', n.id, 'clave', n.clave, 'nombre', n.nombre, 'retirado_en', n.retirado_en, 'actualizado_en', n.actualizado_en)
        order by (n.clave <> 'todos'), n.nombre)
      from (select x.* from public.cotizaciones_niveles x order by (x.clave <> 'todos'), x.nombre limit public._niveles_tope()) n), '[]'::jsonb));
$$;
revoke all on function public._niveles_lista() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Cuánto usan un nivel las fórmulas: {celdas, secciones, origenes}
-- ---------------------------------------------------------------------------
-- De cada origen cuenta sólo su versión más nueva que lo nombra (el borrador, si lo nombra), no cada ⚙ archivada. Los ítems con atajos no dibujan un
-- valor (van sobre la celda de su nodo) y no cuentan. Sólo la llama nivel_eliminar() cuando ya sabe que hay uso.
create or replace function public._nivel_uso(p_clave text)
returns jsonb language sql stable security definer set search_path = '' as $$
  -- Materializada: el índice conduce (la misma lección que _nivel_en_uso).
  with u as materialized (
    select f.id, f.origen_id, f.version from public.formulas f
     where public._niveles_del_diseno(f.diseno) @> jsonb_build_array(p_clave)  -- formulas_niveles_idx
  ), ultimas as (
    select distinct on (u.origen_id) u.id, u.origen_id from u order by u.origen_id, u.version desc nulls first
  ), secciones as (
    select s.value as s from ultimas l join public.formulas f on f.id = l.id, jsonb_array_elements(f.diseno -> 'secciones') s
  )
  select jsonb_build_object(
    'origenes', (select count(*) from (select 1 from ultimas limit 1000) x),
    'secciones', (select count(*) from (select 1 from secciones where p_clave in (s ->> 'nivel_ver', s ->> 'nivel_editar') limit 1000) x),
    'celdas', (select count(*) from (
        select 1 from secciones, jsonb_array_elements(s -> 'items') it
         where it ->> 'tipo' <> 'atajos'
           and p_clave in (coalesce(it ->> 'nivel_ver', s ->> 'nivel_ver'), coalesce(it ->> 'nivel_editar', s ->> 'nivel_editar')) limit 1000) x));
$$;
revoke all on function public._nivel_uso(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------------
create or replace function public.nivel_crear(p_id uuid, p_nombre text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_nombre text; v_clave text; v_version timestamptz; v_estado text; v_tope integer := public._niveles_tope();
begin
  perform public.assert_permiso('equipo.roles.gestionar');
  lock table public.cotizaciones_niveles in share row exclusive mode;
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  select n.actualizado_en into v_version from public.cotizaciones_niveles n where n.id = p_id;
  if found then
    return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', true, 'lista', public._niveles_lista());
  end if;
  v_nombre := public._nivel_nombre(p_nombre);
  v_clave := public._nivel_clave(v_nombre);
  if (select count(*) from (select 1 from public.cotizaciones_niveles limit v_tope) t) >= v_tope then
    raise exception 'Ya hay % niveles, que es el máximo. Elimina uno que ninguna hoja use.', v_tope using errcode = '22023', hint = 'nombre';
  end if;
  if exists (select 1 from public.cotizaciones_niveles n where lower(btrim(n.nombre)) = lower(v_nombre)) then
    raise exception 'Ya hay un nivel «%».', v_nombre using errcode = '23505', hint = 'nombre';
  end if;
  select case when n.retirado_en is not null then ' (retirado)' else '' end into v_estado from public.cotizaciones_niveles n where n.clave = v_clave;
  if found then
    raise exception 'Ya hay un nivel con la clave «%»%: elige otro nombre.', v_clave, v_estado using errcode = '23505', hint = 'nombre';
  end if;
  insert into public.cotizaciones_niveles (id, clave, nombre) values (p_id, v_clave, v_nombre) returning actualizado_en into v_version;
  perform public._nivel_permisos_crear(v_clave, v_nombre, true);
  perform public.registrar_actividad('nivel.crear', 'cotizaciones_niveles', p_id::text, null, jsonb_build_object('clave', v_clave, 'nombre', v_nombre));
  return jsonb_build_object('id', p_id, 'clave', v_clave, 'actualizado_en', v_version, 'repetido', false, 'lista', public._niveles_lista());
end;
$$;
revoke all on function public.nivel_crear(uuid, text) from public, anon;
grant execute on function public.nivel_crear(uuid, text) to authenticated;

-- Cambia el nombre (y el de sus dos permisos). La clave no cambia.
create or replace function public.nivel_renombrar(p_id uuid, p_actualizado_en_esperado timestamptz, p_nombre text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.cotizaciones_niveles; v_nombre text; v_version timestamptz;
begin
  perform public.assert_permiso('equipo.roles.gestionar');
  lock table public.cotizaciones_niveles in share row exclusive mode;
  select * into o from public.cotizaciones_niveles x where x.id = p_id for no key update;
  if not found then
    raise exception 'Ese nivel ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este nivel mientras lo editabas.');
  if o.clave = 'todos' then
    raise exception 'El nivel «Todos» no se renombra.' using errcode = '22023';
  end if;
  v_nombre := public._nivel_nombre(p_nombre);
  if exists (select 1 from public.cotizaciones_niveles n where n.id <> p_id and lower(btrim(n.nombre)) = lower(v_nombre)) then
    raise exception 'Ya hay un nivel «%».', v_nombre using errcode = '23505', hint = 'nombre';
  end if;
  update public.cotizaciones_niveles set nombre = v_nombre where id = p_id returning actualizado_en into v_version;
  perform public._nivel_permisos_crear(o.clave, v_nombre, false);
  perform public.registrar_actividad('nivel.renombrar', 'cotizaciones_niveles', p_id::text, jsonb_build_object('nombre', o.nombre), jsonb_build_object('clave', o.clave, 'nombre', v_nombre));
  return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'lista', public._niveles_lista());
end;
$$;
revoke all on function public.nivel_renombrar(uuid, timestamptz, text) from public, anon;
grant execute on function public.nivel_renombrar(uuid, timestamptz, text) to authenticated;

-- Deja de ofrecerse; sus permisos, sus concesiones y todo lo que ya lo usa siguen.
create or replace function public.nivel_retirar(p_id uuid, p_actualizado_en_esperado timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.cotizaciones_niveles; v_version timestamptz;
begin
  perform public.assert_permiso('equipo.roles.gestionar');
  select * into o from public.cotizaciones_niveles x where x.id = p_id for no key update;
  if not found then
    raise exception 'Ese nivel ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este nivel mientras lo editabas.');
  if o.clave = 'todos' then
    raise exception 'El nivel «Todos» no se retira.' using errcode = '22023';
  end if;
  update public.cotizaciones_niveles set retirado_en = coalesce(retirado_en, now()) where id = p_id returning actualizado_en into v_version;
  perform public.registrar_actividad('nivel.retirar', 'cotizaciones_niveles', p_id::text, jsonb_build_object('nombre', o.nombre), jsonb_build_object('clave', o.clave));
  return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'lista', public._niveles_lista());
end;
$$;
revoke all on function public.nivel_retirar(uuid, timestamptz) from public, anon;
grant execute on function public.nivel_retirar(uuid, timestamptz) to authenticated;

-- Sólo uno que ninguna versión de ninguna fórmula nombra. Con uso responde cuánto y ofrece retirarlo.
-- Orden: el candado de la fila (`for update`) ANTES de mirar el uso. Publicar toma el nivel `for key share` antes de escribir: o publica y este
-- nivel ya no se elimina, o se elimina y publicar da `nivel_inexistente`. Sin candado de tabla: la fila ya serializa con retirar, renombrar y publicar. Después, los roles que lo tienen concedido (en orden de id, como
-- `_rol_para_editar`): `rbac_eliminar_rol` borra sus concesiones en otro orden y sin esto podría cruzarse (40P01).
create or replace function public.nivel_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.cotizaciones_niveles; v_uso jsonb; v_celdas int; v_secciones int; v_origenes int; v_roles uuid[]; v_rol uuid; v_concesiones int;
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
  if public._nivel_en_uso(o.clave) is not null then
    v_uso := public._nivel_uso(o.clave);
    v_celdas := (v_uso ->> 'celdas')::int; v_secciones := (v_uso ->> 'secciones')::int; v_origenes := (v_uso ->> 'origenes')::int;
    raise exception 'Está en % de % (en alguna versión de su fórmula): no se elimina. Puedes retirarlo: deja de ofrecerse y lo que ya lo usa se sigue filtrando igual.',
      case when v_celdas > 0 then v_celdas || case when v_celdas = 1 then ' celda' else ' celdas' end
           else v_secciones || case when v_secciones = 1 then ' sección' else ' secciones' end end,
      v_origenes || case when v_origenes = 1 then ' origen' else ' orígenes' end
      using errcode = '23503', detail = 'nivel_en_uso', hint = 'retirar';
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

-- ---------------------------------------------------------------------------
-- Los niveles que existen: ahora salen de la tabla (el 4.08-2 los dejó en un solo punto, con la lista fija {costos})
-- ---------------------------------------------------------------------------
-- Misma firma y mismos llamadores. «todos» no figura: siempre existe y nunca se retira. Vivos y retirados; los retirados además aparte.
create or replace function public._niveles_de_cotizacion(out niveles text[], out retirados text[])
language sql stable set search_path = '' as $$
  select coalesce(array_agg(n.clave order by n.clave) filter (where n.clave <> 'todos'), '{}'::text[]),
         coalesce(array_agg(n.clave order by n.clave) filter (where n.clave <> 'todos' and n.retirado_en is not null), '{}'::text[])
    from public.cotizaciones_niveles n;
$$;
revoke all on function public._niveles_de_cotizacion() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Preparar la publicación: igual que en …006000, más el candado de los niveles que nombra el diseño
-- ---------------------------------------------------------------------------
create or replace function public._preparar_publicacion(p_def jsonb, p_params jsonb, p_diseno jsonb, p_ignorar_retirados boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_niv text[]; v_ret text[]; v_tonos text[];
begin
  if p_diseno is null then
    perform public._formula_rechazar('diseno_faltante', 'diseno', 'Publicar pide el diseño de la hoja.');
  end if;
  -- Los tonos de los grupos y los niveles del diseño, `for key share`: o se publica y no se eliminan, o se eliminan y publicar da `tono_inexistente` o
  -- `nivel_inexistente`. Sólo los que se nombran, no toda la lista.
  perform 1 from public.tonos t where t.clave in (select jsonb_array_elements_text(public._tonos_de_grupos(p_def))) for key share;
  perform 1 from public.cotizaciones_niveles n where n.clave in (select jsonb_array_elements_text(public._niveles_del_diseno(p_diseno))) for key share;
  select coalesce(array_agg(t.clave), '{}') into v_tonos from public.tonos t;
  select n.niveles, case when p_ignorar_retirados then '{}'::text[] else n.retirados end into v_niv, v_ret from public._niveles_de_cotizacion() n;
  perform public.validar_formula(p_def, p_params);
  perform public.validar_diseno(p_def, p_diseno, v_niv, v_ret, v_tonos);
  return public._compilar_visibilidad(p_def, p_diseno);
end; $$;
revoke all on function public._preparar_publicacion(jsonb, jsonb, jsonb, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- _nodos_visibles(formula): el enforcement de los permisos de nivel
-- ---------------------------------------------------------------------------
-- Los nodos de esa versión que quien llama ve, y si los edita. Recorre `formulas.visibilidad` ({nodo: {ver, editar}} con claves de nivel) y los permisos de
-- `cotizaciones_niveles`, no una lista de claves en el código: un nivel nuevo trae su enforcement sin código nuevo. Los permisos son los reales de la
-- sesión (`mis_permisos()`, una sola vez); «Ver como» no cambia lo que decide la base. Un nivel sólo estrecha:
--   - se ve un nodo de `ver: todos` con `cotizaciones.ver` del origen, y uno de `ver: X` con `cotizaciones.ver` y `cotizaciones.nivel.X.ver`;
--   - se edita lo que se ve con `cotizaciones.crear` o `cotizaciones.editar` del origen y, si `editar` no es «todos», `cotizaciones.nivel.Y.editar`;
--     un `editar` nulo (lo que no se dibuja) no se edita, y lo que no se ve no se edita, tampoco entre dos niveles distintos;
--   - lo que la fórmula tiene y la visibilidad no nombra (o todo, en un borrador) sólo llega a quien tiene `cotizaciones.configurar` del origen, sin editar.
-- Una concesión con `origen_id` nulo cubre todos los orígenes. El alcance (propios o todos) y crear contra editar son de la fila: los decide quien llama
-- (`puede_cotizacion`, 4.10). Lineal en los nodos: ningún permiso se consulta por nodo. De nadie: la llamarán las RPC definer de lectura y guardado.
create or replace function public._nodos_visibles(p_formula uuid)
returns table (nodo text, editar boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_origen uuid; v_def jsonb; v_vis jsonb; v_claves text[]; v_ver boolean; v_mod boolean; v_cfg boolean;
begin
  select f.origen_id, f.definicion, coalesce(f.visibilidad, '{}'::jsonb) into v_origen, v_def, v_vis from public.formulas f where f.id = p_formula;
  if not found then return; end if;
  select coalesce(array_agg(m.clave), '{}') into v_claves from public.mis_permisos() m where m.origen_id is null or m.origen_id = v_origen;
  v_ver := 'cotizaciones.ver' = any (v_claves);
  v_mod := 'cotizaciones.crear' = any (v_claves) or 'cotizaciones.editar' = any (v_claves);
  v_cfg := 'cotizaciones.configurar' = any (v_claves);
  return query
    select e.key,
           v_mod and (e.value ->> 'editar') is not null
             and ((e.value ->> 'editar') = 'todos' or ('cotizaciones.nivel.' || (e.value ->> 'editar') || '.editar') = any (v_claves))
      from jsonb_each(v_vis) e
     where v_ver and (e.value ->> 'ver') is not null
       and ((e.value ->> 'ver') = 'todos' or ('cotizaciones.nivel.' || (e.value ->> 'ver') || '.ver') = any (v_claves))
    union all
    -- Una resta de conjuntos y no `v_vis ? id` por nodo: un jsonb que llega como puntero TOAST se vuelve a leer entero en cada operador (cuadrático).
    select s.id, false from (
      select n ->> 'id' as id from jsonb_array_elements(v_def -> 'nodos') n where v_cfg
      except
      select k from jsonb_object_keys(v_vis) k) s;
end;
$$;
revoke all on function public._nodos_visibles(uuid) from public, anon, authenticated;
comment on function public._nodos_visibles(uuid) is
  'Los nodos de una versión de fórmula que quien llama ve, y si los edita, según formulas.visibilidad y sus permisos (cotizaciones.ver, cotizaciones.nivel.<clave>.ver|editar). El enforcement de los niveles de acceso; docs/COTIZADOR.md › «En la base (4.09-1)».';
