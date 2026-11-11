-- Encender o apagar una regla del flujo (paso 5.10-1), con la versión del flujo (`_flujo_para_editar`, 5.01). Encender inserta la fila si
-- falta y mira el catálogo del ámbito; apagar con uso → 23514 (la regla de `_flujo_regla_uso`), y una regla ya apagada (sin fila o apagada)
-- no mira el uso ni escribe. La versión se mueve siempre, también sin cambio (como `fase_mover`).

create or replace function public.flujo_regla_cambiar(p_flujo uuid, p_actualizado_en_esperado timestamptz, p_regla text, p_activa boolean)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.flujos;
  v_ok boolean;
  v_activa boolean;
  v_bloquea boolean;
begin
  v_ok := public._flujo_regla_admitida('vehiculos', p_regla);
  if not v_ok then
    raise exception 'Esta regla no existe.' using errcode = '22023', hint = 'regla';
  end if;
  if p_activa is null then
    raise exception 'Falta si la regla se enciende o se apaga.' using errcode = '22023', hint = 'activa';
  end if;
  v := public._flujo_para_editar(p_flujo, p_actualizado_en_esperado);

  if p_activa then
    v_ok := public._flujo_regla_admitida(v.ambito, p_regla);
    if not v_ok then
      raise exception 'Esta regla no está disponible en este flujo.' using errcode = '22023', hint = 'regla';
    end if;
    insert into public.flujos_reglas (flujo_id, regla, activa) values (p_flujo, p_regla, true)
    on conflict (flujo_id, regla) do update set activa = true;
  else
    -- flujos_reglas_pkey. Apagar no mira el catálogo: limpia una fila heredada.
    select activa into v_activa from public.flujos_reglas where flujo_id = p_flujo and regla = p_regla;
    v_activa := coalesce(v_activa, false);
    if v_activa then
      v_bloquea := coalesce((public._flujo_regla_uso(p_flujo, p_regla) ->> 'bloquea')::boolean, false);
      if v_bloquea then
        raise exception 'No se puede apagar esta regla: la usan fases o requisitos de este flujo.' using errcode = '23514', hint = 'regla';
      end if;
      update public.flujos_reglas set activa = false where flujo_id = p_flujo and regla = p_regla;
    end if;
  end if;

  return public._flujo_tocar(p_flujo);
end $$;

comment on function public.flujo_regla_cambiar(uuid, timestamptz, text, boolean) is
  'Enciende o apaga una regla de un flujo y devuelve la versión nueva del flujo. Orden: forma (22023, hint regla|activa); _flujo_para_editar '
  '(PT409 / 42501 / versión PT409); encender fuera del catálogo del ámbito → 22023; apagar con uso → 23514 (hint regla). La versión se mueve siempre.';

revoke all on function public.flujo_regla_cambiar(uuid, timestamptz, text, boolean) from public, anon;
grant execute on function public.flujo_regla_cambiar(uuid, timestamptz, text, boolean) to authenticated, service_role;
