-- Poner quién mueve (paso 5.05): los roles que pueden mover una unidad hasta una fase (`fases_roles`) o por una transición
-- (`fases_transiciones_roles`), por RPC con la versión del flujo. Reemplazo todo o nada: la lista se valida entera antes de escribir. Lista vacía:
-- en la fase, cualquiera con `flujos.mover`; en la transición, manda la lista de la fase destino (`_puede_mover`, que este paso no toca). Poner
-- roles acota quién mueve, no otorga nada: no se exige dominar el rol. Estas dos tablas no tienen `trg_auditar`: la actividad la deja
-- `registrar_actividad()` sólo cuando la lista cambia.

-- La lista de roles, validada: sin nulos, hasta 100 distintos y todos existentes. Toma los roles con `for key share` para que nadie los borre
-- antes del insert (sin eso, el 23503 crudo de la FK). Devuelve la lista sin repetidos y ordenada.
create or replace function public._roles_de_lista(p_roles uuid[]) returns uuid[]
language plpgsql
set search_path = ''
as $$
declare
  v uuid[];
begin
  if p_roles is null then
    raise exception 'Faltan los roles.' using errcode = '22023', hint = 'roles';
  end if;
  if array_position(p_roles, null) is not null then
    raise exception 'Hay un rol vacío en la lista.' using errcode = '22023', hint = 'roles';
  end if;
  v := array(select distinct r from unnest(p_roles) r order by r);
  if cardinality(v) > 100 then
    raise exception 'Elige hasta 100 roles.' using errcode = '22023', hint = 'roles';
  end if;
  perform 1 from public.roles where id = any (v) for key share;
  if exists (select 1 from unnest(v) r where not exists (select 1 from public.roles where id = r)) then
    raise exception 'Uno de los roles elegidos ya no existe. Recarga e intenta de nuevo.' using errcode = '22023', hint = 'roles';
  end if;
  return v;
end $$;

revoke all on function public._roles_de_lista(uuid[]) from public, anon, authenticated;
grant execute on function public._roles_de_lista(uuid[]) to service_role;

comment on function public._roles_de_lista(uuid[]) is
  'Valida una lista de roles de quién mueve: nula, con un nulo, más de 100 o un rol inexistente → 22023 (hint roles). Toma los roles con for key share. '
  'Devuelve la lista sin repetidos y ordenada. Sólo para fase_roles_poner y transicion_roles_poner.';

create or replace function public.fase_roles_poner(p_fase uuid, p_actualizado_en_esperado timestamptz, p_roles uuid[]) returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_flujo uuid;
  v_lista uuid[];
  v_antes uuid[];
begin
  select flujo_id into v_flujo from public.fases where id = p_fase;
  if v_flujo is null then
    raise exception 'Esta fase ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  perform public._flujo_para_editar(v_flujo, p_actualizado_en_esperado);
  if not exists (select 1 from public.fases where id = p_fase) then
    raise exception 'Esta fase ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  v_lista := public._roles_de_lista(p_roles);
  v_antes := array(select rol_id from public.fases_roles where fase_id = p_fase order by rol_id);

  delete from public.fases_roles where fase_id = p_fase and rol_id <> all (v_lista);
  insert into public.fases_roles (fase_id, rol_id) select p_fase, r from unnest(v_lista) r on conflict do nothing;
  if v_antes is distinct from v_lista then
    perform public.registrar_actividad('fase.roles_cambiados', 'fases', p_fase::text,
      jsonb_build_object('roles', to_jsonb(v_antes)), jsonb_build_object('roles', to_jsonb(v_lista)));
  end if;
  return public._flujo_tocar(v_flujo);
end $$;

create or replace function public.transicion_roles_poner(p_transicion uuid, p_actualizado_en_esperado timestamptz, p_roles uuid[]) returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_flujo uuid;
  v_lista uuid[];
  v_antes uuid[];
begin
  select flujo_id into v_flujo from public.fases_transiciones where id = p_transicion;
  if v_flujo is null then
    raise exception 'Esta transición ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  perform public._flujo_para_editar(v_flujo, p_actualizado_en_esperado);
  if not exists (select 1 from public.fases_transiciones where id = p_transicion) then
    raise exception 'Esta transición ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  v_lista := public._roles_de_lista(p_roles);
  v_antes := array(select rol_id from public.fases_transiciones_roles where transicion_id = p_transicion order by rol_id);

  delete from public.fases_transiciones_roles where transicion_id = p_transicion and rol_id <> all (v_lista);
  insert into public.fases_transiciones_roles (transicion_id, rol_id) select p_transicion, r from unnest(v_lista) r on conflict do nothing;
  if v_antes is distinct from v_lista then
    perform public.registrar_actividad('transicion.roles_cambiados', 'fases_transiciones', p_transicion::text,
      jsonb_build_object('roles', to_jsonb(v_antes)), jsonb_build_object('roles', to_jsonb(v_lista)));
  end if;
  return public._flujo_tocar(v_flujo);
end $$;

revoke all on function public.fase_roles_poner(uuid, timestamptz, uuid[]) from public, anon;
revoke all on function public.transicion_roles_poner(uuid, timestamptz, uuid[]) from public, anon;
grant execute on function public.fase_roles_poner(uuid, timestamptz, uuid[]) to authenticated, service_role;
grant execute on function public.transicion_roles_poner(uuid, timestamptz, uuid[]) to authenticated, service_role;

comment on function public.fase_roles_poner(uuid, timestamptz, uuid[]) is
  'Pone los roles que pueden mover hasta una fase (5.05), todo o nada; vacía = cualquiera con flujos.mover. Inexistente → PT409; _flujo_para_editar '
  '(42501, PT409); la lista por _roles_de_lista (22023, hint roles). Actividad fase.roles_cambiados {roles} sólo si cambia. Devuelve la versión nueva del flujo.';
comment on function public.transicion_roles_poner(uuid, timestamptz, uuid[]) is
  'Pone los roles que pueden mover por una transición (5.05), todo o nada; vacía = manda la lista de la fase destino. Inexistente → PT409; '
  '_flujo_para_editar (42501, PT409); la lista por _roles_de_lista (22023, hint roles). Actividad transicion.roles_cambiados {roles} sólo si cambia. '
  'Devuelve la versión nueva del flujo.';
