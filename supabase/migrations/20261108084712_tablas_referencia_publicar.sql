-- 4.23-1: publicar una tabla de referencia (D5). La pantalla edita y reordena en su memoria y manda la tabla entera con nota y la versión que leyó;
-- `tabla_referencia_publicar()` reemplaza las filas vivas, sube la versión de la tabla y publica la N+1 de cada fórmula publicada que la usa (un nodo
-- la nombra o ya la tiene congelada en `params.tablas`) con la copia congelada nueva. Las demás congeladas, los demás params, la definición y el
-- diseño quedan como estaban; el borrador de la fórmula no se toca (4.20 P1: un borrador empezado antes da PT409 al publicarse). Candados: la fila
-- de la tabla (`for update`) y después `formulas:<origen>` de cada origen, en orden de `origen_id`, como el ⚙ y revertir: no hay ciclo.
-- docs/COTIZADOR.md › «Las tablas congeladas (D5)».

-- Las filas que manda la pantalla, contra las columnas de la tabla: una lista de hasta 2.000 objetos; cada clave es una columna y cada celda, de su
-- tipo (`numero` → número; `anio` → número entero; `texto` → texto de hasta 200; otro tipo → número o texto de hasta 200, como F68); null vale
-- siempre. La primera que falla, con su lugar (1 en adelante) en el mensaje y su camino (desde 0) en el `hint`. El espejo en TS es del 4.23-2.
create function public._tabla_referencia_filas_validas(p_columnas jsonb, p_filas jsonb) returns void
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  c_tope constant int := 2000;
  c_infinito constant numeric := power(2::numeric, 1024) - power(2::numeric, 970);
  v_fila jsonb; v_n bigint; v_clave text; v_celda jsonb; v_col jsonb; v_tipo text; v_ok boolean; v_motivo text;
begin
  if jsonb_typeof(p_filas) is distinct from 'array' then
    raise exception 'Las filas de la tabla van en una lista.' using errcode = '22023', hint = 'filas';
  end if;
  if jsonb_array_length(p_filas) > c_tope then
    raise exception 'Una tabla tiene hasta 2.000 filas.' using errcode = '22023', hint = 'filas';
  end if;
  for v_fila, v_n in select f.fila, f.n from jsonb_array_elements(p_filas) with ordinality f (fila, n) order by f.n loop
    if jsonb_typeof(v_fila) is distinct from 'object' then
      raise exception 'La fila %: no es una fila de la tabla.', v_n using errcode = '22023', hint = 'filas.' || (v_n - 1);
    end if;
    for v_clave, v_celda in select e.key, e.value from jsonb_each(v_fila) e order by e.key collate "C" loop
      v_col := (select c from jsonb_array_elements(p_columnas) c where c ->> 'clave' = v_clave limit 1);
      if v_col is null then
        raise exception 'La fila %: la tabla no tiene la columna «%».', v_n, v_clave
          using errcode = '22023', hint = 'filas.' || (v_n - 1) || '.' || v_clave;
      end if;
      v_tipo := coalesce(v_col ->> 'tipo', '');
      v_ok := case jsonb_typeof(v_celda)
                when 'null' then true
                when 'number' then v_tipo <> 'texto' and abs(v_celda::numeric) < c_infinito
                                   and (v_tipo <> 'anio' or v_celda::numeric = trunc(v_celda::numeric))
                when 'string' then v_tipo not in ('numero', 'anio') and char_length(v_celda #>> '{}') <= 200
                else false
              end;
      if not v_ok then
        v_motivo := case v_tipo
                      when 'numero' then 'va con un número'
                      when 'anio' then 'va con un año'
                      when 'texto' then 'va con un texto de hasta 200 letras'
                      else 'va con un número o un texto de hasta 200 letras'
                    end;
        raise exception 'La fila %: «%» %.', v_n, coalesce(nullif(btrim(v_col ->> 'etiqueta'), ''), v_clave), v_motivo
          using errcode = '22023', hint = 'filas.' || (v_n - 1) || '.' || v_clave;
      end if;
    end loop;
  end loop;
end;
$$;

revoke all on function public._tabla_referencia_filas_validas(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public._tabla_referencia_filas_validas(jsonb, jsonb) to service_role;
comment on function public._tabla_referencia_filas_validas(jsonb, jsonb) is
  'Interna: valida las filas que se publican contra las columnas de la tabla (lista de hasta 2.000 objetos, cada clave una columna, cada celda de su tipo). 22023 con el camino en el hint. docs/COTIZADOR.md › «Las tablas congeladas (D5)».';

-- Los orígenes que reciben la tabla (el suyo, o todos los que no tienen una propia activa de esa clave si es compartida) y, de cada uno, la
-- publicada que la usa: un nodo la nombra o ya la tiene congelada en `params.tablas` (nula si no la usa o no hay publicada). Con `p_origen`,
-- sólo ese.
create function public._tabla_referencia_usada_en(p_tabla uuid, p_origen uuid default null) returns table (origen_id uuid, formula_id uuid)
  language sql stable security definer
  set search_path = ''
as $$
  select o.id, f.id
    from public.tablas_referencia t                                                              -- tablas_referencia_pkey
    join public.origenes o
      on (t.origen_id is not null and o.id = t.origen_id)
      or (t.origen_id is null
          and not exists (select 1 from public.tablas_referencia r                               -- tablas_referencia_origen_id_clave_key
                           where r.origen_id = o.id and r.clave = t.clave and r.activa))
    left join public.formulas f                                                                  -- formulas_publicada_unica
      on f.origen_id = o.id and f.estado = 'publicada'
     and (coalesce(f.params -> 'tablas', '{}'::jsonb) ? t.clave
          or exists (select 1 from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'tabla' = t.clave))
   where t.id = p_tabla and (p_origen is null or o.id = p_origen)
   order by o.id;
$$;

revoke all on function public._tabla_referencia_usada_en(uuid, uuid) from public, anon, authenticated;
grant execute on function public._tabla_referencia_usada_en(uuid, uuid) to service_role;
comment on function public._tabla_referencia_usada_en(uuid, uuid) is
  'Interna: los orígenes que reciben una tabla de referencia y, de cada uno, la publicada que la usa (un nodo la nombra o la congeló), nula si no la usa. docs/COTIZADOR.md › «Las tablas congeladas (D5)».';

-- La frase del conflicto sobre la versión vigente de una tabla, sin mayúscula inicial ni punto, como `_version_publicada_por()`: «Ana publicó la
-- versión 3 de esta tabla hace 2 min», «otra persona publicó…» (sin quién o sin nombre), «publicaste…» (quien llama); sin cuándo, sin el «hace…».
create function public._tabla_referencia_publicada_por(p_tabla uuid) returns text
  language plpgsql stable security definer
  set search_path = ''
as $$
declare v_t public.tablas_referencia; v_sujeto text;
begin
  select * into v_t from public.tablas_referencia r where r.id = p_tabla;
  if v_t.id is null then return null; end if;
  if v_t.publicado_por is not null and v_t.publicado_por = (select auth.uid()) then
    v_sujeto := 'publicaste';
  else
    select nullif(btrim(p.nombre), '') || ' publicó' into v_sujeto from public.perfiles p where p.id = v_t.publicado_por;
    v_sujeto := coalesce(v_sujeto, 'otra persona publicó');
  end if;
  return v_sujeto || ' la versión ' || v_t.version || ' de esta tabla'
         || case when v_t.publicado_en is null then '' else ' ' || public._hace(v_t.publicado_en) end;
end;
$$;

revoke all on function public._tabla_referencia_publicada_por(uuid) from public, anon, authenticated;
grant execute on function public._tabla_referencia_publicada_por(uuid) to service_role;
comment on function public._tabla_referencia_publicada_por(uuid) is
  'Interna: la frase del PT409 de publicar una tabla de referencia (quién, qué versión y cuándo). docs/COTIZADOR.md › «Las tablas congeladas (D5)».';

-- Publicar una tabla de referencia. El orden de las comprobaciones (todo error deja todo igual):
--   1-2. 42501 con el mismo texto si la tabla no existe, no está activa o falta `cotizaciones.configurar` de su origen (en una compartida, de
--        algún origen); 3. sin versión esperada; 4. sin nota (22023);
--   tras el candado de la tabla: el permiso de cada origen que la usa (42501); 5. otra versión (PT409, quién, cuál y cuándo); 6-7. las filas
--   (22023 con su camino); 8. «La tabla no cambió.» si las filas son las vivas y cada publicada que la usa ya tiene esa copia.
create function public.tabla_referencia_publicar(p_tabla uuid, p_filas jsonb, p_nota text, p_version_esperada integer) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  c_sin_permiso constant text := 'No tienes el permiso «cotizaciones.configurar».';
  v_t public.tablas_referencia; v_anterior int; v_o record; v_pub public.formulas; v_nuevas jsonb; v_vivas jsonb; v_f text; v_id uuid;
  v_formulas jsonb := '[]'::jsonb; v_igual boolean;
begin
  perform public.assert_activo();
  -- Una tabla que no existe, una inactiva y una de un origen ajeno dan el mismo 42501: no se delata ninguna fila.
  select * into v_t from public.tablas_referencia r where r.id = p_tabla;                          -- tablas_referencia_pkey
  if v_t.id is null or not v_t.activa then raise exception '%', c_sin_permiso using errcode = '42501'; end if;
  -- Con origen, el de ese origen; compartida (origen nulo), el de algún origen.
  perform public.assert_permiso('cotizaciones.configurar', v_t.origen_id);
  if p_version_esperada is null then
    raise exception 'Falta la versión de la tabla que tenías.' using errcode = '22023', hint = 'version';
  end if;
  if coalesce(btrim(p_nota), '') = '' then raise exception 'Publicar pide una nota.' using errcode = '22023', hint = 'nota'; end if;

  -- El candado de la tabla: dos publicaciones de la misma tabla van en fila y la segunda ve la versión de la primera.
  select * into v_t from public.tablas_referencia r where r.id = p_tabla for update;
  if not v_t.activa then raise exception '%', c_sin_permiso using errcode = '42501'; end if;
  -- Una compartida cambia los precios de cada origen que la usa: hace falta el permiso de todos ellos (P2), antes de decir nada de la tabla.
  for v_o in select u.origen_id from public._tabla_referencia_usada_en(p_tabla) u where u.formula_id is not null loop
    perform public.assert_permiso('cotizaciones.configurar', v_o.origen_id);
  end loop;
  if v_t.version <> p_version_esperada then
    v_f := public._tabla_referencia_publicada_por(p_tabla);
    raise exception '%.', upper(left(v_f, 1)) || substr(v_f, 2) using errcode = 'PT409';
  end if;
  perform public._tabla_referencia_filas_validas(v_t.columnas, p_filas);

  -- Una celda nula es una celda ausente: así se guarda y así se compara.
  select coalesce(jsonb_agg(jsonb_strip_nulls(f.fila) order by f.n), '[]'::jsonb) into v_nuevas
    from jsonb_array_elements(p_filas) with ordinality f (fila, n);
  -- tablas_referencia_filas_tabla_orden_idx: las vivas activas, en su orden.
  select coalesce(jsonb_agg(jsonb_strip_nulls(x.valores) order by x.orden, x.id), '[]'::jsonb) into v_vivas
    from public.tablas_referencia_filas x where x.tabla_id = p_tabla and x.activa;
  -- Tras revertir una fórmula, su copia congelada vuelve a ser otra: publicar las mismas filas vivas le devuelve la tabla.
  v_igual := v_nuevas = v_vivas and not exists (
    select 1 from public._tabla_referencia_usada_en(p_tabla) u join public.formulas f on f.id = u.formula_id   -- formulas_pkey
     where (f.params -> 'tablas' -> v_t.clave) is distinct from v_nuevas);
  if v_igual then raise exception 'La tabla no cambió.' using errcode = '22023', hint = 'filas'; end if;

  -- Las filas nuevas reemplazan a todas, también a las inactivas: el cálculo y la copia congelada sólo leen las activas, y la historia queda en
  -- las copias congeladas de cada versión de la fórmula.
  delete from public.tablas_referencia_filas x where x.tabla_id = p_tabla;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden)
  select p_tabla, jsonb_strip_nulls(f.fila), (f.n - 1)::smallint from jsonb_array_elements(p_filas) with ordinality f (fila, n);
  v_anterior := v_t.version;
  update public.tablas_referencia r
     set version = r.version + 1, nota = btrim(p_nota), publicado_por = (select auth.uid()), publicado_en = now()
   where r.id = p_tabla
  returning * into v_t;

  -- La N+1 de cada origen que la usa, en orden de origen. La publicada se relee tras el candado del origen (el ⚙ o un revertir pudieron
  -- publicar otra mientras se esperaba): si ya no la usa, se salta; si la usa, con el permiso de ese origen.
  for v_o in select u.origen_id from public._tabla_referencia_usada_en(p_tabla) u loop
    perform pg_advisory_xact_lock(hashtextextended('formulas:' || v_o.origen_id::text, 0));
    select f.* into v_pub from public.formulas f
     where f.id = (select u.formula_id from public._tabla_referencia_usada_en(p_tabla, v_o.origen_id) u);   -- formulas_pkey
    continue when v_pub.id is null;
    perform public.assert_permiso('cotizaciones.configurar', v_o.origen_id);
    v_id := public._publicar_version(
      v_o.origen_id, v_pub.definicion,
      v_pub.params || jsonb_build_object('tablas', coalesce(v_pub.params -> 'tablas', '{}'::jsonb) || jsonb_build_object(v_t.clave, v_nuevas)),
      v_pub.diseno, format('Tabla «%s» versión %s: %s', v_t.nombre, v_t.version, btrim(p_nota)), v_pub.id,
      jsonb_build_object('tabla', v_t.clave, 'version_tabla', v_t.version), true);
    v_formulas := v_formulas || jsonb_build_array(jsonb_build_object(
      'origen_id', v_o.origen_id, 'version', (select f.version from public.formulas f where f.id = v_id)));   -- formulas_pkey
  end loop;

  perform public.registrar_actividad('tabla_referencia.publicada', 'tablas_referencia', p_tabla::text,
    jsonb_build_object('version', v_anterior),
    jsonb_build_object('version', v_t.version, 'nota', v_t.nota, 'filas', jsonb_array_length(v_nuevas), 'formulas', v_formulas));
  return jsonb_build_object('version', v_t.version, 'formulas', v_formulas);
end;
$$;

revoke all on function public.tabla_referencia_publicar(uuid, jsonb, text, integer) from public, anon;
grant execute on function public.tabla_referencia_publicar(uuid, jsonb, text, integer) to authenticated, service_role;
comment on function public.tabla_referencia_publicar(uuid, jsonb, text, integer) is
  'Publicar una tabla de referencia (cotizaciones.configurar de su origen; compartida, de cada origen que la usa): reemplaza sus filas, sube su versión y publica la N+1 de cada fórmula que la usa con la copia congelada, sin tocar el borrador. PT409 si la versión esperada ya no es la vigente; 22023 con el camino en el hint. Devuelve la versión y las N+1, nunca las filas. docs/COTIZADOR.md › «Las tablas congeladas (D5)».';

-- El catálogo: la escritura de las tablas ya no es la policy (la lectura sí). La nube no corre el seed; el seed dice lo mismo.
update public.permisos
   set aplicado_en = replace(aplicado_en, 'policy tablas_referencia', 'policy tablas_referencia (leer), tabla_referencia_publicar')
 where clave = 'cotizaciones.configurar';
