-- Los tonos de la empresa (paso 4.08, prompt 2; docs/COTIZADOR.md › «El diseño de la hoja»). La tabla `tonos` vive en `schemas/07_cotizaciones`.
-- Acá: el contraste AA, la semilla, la sonda «¿lo nombra alguna versión de alguna fórmula?» y las tres RPC que lo escriben.
--
--  - Un tono es el color de un grupo de la fórmula (`definicion.grupos[].tono`) en la hoja y en la tarjeta, en claro y en oscuro: fondo, borde y
--    tinta. Se escribe sólo por `tono_crear|guardar|eliminar`, con `cotizaciones.configurar` (cualquier concesión: el catálogo es de la empresa).
--  - **El AA se valida acá, en la base**, porque no hay otra capa que lo haga (nada de interfaz): la tinta sobre su fondo da al menos 4,5:1 en cada
--    tema. `_color_luminancia()` y `_color_contraste()` copian `luminancia()` y `contraste()` de `src/shared/lib/color.ts`; `tonos.sql` compara los
--    dos lados con un corpus que genera TS (`supabase/tests/corpus-de-contraste.json`). El borde sólo tiene que ser un `#rrggbb`.
--  - **Un tono que alguna versión nombra no se elimina** (`_tono_en_uso`): las cotizaciones viejas se leen con la versión de su fórmula, y el ⚙ y
--    la N+1 republican el diseño sin cambiarlo. No se retira: para cambiarlo se editan sus colores.
--  - Los ayudantes no son de nadie (`revoke … from public, anon, authenticated`): una función nueva nace con EXECUTE para PUBLIC.

-- ---------------------------------------------------------------------------
-- Lectura para toda sesión (la hoja pinta los grupos); la escritura es sólo por RPC
-- ---------------------------------------------------------------------------
revoke all on table public.tonos from anon, authenticated;
grant select, insert, update, delete on table public.tonos to service_role;
grant select on table public.tonos to authenticated;
drop policy if exists "tonos: leer" on public.tonos;
create policy "tonos: leer" on public.tonos for select to authenticated using (true);

-- La versión sólo se mueve si cambia algo que se ve.
create or replace function public.tono_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.nombre, new.claro_fondo, new.claro_borde, new.claro_tinta, new.oscuro_fondo, new.oscuro_borde, new.oscuro_tinta)
     is distinct from (old.nombre, old.claro_fondo, old.claro_borde, old.claro_tinta, old.oscuro_fondo, old.oscuro_borde, old.oscuro_tinta) then
    new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  else
    new.actualizado_en := old.actualizado_en;
  end if;
  return new;
end;
$$;
revoke all on function public.tono_version() from public, anon, authenticated;
drop trigger if exists trg_tono_version on public.tonos;
create trigger trg_tono_version before update on public.tonos for each row execute function public.tono_version();

-- ---------------------------------------------------------------------------
-- El contraste (WCAG), copia de src/shared/lib/color.ts
-- ---------------------------------------------------------------------------
-- IMMUTABLE de verdad: sólo aritmética sobre su argumento, sin format() ni raise. Un hex mal escrito no llega acá (_tono_colores lo rechaza antes).
create or replace function public._color_luminancia(p_hex text)
returns float8 language sql immutable set search_path = '' as $$
  select 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
    from (select
            case when v.r <= 0.04045 then v.r / 12.92 else power((v.r + 0.055) / 1.055, 2.4) end as r,
            case when v.g <= 0.04045 then v.g / 12.92 else power((v.g + 0.055) / 1.055, 2.4) end as g,
            case when v.b <= 0.04045 then v.b / 12.92 else power((v.b + 0.055) / 1.055, 2.4) end as b
            from (select ('x' || substr(lower(p_hex), 2, 2))::bit(8)::int / 255.0::float8 as r,
                         ('x' || substr(lower(p_hex), 4, 2))::bit(8)::int / 255.0::float8 as g,
                         ('x' || substr(lower(p_hex), 6, 2))::bit(8)::int / 255.0::float8 as b) v) c;
$$;
revoke all on function public._color_luminancia(text) from public, anon, authenticated;

create or replace function public._color_contraste(p_a text, p_b text)
returns float8 language sql immutable set search_path = '' as $$
  select (greatest(la, lb) + 0.05) / (least(la, lb) + 0.05)
    from (select public._color_luminancia(p_a) as la, public._color_luminancia(p_b) as lb) x;
$$;
revoke all on function public._color_contraste(text, text) from public, anon, authenticated;

-- La decisión, aparte para probar el umbral exacto: CONTRASTE_AA de color.ts es 4,5 y «alcanza» es mayor o igual.
create or replace function public._contraste_aa(p_razon float8)
returns boolean language sql immutable set search_path = '' as $$ select p_razon >= 4.5; $$;
revoke all on function public._contraste_aa(float8) from public, anon, authenticated;

create or replace function public._tonos_tope()
returns integer language sql immutable set search_path = '' as $$ select 24; $$;
revoke all on function public._tonos_tope() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Nombre, clave y colores
-- ---------------------------------------------------------------------------
-- STABLE y no IMMUTABLE: lanza (la lección de …005100).
create or replace function public._tono_nombre(p_texto text)
returns text language plpgsql stable set search_path = '' as $$
declare v text := btrim(regexp_replace(coalesce(p_texto, ''), '\s+', ' ', 'g'));
begin
  if v = '' then
    raise exception 'Escribe el nombre del tono.' using errcode = '22023', hint = 'nombre';
  end if;
  if char_length(v) > 40 then
    raise exception 'El nombre del tono admite hasta 40 caracteres.' using errcode = '22023', hint = 'nombre';
  end if;
  return v;
end;
$$;
revoke all on function public._tono_nombre(text) from public, anon, authenticated;

-- La clave sale del nombre, sin tildes, y no cambia: la nombran los grupos de las fórmulas.
create or replace function public._tono_clave(p_nombre text)
returns text language plpgsql stable set search_path = '' as $$
declare v text; v_base text; n int := 1;
begin
  v := btrim(regexp_replace(
         translate(lower(p_nombre), 'áàäâéèëêíìïîóòöôúùüûñ', 'aaaaeeeeiiiioooouuuun'),
         '[^a-z0-9]+', '_', 'g'), '_');
  if v !~ '^[a-z]' then
    v := 't_' || v;
  end if;
  v := rtrim(left(v, 30), '_');
  if char_length(v) < 2 then
    v := 'tono';
  end if;
  v_base := v;
  while exists (select 1 from public.tonos t where t.clave = v) loop
    n := n + 1;
    v := left(v_base, 30 - char_length(n::text) - 1) || '_' || n;
  end loop;
  return v;
end;
$$;
revoke all on function public._tono_clave(text) from public, anon, authenticated;

-- Los colores de un tono: {claro: {fondo, borde, tinta}, oscuro: {…}}, estricto. Devuelve los mismos con el hex en minúsculas.
create or replace function public._tono_colores(p_colores jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_tema text; v_color text; v_k text; v_hex text; v_out jsonb := '{}'::jsonb; v_t jsonb; v_razon float8;
begin
  if jsonb_typeof(p_colores) is distinct from 'object' or (select array_agg(k order by k) from jsonb_object_keys(p_colores) k) is distinct from array['claro', 'oscuro'] then
    raise exception 'Los colores del tono tienen que ser dos temas, claro y oscuro, cada uno con fondo, borde y tinta.' using errcode = '22023', hint = 'colores';
  end if;
  foreach v_tema in array array['claro', 'oscuro'] loop
    if jsonb_typeof(p_colores -> v_tema) is distinct from 'object' then
      raise exception 'Los colores del tema % tienen que ser fondo, borde y tinta.', v_tema using errcode = '22023', hint = 'colores';
    end if;
    for v_k in select jsonb_object_keys(p_colores -> v_tema) loop
      if v_k not in ('fondo', 'borde', 'tinta') then
        raise exception 'El color «%» no existe: son fondo, borde y tinta.', v_k using errcode = '22023', hint = v_tema || '.' || v_k;
      end if;
    end loop;
    v_t := '{}'::jsonb;
    foreach v_color in array array['fondo', 'borde', 'tinta'] loop
      v_hex := case when jsonb_typeof(p_colores -> v_tema -> v_color) = 'string' then lower(p_colores -> v_tema ->> v_color) end;
      if v_hex is null or v_hex !~ '^#[0-9a-f]{6}$' then
        raise exception 'El color «%.%» tiene que escribirse como #rrggbb, por ejemplo #fff7d6.', v_tema, v_color using errcode = '22023', hint = v_tema || '.' || v_color;
      end if;
      v_t := v_t || jsonb_build_object(v_color, v_hex);
    end loop;
    v_out := v_out || jsonb_build_object(v_tema, v_t);
  end loop;
  -- El AA de cada tema: la tinta se lee sobre el fondo (WCAG, CONTRASTE_AA de color.ts).
  foreach v_tema in array array['claro', 'oscuro'] loop
    v_razon := public._color_contraste(v_out -> v_tema ->> 'tinta', v_out -> v_tema ->> 'fondo');
    if not public._contraste_aa(v_razon) then
      raise exception 'En el tema % la tinta sobre el fondo da %:1 y hace falta 4,5:1.', v_tema, replace((floor(v_razon * 10) / 10)::numeric(5, 1)::text, '.', ',')
        using errcode = '22023', hint = v_tema;
    end if;
  end loop;
  return v_out;
end;
$$;
revoke all on function public._tono_colores(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- ¿Lo nombra alguna versión de alguna fórmula? (borrador, publicada y archivada)
-- ---------------------------------------------------------------------------
-- Los tonos de los grupos de una definición: un arreglo angosto para indexar, no el grafo entero.
create or replace function public._tonos_de_grupos(p_def jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_path_query_array(p_def, '$.grupos[*].tono'), '[]'::jsonb);
$$;
revoke all on function public._tonos_de_grupos(jsonb) from public, anon, authenticated;
-- La sonda de abajo (`formulas_tonos_idx`, GIN jsonb_path_ops): una clave libre no recorre las versiones, que crecen con cada ⚙.
create index if not exists formulas_tonos_idx on public.formulas using gin (public._tonos_de_grupos(definicion) jsonb_path_ops);

-- El nombre del origen de una fórmula que lo nombra (la primera por nombre), o nulo si ninguna. Definer: lee `formulas` aunque quien llama no
-- tenga cotizaciones.configurar de ese origen; sólo la llaman las RPC de abajo.
create or replace function public._tono_en_uso(p_clave text)
returns text language sql stable security definer set search_path = '' as $$
  -- Materializada: el índice conduce. Sin ella el planificador puede recorrer los orígenes por nombre y probar cada versión, y una clave que
  -- nadie usa no tiene coincidencia que lo corte (cuesta lo que crece la tabla).
  with u as materialized (
    select distinct f.origen_id from public.formulas f
     where public._tonos_de_grupos(f.definicion) @> jsonb_build_array(p_clave)  -- formulas_tonos_idx
  )
  select o.nombre from u join public.origenes o on o.id = u.origen_id order by o.nombre limit 1;
$$;
revoke all on function public._tono_en_uso(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- La lista que devuelven las escrituras
-- ---------------------------------------------------------------------------
create or replace function public._tonos_lista()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'tope', public._tonos_tope(),
    'tonos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', t.id, 'clave', t.clave, 'nombre', t.nombre, 'actualizado_en', t.actualizado_en,
        'claro', jsonb_build_object('fondo', t.claro_fondo, 'borde', t.claro_borde, 'tinta', t.claro_tinta),
        'oscuro', jsonb_build_object('fondo', t.oscuro_fondo, 'borde', t.oscuro_borde, 'tinta', t.oscuro_tinta)) order by t.nombre)
      from (select x.* from public.tonos x order by x.nombre limit public._tonos_tope()) t), '[]'::jsonb));
$$;
revoke all on function public._tonos_lista() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------------
create or replace function public.tono_crear(p_id uuid, p_nombre text, p_colores jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_nombre text; v_version timestamptz; v_c jsonb; v_tope integer := public._tonos_tope();
begin
  perform public.assert_permiso('cotizaciones.configurar');
  lock table public.tonos in share row exclusive mode;
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  select t.actualizado_en into v_version from public.tonos t where t.id = p_id;
  if found then
    return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', true, 'lista', public._tonos_lista());
  end if;
  v_nombre := public._tono_nombre(p_nombre);
  v_c := public._tono_colores(p_colores);
  if (select count(*) from (select 1 from public.tonos limit v_tope) t) >= v_tope then
    raise exception 'Ya hay % tonos, que es el máximo. Elimina uno que ningún grupo use.', v_tope using errcode = '22023', hint = 'nombre';
  end if;
  if exists (select 1 from public.tonos t where lower(btrim(t.nombre)) = lower(v_nombre)) then
    raise exception 'Ya hay un tono «%».', v_nombre using errcode = '23505', hint = 'nombre';
  end if;
  insert into public.tonos (id, clave, nombre, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta)
  values (p_id, public._tono_clave(v_nombre), v_nombre, v_c -> 'claro' ->> 'fondo', v_c -> 'claro' ->> 'borde', v_c -> 'claro' ->> 'tinta',
          v_c -> 'oscuro' ->> 'fondo', v_c -> 'oscuro' ->> 'borde', v_c -> 'oscuro' ->> 'tinta')
  returning actualizado_en into v_version;
  perform public.registrar_actividad('tono.crear', 'tonos', p_id::text, null, jsonb_build_object('nombre', v_nombre, 'colores', v_c));
  return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', false, 'lista', public._tonos_lista());
end;
$$;
revoke all on function public.tono_crear(uuid, text, jsonb) from public, anon;
grant execute on function public.tono_crear(uuid, text, jsonb) to authenticated;

-- Renombra o recolorea. La clave no cambia.
create or replace function public.tono_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.tonos; v_k text; v_nombre text; v_c jsonb; v_version timestamptz;
begin
  perform public.assert_permiso('cotizaciones.configurar');
  lock table public.tonos in share row exclusive mode;
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios de un tono tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_cambios) loop
    if v_k not in ('nombre', 'colores') then
      raise exception 'El dato «%» de un tono no se cambia.', v_k using errcode = '22023', hint = v_k;
    end if;
  end loop;
  select * into o from public.tonos x where x.id = p_id for update;
  if not found then
    raise exception 'Ese tono ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este tono mientras lo editabas.');   -- rechaza también una versión nula

  v_nombre := o.nombre;
  if p_cambios ? 'nombre' then
    if jsonb_typeof(p_cambios -> 'nombre') <> 'string' then
      raise exception 'Escribe el nombre del tono.' using errcode = '22023', hint = 'nombre';
    end if;
    v_nombre := public._tono_nombre(p_cambios ->> 'nombre');
  end if;
  v_c := case when p_cambios ? 'colores' then public._tono_colores(p_cambios -> 'colores')
              else jsonb_build_object('claro', jsonb_build_object('fondo', o.claro_fondo, 'borde', o.claro_borde, 'tinta', o.claro_tinta),
                                      'oscuro', jsonb_build_object('fondo', o.oscuro_fondo, 'borde', o.oscuro_borde, 'tinta', o.oscuro_tinta)) end;
  if exists (select 1 from public.tonos t where t.id <> p_id and lower(btrim(t.nombre)) = lower(v_nombre)) then
    raise exception 'Ya hay un tono «%».', v_nombre using errcode = '23505', hint = 'nombre';
  end if;
  update public.tonos set nombre = v_nombre,
         claro_fondo = v_c -> 'claro' ->> 'fondo', claro_borde = v_c -> 'claro' ->> 'borde', claro_tinta = v_c -> 'claro' ->> 'tinta',
         oscuro_fondo = v_c -> 'oscuro' ->> 'fondo', oscuro_borde = v_c -> 'oscuro' ->> 'borde', oscuro_tinta = v_c -> 'oscuro' ->> 'tinta'
   where id = p_id returning actualizado_en into v_version;
  perform public.registrar_actividad('tono.guardar', 'tonos', p_id::text, jsonb_build_object('nombre', o.nombre), jsonb_build_object('nombre', v_nombre, 'colores', v_c));
  return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'lista', public._tonos_lista());
end;
$$;
revoke all on function public.tono_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.tono_guardar(uuid, timestamptz, jsonb) to authenticated;

-- Sólo uno que ninguna versión de ninguna fórmula nombra. Con uso se cambia su nombre o sus colores: no se retira.
-- Orden: el candado de la tabla y el de la fila ANTES de mirar el uso. Publicar toma el tono `for key share` antes de escribir: o publica y
-- este tono ya no se elimina, o se elimina y publicar da `tono_inexistente`.
create or replace function public.tono_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.tonos; v_origen text;
begin
  perform public.assert_permiso('cotizaciones.configurar');
  lock table public.tonos in share row exclusive mode;
  select * into o from public.tonos x where x.id = p_id for update;
  if not found then
    raise exception 'Ese tono ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este tono mientras lo editabas.');
  v_origen := public._tono_en_uso(o.clave);
  if v_origen is not null then
    raise exception '«%» lo usa la fórmula de «%» (alguna de sus versiones): no se elimina. Cambia su nombre o sus colores.', o.nombre, v_origen using errcode = '23503';
  end if;
  delete from public.tonos where id = p_id;
  perform public.registrar_actividad('tono.eliminar', 'tonos', p_id::text, jsonb_build_object('nombre', o.nombre, 'clave', o.clave), null);
  return jsonb_build_object('lista', public._tonos_lista());
end;
$$;
revoke all on function public.tono_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.tono_eliminar(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- La semilla: los tres tonos de las celdas del cotizador (design/tokens.css). Claro: el fondo y el borde del token con la tinta de la app.
-- Oscuro: el rgba del token compuesto sobre la superficie oscura. Los hex los calcula supabase/tests/corpus-de-contraste.ts.
-- ---------------------------------------------------------------------------
insert into public.tonos (clave, nombre, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta) values
  ('amarillo', 'Amarillo', '#fff7d6', '#e9d27a', '#1b2130', '#3e3f3c', '#797251', '#f2f4f8'),
  ('verde', 'Verde', '#e6f6ee', '#8fd3b0', '#1b2130', '#2d3c42', '#50726a', '#f2f4f8'),
  ('naranja', 'Naranja', '#ffe9d6', '#f0b27a', '#1b2130', '#3f3a3c', '#876b55', '#f2f4f8')
on conflict (clave) do nothing;

-- Cómo se hace cumplir (el catálogo de permisos lo pisa el seed; esto es para una base viva).
update public.permisos set aplicado_en = 'formula_*, plantilla_*, tono_*, policy tablas_referencia' where clave = 'cotizaciones.configurar';
