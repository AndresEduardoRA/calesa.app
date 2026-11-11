-- El impacto de apagar una regla del flujo (paso 5.10-1), para la pantalla «Reglas»: la regla de `_flujo_regla_uso()`, sin versión ni candado
-- (como `fase_impacto`). Una regla ya apagada no bloquea: apagarla no hace nada (las listas se devuelven igual, informativas).

create or replace function public.flujo_regla_impacto(p_flujo uuid, p_regla text) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_existe boolean;
  v_activa boolean;
  v jsonb;
begin
  v_existe := public._flujo_regla_admitida('vehiculos', p_regla);
  if not v_existe then
    raise exception 'Esta regla no existe.' using errcode = '22023', hint = 'regla';
  end if;
  v_existe := p_flujo is not null and exists (select 1 from public.flujos where id = p_flujo);
  if not v_existe then
    raise exception 'Este flujo ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  if not public.puede_configurar_flujo(p_flujo) then
    raise exception 'No tienes permiso para configurar este flujo.' using errcode = '42501';
  end if;
  v := public._flujo_regla_uso(p_flujo, p_regla);
  v_activa := public.flujo_regla_activa(p_flujo, p_regla);
  if not v_activa then
    v := jsonb_set(v, '{bloquea}', 'false'::jsonb);
  end if;
  return v;
end $$;

comment on function public.flujo_regla_impacto(uuid, text) is
  'Qué frena apagar una regla de un flujo (la regla de _flujo_regla_uso): {bloquea, fases, requisitos}. Regla fuera del catálogo → 22023 '
  '(hint regla); inexistente → PT409; sin puede_configurar_flujo → 42501. Ya apagada → bloquea false. Lectura: no devuelve versión.';

revoke all on function public.flujo_regla_impacto(uuid, text) from public, anon;
grant execute on function public.flujo_regla_impacto(uuid, text) to authenticated, service_role;
