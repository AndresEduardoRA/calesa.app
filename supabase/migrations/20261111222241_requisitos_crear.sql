-- Crear un requisito de fase por RPC (paso 5.07-1), con la versión del flujo (`_flujo_para_editar`, `_flujo_tocar`) y los ayudantes que
-- comparte con `requisito_guardar()`: la forma de los datos (lista cerrada por tipo y tipos JSON, sin mirar el estado), la mezcla sobre la fila
-- y las validaciones con el campo en `hint`. Las reglas del flujo (clave del ámbito, formatos del tipo, esperas) siguen en el trigger
-- `fase_requisito_validar()`. Un requisito **nace informativo**: `bloqueante` no se manda al crear y el default de la columna pasa a `false`.

alter table public.fases_requisitos alter column bloqueante set default false;

-- La forma de los datos de un requisito. Al crear, las claves de su tipo y las obligatorias; al guardar, las que se cambian (con el tipo nulo,
-- la unión de todos: va antes del permiso, cuando todavía no se leyó la fila). No mira el estado.
create or replace function public._requisito_forma(p_tipo public.tipo_requisito, p_datos jsonb, p_crear boolean) returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_permitidas text[];
  v_obligatoria text;
  v_clave text;
  v_tipo text;
  v_valor jsonb;
  v_bien boolean;
  v_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'Faltan los datos del requisito.' using errcode = '22023';
  end if;
  if not p_crear and p_datos = '{}'::jsonb then
    raise exception 'No hay cambios para guardar.' using errcode = '22023';
  end if;

  if p_crear then
    v_permitidas := case p_tipo
      when 'documento' then array['tipo_documento_id', 'min_archivos', 'max_archivos', 'formatos', 'notas']
      when 'dato' then array['clave_dato', 'config', 'notas']
      else array['espera_fase_id', 'notas'] end;
    v_obligatoria := case p_tipo when 'documento' then 'tipo_documento_id' when 'dato' then 'clave_dato' else 'espera_fase_id' end;
  else
    v_permitidas := case p_tipo
      when 'documento' then array['min_archivos', 'max_archivos', 'formatos', 'notas', 'bloqueante']
      when 'dato' then array['config', 'notas', 'bloqueante']
      when 'espera' then array['notas', 'bloqueante']
      else array['min_archivos', 'max_archivos', 'formatos', 'config', 'notas', 'bloqueante'] end;
  end if;

  for v_clave, v_valor in select key, value from jsonb_each(p_datos) loop
    if not (v_clave = any (v_permitidas)) then
      raise exception 'El dato «%» no va en este requisito.', v_clave using errcode = '22023', hint = v_clave;
    end if;
    v_tipo := jsonb_typeof(v_valor);
    v_bien := case
      when v_clave in ('tipo_documento_id', 'espera_fase_id') then v_tipo = 'string' and (v_valor #>> '{}') ~ v_uuid
      when v_clave in ('min_archivos', 'max_archivos') then v_tipo = 'null'
        or (v_tipo = 'number' and (v_valor #>> '{}') ~ '^-?[0-9]+$' and (v_valor #>> '{}')::numeric between -2147483648 and 2147483647)
      when v_clave = 'formatos' then v_tipo = 'null'
        or (v_tipo = 'array' and jsonb_array_length(v_valor) > 0
            and not exists (select 1 from jsonb_array_elements(v_valor) e where jsonb_typeof(e) <> 'string'))
      when v_clave = 'config' then v_tipo = 'null'
        or (v_tipo = 'object' and (select array_agg(k) from jsonb_object_keys(v_valor) k) = array['pct'] and jsonb_typeof(v_valor -> 'pct') = 'number')
      when v_clave = 'clave_dato' then v_tipo = 'string'
      when v_clave = 'notas' then v_tipo in ('string', 'null')
      when v_clave = 'bloqueante' then v_tipo = 'boolean'
      else false end;
    if not v_bien then
      raise exception 'El dato «%» no tiene el formato esperado.', v_clave using errcode = '22023', hint = v_clave;
    end if;
  end loop;

  if p_crear and not p_datos ? v_obligatoria then
    raise exception 'Falta «%».', v_obligatoria using errcode = '22023', hint = v_obligatoria;
  end if;
end $$;

-- Mezcla los datos (ya con su forma) sobre la fila: las notas se recortan (vacías = nulas) y `config` nula queda `{}`.
create or replace function public._requisito_aplicar(p_fila public.fases_requisitos, p_datos jsonb) returns public.fases_requisitos
language sql
immutable
set search_path = ''
as $$
  select jsonb_populate_record(p_fila, coalesce((
    select jsonb_object_agg(key, case
      when key = 'notas' then coalesce(to_jsonb(nullif(btrim(value #>> '{}'), '')), 'null'::jsonb)
      when key = 'config' and jsonb_typeof(value) = 'null' then '{}'::jsonb
      else value end)
    from jsonb_each(p_datos)), '{}'::jsonb));
$$;

-- Las validaciones de un requisito con el campo en `hint`, sobre la fila mezclada; las notas sólo si llegan.
create or replace function public._requisito_validar(p_fila public.fases_requisitos, p_claves text[]) returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if 'notas' = any (p_claves) and char_length(p_fila.notas) > 500 then
    raise exception 'Las notas tienen hasta 500 caracteres.' using errcode = '22023', hint = 'notas';
  end if;
  if p_fila.min_archivos < 1 then
    raise exception 'Pide al menos 1 archivo.' using errcode = '22023', hint = 'min_archivos';
  end if;
  if p_fila.max_archivos < 1 then
    raise exception 'El máximo es de al menos 1 archivo.' using errcode = '22023', hint = 'max_archivos';
  end if;
  if p_fila.max_archivos < p_fila.min_archivos then
    raise exception 'El máximo de archivos no puede ser menor que el mínimo.' using errcode = '22023',
      hint = case when 'max_archivos' = any (p_claves) then 'max_archivos' else 'min_archivos' end;
  end if;
  if p_fila.config <> '{}'::jsonb and p_fila.clave_dato is distinct from 'pagos.umbral_pct' then
    raise exception 'Sólo «pagos.umbral_pct» lleva configuración.' using errcode = '22023', hint = 'config';
  end if;
end $$;

revoke all on function public._requisito_forma(public.tipo_requisito, jsonb, boolean) from public, anon, authenticated;
revoke all on function public._requisito_aplicar(public.fases_requisitos, jsonb) from public, anon, authenticated;
revoke all on function public._requisito_validar(public.fases_requisitos, text[]) from public, anon, authenticated;
grant execute on function public._requisito_forma(public.tipo_requisito, jsonb, boolean) to service_role;
grant execute on function public._requisito_aplicar(public.fases_requisitos, jsonb) to service_role;
grant execute on function public._requisito_validar(public.fases_requisitos, text[]) to service_role;

-- Crea un requisito al final de la fase, informativo, y devuelve la versión nueva del flujo. `espera_ambito` sale del ámbito del flujo
-- (vehículos esperan a sus hijos; repuestos, a su padre).
create or replace function public.requisito_crear(p_id uuid, p_fase uuid, p_actualizado_en_esperado timestamptz, p_tipo public.tipo_requisito,
  p_datos jsonb) returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.fases_requisitos;
  v_flujo uuid;
  v_ambito public.ambito_flujo;
  v_restriccion text;
begin
  if p_id is null then
    raise exception 'Falta el id del requisito.' using errcode = '22023', hint = 'id';
  end if;
  if p_tipo is null then
    raise exception 'Falta el tipo del requisito.' using errcode = '22023', hint = 'tipo';
  end if;
  perform public._requisito_forma(p_tipo, p_datos, true);
  select flujo_id into v_flujo from public.fases where id = p_fase;
  if v_flujo is null then
    raise exception 'Esta fase ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  perform public._flujo_para_editar(v_flujo, p_actualizado_en_esperado);
  select fl.ambito into v_ambito from public.fases f join public.flujos fl on fl.id = f.flujo_id where f.id = p_fase;
  if not found then
    raise exception 'Esta fase ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;

  v.id := p_id;
  v.fase_id := p_fase;
  v.tipo := p_tipo;
  v.bloqueante := false;
  v.config := '{}'::jsonb;
  v.orden := (select coalesce(max(r.orden), 0) + 10 from public.fases_requisitos r where r.fase_id = p_fase);
  if p_tipo = 'espera' then
    v.espera_ambito := case v_ambito when 'vehiculos' then 'hijos'::public.ambito_espera else 'padre'::public.ambito_espera end;
  end if;
  v := public._requisito_aplicar(v, p_datos);
  perform public._requisito_validar(v, array(select jsonb_object_keys(p_datos)));

  if p_tipo = 'documento' and not exists (select 1 from public.tipos_documento where id = v.tipo_documento_id) then
    raise exception 'Ese tipo de documento no existe.' using errcode = '22023', hint = 'tipo_documento_id';
  end if;
  if p_tipo = 'espera' and not exists (select 1 from public.fases where id = v.espera_fase_id) then
    raise exception 'La fase que espera no existe.' using errcode = '22023', hint = 'espera_fase_id';
  end if;

  begin
    insert into public.fases_requisitos select (v).*;
  exception when unique_violation then
    get stacked diagnostics v_restriccion = constraint_name;
    if v_restriccion = 'fases_requisitos_pkey' then
      raise exception 'Ese requisito ya existe.' using errcode = '23505', hint = 'id';
    end if;
    raise;
  end;
  return public._flujo_tocar(v_flujo);
end $$;

comment on function public.requisito_crear(uuid, uuid, timestamptz, public.tipo_requisito, jsonb) is
  'Crea un requisito informativo al final de la fase. Contrato _flujo_para_editar/_flujo_tocar; devuelve la versión del flujo.';

revoke all on function public.requisito_crear(uuid, uuid, timestamptz, public.tipo_requisito, jsonb) from public, anon;
grant execute on function public.requisito_crear(uuid, uuid, timestamptz, public.tipo_requisito, jsonb) to authenticated, service_role;
