-- Guardar un requisito de fase por RPC (paso 5.07-1): notas, min_archivos, max_archivos, formatos, `config.pct` y `bloqueante`, según su tipo.
-- Contrato de la configuración del flujo (`_flujo_para_editar`, `_flujo_tocar`). Volver bloqueante no pide nada a la base: el aviso de impacto
-- y la confirmación son de la pantalla (`requisito_impacto`, 5.07-2). El trigger `fase_requisito_validar()` revalida sólo lo que cambia.

create or replace function public.requisito_guardar(p_requisito uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.fases_requisitos;
  v_flujo uuid;
begin
  perform public._requisito_forma(null, p_cambios, false);
  select f.flujo_id into v_flujo from public.fases_requisitos r join public.fases f on f.id = r.fase_id where r.id = p_requisito;
  if v_flujo is null then
    raise exception 'Este requisito ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  perform public._flujo_para_editar(v_flujo, p_actualizado_en_esperado);
  select * into v from public.fases_requisitos where id = p_requisito for update;
  if not found then
    raise exception 'Este requisito ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  perform public._requisito_forma(v.tipo, p_cambios, false);
  v := public._requisito_aplicar(v, p_cambios);
  perform public._requisito_validar(v, array(select jsonb_object_keys(p_cambios)));

  update public.fases_requisitos
  set bloqueante = v.bloqueante, notas = v.notas, min_archivos = v.min_archivos, max_archivos = v.max_archivos,
      formatos = v.formatos, config = v.config
  where id = p_requisito;
  return public._flujo_tocar(v_flujo);
end $$;

comment on function public.requisito_guardar(uuid, timestamptz, jsonb) is
  'Guarda notas, archivos, formatos, config.pct o bloqueante de un requisito. Contrato _flujo_para_editar/_flujo_tocar; devuelve la versión del flujo.';

revoke all on function public.requisito_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.requisito_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;
