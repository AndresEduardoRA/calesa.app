-- La búsqueda del equipo exige 3 letras o dígitos seguidos, como la de leads (5a-31, `docs/PLAN.md`).
--
-- Un texto sin un tramo de 3 («zq», «a b c», «%») no tiene qué buscar en el trigram (`perfiles_busqueda_idx`), y `equipo_lista()` caminaba todo el
-- orden buscándolo: con uno que no coincide con nadie, 4.117 buffers y 172 ms con 100.000 personas, y crecía con la tabla. Ahora con menos de 3
-- la RPC devuelve la lista sin filtro de texto (la etapa `todo` sin texto: lo de siempre, ≤ 150 buffers). El campo ya no lo manda
-- (`MINIMO_DE_BUSQUEDA_DEL_EQUIPO` con `cumpleElMinimo()`, «Escribe al menos 3 letras»); esto cubre una URL escrita a mano (`?q=zq`) o un
-- cliente que no pasa por el campo. La regla es la de `_equipo_lista_indexable()` (`[[:alnum:]]{3}` sobre el texto sin tildes), espejo de
-- `cumpleElMinimo()` (`[\p{L}\p{Nd}]{3}`). Lo asertan `supabase/tests/equipo-lista.sql` y `supabase/tests/medir-equipo.sql`.

create or replace function public.equipo_lista(p_texto text default null, p_estado text default 'vigentes', p_limite int default 101)
returns setof uuid language plpgsql stable security definer set search_path = '' as $$
declare
  v_limite int := public._acotar_pagina(p_limite, 101, 101);  -- el tope de la lista, 100, y una más para saber si hay otras
  v_texto text := left(btrim(coalesce(p_texto, '')), 100);
  v_ids uuid[];
begin
  perform public.assert_activo();
  if not (public.tiene_permiso('equipo.usuarios.ver') or public.tiene_permiso('equipo.usuarios.gestionar')) then
    raise exception 'No tienes el permiso «equipo.usuarios.ver».' using errcode = '42501';
  end if;
  -- Sin texto, o con uno de menos de 3 letras o dígitos seguidos: la lista sin filtro de texto (5a-31).
  if v_texto = '' or not public._equipo_lista_indexable(v_texto) then
    return query execute public._equipo_lista_sql(null, p_estado, v_limite, 'todo');
    return;
  end if;
  execute public._equipo_lista_sql(v_texto, p_estado, v_limite, 'recorrer') into v_ids;
  -- Juntó el límite: no hay nada más que buscar.
  if cardinality(v_ids) >= v_limite then
    return query select unnest(v_ids);
    return;
  end if;
  -- El texto tiene un tramo indexable: lo que no apareció en las primeras S, por el trigram.
  return query execute public._equipo_lista_sql(v_texto, p_estado, v_limite, 'indice');
end;
$$;
revoke all on function public.equipo_lista(text, text, int) from public, anon;
grant execute on function public.equipo_lista(text, text, int) to authenticated;
