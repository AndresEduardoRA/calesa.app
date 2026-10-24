-- El motivo de uso de un nivel, en una sola pasada (paso 4.09, prompt 2).
--
-- `_nivel_motivo_de_uso()` (…006500) preguntaba primero `_nivel_en_uso()` (¿lo nombra alguna versión?) y, si sí, `_nivel_uso()` (cuánto). Las dos recorren, con el índice de
-- niveles, todas las versiones que lo nombran: con 2.000 versiones, 22 ms cada una. La lista de la pantalla lo calcula hasta 10 veces al abrirse y en la respuesta de cada
-- escritura, así que se pregunta una sola vez: `_nivel_uso()` cuenta los orígenes cuya versión más nueva lo nombra, y sin ninguno no hay uso. Es lo mismo que decía
-- `_nivel_en_uso()` (una versión que lo nombra siempre es de un origen), y un nivel que ninguna versión nombra sigue costando lo que una sonda vacía del índice.
-- (Se probó recorrer cada origen hacia atrás por `(origen_id, version)`: con 200 versiones salía 4 veces peor, porque un origen que no lo nombra obliga a recorrer todo su historial.)

create or replace function public._nivel_motivo_de_uso(p_clave text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_uso jsonb; v_celdas int; v_secciones int; v_origenes int; v_retirado boolean;
begin
  v_uso := public._nivel_uso(p_clave);
  v_origenes := (v_uso ->> 'origenes')::int;
  if v_origenes = 0 then
    return null;
  end if;
  v_celdas := (v_uso ->> 'celdas')::int; v_secciones := (v_uso ->> 'secciones')::int;
  select n.retirado_en is not null into v_retirado from public.cotizaciones_niveles n where n.clave = p_clave;
  -- «Puedes retirarlo» sólo si falta: uno ya retirado no tiene qué más ofrecer.
  return format('Está en %s de %s (en alguna versión de su fórmula): no se elimina.%s',
    case when v_celdas > 0 then v_celdas || case when v_celdas = 1 then ' celda' else ' celdas' end
         else v_secciones || case when v_secciones = 1 then ' sección' else ' secciones' end end,
    v_origenes || case when v_origenes = 1 then ' origen' else ' orígenes' end,
    case when coalesce(v_retirado, false) then ''
         else ' Puedes retirarlo: deja de ofrecerse y lo que ya lo usa se sigue filtrando igual.' end);
end;
$$;
revoke all on function public._nivel_motivo_de_uso(text) from public, anon, authenticated;
