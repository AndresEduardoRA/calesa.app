-- 9.10-2 · El logo para el tema oscuro.
-- La columna ajustes_empresa.logo_oscuro_ruta ya existía (y storage_refcount() ya la cuenta); faltaba escribirla y leerla.
-- (a) empresa_guardar_ajustes la suma a lo editable: mismo permiso, misma versión, sin validar la forma de la ruta (igual que
--     logo_ruta: la valida Zod en la action).
-- (b) web.ajustes_acceso() la devuelve, legible por anon como logo_ruta (una ruta del bucket público «marca»). Cambia su tipo
--     de retorno, así que se borra y se crea, con los mismos grants que tenía.

CREATE OR REPLACE FUNCTION "public"."empresa_guardar_ajustes"("p_cambios" "jsonb", "p_actualizado_en_esperado" timestamp with time zone) RETURNS timestamp with time zone
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v public.ajustes_empresa;
  v_clave text;
  v_nueva timestamptz;
  v_editables constant text[] := array['nombre', 'razon_social', 'nit', 'direccion', 'ciudad', 'pais', 'telefono', 'whatsapp', 'email',
    'logo_ruta', 'logo_oscuro_ruta', 'color_acento', 'iconos', 'locale', 'zona_horaria', 'moneda_base', 'registro_abierto', 'papelera_dias', 'actividad_dias',
    'limpieza_automatica', 'limpieza_dias_gracia', 'telefono_cc'];
  v_obligatorias constant text[] := array['nombre', 'pais', 'locale', 'zona_horaria', 'moneda_base', 'registro_abierto', 'papelera_dias', 'actividad_dias',
    'limpieza_automatica', 'limpieza_dias_gracia'];
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
  -- Con el locale se formatea cada número de la app: uno con otra forma rompería todas las pantallas.
  if p_cambios ? 'locale' and btrim(p_cambios ->> 'locale') !~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$' then
    raise exception 'El formato regional «%» no tiene la forma esperada, como es-BO.', p_cambios ->> 'locale';
  end if;
  if p_cambios ? 'iconos' and jsonb_typeof(p_cambios -> 'iconos') not in ('object', 'null') then
    raise exception 'Los íconos no tienen la forma esperada.';
  end if;
  if p_cambios ? 'telefono_cc' and nullif(btrim(p_cambios ->> 'telefono_cc'), '') is not null
     and btrim(p_cambios ->> 'telefono_cc') !~ '^\+[1-9][0-9]{0,2}$' then
    raise exception 'El código de país lleva un «+» y de 1 a 3 dígitos.' using errcode = '22023', hint = 'telefono_cc';
  end if;
  if p_cambios ? 'limpieza_dias_gracia'
     and (btrim(p_cambios ->> 'limpieza_dias_gracia') !~ '^[0-9]{1,3}$' or (p_cambios ->> 'limpieza_dias_gracia')::int not between 1 and 90) then
    raise exception 'Los días de gracia de la limpieza van de 1 a 90.' using errcode = '22023', hint = 'limpieza_dias_gracia';
  end if;
  if p_cambios ? 'limpieza_automatica' and (p_cambios ->> 'limpieza_automatica') not in ('true', 'false') then
    raise exception 'La limpieza automática se enciende o se apaga.' using errcode = '22023', hint = 'limpieza_automatica';
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
    telefono_cc = case when p_cambios ? 'telefono_cc' then nullif(btrim(p_cambios ->> 'telefono_cc'), '') else e.telefono_cc end,
    whatsapp = case when p_cambios ? 'whatsapp' then nullif(btrim(p_cambios ->> 'whatsapp'), '') else e.whatsapp end,
    email = case when p_cambios ? 'email' then nullif(btrim(p_cambios ->> 'email'), '') else e.email end,
    logo_ruta = case when p_cambios ? 'logo_ruta' then nullif(p_cambios ->> 'logo_ruta', '') else e.logo_ruta end,
    logo_oscuro_ruta = case when p_cambios ? 'logo_oscuro_ruta' then nullif(p_cambios ->> 'logo_oscuro_ruta', '') else e.logo_oscuro_ruta end,
    color_acento = case when p_cambios ? 'color_acento' then nullif(lower(p_cambios ->> 'color_acento'), '') else e.color_acento end,
    iconos = case when p_cambios ? 'iconos' then nullif(p_cambios -> 'iconos', 'null'::jsonb) else e.iconos end,
    locale = case when p_cambios ? 'locale' then btrim(p_cambios ->> 'locale') else e.locale end,
    zona_horaria = case when p_cambios ? 'zona_horaria' then btrim(p_cambios ->> 'zona_horaria') else e.zona_horaria end,
    moneda_base = case when p_cambios ? 'moneda_base' then (p_cambios ->> 'moneda_base')::char(3) else e.moneda_base end,
    registro_abierto = case when p_cambios ? 'registro_abierto' then (p_cambios ->> 'registro_abierto')::boolean else e.registro_abierto end,
    papelera_dias = case when p_cambios ? 'papelera_dias' then (p_cambios ->> 'papelera_dias')::int else e.papelera_dias end,
    actividad_dias = case when p_cambios ? 'actividad_dias' then (p_cambios ->> 'actividad_dias')::int else e.actividad_dias end,
    limpieza_automatica = case when p_cambios ? 'limpieza_automatica' then (p_cambios ->> 'limpieza_automatica')::boolean else e.limpieza_automatica end,
    limpieza_dias_gracia = case when p_cambios ? 'limpieza_dias_gracia' then (p_cambios ->> 'limpieza_dias_gracia')::int else e.limpieza_dias_gracia end,
    actualizado_por = (select auth.uid())
  where e.id = 1
  returning e.actualizado_en into v_nueva;
  return v_nueva;
end;
$_$;


revoke all on function public.empresa_guardar_ajustes(jsonb, timestamptz) from public, anon;
grant execute on function public.empresa_guardar_ajustes(jsonb, timestamptz) to authenticated, service_role;

drop function web.ajustes_acceso();

create function web.ajustes_acceso()
returns table (nombre text, logo_ruta text, logo_oscuro_ruta text, color_acento text, iconos jsonb, locale text, zona_horaria text,
               moneda_base text, registro_abierto boolean, primer_registro boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select e.nombre, e.logo_ruta, e.logo_oscuro_ruta, e.color_acento, e.iconos, e.locale, e.zona_horaria, e.moneda_base::text,
         e.registro_abierto, not exists (select 1 from public.perfiles)
  from public.ajustes_empresa e
  where e.id = 1;
$$;

revoke all on function web.ajustes_acceso() from public, anon, authenticated;
grant execute on function web.ajustes_acceso() to anon, authenticated, service_role;
