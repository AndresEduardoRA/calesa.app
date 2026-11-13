-- El impacto de un campo privado de cartera no lee valores ajenos: la presencia (total, con valor, sin valor) sigue siendo de todos
-- los leads, porque frena cambiar el tipo o eliminar; lo que sale de los valores (fuera de rango, por opción) mira sólo los leads de
-- la cartera de quien llama, la misma regla que `atributos_lead`. Si no, acotando el rango se hallan los extremos de un campo privado.
create or replace function public.lead_campo_impacto(p_campo uuid, p_cambios jsonb default null::jsonb) returns jsonb
    language plpgsql stable security definer
    set search_path to ''
    as $$
declare c public.leads_campos; v_min numeric; v_max numeric; v_fuera int; v_yo uuid := (select auth.uid()); v_impacto jsonb;
begin
  perform public.assert_permiso('leads.campos.gestionar');
  if p_cambios is not null and jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Faltan los cambios a medir.' using errcode = '22023';
  end if;
  select * into c from public.leads_campos x where x.id = p_campo;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  -- Los fuera del rango propuesto (o del vigente), con tope 50 y uno de más; null si el campo no es numérico o no tiene límites.
  v_min := public._campo_limite(coalesce(p_cambios, '{}'::jsonb), 'minimo', c.minimo);
  v_max := public._campo_limite(coalesce(p_cambios, '{}'::jsonb), 'maximo', c.maximo);
  if c.tipo in ('numero', 'moneda') and (v_min is not null or v_max is not null) then
    select count(*)::int into v_fuera from (
      select 1 from public.leads l
      where (not c.solo_cartera or v_yo = any (l.cartera))
        and public._valor_fuera_de_rango(l.atributos -> c.clave, v_min, v_max) limit 51) q;
  end if;
  v_impacto := public._campo_impacto(array(select l.atributos -> c.clave from public.leads l), c.tipo);
  if c.solo_cartera and c.tipo in ('opcion', 'multi_opcion') then
    v_impacto := v_impacto || jsonb_build_object('por_opcion', public._campo_impacto(
      array(select l.atributos -> c.clave from public.leads l where v_yo = any (l.cartera)), c.tipo) -> 'por_opcion');
  end if;
  return v_impacto || jsonb_build_object('fuera_de_rango', v_fuera);
end;
$$;

comment on function public.lead_campo_impacto(uuid, jsonb) is 'Lo que cambiaría editar un campo de los leads: total, con valor y sin valor de todos los leads; fuera de rango (tope 51) y por opción, de todos salvo en un campo solo_cartera: ahí sólo los de la cartera de quien llama (como atributos_lead).';
