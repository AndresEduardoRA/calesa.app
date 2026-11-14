-- El job de purga recorre hasta 50 lotes vencidos por `creado_en` en una sola transacción y retiene lo de cada uno hasta el final: antes de purgar
-- toma los lotes de vehículos y de leads, sus leads y sus vehículos, cada clase por id (el orden lead → vehículo → cotización de restaurar
-- cotizaciones); las cotizaciones vienen después, lote a lote. Tomadas lote a lote, un vehículo de un lote viejo antes que el lead de uno nuevo (o dos
-- vehículos al revés de su id) cierran un círculo con restaurar y una de las dos recibe 40P01. Su carrera: scripts/carreras/purga-contra-restaurar.mjs.

CREATE OR REPLACE FUNCTION "public"."papelera_purgar_vencidos"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_dias int; v_ids uuid[]; v_tipos public.tipo_lote_papelera[]; v_resultado jsonb; total int := 0;
begin
  select e.papelera_dias into v_dias from public.ajustes_empresa e where e.id = 1;
  -- Los 50 lotes vencidos más viejos entre los tres tipos (lotes_papelera_pendientes_idx), en el orden en que se purgan.
  select coalesce(array_agg(q.id order by q.creado_en, q.id), '{}'), coalesce(array_agg(q.tipo order by q.creado_en, q.id), '{}')
    into v_ids, v_tipos
  from (
    select l.id, l.tipo, l.creado_en from public.lotes_papelera l
    where l.tipo in ('vehiculos', 'leads', 'cotizaciones') and l.purgado_en is null and l.restaurado_en is null
      and l.creado_en < now() - make_interval(days => v_dias)
      and ((l.tipo = 'vehiculos' and exists (select 1 from public.vehiculos v where v.lote_papelera_id = l.id and v.eliminado_en is not null))
        or (l.tipo = 'leads' and exists (select 1 from public.leads x where x.lote_papelera_id = l.id and x.eliminado_en is not null))
        or (l.tipo = 'cotizaciones' and (select true from public.cotizaciones c where c.lote_papelera_id = l.id and c.eliminado_en is not null limit 1)))
    order by l.creado_en
    limit 50) q;

  -- El orden común antes de purgar nada (la transacción retiene todo hasta el final): los lotes de vehículos y de leads, sus leads y sus vehículos,
  -- cada clase por id (leads_lote_papelera_idx, vehiculos_lote_papelera_idx). Los de cotizaciones no: se toman `skip locked`, lote a lote.
  perform 1 from public.lotes_papelera l where l.id = any (v_ids) and l.tipo in ('vehiculos', 'leads') order by l.id for update;
  perform 1 from public.leads x where x.lote_papelera_id = any (v_ids) and x.eliminado_en is not null order by x.id for update;
  perform 1 from public.vehiculos v where v.lote_papelera_id = any (v_ids) and v.eliminado_en is not null order by v.id for update;

  for i in 1 .. cardinality(v_ids) loop
    begin
      if v_tipos[i] = 'cotizaciones' then
        perform 1 from public.lotes_papelera l where l.id = v_ids[i] and l.purgado_en is null and l.restaurado_en is null for no key update skip locked;
        if found then
          v_resultado := public._papelera_purgar_cotizaciones(v_ids[i], null);
          total := total + jsonb_array_length(v_resultado -> 'purgados');
        end if;
      else
        if v_tipos[i] = 'vehiculos' then
          v_resultado := public._papelera_purgar_vehiculos(v_ids[i], null);
        else
          v_resultado := public._papelera_purgar_leads(v_ids[i], null);
        end if;
        total := total + jsonb_array_length(v_resultado -> 'purgados');
      end if;
    exception when others then
      raise warning 'papelera: no se pudo purgar el lote %: %', v_ids[i], sqlerrm;
    end;
  end loop;
  return total;
end;
$$;

COMMENT ON FUNCTION "public"."papelera_purgar_vencidos"() IS 'El job papelera-purgar: purga los 50 lotes vencidos más viejos (ajustes_empresa.papelera_dias) de vehículos, leads y cotizaciones, del más viejo al más nuevo, en una transacción. Antes de purgar toma los lotes de vehículos y de leads, sus leads y sus vehículos, cada clase por id (el orden lead → vehículo → cotización); un lote de cotizaciones tomado por otro se salta. Lo que falla en un lote queda en un aviso y el resto sigue. Devuelve cuántas filas purgó.';
