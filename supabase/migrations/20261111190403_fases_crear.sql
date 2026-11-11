-- Crear una fase por RPC (paso 5.01-1), con la versión del flujo (`_flujo_para_editar`, `_flujo_tocar`) y los ayudantes que comparte con
-- `fase_guardar()`: la forma de los datos (lista cerrada y tipos, sin mirar el estado), la mezcla sobre la fila y las validaciones con el campo
-- en `hint`. El trigger `fase_validar()` queda como respaldo de las reglas del flujo.

-- La forma de los datos de una fase: un objeto, sólo claves de la lista y cada una con su tipo. No mira el estado (va antes del permiso).
create or replace function public._fase_forma(p_datos jsonb, p_vacio_vale boolean) returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_clave text;
  v_tipo text;
  v_valor jsonb;
  v_booleanos constant text[] := array['es_inicial', 'es_final', 'es_logistica', 'nota_obligatoria', 'permite_contenedor', 'permite_aduana',
    'cuenta_llegada_repuestos', 'publica_web', 'visible_portal'];
  v_enteros constant text[] := array['demora_dias', 'alerta_cada_horas'];
  v_textos_obligatorios constant text[] := array['nombre', 'color'];
  v_textos constant text[] := array['descripcion', 'icono', 'alias_portal', 'descripcion_portal'];
  v_bien boolean;
begin
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'Faltan los datos de la fase.' using errcode = '22023';
  end if;
  if not p_vacio_vale and p_datos = '{}'::jsonb then
    raise exception 'No hay cambios para guardar.' using errcode = '22023';
  end if;
  for v_clave, v_valor in select key, value from jsonb_each(p_datos) loop
    v_tipo := jsonb_typeof(v_valor);
    if v_clave = any (v_booleanos) then
      v_bien := v_tipo = 'boolean';
    elsif v_clave = any (v_enteros) then
      v_bien := v_tipo = 'null'
        or (v_tipo = 'number' and (v_valor #>> '{}')::numeric = trunc((v_valor #>> '{}')::numeric)
            and (v_valor #>> '{}')::numeric between -2147483648 and 2147483647);
    elsif v_clave = any (v_textos_obligatorios) then
      v_bien := v_tipo = 'string';
    elsif v_clave = any (v_textos) then
      v_bien := v_tipo in ('string', 'null');
    else
      raise exception 'El dato «%» no se cambia desde una fase.', v_clave using errcode = '22023', hint = v_clave;
    end if;
    if not v_bien then
      raise exception 'El dato «%» no tiene el formato esperado.', v_clave using errcode = '22023', hint = v_clave;
    end if;
  end loop;
end $$;

-- Mezcla los datos (ya con su forma) sobre la fila: los textos se recortan y un texto opcional vacío queda nulo.
create or replace function public._fase_aplicar(p_fila public.fases, p_datos jsonb) returns public.fases
language sql
immutable
set search_path = ''
as $$
  select jsonb_populate_record(p_fila, coalesce((
    select jsonb_object_agg(key, case
      when key in ('descripcion', 'icono', 'alias_portal', 'descripcion_portal') then coalesce(to_jsonb(nullif(btrim(value #>> '{}'), '')), 'null'::jsonb)
      when key in ('nombre', 'color') then to_jsonb(btrim(value #>> '{}'))
      else value end)
    from jsonb_each(p_datos)), '{}'::jsonb));
$$;

-- Las validaciones de una fase con el campo en `hint`. Los checks que la tabla ya tiene, sobre la fila mezclada; los topes nuevos (nombre, alias
-- y descripciones, la forma del ícono) sólo sobre las claves que llegan: una fase vieja que los pase no impide guardar otro campo. Después,
-- las reglas del flujo con el texto de `fase_validar()`.
create or replace function public._fase_validar(p_fila public.fases, p_claves text[]) returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if coalesce(p_fila.nombre, '') = '' then
    raise exception 'La fase necesita un nombre.' using errcode = '22023', hint = 'nombre';
  end if;
  if 'nombre' = any (p_claves) and char_length(p_fila.nombre) > 60 then
    raise exception 'El nombre de la fase tiene hasta 60 caracteres.' using errcode = '22023', hint = 'nombre';
  end if;
  if 'descripcion' = any (p_claves) and char_length(p_fila.descripcion) > 500 then
    raise exception 'La descripción tiene hasta 500 caracteres.' using errcode = '22023', hint = 'descripcion';
  end if;
  if 'descripcion_portal' = any (p_claves) and char_length(p_fila.descripcion_portal) > 500 then
    raise exception 'La descripción tiene hasta 500 caracteres.' using errcode = '22023', hint = 'descripcion_portal';
  end if;
  if 'alias_portal' = any (p_claves) and char_length(p_fila.alias_portal) > 60 then
    raise exception 'El nombre para el cliente tiene hasta 60 caracteres.' using errcode = '22023', hint = 'alias_portal';
  end if;
  if p_fila.color is null or p_fila.color !~ '^#[0-9a-fA-F]{6}$' then
    raise exception 'El color va como #rrggbb.' using errcode = '22023', hint = 'color';
  end if;
  if 'icono' = any (p_claves) and p_fila.icono !~ '^[a-z0-9-]{1,40}$' then
    raise exception 'El ícono no tiene el formato esperado.' using errcode = '22023', hint = 'icono';
  end if;
  if p_fila.demora_dias < 0 then
    raise exception 'La demora va en días enteros, desde 0.' using errcode = '22023', hint = 'demora_dias';
  end if;
  if p_fila.alerta_cada_horas not between 1 and 720 then
    raise exception 'La alerta se repite cada 1 a 720 horas.' using errcode = '22023', hint = 'alerta_cada_horas';
  end if;
  if p_fila.es_inicial and p_fila.es_final then
    raise exception 'Una fase no puede ser inicial y final a la vez.' using errcode = '22023', hint = 'es_final';
  end if;
  if p_fila.visible_portal and p_fila.alias_portal is null then
    raise exception 'Para mostrarla en el portal escribe su nombre para el cliente.' using errcode = '22023', hint = 'alias_portal';
  end if;
  if p_fila.publica_web and not public.flujo_regla_activa(p_fila.flujo_id, 'vitrina_web') then
    raise exception 'La vitrina web está apagada en este flujo.' using errcode = '23514', hint = 'publica_web';
  end if;
  if p_fila.visible_portal and not public.flujo_regla_activa(p_fila.flujo_id, 'portal_cliente') then
    raise exception 'El portal del cliente está apagado en este flujo.' using errcode = '23514', hint = 'visible_portal';
  end if;
  if p_fila.permite_aduana and not public.flujo_regla_activa(p_fila.flujo_id, 'aduana') then
    raise exception 'La aduana está apagada en este flujo.' using errcode = '23514', hint = 'permite_aduana';
  end if;
  if p_fila.es_logistica and not public.flujo_regla_activa(p_fila.flujo_id, 'logistica') then
    raise exception 'La logística está apagada en este flujo.' using errcode = '23514', hint = 'es_logistica';
  end if;
end $$;

-- Un único de `fases` que saltó, con su mensaje humano. Si no es uno de los conocidos, vuelve y quien llama relanza el original.
create or replace function public._fase_unico(p_restriccion text, p_nombre text) returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_restriccion = 'fases_flujo_id_nombre_key' then
    raise exception 'Ya hay una fase «%» en este flujo.', p_nombre using errcode = '23505', hint = 'nombre';
  elsif p_restriccion = 'fases_llegada_repuestos_unica' then
    raise exception 'Otra fase de este flujo ya cuenta la llegada de repuestos.' using errcode = '23505', hint = 'cuenta_llegada_repuestos';
  elsif p_restriccion = 'fases_pkey' then
    raise exception 'Esa fase ya existe.' using errcode = '23505', hint = 'id';
  end if;
end $$;

revoke all on function public._fase_forma(jsonb, boolean) from public, anon, authenticated;
revoke all on function public._fase_aplicar(public.fases, jsonb) from public, anon, authenticated;
revoke all on function public._fase_validar(public.fases, text[]) from public, anon, authenticated;
revoke all on function public._fase_unico(text, text) from public, anon, authenticated;
grant execute on function public._fase_forma(jsonb, boolean) to service_role;
grant execute on function public._fase_aplicar(public.fases, jsonb) to service_role;
grant execute on function public._fase_validar(public.fases, text[]) to service_role;
grant execute on function public._fase_unico(text, text) to service_role;

-- Crea una fase al final del flujo y devuelve la versión nueva del flujo. Sin `es_logistica`, toma la regla `logistica` del flujo.
create or replace function public.fase_crear(p_id uuid, p_flujo uuid, p_actualizado_en_esperado timestamptz, p_datos jsonb) returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.fases;
  v_restriccion text;
begin
  if p_id is null then
    raise exception 'Falta el id de la fase.' using errcode = '22023', hint = 'id';
  end if;
  perform public._fase_forma(p_datos, true);
  perform public._flujo_para_editar(p_flujo, p_actualizado_en_esperado);

  v.id := p_id;
  v.flujo_id := p_flujo;
  v.color := '#717c93';
  v.orden := (select coalesce(max(f.orden), 0) + 10 from public.fases f where f.flujo_id = p_flujo);
  v.es_inicial := false;
  v.es_final := false;
  v.activa := true;
  v.es_logistica := public.flujo_regla_activa(p_flujo, 'logistica');
  v.nota_obligatoria := false;
  v.permite_contenedor := true;
  v.permite_aduana := false;
  v.cuenta_llegada_repuestos := false;
  v.publica_web := false;
  v.visible_portal := false;
  v.creado_en := now();
  v.actualizado_en := now();
  v := public._fase_aplicar(v, p_datos);
  perform public._fase_validar(v, array(select jsonb_object_keys(p_datos)));

  begin
    insert into public.fases select (v).*;
  exception when unique_violation then
    get stacked diagnostics v_restriccion = constraint_name;
    perform public._fase_unico(v_restriccion, v.nombre);
    raise;
  end;
  return public._flujo_tocar(p_flujo);
end $$;

revoke all on function public.fase_crear(uuid, uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.fase_crear(uuid, uuid, timestamptz, jsonb) to authenticated, service_role;
