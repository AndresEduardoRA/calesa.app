-- Orígenes: la única puerta de escritura de los orígenes, su layout de campos y sus categorías.
-- Escrito a mano. Las tres tablas son de sólo lectura para `authenticated`
-- (`…000200_rls_y_grants.sql`): acá se comprueba el permiso, la versión que tenía en pantalla quien
-- edita (`PT409`, obligatoria: ver `…001300_version_obligatoria.sql`) y las reglas de uso que un
-- CHECK no expresa (qué se puede quitar o cambiar cuando ya hay vehículos con ese dato).
--
-- Crear un origen es un solo INSERT: los triggers AFTER INSERT (`origen_crear_flujo`,
-- `origen_preconfigurar_campos`) corren en la misma transacción, así que o nace todo o no nace nada.

-- ---------------------------------------------------------------------------
-- Invariantes que no dependen de quién escribe
-- ---------------------------------------------------------------------------
-- El tipo decide, sólo al insertar, los campos preconfigurados, la regla `aduana` del flujo y el
-- mapeo con apibara. Cambiarlo después dejaría un origen con la mitad de cada mundo.
create or replace function public.origen_tipo_inmutable()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.tipo is distinct from old.tipo then
    raise exception 'El tipo de un origen no cambia una vez creado. Si te equivocaste y todavía no se usa, elimínalo y créalo de nuevo.';
  end if;
  return new;
end;
$$;
create trigger trg_origen_tipo_inmutable before update of tipo on public.origenes for each row execute function public.origen_tipo_inmutable();

-- `clave_apibara` sólo tiene sentido en un origen de subasta.
create or replace function public.origen_campo_validar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.clave_apibara is not null and (select o.tipo from public.origenes o where o.id = new.origen_id) <> 'subasta' then
    raise exception 'La clave de apibara sólo se usa en orígenes de subasta.';
  end if;
  return new;
end;
$$;
create trigger trg_origen_campo_validar before insert or update of clave_apibara on public.origenes_campos for each row execute function public.origen_campo_validar();

-- Un origen desactivado no recibe vehículos ni cotizaciones nuevos (la interfaz ya no lo ofrece;
-- esto lo vuelve cierto para quien escriba sin pasar por ella).
create or replace function public.origen_activo_requerido()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_origen public.origenes;
begin
  select * into v_origen from public.origenes o where o.id = new.origen_id;
  if found and not v_origen.activo then
    raise exception 'El origen «%» está desactivado: no recibe registros nuevos.', v_origen.nombre using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger trg_origen_activo_requerido before insert or update of origen_id on public.vehiculos for each row execute function public.origen_activo_requerido();
create trigger trg_origen_activo_requerido before insert or update of origen_id on public.cotizaciones for each row execute function public.origen_activo_requerido();

-- ---------------------------------------------------------------------------
-- Ayudas internas (nadie las llama desde la app)
-- ---------------------------------------------------------------------------
-- Claves que son columnas de `vehiculos`: un campo propio con ese nombre se prestaría a confusión.
create or replace function public._origen_clave_reservada(p_clave text)
returns boolean language sql immutable set search_path = '' as $$
  select p_clave = any (array['marca', 'modelo', 'anio', 'vin', 'lote', 'precio', 'precio_negociable', 'acepta_permuta',
    'placado', 'kilometraje', 'titulo', 'plataforma', 'url_origen', 'categoria_id', 'atributos']);
$$;
revoke all on function public._origen_clave_reservada(text) from public, anon, authenticated;

-- Opciones de un campo: [{clave, etiqueta}] con claves únicas y bien formadas.
create or replace function public._origen_opciones_validas(p_opciones jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare v_item jsonb; v_claves text[] := '{}'; v_clave text;
begin
  if p_opciones is null or jsonb_typeof(p_opciones) <> 'array' then
    raise exception 'Las opciones tienen que ser una lista.';
  end if;
  for v_item in select * from jsonb_array_elements(p_opciones) loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Cada opción necesita una clave y una etiqueta.';
    end if;
    v_clave := v_item ->> 'clave';
    if v_clave is null or v_clave !~ '^[a-z0-9][a-z0-9_]{0,40}$' then
      raise exception 'La clave de una opción usa minúsculas, números y guion bajo.';
    end if;
    if nullif(btrim(v_item ->> 'etiqueta'), '') is null then
      raise exception 'Cada opción necesita una etiqueta.';
    end if;
    if v_clave = any (v_claves) then
      raise exception 'Hay dos opciones con la clave «%».', v_clave;
    end if;
    v_claves := v_claves || v_clave;
  end loop;
end;
$$;
revoke all on function public._origen_opciones_validas(jsonb) from public, anon, authenticated;

-- ¿Un vehículo tiene valor en este atributo? Cuenta también los de la papelera.
create or replace function public._origen_vehiculos_con_valor(p_origen uuid, p_clave text)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.vehiculos v
  where v.origen_id = p_origen and v.atributos ? p_clave
    and (v.atributos -> p_clave) not in ('null'::jsonb, '""'::jsonb, '[]'::jsonb);
$$;
revoke all on function public._origen_vehiculos_con_valor(uuid, text) from public, anon, authenticated;

-- Deja `orden` en 10, 20, 30… respetando el orden actual. Sólo toca las filas que cambian de
-- número: así editar un campo no hace «conflictivos» a todos los vecinos.
create or replace function public._origen_campos_renumerar(p_origen uuid)
returns void language sql security definer set search_path = '' as $$
  update public.origenes_campos c set orden = n.nuevo
  from (select id, (row_number() over (order by orden, clave) * 10)::smallint as nuevo from public.origenes_campos where origen_id = p_origen) n
  where c.id = n.id and c.orden <> n.nuevo;
$$;
revoke all on function public._origen_campos_renumerar(uuid) from public, anon, authenticated;

create or replace function public._origen_nombre_valido(p_texto text, p_que text, p_largo int)
returns text language plpgsql immutable set search_path = '' as $$
declare v text := btrim(coalesce(p_texto, ''));
begin
  if v = '' then raise exception 'Falta %.', p_que; end if;
  if length(v) > p_largo then raise exception 'Máximo % caracteres para %.', p_largo, p_que; end if;
  return v;
end;
$$;
revoke all on function public._origen_nombre_valido(text, text, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Orígenes
-- ---------------------------------------------------------------------------
create or replace function public.origen_crear(
  p_clave text, p_nombre text, p_sustantivo text, p_genero public.genero_gramatical, p_tipo public.tipo_origen,
  p_color text default null, p_apibara_plataformas text[] default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_nombre text; v_sustantivo text; v_color text; v_plataformas text[] := coalesce(p_apibara_plataformas, '{}');
  v_id uuid; v_version timestamptz; v_constraint text;
begin
  perform public.assert_permiso('origenes.gestionar');
  v_nombre := public._origen_nombre_valido(p_nombre, 'el nombre del origen', 60);
  v_sustantivo := public._origen_nombre_valido(p_sustantivo, 'el sustantivo de lo que entra', 30);
  if p_clave is null or p_clave !~ '^[a-z][a-z0-9_]{1,30}$' then
    raise exception 'La clave interna del origen usa minúsculas, números y guion bajo, y empieza con una letra.';
  end if;
  v_color := lower(coalesce(p_color, '#465fff'));
  if v_color !~ '^#[0-9a-f]{6}$' then
    raise exception 'El color tiene que ser un valor hexadecimal como #465fff.';
  end if;
  if p_tipo <> 'subasta' and cardinality(v_plataformas) > 0 then
    raise exception 'Las plataformas de apibara sólo se eligen en un origen de subasta.';
  end if;
  if exists (select 1 from unnest(v_plataformas) x where x !~ '^[a-z][a-z0-9_]{1,20}$') then
    raise exception 'Una plataforma de apibara no es válida.';
  end if;
  begin
    insert into public.origenes (clave, nombre, sustantivo, genero, tipo, color, orden, apibara_plataformas)
    values (p_clave, v_nombre, lower(v_sustantivo), p_genero, p_tipo, v_color,
            coalesce((select max(o.orden) + 10 from public.origenes o), 0), v_plataformas)
    returning id, actualizado_en into v_id, v_version;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'origenes_clave_key' then
      raise exception 'Ya existe un origen con un nombre muy parecido a «%». Cámbialo un poco.', v_nombre using errcode = '23505';
    end if;
    raise exception 'Ya existe un origen llamado «%».', v_nombre using errcode = '23505';
  end;
  return jsonb_build_object('id', v_id, 'actualizado_en', v_version);
end;
$$;
revoke all on function public.origen_crear(text, text, text, public.genero_gramatical, public.tipo_origen, text, text[]) from public, anon;
grant execute on function public.origen_crear(text, text, text, public.genero_gramatical, public.tipo_origen, text, text[]) to authenticated;

-- Cambia sólo lo que viene. El tipo y la clave no se editan. Devuelve la versión nueva.
create or replace function public.origen_guardar(
  p_origen uuid, p_actualizado_en_esperado timestamptz,
  p_nombre text default null, p_sustantivo text default null, p_genero public.genero_gramatical default null,
  p_color text default null, p_activo boolean default null, p_apibara_plataformas text[] default null)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v public.origenes; v_nombre text; v_color text; v_nueva timestamptz; v_constraint text;
begin
  perform public.assert_permiso('origenes.gestionar');
  select * into v from public.origenes o where o.id = p_origen for update;
  if not found then raise exception 'Ese origen ya no existe.' using errcode = 'PT409'; end if;
  perform public._exigir_version(v.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este origen mientras lo editabas.');

  v_nombre := case when p_nombre is null then v.nombre else public._origen_nombre_valido(p_nombre, 'el nombre del origen', 60) end;
  v_color := lower(coalesce(p_color, v.color));
  if v_color !~ '^#[0-9a-f]{6}$' then
    raise exception 'El color tiene que ser un valor hexadecimal como #465fff.';
  end if;
  if p_apibara_plataformas is not null then
    if v.tipo <> 'subasta' and cardinality(p_apibara_plataformas) > 0 then
      raise exception 'Las plataformas de apibara sólo se eligen en un origen de subasta.';
    end if;
    if exists (select 1 from unnest(p_apibara_plataformas) x where x !~ '^[a-z][a-z0-9_]{1,20}$') then
      raise exception 'Una plataforma de apibara no es válida.';
    end if;
  end if;

  begin
    update public.origenes o set
      nombre = v_nombre,
      sustantivo = case when p_sustantivo is null then o.sustantivo else lower(public._origen_nombre_valido(p_sustantivo, 'el sustantivo de lo que entra', 30)) end,
      genero = coalesce(p_genero, o.genero),
      color = v_color,
      activo = coalesce(p_activo, o.activo),
      apibara_plataformas = coalesce(p_apibara_plataformas, o.apibara_plataformas)
    where o.id = p_origen
    returning o.actualizado_en into v_nueva;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    raise exception 'Ya existe un origen llamado «%».', v_nombre using errcode = '23505';
  end;

  -- El flujo nace llamándose «Logística <origen>»: si seguía así, acompaña al nombre nuevo.
  if v_nombre <> v.nombre then
    update public.flujos f set nombre = 'Logística ' || v_nombre
    where f.origen_id = p_origen and f.ambito = 'vehiculos' and f.nombre = 'Logística ' || v.nombre;
  end if;
  return v_nueva;
end;
$$;
revoke all on function public.origen_guardar(uuid, timestamptz, text, text, public.genero_gramatical, text, boolean, text[]) from public, anon;
grant execute on function public.origen_guardar(uuid, timestamptz, text, text, public.genero_gramatical, text, boolean, text[]) to authenticated;

-- Sólo un origen sin uso. Los campos, categorías, el flujo sin movimientos, las reglas, el borrador
-- de la fórmula y las concesiones de roles caen con él.
create or replace function public.origen_eliminar(p_origen uuid, p_actualizado_en_esperado timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.origenes; v_vehiculos int; v_cotizaciones int; v_movimientos int; v_formulas int; v_motivos text[] := '{}';
begin
  perform public.assert_permiso('origenes.gestionar');
  select * into v from public.origenes o where o.id = p_origen for update;
  if not found then raise exception 'Ese origen ya no existe.' using errcode = 'PT409'; end if;
  perform public._exigir_version(v.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este origen mientras lo editabas.');

  select count(*) into v_vehiculos from public.vehiculos x where x.origen_id = p_origen;
  select count(*) into v_cotizaciones from public.cotizaciones x where x.origen_id = p_origen;
  select count(*) into v_movimientos from public.historial_fases h join public.fases f on f.id = h.a_fase_id join public.flujos fl on fl.id = f.flujo_id where fl.origen_id = p_origen;
  select count(*) into v_formulas from public.formulas x where x.origen_id = p_origen and x.estado <> 'borrador';
  if v_vehiculos > 0 then v_motivos := v_motivos || (v_vehiculos || case when v_vehiculos = 1 then ' vehículo' else ' vehículos' end); end if;
  if v_cotizaciones > 0 then v_motivos := v_motivos || (v_cotizaciones || case when v_cotizaciones = 1 then ' cotización' else ' cotizaciones' end); end if;
  if v_movimientos > 0 then v_motivos := v_motivos || (v_movimientos || case when v_movimientos = 1 then ' movimiento de fase' else ' movimientos de fase' end); end if;
  if v_formulas > 0 then v_motivos := v_motivos || 'una fórmula publicada'::text; end if;
  if cardinality(v_motivos) > 0 then
    raise exception '«%» tiene %. Desactívalo en vez de eliminarlo.', v.nombre, array_to_string(v_motivos, ', ') using errcode = '23503';
  end if;
  delete from public.origenes where id = p_origen;
end;
$$;
revoke all on function public.origen_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.origen_eliminar(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Campos del layout
-- ---------------------------------------------------------------------------
create or replace function public.origen_campo_crear(
  p_origen uuid, p_clave text, p_etiqueta text, p_tipo public.tipo_campo, p_opciones jsonb default '[]'::jsonb,
  p_requerido boolean default false, p_grupo text default null, p_en_tarjeta boolean default false,
  p_filtrable boolean default false, p_publico_web boolean default false, p_clave_apibara text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_origen public.origenes; v_etiqueta text; v_grupo text := nullif(btrim(p_grupo), '');
  v_apibara text := nullif(btrim(p_clave_apibara), ''); v_id uuid; v_version timestamptz;
begin
  perform public.assert_permiso('origenes.gestionar');
  select * into v_origen from public.origenes o where o.id = p_origen for update;
  if not found then raise exception 'Ese origen ya no existe.' using errcode = 'PT409'; end if;
  if p_clave is null or p_clave !~ '^[a-z][a-z0-9_]{1,40}$' then
    raise exception 'La clave del campo usa minúsculas, números y guion bajo, y empieza con una letra.';
  end if;
  if public._origen_clave_reservada(p_clave) then
    raise exception '«%» ya es un dato común de todos los vehículos: no se crea como campo propio.', p_clave;
  end if;
  v_etiqueta := public._origen_nombre_valido(p_etiqueta, 'el nombre del campo', 60);
  perform public._origen_opciones_validas(coalesce(p_opciones, '[]'::jsonb));
  if p_tipo in ('opcion', 'multi_opcion') and jsonb_array_length(coalesce(p_opciones, '[]'::jsonb)) = 0 then
    raise exception 'Un campo de opciones necesita al menos una opción.';
  end if;
  if p_tipo not in ('opcion', 'multi_opcion') and jsonb_array_length(coalesce(p_opciones, '[]'::jsonb)) > 0 then
    raise exception 'Sólo un campo de opciones lleva opciones.';
  end if;
  if v_apibara is not null and v_origen.tipo <> 'subasta' then
    raise exception 'La clave de apibara sólo se usa en orígenes de subasta.';
  end if;
  if v_grupo is not null and length(v_grupo) > 40 then raise exception 'El nombre del grupo no puede pasar de 40 caracteres.'; end if;
  begin
    insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, opciones, requerido, grupo, orden, en_tarjeta, filtrable, publico_web, clave_apibara, es_sistema)
    values (p_origen, p_clave, v_etiqueta, p_tipo, coalesce(p_opciones, '[]'::jsonb), coalesce(p_requerido, false), v_grupo,
            coalesce((select max(c.orden) + 10 from public.origenes_campos c where c.origen_id = p_origen), 10),
            coalesce(p_en_tarjeta, false), coalesce(p_filtrable, false), coalesce(p_publico_web, false), v_apibara, false)
    returning id, actualizado_en into v_id, v_version;
  exception when unique_violation then
    raise exception 'Ya hay un campo con la clave «%» en este origen.', p_clave using errcode = '23505';
  end;
  return jsonb_build_object('id', v_id, 'actualizado_en', v_version);
end;
$$;
revoke all on function public.origen_campo_crear(uuid, text, text, public.tipo_campo, jsonb, boolean, text, boolean, boolean, boolean, text) from public, anon;
grant execute on function public.origen_campo_crear(uuid, text, text, public.tipo_campo, jsonb, boolean, text, boolean, boolean, boolean, text) to authenticated;

-- Lo que cambiaría una edición, contado antes de hacerla: la pantalla lo muestra y, al confirmar,
-- la misma regla vuelve a correr en `origen_campo_guardar`.
create or replace function public.origen_campo_impacto(p_campo uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c public.origenes_campos; v_total int; v_con int; v_por jsonb := '{}'::jsonb;
begin
  perform public.assert_permiso('origenes.gestionar');
  select * into c from public.origenes_campos x where x.id = p_campo;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  select count(*)::int into v_total from public.vehiculos v where v.origen_id = c.origen_id;
  v_con := public._origen_vehiculos_con_valor(c.origen_id, c.clave);
  if c.tipo = 'opcion' then
    select coalesce(jsonb_object_agg(t.valor, t.n), '{}'::jsonb) into v_por from (
      select v.atributos ->> c.clave as valor, count(*)::int as n from public.vehiculos v
      where v.origen_id = c.origen_id and v.atributos ? c.clave and (v.atributos -> c.clave) not in ('null'::jsonb, '""'::jsonb)
      group by 1) t;
  elsif c.tipo = 'multi_opcion' then
    select coalesce(jsonb_object_agg(t.valor, t.n), '{}'::jsonb) into v_por from (
      select e.valor, count(*)::int as n from public.vehiculos v
      cross join lateral jsonb_array_elements_text(case when jsonb_typeof(v.atributos -> c.clave) = 'array' then v.atributos -> c.clave else '[]'::jsonb end) as e (valor)
      where v.origen_id = c.origen_id and v.atributos ? c.clave
      group by 1) t;
  end if;
  return jsonb_build_object('total', v_total, 'con_valor', v_con, 'sin_valor', v_total - v_con, 'por_opcion', v_por);
end;
$$;
revoke all on function public.origen_campo_impacto(uuid) from public, anon;
grant execute on function public.origen_campo_impacto(uuid) to authenticated;

-- Cambia sólo las claves presentes en `p_cambios`; un valor nulo vacía la columna (grupo, clave de
-- apibara). Devuelve la versión nueva del campo.
create or replace function public.origen_campo_guardar(p_campo uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  c public.origenes_campos; v_origen public.origenes; v_clave text; v_nueva timestamptz;
  v_editables constant text[] := array['etiqueta', 'tipo', 'opciones', 'requerido', 'grupo', 'en_tarjeta', 'filtrable', 'publico_web', 'clave_apibara', 'activo'];
  v_tipo public.tipo_campo; v_opciones jsonb; v_grupo text; v_apibara text; v_con int; v_orden smallint;
begin
  perform public.assert_permiso('origenes.gestionar');
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Faltan los cambios a guardar.';
  end if;
  for v_clave in select jsonb_object_keys(p_cambios) loop
    if not (v_clave = any (v_editables)) then
      raise exception 'El dato «%» no se cambia desde el layout de campos.', v_clave;
    end if;
    if v_clave in ('etiqueta', 'tipo', 'opciones', 'requerido', 'en_tarjeta', 'filtrable', 'publico_web', 'activo') and p_cambios -> v_clave = 'null'::jsonb then
      raise exception 'El dato «%» no puede quedar vacío.', v_clave;
    end if;
  end loop;

  select * into c from public.origenes_campos x where x.id = p_campo for update;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este campo mientras lo editabas.');
  select * into v_origen from public.origenes o where o.id = c.origen_id;

  v_tipo := coalesce((p_cambios ->> 'tipo')::public.tipo_campo, c.tipo);
  if v_tipo is distinct from c.tipo then
    if c.es_sistema then
      raise exception 'El tipo de «%» no cambia: es un campo del sistema.', c.etiqueta;
    end if;
    v_con := public._origen_vehiculos_con_valor(c.origen_id, c.clave);
    if v_con > 0 then
      raise exception '% % ya tienen un valor en «%»: no se puede cambiar su tipo. Desactívalo y crea otro campo.',
        v_con, case when v_con = 1 then 'vehículo' else 'vehículos' end, c.etiqueta;
    end if;
  end if;

  v_opciones := coalesce(p_cambios -> 'opciones', c.opciones);
  if v_tipo not in ('opcion', 'multi_opcion') then
    v_opciones := '[]'::jsonb;
  else
    perform public._origen_opciones_validas(v_opciones);
  end if;

  v_grupo := case when p_cambios ? 'grupo' then nullif(btrim(p_cambios ->> 'grupo'), '') else c.grupo end;
  if v_grupo is not null and length(v_grupo) > 40 then raise exception 'El nombre del grupo no puede pasar de 40 caracteres.'; end if;
  v_apibara := case when p_cambios ? 'clave_apibara' then nullif(btrim(p_cambios ->> 'clave_apibara'), '') else c.clave_apibara end;
  if v_apibara is not null and v_origen.tipo <> 'subasta' then
    raise exception 'La clave de apibara sólo se usa en orígenes de subasta.';
  end if;

  -- Cambiar de grupo lo manda al final del grupo nuevo.
  v_orden := c.orden;
  if v_grupo is distinct from c.grupo then
    select max(x.orden) + 1 into v_orden from public.origenes_campos x
    where x.origen_id = c.origen_id and x.id <> c.id and x.grupo is not distinct from v_grupo;
    v_orden := coalesce(v_orden, (select coalesce(max(x.orden), 0) + 10 from public.origenes_campos x where x.origen_id = c.origen_id));
  end if;

  update public.origenes_campos x set
    etiqueta = case when p_cambios ? 'etiqueta' then public._origen_nombre_valido(p_cambios ->> 'etiqueta', 'el nombre del campo', 60) else x.etiqueta end,
    tipo = v_tipo,
    opciones = v_opciones,
    requerido = coalesce((p_cambios ->> 'requerido')::boolean, x.requerido),
    grupo = v_grupo,
    en_tarjeta = coalesce((p_cambios ->> 'en_tarjeta')::boolean, x.en_tarjeta),
    filtrable = coalesce((p_cambios ->> 'filtrable')::boolean, x.filtrable),
    publico_web = coalesce((p_cambios ->> 'publico_web')::boolean, x.publico_web),
    clave_apibara = v_apibara,
    activo = coalesce((p_cambios ->> 'activo')::boolean, x.activo),
    orden = v_orden
  where x.id = p_campo
  returning x.actualizado_en into v_nueva;
  if v_orden is distinct from c.orden then
    perform public._origen_campos_renumerar(c.origen_id);
  end if;
  return v_nueva;
end;
$$;
revoke all on function public.origen_campo_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.origen_campo_guardar(uuid, timestamptz, jsonb) to authenticated;

-- «Ponlo después de X» (nulo = primero). Relativo y no por posición: si alguien agregó un campo
-- entre tanto, el campo queda donde la persona lo quiso, junto a su vecino.
create or replace function public.origen_campo_mover(p_campo uuid, p_actualizado_en_esperado timestamptz, p_despues_de uuid default null)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare c public.origenes_campos; v_nueva timestamptz;
begin
  perform public.assert_permiso('origenes.gestionar');
  select * into c from public.origenes_campos x where x.id = p_campo;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  -- El orden es del origen entero: se bloquea el origen para que dos reordenamientos vayan en fila.
  perform 1 from public.origenes o where o.id = c.origen_id for update;
  select * into c from public.origenes_campos x where x.id = p_campo for update;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este campo mientras lo editabas.');
  if p_despues_de is not null then
    if p_despues_de = p_campo then raise exception 'Un campo no puede ir después de sí mismo.'; end if;
    if not exists (select 1 from public.origenes_campos x where x.id = p_despues_de and x.origen_id = c.origen_id) then
      raise exception 'Ese campo ya no está en este origen. Recarga e intenta de nuevo.' using errcode = 'PT409';
    end if;
  end if;

  update public.origenes_campos x set orden = n.nuevo
  from (
    select id, (row_number() over (order by posicion, clave) * 10)::smallint as nuevo from (
      select x.id, x.clave,
        case
          when x.id = p_campo then (case when p_despues_de is null then -1.0
                                         else (select y.orden from public.origenes_campos y where y.id = p_despues_de) + 0.5 end)
          else x.orden::numeric
        end as posicion
      from public.origenes_campos x where x.origen_id = c.origen_id
    ) q
  ) n
  where x.id = n.id and x.orden <> n.nuevo;

  select x.actualizado_en into v_nueva from public.origenes_campos x where x.id = p_campo;
  return v_nueva;
end;
$$;
revoke all on function public.origen_campo_mover(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.origen_campo_mover(uuid, timestamptz, uuid) to authenticated;

-- Sólo un campo propio que ningún vehículo usa. Si no, se desactiva y el dato se conserva.
create or replace function public.origen_campo_eliminar(p_campo uuid, p_actualizado_en_esperado timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.origenes_campos; v_con int;
begin
  perform public.assert_permiso('origenes.gestionar');
  select * into c from public.origenes_campos x where x.id = p_campo for update;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este campo mientras lo editabas.');
  if c.es_sistema then
    raise exception '«%» es un campo del sistema: no se elimina. Puedes desactivarlo.', c.etiqueta using errcode = '23503';
  end if;
  v_con := public._origen_vehiculos_con_valor(c.origen_id, c.clave);
  if v_con > 0 then
    raise exception '% % tienen un valor en «%». Desactívalo para conservarlo.',
      v_con, case when v_con = 1 then 'vehículo' else 'vehículos' end, c.etiqueta using errcode = '23503';
  end if;
  delete from public.origenes_campos where id = p_campo;
end;
$$;
revoke all on function public.origen_campo_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.origen_campo_eliminar(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Categorías (un solo nivel de anidado)
-- ---------------------------------------------------------------------------
create or replace function public.categoria_crear(p_origen uuid, p_nombre text, p_padre uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_nombre text; v_id uuid; v_version timestamptz;
begin
  perform public.assert_permiso('origenes.gestionar');
  perform 1 from public.origenes o where o.id = p_origen for update;
  if not found then raise exception 'Ese origen ya no existe.' using errcode = 'PT409'; end if;
  v_nombre := public._origen_nombre_valido(p_nombre, 'el nombre de la categoría', 60);
  if p_padre is not null then
    if not exists (select 1 from public.categorias x where x.id = p_padre and x.origen_id = p_origen) then
      raise exception 'La categoría padre ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
    end if;
    if exists (select 1 from public.categorias x where x.id = p_padre and x.padre_id is not null) then
      raise exception 'Las categorías tienen un solo nivel de anidado.';
    end if;
  end if;
  begin
    insert into public.categorias (origen_id, padre_id, nombre, orden)
    values (p_origen, p_padre, v_nombre,
            coalesce((select max(x.orden) + 10 from public.categorias x where x.origen_id = p_origen and x.padre_id is not distinct from p_padre), 10))
    returning id, actualizado_en into v_id, v_version;
  exception when unique_violation then
    raise exception 'Ya hay una categoría «%» en este lugar.', v_nombre using errcode = '23505';
  end;
  return jsonb_build_object('id', v_id, 'actualizado_en', v_version);
end;
$$;
revoke all on function public.categoria_crear(uuid, text, uuid) from public, anon;
grant execute on function public.categoria_crear(uuid, text, uuid) to authenticated;

create or replace function public.categoria_guardar(p_categoria uuid, p_actualizado_en_esperado timestamptz, p_nombre text default null, p_activa boolean default null)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare c public.categorias; v_nombre text; v_nueva timestamptz;
begin
  perform public.assert_permiso('origenes.gestionar');
  select * into c from public.categorias x where x.id = p_categoria for update;
  if not found then raise exception 'Esa categoría ya no existe.' using errcode = 'PT409'; end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió esta categoría mientras la editabas.');
  v_nombre := case when p_nombre is null then c.nombre else public._origen_nombre_valido(p_nombre, 'el nombre de la categoría', 60) end;
  if p_activa is false and exists (select 1 from public.categorias x where x.padre_id = p_categoria and x.activa) then
    raise exception 'Desactiva primero las subcategorías de «%».', c.nombre;
  end if;
  begin
    update public.categorias x set nombre = v_nombre, activa = coalesce(p_activa, x.activa)
    where x.id = p_categoria returning x.actualizado_en into v_nueva;
  exception when unique_violation then
    raise exception 'Ya hay una categoría «%» en este lugar.', v_nombre using errcode = '23505';
  end;
  return v_nueva;
end;
$$;
revoke all on function public.categoria_guardar(uuid, timestamptz, text, boolean) from public, anon;
grant execute on function public.categoria_guardar(uuid, timestamptz, text, boolean) to authenticated;

-- Entre hermanas (mismo origen y mismo padre). «Después de X», nulo = primera.
create or replace function public.categoria_mover(p_categoria uuid, p_actualizado_en_esperado timestamptz, p_despues_de uuid default null)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare c public.categorias; v_nueva timestamptz;
begin
  perform public.assert_permiso('origenes.gestionar');
  select * into c from public.categorias x where x.id = p_categoria;
  if not found then raise exception 'Esa categoría ya no existe.' using errcode = 'PT409'; end if;
  perform 1 from public.origenes o where o.id = c.origen_id for update;
  select * into c from public.categorias x where x.id = p_categoria for update;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió esta categoría mientras la editabas.');
  if p_despues_de is not null then
    if p_despues_de = p_categoria then raise exception 'Una categoría no puede ir después de sí misma.'; end if;
    if not exists (select 1 from public.categorias x where x.id = p_despues_de and x.origen_id = c.origen_id and x.padre_id is not distinct from c.padre_id) then
      raise exception 'Esa categoría ya no está en este lugar. Recarga e intenta de nuevo.' using errcode = 'PT409';
    end if;
  end if;

  update public.categorias x set orden = n.nuevo
  from (
    select id, (row_number() over (order by posicion, nombre) * 10)::smallint as nuevo from (
      select x.id, x.nombre,
        case
          when x.id = p_categoria then (case when p_despues_de is null then -1.0
                                             else (select y.orden from public.categorias y where y.id = p_despues_de) + 0.5 end)
          else x.orden::numeric
        end as posicion
      from public.categorias x where x.origen_id = c.origen_id and x.padre_id is not distinct from c.padre_id
    ) q
  ) n
  where x.id = n.id and x.orden <> n.nuevo;

  select x.actualizado_en into v_nueva from public.categorias x where x.id = p_categoria;
  return v_nueva;
end;
$$;
revoke all on function public.categoria_mover(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.categoria_mover(uuid, timestamptz, uuid) to authenticated;

create or replace function public.categoria_eliminar(p_categoria uuid, p_actualizado_en_esperado timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.categorias; v_vehiculos int; v_hijas int;
begin
  perform public.assert_permiso('origenes.gestionar');
  select * into c from public.categorias x where x.id = p_categoria for update;
  if not found then raise exception 'Esa categoría ya no existe.' using errcode = 'PT409'; end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió esta categoría mientras la editabas.');
  select count(*) into v_hijas from public.categorias x where x.padre_id = p_categoria;
  if v_hijas > 0 then
    raise exception '«%» tiene subcategorías: elimínalas primero.', c.nombre using errcode = '23503';
  end if;
  select count(*) into v_vehiculos from public.vehiculos v where v.categoria_id = p_categoria;
  if v_vehiculos > 0 then
    raise exception '% % están en «%». Desactívala para conservarlos agrupados.',
      v_vehiculos, case when v_vehiculos = 1 then 'vehículo' else 'vehículos' end, c.nombre using errcode = '23503';
  end if;
  delete from public.categorias where id = p_categoria;
end;
$$;
revoke all on function public.categoria_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.categoria_eliminar(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Lecturas: sólo conteos. Cuentan lo que RLS esconde (la papelera), por eso son DEFINER.
-- ---------------------------------------------------------------------------
-- Entra quien gestiona orígenes y quien configura lo que cuelga de ellos (flujo, fórmula).
create or replace function public.origenes_resumen()
returns table (origen_id uuid, vehiculos int, cotizaciones int, campos_activos int, categorias int, fases int, formula_publicada boolean, concesiones int)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_activo();
  if not (public.tiene_permiso('origenes.gestionar') or public.tiene_permiso('flujos.configurar') or public.tiene_permiso('cotizaciones.configurar')) then
    raise exception 'No tienes permiso para ver cómo está configurado cada origen.' using errcode = '42501';
  end if;
  return query
  select o.id,
    (select count(*)::int from public.vehiculos v where v.origen_id = o.id),
    (select count(*)::int from public.cotizaciones q where q.origen_id = o.id),
    (select count(*)::int from public.origenes_campos c where c.origen_id = o.id and c.activo),
    (select count(*)::int from public.categorias k where k.origen_id = o.id),
    (select count(*)::int from public.fases f join public.flujos fl on fl.id = f.flujo_id where fl.origen_id = o.id and f.activa),
    exists (select 1 from public.formulas fo where fo.origen_id = o.id and fo.estado = 'publicada'),
    (select count(*)::int from public.roles_permisos rp where rp.origen_id = o.id)
  from public.origenes o
  order by o.orden, o.nombre;
end;
$$;
revoke all on function public.origenes_resumen() from public, anon;
grant execute on function public.origenes_resumen() to authenticated;

create or replace function public.categorias_con_uso(p_origen uuid)
returns table (categoria_id uuid, vehiculos int)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_permiso('origenes.gestionar');
  return query
  select k.id, (select count(*)::int from public.vehiculos v where v.categoria_id = k.id)
  from public.categorias k where k.origen_id = p_origen;
end;
$$;
revoke all on function public.categorias_con_uso(uuid) from public, anon;
grant execute on function public.categorias_con_uso(uuid) to authenticated;
