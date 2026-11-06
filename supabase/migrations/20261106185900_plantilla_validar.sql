-- La plantilla de la tarjeta, validada (paso 4.18-1). docs/COTIZADOR.md › «Plantilla de tarjeta».
-- `plantillas_tarjeta.definicion` pasa a una forma declarativa, como el diseño (D7): los grupos de la fórmula en orden con su tono (el del grupo o uno del
-- catálogo), etiquetas y leyendas por nodo, el total, la nota, el logo y qué columnas van. Sin hex, CSS ni plantillas de texto.
-- `validar_plantilla()` la valida (STABLE, invocadora, sin leer tablas; 22023 con la regla en DETAIL y el donde en HINT, como `validar_diseno`), con el juego
-- común `src/modules/cotizaciones/entities/plantilla/casos-de-plantilla.json`. Guardar el borrador valida la forma; publicar, contra la fórmula publicada del origen.
-- La tarjeta (y el PDF) sólo dibuja nodos del nivel «todos»: cada grupo de la fórmula entero (lo que se ve suma el total) y un miembro que no es del nivel
-- «todos» (o que el diseño no dibuja) invalida la plantilla. Las dos RPC siguen sin versión esperada hasta el 4.19 (.claude/rules/migraciones.md).

-- La forma: un objeto estricto, de hasta 32 KB; los textos se cuentan en caracteres.
create function public._plantilla_forma(p_plantilla jsonb) returns void
    language plpgsql stable
    set search_path = ''
    as $$
declare
  v_id constant text := '^[a-z][a-z0-9_]{0,40}$';
  v_k text; v_x jsonb; v_g jsonb; v_dic text; v_min int; v_max int;
begin
  if jsonb_typeof(p_plantilla) is distinct from 'object' or octet_length(p_plantilla::text) > 32768 then
    perform public._formula_rechazar('forma', 'definicion', 'La plantilla no tiene la forma esperada.');
  end if;
  select k into v_k from jsonb_object_keys(p_plantilla) k
   where k not in ('grupos', 'etiquetas', 'leyendas', 'total', 'nota', 'logo', 'columnas') order by k collate "C" limit 1;
  if v_k is not null then perform public._formula_rechazar('forma', v_k, 'La plantilla no tiene la forma esperada.'); end if;

  -- Los grupos: hasta 20 {grupo, tono?}, con la forma de un id.
  v_x := p_plantilla -> 'grupos';
  if jsonb_typeof(v_x) is distinct from 'array' or jsonb_array_length(v_x) > 20 then perform public._formula_rechazar('forma', 'grupos', 'La plantilla no tiene la forma esperada.'); end if;
  for i in 0 .. jsonb_array_length(v_x) - 1 loop
    v_g := v_x -> i;
    if jsonb_typeof(v_g) is distinct from 'object' then perform public._formula_rechazar('forma', format('grupos[%s]', i), 'La plantilla no tiene la forma esperada.'); end if;
    if exists (select 1 from jsonb_object_keys(v_g) k where k not in ('grupo', 'tono')) then
      perform public._formula_rechazar('forma', format('grupos[%s]', i), 'La plantilla no tiene la forma esperada.');
    end if;
    if jsonb_typeof(v_g -> 'grupo') is distinct from 'string' or (v_g ->> 'grupo') !~ v_id then
      perform public._formula_rechazar('forma', format('grupos[%s].grupo', i), 'La plantilla no tiene la forma esperada.');
    end if;
    if v_g ? 'tono' and (jsonb_typeof(v_g -> 'tono') is distinct from 'string' or (v_g ->> 'tono') !~ v_id) then
      perform public._formula_rechazar('forma', format('grupos[%s].tono', i), 'La plantilla no tiene la forma esperada.');
    end if;
  end loop;

  -- Etiquetas (1 a 60 caracteres) y leyendas (0 a 160; vacía = sin leyenda) por nodo: hasta 200 claves cada una, en orden de bytes.
  foreach v_dic in array array['etiquetas', 'leyendas'] loop
    continue when not p_plantilla ? v_dic;
    v_x := p_plantilla -> v_dic;
    if jsonb_typeof(v_x) is distinct from 'object' then perform public._formula_rechazar('forma', v_dic, 'La plantilla no tiene la forma esperada.'); end if;
    if cardinality(array(select jsonb_object_keys(v_x))) > 200 then perform public._formula_rechazar('forma', v_dic, 'La plantilla no tiene la forma esperada.'); end if;
    v_min := case when v_dic = 'etiquetas' then 1 else 0 end;
    v_max := case when v_dic = 'etiquetas' then 60 else 160 end;
    for v_k, v_g in select e.key, e.value from jsonb_each(v_x) e order by e.key collate "C" loop
      if v_k !~ v_id then perform public._formula_rechazar('forma', v_dic, 'La plantilla no tiene la forma esperada.'); end if;
      if jsonb_typeof(v_g) is distinct from 'string' or char_length(btrim(v_g #>> '{}')) < v_min or char_length(v_g #>> '{}') > v_max then
        perform public._formula_rechazar('forma', v_dic || '.' || v_k, 'La plantilla no tiene la forma esperada.');
      end if;
    end loop;
  end loop;

  -- El total ({etiqueta de 1 a 40, leyenda? hasta 160}), la nota (hasta 300), el logo y las tres columnas.
  v_x := p_plantilla -> 'total';
  if jsonb_typeof(v_x) is distinct from 'object' then perform public._formula_rechazar('forma', 'total', 'La plantilla no tiene la forma esperada.'); end if;
  if exists (select 1 from jsonb_object_keys(v_x) k where k not in ('etiqueta', 'leyenda')) then perform public._formula_rechazar('forma', 'total', 'La plantilla no tiene la forma esperada.'); end if;
  if jsonb_typeof(v_x -> 'etiqueta') is distinct from 'string' or char_length(btrim(v_x ->> 'etiqueta')) < 1 or char_length(v_x ->> 'etiqueta') > 40 then
    perform public._formula_rechazar('forma', 'total.etiqueta', 'La plantilla no tiene la forma esperada.');
  end if;
  if v_x ? 'leyenda' and (jsonb_typeof(v_x -> 'leyenda') is distinct from 'string' or char_length(v_x ->> 'leyenda') > 160) then
    perform public._formula_rechazar('forma', 'total.leyenda', 'La plantilla no tiene la forma esperada.');
  end if;
  if p_plantilla ? 'nota' and (jsonb_typeof(p_plantilla -> 'nota') is distinct from 'string' or char_length(p_plantilla ->> 'nota') > 300) then
    perform public._formula_rechazar('forma', 'nota', 'La plantilla no tiene la forma esperada.');
  end if;
  if jsonb_typeof(p_plantilla -> 'logo') is distinct from 'boolean' then perform public._formula_rechazar('forma', 'logo', 'La plantilla no tiene la forma esperada.'); end if;
  v_x := p_plantilla -> 'columnas';
  if jsonb_typeof(v_x) is distinct from 'object' then perform public._formula_rechazar('forma', 'columnas', 'La plantilla no tiene la forma esperada.'); end if;
  if array(select k from jsonb_object_keys(v_x) k order by k collate "C") is distinct from array['leyenda', 'plazo', 'tipo_cambio']
     or exists (select 1 from jsonb_each(v_x) e where jsonb_typeof(e.value) <> 'boolean') then
    perform public._formula_rechazar('forma', 'columnas', 'La plantilla no tiene la forma esperada.');
  end if;
end;
$$;

-- Los nodos que nombra o dibuja: cada clave de etiquetas y leyendas es un nodo con lugar en la tarjeta (un miembro de un grupo, el total o lo aparte de la
-- tarjeta del total), y lo que dibuja es del nivel «todos» (no figurar en la visibilidad compilada cuenta como restringido). Cada conjunto se arma una vez.
create function public._plantilla_nodos(p_plantilla jsonb, p_def jsonb, p_diseno jsonb, p_visibilidad jsonb) returns void
    language plpgsql stable
    set search_path = ''
    as $$
declare
  v_nodos jsonb; v_lugar jsonb; v_vis jsonb; v_usados jsonb; v_nombrados jsonb; v_total text; v_k text;
begin
  v_nodos := coalesce((select jsonb_object_agg(n ->> 'id', n) from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) n), '{}'::jsonb);
  v_vis := coalesce(p_visibilidad, '{}'::jsonb);
  select n ->> 'id' into v_total from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) n where n ->> 'salida' = 'total' limit 1;
  v_lugar := coalesce((select jsonb_object_agg(n ->> 'id', true) from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) n where n ->> 'grupo' is not null), '{}'::jsonb)
          || coalesce((select jsonb_object_agg(s, true) from jsonb_array_elements_text(coalesce(p_diseno -> 'tarjeta_total' -> 'secundarios', '[]'::jsonb)) s), '{}'::jsonb)
          || case when v_total is null then '{}'::jsonb else jsonb_build_object(v_total, true) end;

  -- Las claves nombradas: las de etiquetas y después las de leyendas, cada una en orden de bytes.
  v_nombrados := coalesce((select jsonb_agg(jsonb_build_object('clave', k, 'd', 1)) from jsonb_object_keys(coalesce(p_plantilla -> 'etiquetas', '{}'::jsonb)) k), '[]'::jsonb)
              || coalesce((select jsonb_agg(jsonb_build_object('clave', k, 'd', 2)) from jsonb_object_keys(coalesce(p_plantilla -> 'leyendas', '{}'::jsonb)) k), '[]'::jsonb);
  select x.clave into v_k from jsonb_to_recordset(v_nombrados) x (clave text, d int) where not v_nodos ? x.clave order by x.d, x.clave collate "C" limit 1;
  if v_k is not null then perform public._formula_rechazar('nodo_inexistente', v_k, format('La plantilla nombra «%s», que no es un nodo de la fórmula.', v_k)); end if;
  select x.clave into v_k from jsonb_to_recordset(v_nombrados) x (clave text, d int) where not v_lugar ? x.clave order by x.d, x.clave collate "C" limit 1;
  if v_k is not null then perform public._formula_rechazar('nodo_sin_lugar', v_k, format('El nodo «%s» no va en la tarjeta: no es de un grupo, el total ni lo aparte.', v_k)); end if;

  -- Lo que dibuja: los miembros en el orden de la fórmula, el total, lo aparte y (defensivo: nodo_sin_lugar va antes) lo nombrado.
  select x.id into v_k from (
    select n ->> 'id' as id, 1 as d, o as ord from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) with ordinality t (n, o) where n ->> 'grupo' is not null
    union all select v_total, 2, 0 where v_total is not null
    union all select s, 3, o from jsonb_array_elements_text(coalesce(p_diseno -> 'tarjeta_total' -> 'secundarios', '[]'::jsonb)) with ordinality t (s, o)
    union all select y.clave, 4, y.d from jsonb_to_recordset(v_nombrados) y (clave text, d int)) x
   where coalesce(v_vis -> x.id ->> 'ver', '') <> 'todos'
   order by x.d, x.ord, x.id collate "C" limit 1;
  if v_k is not null then perform public._formula_rechazar('nodo_restringido', v_k, format('La tarjeta no puede mostrar «%s»: no es del nivel «todos».', v_k)); end if;

  -- Con la columna del tipo de cambio, el de cada bucket que usa un grupo (por omisión y en cada modo del diseño) es del nivel «todos».
  if coalesce((p_plantilla -> 'columnas' ->> 'tipo_cambio')::boolean, false) then
    v_usados := coalesce((select jsonb_object_agg(g ->> 'bucket', true) from jsonb_array_elements(coalesce(p_def -> 'grupos', '[]'::jsonb)) g where g ->> 'bucket' is not null), '{}'::jsonb);
    select x.id into v_k from (
      select p_def -> 'buckets' ->> b as id, 1 as d, 0::bigint as ord, b from jsonb_object_keys(v_usados) b
      union all
      select mb ->> 'nodo', 2, m.o * 1000 + t.o, mb ->> 'bucket'
        from jsonb_array_elements(coalesce(p_diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) with ordinality m (v, o)
       cross join lateral jsonb_array_elements(coalesce(m.v -> 'buckets', '[]'::jsonb)) with ordinality t (mb, o)
       where v_usados ? (mb ->> 'bucket')) x
     where x.id is not null and coalesce(v_vis -> x.id ->> 'ver', '') <> 'todos'
     order by x.d, x.ord, x.b collate "C" limit 1;
    if v_k is not null then
      perform public._formula_rechazar('tipo_de_cambio_restringido', v_k, format('La tarjeta no puede nombrar el tipo de cambio de «%s»: no es del nivel «todos».', v_k));
    end if;
  end if;
end;
$$;

-- La plantilla contra una fórmula: la forma; sin fórmula (`p_def` nulo), nada más. Con ella, los grupos (todos los de la fórmula, una vez, con un tono del
-- catálogo si `p_tonos` no es nulo) y los nodos. El primer rechazo manda, en este orden fijo.
create function public.validar_plantilla(p_plantilla jsonb, p_def jsonb, p_diseno jsonb, p_visibilidad jsonb, p_tonos text[]) returns void
    language plpgsql stable
    set search_path = ''
    as $$
declare
  v_grupos jsonb; v_pla jsonb; v_ton jsonb; v_k text;
begin
  perform public._plantilla_forma(p_plantilla);
  if p_def is null then return; end if;
  v_grupos := coalesce((select jsonb_object_agg(g ->> 'id', true) from jsonb_array_elements(coalesce(p_def -> 'grupos', '[]'::jsonb)) g), '{}'::jsonb);
  v_pla := coalesce((select jsonb_object_agg(g ->> 'grupo', true) from jsonb_array_elements(p_plantilla -> 'grupos') g), '{}'::jsonb);

  select g ->> 'grupo' into v_k from jsonb_array_elements(p_plantilla -> 'grupos') with ordinality t (g, o) where not v_grupos ? (g ->> 'grupo') order by o limit 1;
  if v_k is not null then perform public._formula_rechazar('grupo_inexistente', v_k, format('El grupo «%s» no es de la fórmula.', v_k)); end if;
  select a.g ->> 'grupo' into v_k from jsonb_array_elements(p_plantilla -> 'grupos') with ordinality a (g, o)
   where exists (select 1 from jsonb_array_elements(p_plantilla -> 'grupos') with ordinality b (g, o) where b.o < a.o and b.g ->> 'grupo' = a.g ->> 'grupo')
   order by a.o limit 1;
  if v_k is not null then perform public._formula_rechazar('grupo_repetido', v_k, format('El grupo «%s» está dos veces.', v_k)); end if;
  select g ->> 'id' into v_k from jsonb_array_elements(coalesce(p_def -> 'grupos', '[]'::jsonb)) with ordinality t (g, o) where not v_pla ? (g ->> 'id') order by o limit 1;
  if v_k is not null then perform public._formula_rechazar('grupo_faltante', v_k, format('Falta el grupo «%s»: la tarjeta lleva todos los grupos de la fórmula.', v_k)); end if;
  if p_tonos is not null then
    select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) into v_ton from unnest(p_tonos) x where x is not null;
    select g ->> 'grupo' into v_k from jsonb_array_elements(p_plantilla -> 'grupos') with ordinality t (g, o) where g ? 'tono' and not v_ton ? (g ->> 'tono') order by o limit 1;
    if v_k is not null then perform public._formula_rechazar('tono_inexistente', v_k, format('El grupo «%s» usa un tono que no está en el catálogo.', v_k)); end if;
  end if;

  perform public._plantilla_nodos(p_plantilla, p_def, p_diseno, p_visibilidad);
end;
$$;

revoke all on function public._plantilla_forma(jsonb) from public, anon;
grant execute on function public._plantilla_forma(jsonb) to authenticated, service_role;
revoke all on function public._plantilla_nodos(jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public._plantilla_nodos(jsonb, jsonb, jsonb, jsonb) to authenticated, service_role;
revoke all on function public.validar_plantilla(jsonb, jsonb, jsonb, jsonb, text[]) from public, anon;
grant execute on function public.validar_plantilla(jsonb, jsonb, jsonb, jsonb, text[]) to authenticated, service_role;

-- Guardar el borrador valida la forma (la fórmula puede cambiar antes de publicar). El cuerpo es el de la base, con la validación en vez de su comprobación.
create or replace function public.plantilla_guardar_borrador(p_origen uuid, p_def jsonb, p_nota text default null::text) returns uuid
    language plpgsql security definer
    set search_path = ''
    as $$
declare v_id uuid;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  perform public.validar_plantilla(p_def, null, null, null, null);
  insert into public.plantillas_tarjeta (origen_id, estado, definicion, nota, creado_por) values (p_origen, 'borrador', p_def, p_nota, (select auth.uid()))
  on conflict (origen_id) where estado = 'borrador' do update set definicion = excluded.definicion, nota = excluded.nota returning id into v_id;
  return v_id;
end;
$$;

-- Publicar valida el borrador contra la fórmula publicada del origen y los tonos del catálogo, antes de archivar nada: un rechazo no cambia nada.
create or replace function public.plantilla_publicar(p_origen uuid, p_nota text) returns uuid
    language plpgsql security definer
    set search_path = ''
    as $$
declare v_borrador uuid; v_def jsonb; v_pub uuid; v_ver int; fo record;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  select id into v_pub from public.plantillas_tarjeta where origen_id = p_origen and estado = 'publicada';
  select id, definicion into v_borrador, v_def from public.plantillas_tarjeta where origen_id = p_origen and estado = 'borrador';
  if v_borrador is null then raise exception 'No hay borrador para publicar.' using errcode = '22023'; end if;
  select f.definicion, f.diseno, f.visibilidad into fo from public.formulas f where f.origen_id = p_origen and f.estado = 'publicada';
  if not found then perform public._formula_rechazar('formula_sin_publicar', 'origen', 'Publica la fórmula del origen antes que su plantilla.'); end if;
  perform public.validar_plantilla(v_def, fo.definicion, fo.diseno, fo.visibilidad, array(select t.clave from public.tonos t));
  select coalesce(max(version), 0) + 1 into v_ver from public.plantillas_tarjeta where origen_id = p_origen;
  update public.plantillas_tarjeta set estado = 'archivada' where id = v_pub;
  update public.plantillas_tarjeta set estado = 'publicada', version = v_ver, nota = p_nota, publicado_en = now() where id = v_borrador;
  return v_borrador;
end;
$$;
