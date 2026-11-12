-- 9.04-1 (9-3): los campos de los leads tienen su propia clave, `leads.campos.gestionar`. Hasta acá los gobernaba `leads.configurar`, que sigue para los
-- orígenes de lead, los tipos de lead y los tipos de seguimiento. La reciben el dueño y todo rol que hoy tenga `leads.configurar` (con «todos» y sin origen:
-- esa clave no va por origen ni por alcance): nadie pierde nada. Desde acá se separan. Las cinco `lead_campo_*` piden la nueva; nada más cambia.
-- La prueba: el bloque `leads.campos.gestionar` de `supabase/tests/configuracion-de-leads.sql` (vuelve a ejecutar este archivo: si se recrea con otra
-- fecha, se corrige su ruta en `DATOS_DE_PRUEBA` de `scripts/probar-schema.mjs`).

-- ---------------------------------------------------------------------------------------------------
-- La clave (la misma fila que `seed.sql`) y el texto de `leads.configurar`, que ya no habla de los campos.
-- ---------------------------------------------------------------------------------------------------
insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden) values
  ('leads.campos.gestionar', 'leads', 'Gestionar los campos de los leads', 'Crear, editar, ordenar y eliminar los campos de los leads, y decidir quién los ve',
   false, false, 'lead_campo_crear, lead_campo_guardar, lead_campo_eliminar, lead_campo_mover, lead_campo_impacto', 215)
on conflict (clave) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, por_origen = excluded.por_origen,
  con_alcance = excluded.con_alcance, aplicado_en = excluded.aplicado_en, modulo = excluded.modulo, orden = excluded.orden;

update public.permisos
   set descripcion = 'Los orígenes de lead, los tipos de lead y los tipos de seguimiento',
       aplicado_en = 'origen_lead_*, origenes_lead_con_uso, tipo_lead_*, tipos_lead_con_uso, tipo_seguimiento_*, tipos_seguimiento_con_uso'
 where clave = 'leads.configurar';

-- ---------------------------------------------------------------------------------------------------
-- A quién: el dueño y todo rol con alguna concesión de `leads.configurar`, con «todos» y sin origen. En un reset local (las migraciones corren antes del
-- seed) no hay roles todavía: el seed se la da al dueño con su `cross join`.
-- ---------------------------------------------------------------------------------------------------
do $$
declare v_nuevos text;
begin
  with concedidos as (
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    select r.id, 'leads.campos.gestionar', 'todos'::public.alcance_permiso
      from public.roles r
     where r.clave = 'dueno'
        or exists (select 1 from public.roles_permisos x where x.rol_id = r.id and x.permiso_clave = 'leads.configurar')
    on conflict do nothing
    returning rol_id)
  select string_agg(r.clave, ', ' order by r.clave) into v_nuevos from concedidos c join public.roles r on r.id = c.rol_id;
  raise notice 'leads.campos.gestionar concedido a los roles: %', coalesce(v_nuevos, '(ninguno nuevo)');
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Las cinco: la definición de la base (`20261028180656_base.sql`, ninguna migración las había redefinido) con la clave cambiada; mismas firmas, cuerpos,
-- mensajes y códigos. `create or replace` conserva el dueño y los grants.
-- ---------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."lead_campo_crear"("p_clave" "text", "p_etiqueta" "text", "p_tipo" "public"."tipo_campo", "p_opciones" "jsonb" DEFAULT '[]'::"jsonb", "p_requerido" boolean DEFAULT false, "p_grupo" "text" DEFAULT NULL::"text", "p_en_tabla" boolean DEFAULT false, "p_filtrable" boolean DEFAULT false, "p_solo_cartera" boolean DEFAULT NULL::boolean, "p_valor_defecto" "jsonb" DEFAULT NULL::"jsonb", "p_valor_defecto_empresa" "text" DEFAULT NULL::"text") RETURNS "jsonb"
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
  begin
    insert into public.leads_campos (clave, etiqueta, tipo, opciones, requerido, grupo, orden, en_tabla, filtrable,
                                     solo_cartera, es_sistema, valor_defecto, valor_defecto_empresa)
    values (p_clave, v_etiqueta, p_tipo, coalesce(p_opciones, '[]'::jsonb), coalesce(p_requerido, false), v_grupo,
            coalesce((select max(c.orden) + 10 from public.leads_campos c), 10),
            coalesce(p_en_tabla, false), coalesce(p_filtrable, false),
            coalesce(p_solo_cartera, p_tipo in ('correo', 'documento')), false, v_defecto, v_empresa)
    returning id, actualizado_en into v_id, v_version;
  exception when unique_violation then
    raise exception 'Ya hay un campo con la clave «%».', p_clave using errcode = '23505';
  end;
  return jsonb_build_object('id', v_id, 'actualizado_en', v_version);
end;
$_$;

CREATE OR REPLACE FUNCTION "public"."lead_campo_eliminar"("p_campo" "uuid", "p_actualizado_en_esperado" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare c public.leads_campos; v_con int;
begin
  perform public.assert_permiso('leads.campos.gestionar');
  select * into c from public.leads_campos x where x.id = p_campo for update;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este campo mientras lo editabas.');
  if c.es_sistema then
    raise exception '«%» es un campo de fábrica: no se elimina. Puedes desactivarlo.', c.etiqueta using errcode = '23503';
  end if;
  v_con := public._lead_campo_con_valor(c.clave);
  if v_con > 0 then
    raise exception '% % tienen un valor en «%». Desactívalo para conservarlo.',
      v_con, case when v_con = 1 then 'lead' else 'leads' end, c.etiqueta using errcode = '23503';
  end if;
  delete from public.leads_campos where id = p_campo;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."lead_campo_guardar"("p_campo" "uuid", "p_actualizado_en_esperado" timestamp with time zone, "p_cambios" "jsonb") RETURNS timestamp with time zone
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  c public.leads_campos; v_clave text; v_nueva timestamptz;
  v_editables constant text[] := array['etiqueta', 'tipo', 'opciones', 'requerido', 'grupo', 'en_tabla', 'filtrable',
    'solo_cartera', 'activo', 'valor_defecto', 'valor_defecto_empresa'];
  v_tipo public.tipo_campo; v_opciones jsonb; v_grupo text; v_con int; v_orden smallint; v_defecto jsonb; v_empresa text;
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

CREATE OR REPLACE FUNCTION "public"."lead_campo_impacto"("p_campo" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare c public.leads_campos;
begin
  perform public.assert_permiso('leads.campos.gestionar');
  select * into c from public.leads_campos x where x.id = p_campo;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  return public._campo_impacto(array(select l.atributos -> c.clave from public.leads l), c.tipo);
end;
$$;

CREATE OR REPLACE FUNCTION "public"."lead_campo_mover"("p_campo" "uuid", "p_actualizado_en_esperado" timestamp with time zone, "p_despues_de" "uuid" DEFAULT NULL::"uuid") RETURNS timestamp with time zone
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare c public.leads_campos; v_nueva timestamptz;
begin
  perform public.assert_permiso('leads.campos.gestionar');
  -- El orden es del layout entero: el candado hace que dos reordenamientos vayan en fila.
  lock table public.leads_campos in share row exclusive mode;
  select * into c from public.leads_campos x where x.id = p_campo for update;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este campo mientras lo editabas.');
  if p_despues_de is not null then
    if p_despues_de = p_campo then raise exception 'Un campo no puede ir después de sí mismo.'; end if;
    if not exists (select 1 from public.leads_campos x where x.id = p_despues_de) then
      raise exception 'Ese campo ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
    end if;
  end if;

  update public.leads_campos x set orden = n.orden_nuevo
  from public._campos_reordenar((
    select jsonb_agg(jsonb_build_object('id', y.id, 'clave', y.clave, 'orden', y.orden)) from public.leads_campos y),
    p_campo, p_despues_de) n
  where x.id = n.campo_id and x.orden <> n.orden_nuevo;

  select x.actualizado_en into v_nueva from public.leads_campos x where x.id = p_campo;
  return v_nueva;
end;
$$;
