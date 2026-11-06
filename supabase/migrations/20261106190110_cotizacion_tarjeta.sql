-- La lectura de la tarjeta (paso 4.18-1). docs/COTIZADOR.md › «La lectura de la tarjeta (4.18-1)».
-- `cotizacion_tarjeta(p_formula)` da lo que dibuja la tarjeta (y el PDF) de una versión de la fórmula: la plantilla publicada del origen, validada otra vez con
-- `validar_plantilla()` contra ESA versión (si ya no le sirve, `sin_plantilla`, sin motivo: el donde podría nombrar un nodo oculto), y de la fórmula sólo lo del
-- nivel «todos»: los grupos enteros con su etiqueta, plazo, bucket y tono; sus miembros con su etiqueta y su leyenda (la `descripcion`); el total y lo aparte; la
-- variante; los tipos de cambio por su nombre de `tipos_cambio` (nunca el id ni la clave del nodo); los tonos que usa como la hoja; y la moneda del total en Bs.
-- La pide `cotizaciones.ver` (cualquier alcance) del origen de la versión. Una versión que no existe y un borrador dan lo mismo que no tener el permiso.
-- Un tono que la plantilla elige y ya no está en el catálogo cae al del grupo (la lectura valida con `p_tonos` nulo; `tono_eliminar` no mira las plantillas).

-- Los grupos en el orden de la plantilla, cada uno con sus miembros en el orden de la fórmula. Recibe la definición ya leída (no lee `formulas`).
create function public._tarjeta_grupos(p_plantilla jsonb, p_def jsonb, p_tonos jsonb) returns jsonb
    language sql stable
    set search_path = ''
    as $$
  with dg as (
    select g ->> 'id' as id, g from jsonb_array_elements(coalesce(p_def -> 'grupos', '[]'::jsonb)) g
  ), filas as (
    select n ->> 'grupo' as grupo,
           jsonb_agg(jsonb_build_object(
             'nodo', n ->> 'id',
             'etiqueta', coalesce(p_plantilla -> 'etiquetas' ->> (n ->> 'id'), n ->> 'etiqueta'),
             -- La leyenda de la plantilla (vacía = sin leyenda) o la descripción del nodo.
             'leyenda', case when coalesce((p_plantilla -> 'leyendas') ? (n ->> 'id'), false) then nullif(p_plantilla -> 'leyendas' ->> (n ->> 'id'), '')
                             else n ->> 'descripcion' end) order by t.o) as filas
      from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) with ordinality t (n, o)
     where n ->> 'grupo' is not null
     group by n ->> 'grupo'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', pg.g ->> 'grupo',
           'etiqueta', dg.g ->> 'etiqueta',
           'plazo', dg.g -> 'plazo',
           -- El tono que elige la plantilla si sigue en el catálogo; si no, el del grupo.
           'tono', case when p_tonos ? (pg.g ->> 'tono') then pg.g ->> 'tono' when p_tonos ? (dg.g ->> 'tono') then dg.g ->> 'tono' end,
           'bucket', dg.g ->> 'bucket',
           'filas', coalesce(f.filas, '[]'::jsonb)) order by pg.o), '[]'::jsonb)
    from jsonb_array_elements(p_plantilla -> 'grupos') with ordinality pg (g, o)
    join dg on dg.id = pg.g ->> 'grupo'
    left join filas f on f.grupo = pg.g ->> 'grupo';
$$;

-- El nombre del tipo de cambio de cada bucket que usa un grupo, por omisión (`definicion.buckets`) y en cada modo del diseño; nulo si no hay uno activo con esa clave.
create function public._tarjeta_tipos_de_cambio(p_def jsonb, p_diseno jsonb, p_buckets text[]) returns jsonb
    language sql stable
    set search_path = ''
    as $$
  with nodos as (
    select coalesce(jsonb_object_agg(n ->> 'id', n ->> 'clave'), '{}'::jsonb) as m
      from jsonb_array_elements(coalesce(p_def -> 'nodos', '[]'::jsonb)) n where n ->> 'tipo' = 'tipo_cambio'
  ), tc as (
    select coalesce(jsonb_object_agg(t.clave, t.nombre), '{}'::jsonb) as m from public.tipos_cambio t where t.activo
  )
  select jsonb_build_object(
    'buckets', coalesce((select jsonb_object_agg(b, tc.m -> (nodos.m ->> (p_def -> 'buckets' ->> b))) from unnest(p_buckets) b), '{}'::jsonb),
    'modos', coalesce((select jsonb_object_agg(md ->> 'clave',
                                coalesce((select jsonb_object_agg(mb ->> 'bucket', tc.m -> (nodos.m ->> (mb ->> 'nodo')))
                                            from jsonb_array_elements(coalesce(md -> 'buckets', '[]'::jsonb)) mb where mb ->> 'bucket' = any (p_buckets)), '{}'::jsonb))
                         from jsonb_array_elements(coalesce(p_diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) md), '{}'::jsonb))
    from nodos, tc;
$$;

create function public.cotizacion_tarjeta(p_formula uuid) returns jsonb
    language plpgsql stable security definer
    set search_path = ''
    as $$
declare
  fo public.formulas; v_pla public.plantillas_tarjeta; v_p jsonb; v_nodos jsonb; v_total text; v_ton jsonb; v_grupos jsonb; v_opcion jsonb;
  v_claves text[]; v_buckets text[];
begin
  perform public.assert_activo();
  select * into fo from public.formulas f where f.id = p_formula;
  -- La inexistencia y el borrador se deciden antes del permiso (`tiene_permiso` con un origen nulo da verdadero) y dan lo mismo que no tenerlo.
  if not found or fo.estado = 'borrador' then raise exception 'No tienes acceso a esa versión de la fórmula.' using errcode = '42501'; end if;
  if not public.tiene_permiso('cotizaciones.ver', fo.origen_id) then raise exception 'No tienes acceso a esa versión de la fórmula.' using errcode = '42501'; end if;

  -- La publicada del origen (plantillas_publicada_unica), validada contra ESTA versión; sin tonos: uno borrado cae al del grupo.
  select * into v_pla from public.plantillas_tarjeta p where p.origen_id = fo.origen_id and p.estado = 'publicada';
  if not found then return jsonb_build_object('estado', 'sin_plantilla'); end if;
  begin
    perform public.validar_plantilla(v_pla.definicion, fo.definicion, fo.diseno, fo.visibilidad, null);
  exception when sqlstate '22023' then
    return jsonb_build_object('estado', 'sin_plantilla');
  end;

  v_p := v_pla.definicion;
  v_nodos := coalesce((select jsonb_object_agg(n ->> 'id', n) from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n), '{}'::jsonb);
  select n ->> 'id' into v_total from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n where n ->> 'salida' = 'total' limit 1;
  select n into v_opcion from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n where n ->> 'tipo' = 'opcion' limit 1;
  v_ton := coalesce((select jsonb_object_agg(t.clave, jsonb_build_object('clave', t.clave,
                                                    'claro', jsonb_build_object('fondo', t.claro_fondo, 'borde', t.claro_borde, 'tinta', t.claro_tinta),
                                                    'oscuro', jsonb_build_object('fondo', t.oscuro_fondo, 'borde', t.oscuro_borde, 'tinta', t.oscuro_tinta)))
                       from public.tonos t), '{}'::jsonb);
  v_grupos := public._tarjeta_grupos(v_p, fo.definicion, v_ton);
  v_claves := array(select distinct g ->> 'tono' from jsonb_array_elements(v_grupos) g where g ->> 'tono' is not null);
  v_buckets := array(select distinct g ->> 'bucket' from jsonb_array_elements(v_grupos) g where g ->> 'bucket' is not null);

  return jsonb_build_object(
    'estado', 'lista',
    'plantilla', jsonb_build_object('version', v_pla.version),
    'logo', v_p -> 'logo',
    'nota', v_p -> 'nota',
    'columnas', v_p -> 'columnas',
    'total', jsonb_build_object('nodo', v_total, 'etiqueta', v_p -> 'total' ->> 'etiqueta', 'leyenda', v_p -> 'total' ->> 'leyenda'),
    'secundarios', coalesce((select jsonb_agg(jsonb_build_object('nodo', x.s, 'etiqueta', coalesce(v_p -> 'etiquetas' ->> x.s, v_nodos -> x.s ->> 'etiqueta')) order by x.o)
                               from jsonb_array_elements_text(coalesce(fo.diseno -> 'tarjeta_total' -> 'secundarios', '[]'::jsonb)) with ordinality x (s, o)), '[]'::jsonb),
    'grupos', v_grupos,
    'tipos_de_cambio', case when (v_p -> 'columnas' ->> 'tipo_cambio')::boolean then public._tarjeta_tipos_de_cambio(fo.definicion, fo.diseno, v_buckets)
                            else '{"buckets": {}, "modos": {}}'::jsonb end,
    'variante', case when (fo.visibilidad -> (v_opcion ->> 'id') ->> 'ver') = 'todos'
                     then jsonb_build_object('nodo', v_opcion ->> 'id', 'opciones', coalesce((select jsonb_agg(jsonb_build_object('clave', x.v ->> 'clave', 'titulo', x.v ->> 'titulo') order by x.o)
                                                                                               from jsonb_array_elements(v_opcion -> 'opciones') with ordinality x (v, o)), '[]'::jsonb)) end,
    'tonos', coalesce((select jsonb_agg(v_ton -> c order by c collate "C") from unnest(v_claves) c), '[]'::jsonb),
    -- La moneda del total en Bs: la `moneda_a` del tipo de cambio activo que nombra el `total_en` de esta versión (la regla de la hoja).
    'moneda_bs', (select to_jsonb(t.moneda_a::text) from public.tipos_cambio t where t.activo and t.clave = (v_nodos -> (fo.definicion ->> 'total_en')) ->> 'clave'));
end;
$$;

revoke all on function public._tarjeta_grupos(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public._tarjeta_grupos(jsonb, jsonb, jsonb) to service_role;
revoke all on function public._tarjeta_tipos_de_cambio(jsonb, jsonb, text[]) from public, anon, authenticated;
grant execute on function public._tarjeta_tipos_de_cambio(jsonb, jsonb, text[]) to service_role;
revoke all on function public.cotizacion_tarjeta(uuid) from public, anon;
grant execute on function public.cotizacion_tarjeta(uuid) to authenticated, service_role;
