-- Crear una transición por RPC (paso 5.05), con la versión del flujo (`_flujo_para_editar`, `_flujo_tocar` del 5.01) y las validaciones que la
-- escritura directa no tenía: las dos fases son del flujo que se edita, el destino está activo y la transición repetida da un 23505 humano. La
-- actividad la deja el `trg_auditar` que la tabla ya tiene.

-- La acción de una transición (el texto del botón): se recorta, vacía queda nula y tiene hasta 40 caracteres.
create or replace function public._transicion_accion(p_accion text) returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := nullif(btrim(p_accion), '');
begin
  if char_length(v) > 40 then
    raise exception 'La acción tiene hasta 40 caracteres.' using errcode = '22023', hint = 'accion';
  end if;
  return v;
end $$;

-- Un único de `fases_transiciones` que saltó, con su mensaje humano. Si no es uno de los conocidos, vuelve y quien llama relanza el original.
create or replace function public._transicion_unico(p_restriccion text, p_de text, p_a text) returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_restriccion = 'fases_transiciones_de_fase_id_a_fase_id_key' then
    raise exception 'Ya hay una transición de «%» a «%».', p_de, p_a using errcode = '23505', hint = 'a_fase_id';
  elsif p_restriccion = 'fases_transiciones_pkey' then
    raise exception 'Esa transición ya existe.' using errcode = '23505', hint = 'id';
  end if;
end $$;

revoke all on function public._transicion_accion(text) from public, anon, authenticated;
revoke all on function public._transicion_unico(text, text, text) from public, anon, authenticated;
grant execute on function public._transicion_accion(text) to service_role;
grant execute on function public._transicion_unico(text, text, text) to service_role;

comment on function public._transicion_accion(text) is
  'La acción de una transición: recortada, vacía = null, más de 40 caracteres → 22023 (hint accion). Sólo para las RPC de transiciones.';
comment on function public._transicion_unico(text, text, text) is
  'Traduce un unique_violation de fases_transiciones: (de, a) → 23505 «Ya hay una transición de «de» a «a».» (hint a_fase_id); pkey → 23505 (hint id); otro: vuelve.';

-- Crea una transición del flujo y devuelve la versión nueva del flujo. El origen puede estar jubilado (las unidades que siguen ahí necesitan
-- salir); el destino, no.
create or replace function public.transicion_crear(p_id uuid, p_flujo uuid, p_actualizado_en_esperado timestamptz, p_de uuid, p_a uuid,
  p_accion text, p_nota_obligatoria boolean) returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_de public.fases;
  v_a public.fases;
  v_accion text;
  v_restriccion text;
begin
  if p_id is null then
    raise exception 'Falta el id de la transición.' using errcode = '22023', hint = 'id';
  end if;
  if p_de is null then
    raise exception 'Elige la fase de origen.' using errcode = '22023', hint = 'de_fase_id';
  end if;
  if p_a is null then
    raise exception 'Elige la fase destino.' using errcode = '22023', hint = 'a_fase_id';
  end if;
  if p_de = p_a then
    raise exception 'Una transición no puede volver a la misma fase.' using errcode = '22023', hint = 'a_fase_id';
  end if;
  v_accion := public._transicion_accion(p_accion);
  perform public._flujo_para_editar(p_flujo, p_actualizado_en_esperado);

  select * into v_de from public.fases where id = p_de;
  select * into v_a from public.fases where id = p_a;
  if v_de.id is null or v_a.id is null then
    raise exception 'Esa fase ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  if v_de.flujo_id <> p_flujo then
    raise exception 'La fase «%» no es de este flujo.', v_de.nombre using errcode = '22023', hint = 'de_fase_id';
  end if;
  if v_a.flujo_id <> p_flujo then
    raise exception 'La fase «%» no es de este flujo.', v_a.nombre using errcode = '22023', hint = 'a_fase_id';
  end if;
  if not v_a.activa then
    raise exception 'La fase «%» está jubilada: no puede ser destino.', v_a.nombre using errcode = '22023', hint = 'a_fase_id';
  end if;

  begin
    insert into public.fases_transiciones (id, flujo_id, de_fase_id, a_fase_id, accion, nota_obligatoria)
    values (p_id, p_flujo, p_de, p_a, v_accion, coalesce(p_nota_obligatoria, false));
  exception when unique_violation then
    get stacked diagnostics v_restriccion = constraint_name;
    perform public._transicion_unico(v_restriccion, v_de.nombre, v_a.nombre);
    raise;
  end;
  return public._flujo_tocar(p_flujo);
end $$;

revoke all on function public.transicion_crear(uuid, uuid, timestamptz, uuid, uuid, text, boolean) from public, anon;
grant execute on function public.transicion_crear(uuid, uuid, timestamptz, uuid, uuid, text, boolean) to authenticated, service_role;

comment on function public.transicion_crear(uuid, uuid, timestamptz, uuid, uuid, text, boolean) is
  'Crea una transición (5.05). Forma (22023 con hint: id, de_fase_id, a_fase_id, accion) → _flujo_para_editar (42501, PT409) → fase inexistente PT409; '
  'de otro flujo o destino jubilado 22023 con hint; (de, a) o id repetidos 23505 con hint. Devuelve la versión nueva del flujo.';
