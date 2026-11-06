-- La purga automática de la papelera incluye las cotizaciones (4.24-1b).
--
-- `papelera_purgar_vencidos()` (el job de cada hora, sin sesión) purgaba sólo los lotes de vehículos y leads: los de cotizaciones quedaban para siempre.
-- Ahora también los de cotizaciones, por el ayudante de la propia (`_papelera_purgar_cotizaciones`: lo bloqueado se queda, las rutas por refcount),
-- con los mismos 50 lotes por corrida entre los tres tipos.
--
-- «Le queda alguna en la papelera» es, para cotizaciones, una sonda por lote (`select true … limit 1`) y no un `exists`: con pocas en la papelera, el plan
-- genérico del `exists` es un semi join que lee entero `cotizaciones_lote_papelera_idx` (lo midió el 4.24-1a en su lista de lotes).
-- El lote de cotizaciones se toma `for no key update skip locked`: uno que alguien restaura o purga a mano se salta y vuelve en la corrida siguiente.
-- Sin el `skip locked`, el job, que ya retiene las filas de los lotes de vehículos o de leads que purgó en esta transacción, esperaría el lote que tiene
-- un restaurar que a su vez espera uno de esos vehículos o leads (`_papelera_restaurar_cotizaciones` los toma `for key share`): 40P01.
--
-- El índice por ruta de los adjuntos: cada adjunto purgado pasa por `storage_refcount('cotizaciones', ruta)`, que sin él recorre `cotizaciones_adjuntos`
-- entera por ruta (hasta 10.000 por corrida). Lo mide `supabase/tests/medir-jobs.sql`.
-- Pruebas: `supabase/tests/areas/papelera/purga-automatica.sql`.

create index cotizaciones_adjuntos_ruta_idx on public.cotizaciones_adjuntos (ruta);
comment on index public.cotizaciones_adjuntos_ruta_idx is 'El refcount de storage (storage_refcount(''cotizaciones'', ruta)) al purgar la papelera de cotizaciones: una ruta, sin recorrer la tabla (4.24-1b).';

create or replace function public.papelera_purgar_vencidos()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare v_dias int; r record; v_resultado jsonb; total int := 0;
begin
  select e.papelera_dias into v_dias from public.ajustes_empresa e where e.id = 1;
  -- Los 50 lotes vencidos más viejos entre los tres tipos (lotes_papelera_pendientes_idx).
  for r in
    select l.id, l.tipo from public.lotes_papelera l
    where l.tipo in ('vehiculos', 'leads', 'cotizaciones') and l.purgado_en is null and l.restaurado_en is null
      and l.creado_en < now() - make_interval(days => v_dias)
      and ((l.tipo = 'vehiculos' and exists (select 1 from public.vehiculos v where v.lote_papelera_id = l.id and v.eliminado_en is not null))
        or (l.tipo = 'leads' and exists (select 1 from public.leads x where x.lote_papelera_id = l.id and x.eliminado_en is not null))
        or (l.tipo = 'cotizaciones' and (select true from public.cotizaciones c where c.lote_papelera_id = l.id and c.eliminado_en is not null limit 1)))
    order by l.creado_en
    limit 50
  loop
    begin
      if r.tipo = 'cotizaciones' then
        perform 1 from public.lotes_papelera l where l.id = r.id and l.purgado_en is null and l.restaurado_en is null for no key update skip locked;
        if found then
          v_resultado := public._papelera_purgar_cotizaciones(r.id, null);
          total := total + jsonb_array_length(v_resultado -> 'purgados');
        end if;
      else
        perform 1 from public.lotes_papelera l where l.id = r.id for update;
        if r.tipo = 'vehiculos' then
          v_resultado := public._papelera_purgar_vehiculos(r.id, null);
        else
          v_resultado := public._papelera_purgar_leads(r.id, null);
        end if;
        total := total + jsonb_array_length(v_resultado -> 'purgados');
      end if;
    exception when others then
      raise warning 'papelera: no se pudo purgar el lote %: %', r.id, sqlerrm;
    end;
  end loop;
  return total;
end;
$$;

-- `create or replace` conserva los privilegios: el job es sólo de service_role (se repiten explícitos).
revoke all on function public.papelera_purgar_vencidos() from public, anon, authenticated;
grant execute on function public.papelera_purgar_vencidos() to service_role;
