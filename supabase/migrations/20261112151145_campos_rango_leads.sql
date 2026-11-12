-- El rango en las RPC de campos de leads (9.04-2, 9-2). `lead_campo_crear` recibe `p_minimo`/`p_maximo` al final (con default),
-- `lead_campo_guardar` acepta `minimo`/`maximo` en `p_cambios` (null = sin límite) y `lead_campo_impacto(p_campo, p_cambios)` cuenta,
-- acotado a 51, los leads con un valor fuera del rango propuesto o del vigente. La regla es una sola (`_valor_fuera_de_rango`, de
-- `campos_rango`); un valor que ya estaba fuera no impide guardar, y cambiar el rango no toca ningún lead. Cuerpos copiados de su
-- definición vigente (`20261112102408_leads_campos_gestionar.sql`), con la misma clave y los mismos mensajes. También crea las dos
-- ayudas que usan las RPC de orígenes (`campos_rango_origenes`).

-- Un límite de `p_cambios`: el vigente si no viene la clave, null si viene null, el número si es un número; si no, 22023.
create function public._campo_limite(p_cambios jsonb, p_clave text, p_vigente numeric) returns numeric
    language plpgsql immutable
    set search_path = ''
    as $$
begin
  if p_cambios is null or not p_cambios ? p_clave then return p_vigente; end if;
  if p_cambios -> p_clave = 'null'::jsonb then return null; end if;
  if jsonb_typeof(p_cambios -> p_clave) <> 'number' then
    raise exception 'El % tiene que ser un número.', case when p_clave = 'minimo' then 'mínimo' else 'máximo' end
      using errcode = '22023', hint = p_clave;
  end if;
  return (p_cambios ->> p_clave)::numeric;
end;
$$;

-- El rango de un campo, antes de guardarlo: sólo en un número o un monto, con el tope de siempre (1e12), mínimo ≤ máximo, y el
-- valor por defecto adentro (si no, precargaría un valor que no se puede guardar). Todo 22023 con su hint.
create function public._campo_rango(p_tipo public.tipo_campo, p_minimo numeric, p_maximo numeric, p_defecto jsonb) returns void
    language plpgsql immutable
    set search_path = ''
    as $$
begin
  if p_minimo is null and p_maximo is null then return; end if;
  if p_tipo not in ('numero', 'moneda') then
    raise exception 'Sólo un número o un monto lleva mínimo y máximo.' using errcode = '22023', hint = 'minimo';
  end if;
  if abs(p_minimo) > 1000000000000 then
    raise exception 'El mínimo es demasiado grande.' using errcode = '22023', hint = 'minimo';
  end if;
  if abs(p_maximo) > 1000000000000 then
    raise exception 'El máximo es demasiado grande.' using errcode = '22023', hint = 'maximo';
  end if;
  if p_minimo > p_maximo then
    raise exception 'El mínimo no puede ser mayor que el máximo.' using errcode = '22023', hint = 'maximo';
  end if;
  if public._valor_fuera_de_rango(p_defecto, p_minimo, p_maximo) then
    raise exception 'El valor por defecto queda fuera del rango.' using errcode = '22023', hint = 'valor_defecto';
  end if;
end;
$$;

revoke all on function public._campo_limite(jsonb, text, numeric) from public, anon, authenticated;
revoke all on function public._campo_rango(public.tipo_campo, numeric, numeric, jsonb) from public, anon, authenticated;

-- Cambia la firma: la vieja se borra (una sobrecarga viva seguiría llamable sin el rango).
drop function public.lead_campo_crear(text, text, public.tipo_campo, jsonb, boolean, text, boolean, boolean, boolean, jsonb, text);
drop function public.lead_campo_impacto(uuid);

CREATE FUNCTION "public"."lead_campo_crear"("p_clave" "text", "p_etiqueta" "text", "p_tipo" "public"."tipo_campo", "p_opciones" "jsonb" DEFAULT '[]'::"jsonb", "p_requerido" boolean DEFAULT false, "p_grupo" "text" DEFAULT NULL::"text", "p_en_tabla" boolean DEFAULT false, "p_filtrable" boolean DEFAULT false, "p_solo_cartera" boolean DEFAULT NULL::boolean, "p_valor_defecto" "jsonb" DEFAULT NULL::"jsonb", "p_valor_defecto_empresa" "text" DEFAULT NULL::"text", "p_minimo" numeric DEFAULT NULL, "p_maximo" numeric DEFAULT NULL) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_etiqueta text; v_grupo text := nullif(btrim(p_grupo), ''); v_id uuid; v_version timestamptz;
  v_defecto jsonb; v_empresa text;
begin
  perform public.assert_permiso('leads.campos.gestionar');
  -- El orden es del layout entero: el candado también ordena el «último + 10» de dos altas a la vez.
  lock table public.leads_campos in share row exclusive mode;
  if p_clave is null or p_clave !~ '^[a-z][a-z0-9_]{1,40}$' then
    raise exception 'La clave del campo usa minúsculas, números y guion bajo, y empieza con una letra.';
  end if;
  if public._lead_clave_reservada(p_clave) then
    raise exception '«%» ya es un dato fijo de todos los leads: no se crea como campo propio.', p_clave;
  end if;
  if p_tipo in ('vin', 'lote') then
    raise exception 'Un lead no lleva campos de ese tipo.';
  end if;
  v_etiqueta := public._campo_nombre_valido(p_etiqueta, 'el nombre del campo', 60);
  perform public._campo_opciones_validas(coalesce(p_opciones, '[]'::jsonb));
  if p_tipo in ('opcion', 'multi_opcion') and jsonb_array_length(coalesce(p_opciones, '[]'::jsonb)) = 0 then
    raise exception 'Un campo de opciones necesita al menos una opción.';
  end if;
  if p_tipo not in ('opcion', 'multi_opcion') and jsonb_array_length(coalesce(p_opciones, '[]'::jsonb)) > 0 then
    raise exception 'Sólo un campo de opciones lleva opciones.';
  end if;
  if v_grupo is not null and length(v_grupo) > 40 then raise exception 'El nombre del grupo no puede pasar de 40 caracteres.'; end if;
  v_defecto := public._campo_valor_defecto(p_tipo, coalesce(p_opciones, '[]'::jsonb), p_valor_defecto);
  v_empresa := public._lead_defecto_empresa(p_tipo, v_defecto, p_valor_defecto_empresa);
  perform public._campo_rango(p_tipo, p_minimo, p_maximo, v_defecto);
  begin
    insert into public.leads_campos (clave, etiqueta, tipo, opciones, requerido, grupo, orden, en_tabla, filtrable,
                                     solo_cartera, es_sistema, valor_defecto, valor_defecto_empresa, minimo, maximo)
    values (p_clave, v_etiqueta, p_tipo, coalesce(p_opciones, '[]'::jsonb), coalesce(p_requerido, false), v_grupo,
            coalesce((select max(c.orden) + 10 from public.leads_campos c), 10),
            coalesce(p_en_tabla, false), coalesce(p_filtrable, false),
            coalesce(p_solo_cartera, p_tipo in ('correo', 'documento')), false, v_defecto, v_empresa, p_minimo, p_maximo)
    returning id, actualizado_en into v_id, v_version;
  exception when unique_violation then
    raise exception 'Ya hay un campo con la clave «%».', p_clave using errcode = '23505';
  end;
  return jsonb_build_object('id', v_id, 'actualizado_en', v_version);
end;
$_$;

-- Misma firma: `create or replace` conserva sus grants.
CREATE OR REPLACE FUNCTION "public"."lead_campo_guardar"("p_campo" "uuid", "p_actualizado_en_esperado" timestamp with time zone, "p_cambios" "jsonb") RETURNS timestamp with time zone
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  c public.leads_campos; v_clave text; v_nueva timestamptz;
  v_editables constant text[] := array['etiqueta', 'tipo', 'opciones', 'requerido', 'grupo', 'en_tabla', 'filtrable',
    'solo_cartera', 'activo', 'valor_defecto', 'valor_defecto_empresa', 'minimo', 'maximo'];
  v_tipo public.tipo_campo; v_opciones jsonb; v_grupo text; v_con int; v_orden smallint; v_defecto jsonb; v_empresa text;
  v_minimo numeric; v_maximo numeric;
  v_privado boolean := (p_cambios ->> 'solo_cartera')::boolean; v_pendiente boolean;
begin
  perform public.assert_permiso('leads.campos.gestionar');
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Faltan los cambios a guardar.';
  end if;
  for v_clave in select jsonb_object_keys(p_cambios) loop
    if not (v_clave = any (v_editables)) then
      raise exception 'El dato «%» no se cambia desde el layout de campos.', v_clave;
    end if;
    if v_clave in ('etiqueta', 'tipo', 'opciones', 'requerido', 'en_tabla', 'filtrable', 'solo_cartera', 'activo')
       and p_cambios -> v_clave = 'null'::jsonb then
      raise exception 'El dato «%» no puede quedar vacío.', v_clave;
    end if;
  end loop;

  lock table public.leads_campos in share row exclusive mode;
  select * into c from public.leads_campos x where x.id = p_campo for update;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este campo mientras lo editabas.');

  v_tipo := coalesce((p_cambios ->> 'tipo')::public.tipo_campo, c.tipo);
  if v_tipo is distinct from c.tipo then
    if c.es_sistema then
      raise exception 'El tipo de «%» no cambia: es un campo de fábrica.', c.etiqueta;
    end if;
    if v_tipo in ('vin', 'lote') then
      raise exception 'Un lead no lleva campos de ese tipo.';
    end if;
    v_con := public._lead_campo_con_valor(c.clave);
    if v_con > 0 then
      raise exception '% % ya tienen un valor en «%»: no se puede cambiar su tipo. Desactívalo y crea otro campo.',
        v_con, case when v_con = 1 then 'lead' else 'leads' end, c.etiqueta;
    end if;
  end if;

  v_opciones := coalesce(p_cambios -> 'opciones', c.opciones);
  if v_tipo not in ('opcion', 'multi_opcion') then
    v_opciones := '[]'::jsonb;
  else
    perform public._campo_opciones_validas(v_opciones);
    if jsonb_array_length(v_opciones) = 0 then
      raise exception 'Un campo de opciones necesita al menos una opción.';
    end if;
  end if;

  if p_cambios ? 'valor_defecto' then
    v_defecto := public._campo_valor_defecto(v_tipo, v_opciones, p_cambios -> 'valor_defecto');
  elsif v_tipo is distinct from c.tipo then
    v_defecto := null;
  else
    begin
      v_defecto := public._campo_valor_defecto(v_tipo, v_opciones, c.valor_defecto);
    exception when invalid_parameter_value then
      v_defecto := null;
    end;
  end if;

  -- El rango: lo que se manda (null = sin límite) o el vigente; si el tipo deja de ser numérico, se va solo, como las opciones.
  v_minimo := public._campo_limite(p_cambios, 'minimo', case when v_tipo in ('numero', 'moneda') then c.minimo end);
  v_maximo := public._campo_limite(p_cambios, 'maximo', case when v_tipo in ('numero', 'moneda') then c.maximo end);
  perform public._campo_rango(v_tipo, v_minimo, v_maximo, v_defecto);

  -- «La de la empresa»: si ahora hay un valor fijo se va solo; si el tipo ya no es texto, también.
  if p_cambios ? 'valor_defecto_empresa' then
    v_empresa := public._lead_defecto_empresa(v_tipo, v_defecto, p_cambios ->> 'valor_defecto_empresa');
  elsif v_tipo <> 'texto' or v_defecto is not null then
    v_empresa := null;
  else
    v_empresa := c.valor_defecto_empresa;
  end if;

  v_grupo := case when p_cambios ? 'grupo' then nullif(btrim(p_cambios ->> 'grupo'), '') else c.grupo end;
  if v_grupo is not null and length(v_grupo) > 40 then raise exception 'El nombre del grupo no puede pasar de 40 caracteres.'; end if;

  -- Cambiar de grupo lo manda al final del grupo nuevo.
  v_orden := c.orden;
  if v_grupo is distinct from c.grupo then
    select max(x.orden) + 1 into v_orden from public.leads_campos x where x.id <> c.id and x.grupo is not distinct from v_grupo;
    v_orden := coalesce(v_orden, (select coalesce(max(x.orden), 0) + 10 from public.leads_campos x));
  end if;

  update public.leads_campos x set
    etiqueta = case when p_cambios ? 'etiqueta' then public._campo_nombre_valido(p_cambios ->> 'etiqueta', 'el nombre del campo', 60) else x.etiqueta end,
    tipo = v_tipo,
    opciones = v_opciones,
    requerido = coalesce((p_cambios ->> 'requerido')::boolean, x.requerido),
    grupo = v_grupo,
    en_tabla = coalesce((p_cambios ->> 'en_tabla')::boolean, x.en_tabla),
    filtrable = coalesce((p_cambios ->> 'filtrable')::boolean, x.filtrable),
    -- 9h: pasar a privado no cambia `solo_cartera` hasta quitar la clave de los atributos públicos de todos los leads
    -- (por lotes, `_lead_campo_privacidad_lote`); pasar a público es inmediato y deja completar los atributos públicos.
    solo_cartera = case when v_privado is null or v_privado then x.solo_cartera else false end,
    solo_cartera_pendiente = case
      when v_privado is null then x.solo_cartera_pendiente
      when v_privado and x.solo_cartera and x.solo_cartera_pendiente is null then null
      when v_privado then true
      when not x.solo_cartera and x.solo_cartera_pendiente is null then null
      else false end,
    activo = coalesce((p_cambios ->> 'activo')::boolean, x.activo),
    valor_defecto = v_defecto,
    valor_defecto_empresa = v_empresa,
    minimo = v_minimo,
    maximo = v_maximo,
    orden = v_orden
  where x.id = p_campo
  returning x.actualizado_en, x.solo_cartera_pendiente into v_nueva, v_pendiente;
  if v_orden is distinct from c.orden then
    perform public._lead_campos_renumerar();
  end if;
  -- El primer lote, en esta misma llamada: una base chica termina acá. Lo que quede lo sigue el job.
  if v_pendiente is not null then
    perform public._lead_campo_privacidad_lote(p_campo, 5000);
  end if;
  return v_nueva;
end;
$$;

CREATE FUNCTION "public"."lead_campo_impacto"("p_campo" "uuid", "p_cambios" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare c public.leads_campos; v_min numeric; v_max numeric; v_fuera int;
begin
  perform public.assert_permiso('leads.campos.gestionar');
  if p_cambios is not null and jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Faltan los cambios a medir.' using errcode = '22023';
  end if;
  select * into c from public.leads_campos x where x.id = p_campo;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  -- Los fuera del rango propuesto (o del vigente), con tope 50 y uno de más; null si el campo no es numérico o no tiene límites.
  v_min := public._campo_limite(coalesce(p_cambios, '{}'::jsonb), 'minimo', c.minimo);
  v_max := public._campo_limite(coalesce(p_cambios, '{}'::jsonb), 'maximo', c.maximo);
  if c.tipo in ('numero', 'moneda') and (v_min is not null or v_max is not null) then
    select count(*)::int into v_fuera from (
      select 1 from public.leads l where public._valor_fuera_de_rango(l.atributos -> c.clave, v_min, v_max) limit 51) q;
  end if;
  return public._campo_impacto(array(select l.atributos -> c.clave from public.leads l), c.tipo)
         || jsonb_build_object('fuera_de_rango', v_fuera);
end;
$$;

revoke all on function public.lead_campo_crear(text, text, public.tipo_campo, jsonb, boolean, text, boolean, boolean, boolean, jsonb, text, numeric, numeric) from public, anon;
grant execute on function public.lead_campo_crear(text, text, public.tipo_campo, jsonb, boolean, text, boolean, boolean, boolean, jsonb, text, numeric, numeric) to authenticated, service_role;
revoke all on function public.lead_campo_impacto(uuid, jsonb) from public, anon;
grant execute on function public.lead_campo_impacto(uuid, jsonb) to authenticated, service_role;
