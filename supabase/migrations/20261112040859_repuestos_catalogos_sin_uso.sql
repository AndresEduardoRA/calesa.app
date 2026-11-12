-- Un valor de catálogo de repuestos en uso no se borra (paso 8.08-1, C12): se desactiva para que no se elija más.
--   · Trigger `before delete` sobre `repuestos_catalogos`. Rechaza si algún ítem (también uno eliminado: la papelera lo puede devolver) usa el valor en la
--     columna de su catálogo, o si lo usa una línea de cotización (`tipo_pieza_id`, `condicion_id`). El `set null` de esas FK no llega a correr.
--   · La función es `security definer`: quien sólo configura no lee los ítems (la RLS de `repuestos_items` pide `repuestos.ver`).
--   · 23514 «"<nombre>" está en uso: desactívalo para que no se elija más.», hint `en_uso`. Sin carrera: el trigger corre en la misma sentencia.

create function public.repuestos_catalogo_sin_uso()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare v_en_uso boolean;
begin
  v_en_uso := case old.catalogo
    when 'tipo_pieza' then exists (select 1 from public.repuestos_items i where i.tipo_pieza_id = old.id)
                        or exists (select 1 from public.repuestos_cotizaciones_lineas l where l.tipo_pieza_id = old.id)
    when 'condicion' then exists (select 1 from public.repuestos_items i where i.condicion_id = old.id)
                       or exists (select 1 from public.repuestos_cotizaciones_lineas l where l.condicion_id = old.id)
    when 'pais_origen' then exists (select 1 from public.repuestos_items i where i.pais_origen_id = old.id)
    when 'modo_transporte' then exists (select 1 from public.repuestos_items i where i.modo_transporte_id = old.id)
    else false
  end;
  if v_en_uso then
    raise exception '“%” está en uso: desactívalo para que no se elija más.', old.nombre using errcode = '23514', hint = 'en_uso';
  end if;
  return old;
end;
$$;

revoke all on function public.repuestos_catalogo_sin_uso() from public, anon, authenticated;
grant execute on function public.repuestos_catalogo_sin_uso() to service_role;

create trigger trg_sin_uso before delete on public.repuestos_catalogos for each row execute function public.repuestos_catalogo_sin_uso();
