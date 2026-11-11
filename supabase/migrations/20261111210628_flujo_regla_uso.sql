-- El uso de una regla del flujo (paso 5.10-1). `_flujo_regla_uso()` es la única regla: la lee la pantalla por `flujo_regla_impacto()`, la
-- aplica `flujo_regla_cambiar()` y la aplica el trigger `flujo_regla_apagar_validar()`, así lo que se anuncia es lo que se hace. Bloquean las
-- fases del flujo (activas y jubiladas) que marcan la regla y, nuevo, en «esperas», los requisitos de espera de sus fases: antes se apagaba en
-- silencio y se seguían evaluando. `transporte`, `contenedor`, `gastos`, `pagos` y `alerta_demora` no tienen uso que bloquee. Listas con tope
-- fijo de 50, se lee una de más (la app las corta con `cortarAlTope()`); sin `count(`.

-- El catálogo de reglas por ámbito: las 10 de `flujos_reglas_regla_check`; repuestos no tiene vitrina, portal ni aduana.
create or replace function public._flujo_regla_admitida(p_ambito public.ambito_flujo, p_regla text) returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_regla = any (array['logistica', 'alerta_demora', 'vitrina_web', 'portal_cliente', 'transporte', 'contenedor', 'aduana', 'gastos', 'pagos', 'esperas'])
    and not (p_ambito = 'repuestos' and p_regla in ('vitrina_web', 'portal_cliente', 'aduana')),
    false);
$$;

comment on function public._flujo_regla_admitida(public.ambito_flujo, text) is
  'Si una regla existe en el catálogo de un ámbito (las 10 claves; repuestos sin vitrina_web, portal_cliente ni aduana). Nula = false. Sin EXECUTE para authenticated.';

revoke all on function public._flujo_regla_admitida(public.ambito_flujo, text) from public, anon, authenticated;
grant execute on function public._flujo_regla_admitida(public.ambito_flujo, text) to service_role;

create or replace function public._flujo_regla_uso(p_flujo uuid, p_regla text) returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_tope constant int := 50;
  v_fases jsonb := '[]'::jsonb;
  v_requisitos jsonb := '[]'::jsonb;
begin
  if p_regla in ('vitrina_web', 'portal_cliente', 'aduana', 'logistica') then
    -- fases_flujo_id_nombre_key (por flujo_id): decenas de fases por flujo.
    v_fases := coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'nombre', q.nombre) order by q.orden, q.nombre, q.id)
      from (
        select f.id, f.nombre, f.orden
        from public.fases f
        where f.flujo_id = p_flujo
          and case p_regla
                when 'vitrina_web' then f.publica_web
                when 'portal_cliente' then f.visible_portal
                when 'aduana' then f.permite_aduana
                else f.es_logistica
              end
        order by f.orden, f.nombre, f.id
        limit v_tope + 1
      ) q), '[]'::jsonb);
  elsif p_regla = 'esperas' then
    -- fases_flujo_id_nombre_key y fases_requisitos_fase_id_idx. Los requisitos no tienen borrado lógico: todos están vivos.
    v_requisitos := coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'fase', q.fase, 'fase_nombre', q.fase_nombre)
               order by q.fase_orden, q.fase_nombre, q.orden, q.id)
      from (
        select r.id, f.id as fase, f.nombre as fase_nombre, f.orden as fase_orden, r.orden
        from public.fases f
        join public.fases_requisitos r on r.fase_id = f.id
        where f.flujo_id = p_flujo and r.tipo = 'espera'
        order by f.orden, f.nombre, r.orden, r.id
        limit v_tope + 1
      ) q), '[]'::jsonb);
  end if;
  return jsonb_build_object('bloquea', v_fases <> '[]'::jsonb or v_requisitos <> '[]'::jsonb, 'fases', v_fases, 'requisitos', v_requisitos);
end $$;

comment on function public._flujo_regla_uso(uuid, text) is
  'Lo que usa una regla de un flujo: {bloquea, fases: [{id, nombre}], requisitos: [{id, fase, fase_nombre}]}. Fases (activas y jubiladas) que '
  'la marcan; en esperas, los requisitos de espera de sus fases. Listas con tope 50 (lee 51). Regla única de flujo_regla_impacto, '
  'flujo_regla_cambiar y flujo_regla_apagar_validar; sin EXECUTE para authenticated.';

revoke all on function public._flujo_regla_uso(uuid, text) from public, anon, authenticated;
grant execute on function public._flujo_regla_uso(uuid, text) to service_role;

-- El trigger, desde su definición de la base: mira la regla vieja cuando deja de estar encendida (borrarla, apagarla, o cambiarle la regla o
-- el flujo); una fila ya apagada no se valida. El borrado en cascada de un flujo pasa: el flujo ya no está y su uso no importa.
create or replace function public.flujo_regla_apagar_validar() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deja boolean;
  v_flujo_vivo boolean;
  v_bloquea boolean;
begin
  v_deja := (tg_op = 'DELETE' and old.activa)
    or (tg_op = 'UPDATE' and old.activa
        and (not new.activa or old.regla is distinct from new.regla or old.flujo_id is distinct from new.flujo_id));
  if v_deja then
    v_flujo_vivo := exists (select 1 from public.flujos where id = old.flujo_id);
    if v_flujo_vivo then
      v_bloquea := coalesce((public._flujo_regla_uso(old.flujo_id, old.regla) ->> 'bloquea')::boolean, false);
      if v_bloquea then
        raise exception 'No se puede apagar esta regla: la usan fases o requisitos de este flujo.' using errcode = '23514', hint = 'regla';
      end if;
    end if;
  end if;
  return coalesce(new, old);
end $$;
