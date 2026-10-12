-- Empresa: la única puerta de escritura de los ajustes, las monedas, los tipos de cambio y las
-- integraciones. Escrito a mano. Las tablas son de sólo lectura para `authenticated`
-- (`…000200_rls_y_grants.sql`): acá se comprueba el permiso, la versión que tenía en pantalla quien
-- edita (`PT409`), y las reglas que un CHECK no expresa.

-- `p_esperado` nulo salta el control: es para el seed y las pruebas, la app siempre lo manda.
create or replace function public._exigir_version(p_actual timestamptz, p_esperado timestamptz, p_mensaje text)
returns void language plpgsql set search_path = '' as $$
begin
  if p_esperado is not null and p_actual is distinct from p_esperado then
    raise exception '%', p_mensaje using errcode = 'PT409';
  end if;
end;
$$;
revoke all on function public._exigir_version(timestamptz, timestamptz, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Ajustes de la empresa (fila única)
-- ---------------------------------------------------------------------------
-- Los montos se guardan en la moneda base: con algo cargado, cambiarla los dejaría mal expresados.
-- Cuenta también lo que está en la papelera.
create or replace function public.empresa_con_datos_cargados()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.vehiculos)
      or exists (select 1 from public.cotizaciones)
      or exists (select 1 from public.gastos)
      or exists (select 1 from public.pagos)
      or exists (select 1 from public.repuestos_compras)
      or exists (select 1 from public.repuestos_cotizaciones);
$$;
revoke all on function public.empresa_con_datos_cargados() from public, anon;
grant execute on function public.empresa_con_datos_cargados() to authenticated;

-- Cambia sólo las claves presentes en `p_cambios`. Un valor nulo vacía la columna (quitar el logo,
-- volver a los íconos neutros); una clave ausente no la toca. Devuelve la versión nueva.
create or replace function public.empresa_guardar_ajustes(p_cambios jsonb, p_actualizado_en_esperado timestamptz)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v public.ajustes_empresa;
  v_clave text;
  v_nueva timestamptz;
  v_editables constant text[] := array['nombre', 'razon_social', 'nit', 'direccion', 'ciudad', 'pais', 'telefono', 'whatsapp', 'email',
    'logo_ruta', 'color_acento', 'iconos', 'locale', 'zona_horaria', 'moneda_base', 'registro_abierto', 'papelera_dias', 'actividad_dias'];
  v_obligatorias constant text[] := array['nombre', 'pais', 'locale', 'zona_horaria', 'moneda_base', 'registro_abierto', 'papelera_dias', 'actividad_dias'];
begin
  perform public.assert_permiso('empresa.ajustes.gestionar');
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Faltan los cambios a guardar.';
  end if;
  for v_clave in select jsonb_object_keys(p_cambios) loop
    if not (v_clave = any (v_editables)) then
      raise exception 'El dato «%» no se cambia desde los ajustes de la empresa.', v_clave;
    end if;
    if v_clave = any (v_obligatorias) and nullif(btrim(p_cambios ->> v_clave), '') is null then
      raise exception 'El dato «%» no puede quedar vacío.', v_clave;
    end if;
  end loop;

  select * into v from public.ajustes_empresa where id = 1 for update;
  perform public._exigir_version(v.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió los ajustes de la empresa mientras los editabas.');

  if p_cambios ? 'zona_horaria' then
    begin
      perform now() at time zone (p_cambios ->> 'zona_horaria');
    exception when others then
      raise exception 'La zona horaria «%» no existe.', p_cambios ->> 'zona_horaria';
    end;
  end if;
  if p_cambios ? 'iconos' and jsonb_typeof(p_cambios -> 'iconos') not in ('object', 'null') then
    raise exception 'Los íconos no tienen la forma esperada.';
  end if;
  if p_cambios ? 'moneda_base' and (p_cambios ->> 'moneda_base') is distinct from v.moneda_base::text then
    if not exists (select 1 from public.monedas m where m.codigo::text = p_cambios ->> 'moneda_base' and m.activa) then
      raise exception 'La moneda base tiene que ser una de las monedas activas.';
    end if;
    if public.empresa_con_datos_cargados() then
      raise exception 'La moneda base no se cambia con datos cargados: los montos ya están guardados en %.', v.moneda_base;
    end if;
  end if;

  update public.ajustes_empresa e set
    nombre = case when p_cambios ? 'nombre' then btrim(p_cambios ->> 'nombre') else e.nombre end,
    razon_social = case when p_cambios ? 'razon_social' then nullif(btrim(p_cambios ->> 'razon_social'), '') else e.razon_social end,
    nit = case when p_cambios ? 'nit' then nullif(btrim(p_cambios ->> 'nit'), '') else e.nit end,
    direccion = case when p_cambios ? 'direccion' then nullif(btrim(p_cambios ->> 'direccion'), '') else e.direccion end,
    ciudad = case when p_cambios ? 'ciudad' then nullif(btrim(p_cambios ->> 'ciudad'), '') else e.ciudad end,
    pais = case when p_cambios ? 'pais' then btrim(p_cambios ->> 'pais') else e.pais end,
    telefono = case when p_cambios ? 'telefono' then nullif(btrim(p_cambios ->> 'telefono'), '') else e.telefono end,
    whatsapp = case when p_cambios ? 'whatsapp' then nullif(btrim(p_cambios ->> 'whatsapp'), '') else e.whatsapp end,
    email = case when p_cambios ? 'email' then nullif(btrim(p_cambios ->> 'email'), '') else e.email end,
    logo_ruta = case when p_cambios ? 'logo_ruta' then nullif(p_cambios ->> 'logo_ruta', '') else e.logo_ruta end,
    color_acento = case when p_cambios ? 'color_acento' then nullif(lower(p_cambios ->> 'color_acento'), '') else e.color_acento end,
    iconos = case when p_cambios ? 'iconos' then nullif(p_cambios -> 'iconos', 'null'::jsonb) else e.iconos end,
    locale = case when p_cambios ? 'locale' then btrim(p_cambios ->> 'locale') else e.locale end,
    zona_horaria = case when p_cambios ? 'zona_horaria' then btrim(p_cambios ->> 'zona_horaria') else e.zona_horaria end,
    moneda_base = case when p_cambios ? 'moneda_base' then (p_cambios ->> 'moneda_base')::char(3) else e.moneda_base end,
    registro_abierto = case when p_cambios ? 'registro_abierto' then (p_cambios ->> 'registro_abierto')::boolean else e.registro_abierto end,
    papelera_dias = case when p_cambios ? 'papelera_dias' then (p_cambios ->> 'papelera_dias')::int else e.papelera_dias end,
    actividad_dias = case when p_cambios ? 'actividad_dias' then (p_cambios ->> 'actividad_dias')::int else e.actividad_dias end,
    actualizado_por = (select auth.uid())
  where e.id = 1
  returning e.actualizado_en into v_nueva;
  return v_nueva;
end;
$$;
revoke all on function public.empresa_guardar_ajustes(jsonb, timestamptz) from public, anon;
grant execute on function public.empresa_guardar_ajustes(jsonb, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Monedas
-- ---------------------------------------------------------------------------
create or replace function public.moneda_crear(p_codigo text, p_nombre text, p_simbolo text, p_decimales int default 2)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v_codigo text := upper(btrim(coalesce(p_codigo, '')));
  v_nueva timestamptz;
begin
  perform public.assert_permiso('empresa.tipos_cambio.gestionar');
  if v_codigo !~ '^[A-Z]{3}$' then
    raise exception 'El código de la moneda son tres letras, como USD.';
  end if;
  if nullif(btrim(p_nombre), '') is null or nullif(btrim(p_simbolo), '') is null then
    raise exception 'La moneda necesita un nombre y un símbolo.';
  end if;
  if exists (select 1 from public.monedas m where m.codigo::text = v_codigo) then
    raise exception 'Ya existe la moneda %.', v_codigo using errcode = '23505';
  end if;
  insert into public.monedas (codigo, nombre, simbolo, decimales, orden)
  values (v_codigo, btrim(p_nombre), btrim(p_simbolo), coalesce(p_decimales, 2),
          (select coalesce(max(m.orden), -1) + 1 from public.monedas m))
  returning actualizado_en into v_nueva;
  return v_nueva;
end;
$$;
revoke all on function public.moneda_crear(text, text, text, int) from public, anon;
grant execute on function public.moneda_crear(text, text, text, int) to authenticated;

-- Un parámetro nulo no toca esa columna. El código no cambia: lo referencian los montos.
create or replace function public.moneda_guardar(p_codigo text, p_actualizado_en_esperado timestamptz, p_nombre text default null, p_simbolo text default null, p_decimales int default null, p_activa boolean default null)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v public.monedas;
  v_nueva timestamptz;
begin
  perform public.assert_permiso('empresa.tipos_cambio.gestionar');
  select * into v from public.monedas m where m.codigo::text = upper(btrim(p_codigo)) for update;
  if not found then
    raise exception 'Esa moneda ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(v.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió esta moneda mientras la editabas.');
  if p_activa = false and v.activa then
    if exists (select 1 from public.ajustes_empresa e where e.id = 1 and e.moneda_base = v.codigo) then
      raise exception 'La moneda base no se desactiva.';
    end if;
    if exists (select 1 from public.tipos_cambio t where t.activo and (t.moneda_de = v.codigo or t.moneda_a = v.codigo)) then
      raise exception 'Desactiva primero los tipos de cambio que usan %.', v.codigo;
    end if;
  end if;
  update public.monedas m set
    nombre = coalesce(nullif(btrim(p_nombre), ''), m.nombre),
    simbolo = coalesce(nullif(btrim(p_simbolo), ''), m.simbolo),
    decimales = coalesce(p_decimales, m.decimales),
    activa = coalesce(p_activa, m.activa)
  where m.codigo = v.codigo
  returning m.actualizado_en into v_nueva;
  return v_nueva;
end;
$$;
revoke all on function public.moneda_guardar(text, timestamptz, text, text, int, boolean) from public, anon;
grant execute on function public.moneda_guardar(text, timestamptz, text, text, int, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Tipos de cambio: un valor vigente por clave; el historial lo escribe el trigger
-- ---------------------------------------------------------------------------
-- El primero entre dos monedas nace por defecto. La clave no cambia después: la nombran las
-- fórmulas (`buckets`) y las cotizaciones guardadas.
create or replace function public.tipo_cambio_crear(p_clave text, p_nombre text, p_moneda_de text, p_moneda_a text, p_valor numeric)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_clave text := lower(btrim(coalesce(p_clave, '')));
  v_de text := upper(btrim(coalesce(p_moneda_de, '')));
  v_a text := upper(btrim(coalesce(p_moneda_a, '')));
  v_id uuid;
begin
  perform public.assert_permiso('empresa.tipos_cambio.gestionar');
  if v_clave !~ '^[a-z][a-z0-9_]{1,30}$' then
    raise exception 'La clave va en minúsculas, sin espacios y empieza con una letra.';
  end if;
  if nullif(btrim(p_nombre), '') is null then
    raise exception 'El tipo de cambio necesita un nombre.';
  end if;
  if p_valor is null or p_valor <= 0 then
    raise exception 'El valor tiene que ser mayor que cero.';
  end if;
  if v_de = v_a then
    raise exception 'Un tipo de cambio va entre dos monedas distintas.';
  end if;
  if (select count(*) from public.monedas m where m.activa and m.codigo::text in (v_de, v_a)) <> 2 then
    raise exception 'Las dos monedas tienen que estar activas.';
  end if;
  if exists (select 1 from public.tipos_cambio t where t.clave = v_clave) then
    raise exception 'Ya existe un tipo de cambio con la clave «%».', v_clave using errcode = '23505';
  end if;
  insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor, es_default, orden)
  values (v_clave, btrim(p_nombre), v_de, v_a, p_valor,
          not exists (select 1 from public.tipos_cambio t where t.moneda_de::text = v_de and t.moneda_a::text = v_a and t.es_default),
          (select coalesce(max(t.orden), -1) + 1 from public.tipos_cambio t))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.tipo_cambio_crear(text, text, text, text, numeric) from public, anon;
grant execute on function public.tipo_cambio_crear(text, text, text, text, numeric) to authenticated;

-- Un parámetro nulo no toca esa columna. Marcar uno por defecto desmarca al que lo era entre esas
-- dos monedas; no se puede dejar al par sin uno por defecto ni desactivar al que lo es.
create or replace function public.tipo_cambio_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_nombre text default null, p_valor numeric default null, p_activo boolean default null, p_es_default boolean default null)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v public.tipos_cambio;
  v_nueva timestamptz;
begin
  perform public.assert_permiso('empresa.tipos_cambio.gestionar');
  select * into v from public.tipos_cambio t where t.id = p_id for update;
  if not found then
    raise exception 'Ese tipo de cambio ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(v.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este tipo de cambio mientras lo editabas.');
  if p_valor is not null and p_valor <= 0 then
    raise exception 'El valor tiene que ser mayor que cero.';
  end if;
  if v.es_default and p_es_default = false then
    raise exception 'Siempre hay un tipo de cambio por defecto entre dos monedas: marca otro para cambiarlo.';
  end if;
  if coalesce(p_es_default, v.es_default) and not coalesce(p_activo, v.activo) then
    raise exception 'El tipo de cambio por defecto no se desactiva: marca otro por defecto antes.';
  end if;
  if p_activo and not v.activo
     and (select count(*) from public.monedas m where m.activa and m.codigo in (v.moneda_de, v.moneda_a)) <> 2 then
    raise exception 'Para activarlo, las dos monedas tienen que estar activas.';
  end if;
  if p_es_default and not v.es_default then
    update public.tipos_cambio t set es_default = false
    where t.moneda_de = v.moneda_de and t.moneda_a = v.moneda_a and t.es_default and t.id <> v.id;
  end if;
  update public.tipos_cambio t set
    nombre = coalesce(nullif(btrim(p_nombre), ''), t.nombre),
    valor = coalesce(p_valor, t.valor),
    activo = coalesce(p_activo, t.activo),
    es_default = coalesce(p_es_default, t.es_default)
  where t.id = v.id
  returning t.actualizado_en into v_nueva;
  return v_nueva;
end;
$$;
revoke all on function public.tipo_cambio_guardar(uuid, timestamptz, text, numeric, boolean, boolean) from public, anon;
grant execute on function public.tipo_cambio_guardar(uuid, timestamptz, text, numeric, boolean, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Integraciones: interruptor, configuración no secreta y el secreto en Vault
-- ---------------------------------------------------------------------------
-- Un parámetro nulo no toca esa columna. apibara no se activa sin su clave guardada.
create or replace function public.integracion_guardar(p_clave text, p_actualizado_en_esperado timestamptz, p_activa boolean default null, p_config jsonb default null)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v public.integraciones;
  v_nueva timestamptz;
begin
  perform public.assert_permiso('empresa.ajustes.gestionar');
  select * into v from public.integraciones i where i.clave = p_clave for update;
  if not found then
    raise exception 'Esa integración no existe.';
  end if;
  perform public._exigir_version(v.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió esta integración mientras la editabas.');
  if p_config is not null and jsonb_typeof(p_config) <> 'object' then
    raise exception 'La configuración no tiene la forma esperada.';
  end if;
  if coalesce(p_activa, v.activa) and v.clave = 'apibara' and v.secreto_guardado_en is null then
    raise exception 'Guarda la clave de apibara antes de activarla.';
  end if;
  update public.integraciones i set
    activa = coalesce(p_activa, i.activa),
    config = coalesce(p_config, i.config),
    actualizado_por = (select auth.uid())
  where i.clave = v.clave
  returning i.actualizado_en into v_nueva;
  return v_nueva;
end;
$$;
revoke all on function public.integracion_guardar(text, timestamptz, boolean, jsonb) from public, anon;
grant execute on function public.integracion_guardar(text, timestamptz, boolean, jsonb) to authenticated;

-- Guarda o reemplaza el secreto en Vault (`integracion:<clave>`). En la tabla sólo queda cuándo:
-- ninguna función se lo devuelve a `authenticated`.
create or replace function public.integracion_guardar_secreto(p_clave text, p_secreto text, p_actualizado_en_esperado timestamptz)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v public.integraciones;
  v_nombre text := 'integracion:' || p_clave;
  v_secreto text := btrim(coalesce(p_secreto, ''));
  v_id uuid;
  v_nueva timestamptz;
begin
  perform public.assert_permiso('empresa.ajustes.gestionar');
  select * into v from public.integraciones i where i.clave = p_clave for update;
  if not found then
    raise exception 'Esa integración no existe.';
  end if;
  perform public._exigir_version(v.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió esta integración mientras la editabas.');
  if length(v_secreto) < 8 or length(v_secreto) > 500 then
    raise exception 'La clave tiene que tener entre 8 y 500 caracteres.';
  end if;
  select s.id into v_id from vault.secrets s where s.name = v_nombre;
  if v_id is null then
    perform vault.create_secret(new_secret => v_secreto, new_name => v_nombre, new_description => 'Secreto de la integración ' || p_clave);
  else
    perform vault.update_secret(secret_id => v_id, new_secret => v_secreto);
  end if;
  update public.integraciones i set
    secreto_guardado_en = now(),
    actualizado_por = (select auth.uid())
  where i.clave = v.clave
  returning i.actualizado_en into v_nueva;
  return v_nueva;
end;
$$;
revoke all on function public.integracion_guardar_secreto(text, text, timestamptz) from public, anon;
grant execute on function public.integracion_guardar_secreto(text, text, timestamptz) to authenticated;

-- Quien lo lee: las edge functions, con el cliente de servicio. Nadie más.
create or replace function public.integracion_secreto(p_clave text)
returns text language sql stable security definer set search_path = '' as $$
  select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'integracion:' || p_clave;
$$;
revoke all on function public.integracion_secreto(text) from public, anon, authenticated;
grant execute on function public.integracion_secreto(text) to service_role;
