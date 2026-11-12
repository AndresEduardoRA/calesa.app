-- Un ítem de repuesto que terminó sin llegar no frena al vehículo que lo espera (paso 8.08-1, C10; contradicción 3 de la Fase 8).
--   · `_repuesto_ante_espera(item, fase)`: `llego` si el ítem está en la fase esperada o llegó a ella (`unidad_llego_a_fase`); `sin_llegar` si no
--     llegó y su fase actual es final (p. ej. «Perdido»); si no, `pendiente` (también sin fase). Sólo la ejecuta `service_role`.
--   · `evaluar_requisitos` se recrea desde la del 6.02-1 (`20261112023127_fases_requisitos_sin_execute.sql`) y sólo cambia la rama `hijos`: cumple si
--     todos los ítems vivos fuera de stock llegaron o terminaron sin llegar, y el `detalle` suma `sin_llegar`. Antes, un ítem «Perdido» frenaba al
--     vehículo para siempre: `unidad_llego_a_fase` no da por llegada una unidad cuya fase actual es final.

create function public._repuesto_ante_espera(p_item uuid, p_fase uuid)
returns text
language sql stable security definer
set search_path = ''
as $f$
  select case
    when i.fase_id = p_fase or public.unidad_llego_a_fase(null, i.id, p_fase) then 'llego'
    when fa.es_final then 'sin_llegar'
    else 'pendiente'
  end
  from public.repuestos_items i
  left join public.fases fa on fa.id = i.fase_id
  where i.id = p_item;
$f$;

revoke all on function public._repuesto_ante_espera(uuid, uuid) from public, anon, authenticated;
grant execute on function public._repuesto_ante_espera(uuid, uuid) to service_role;

create or replace function public.evaluar_requisitos(p_vehiculo uuid, p_repuesto uuid, p_fase uuid)
returns table (requisito_id uuid, tipo public.tipo_requisito, bloqueante boolean, descripcion text, cumplido boolean, detalle jsonb)
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare r record; n int; ok boolean; d jsonb; v_padre uuid; v_hijos int; v_hijos_ok int; v_sin_llegar int;
begin
  for r in select q.*, td.nombre as tipo_doc_nombre, td.formatos as tipo_doc_formatos, fe.nombre as espera_nombre
           from public.fases_requisitos q
           left join public.tipos_documento td on td.id = q.tipo_documento_id
           left join public.fases fe on fe.id = q.espera_fase_id
           where q.fase_id = p_fase order by q.orden loop
    d := '{}'::jsonb;
    if r.tipo = 'documento' then
      select count(*) into n from public.documentos doc
      where doc.vehiculo_id is not distinct from p_vehiculo and doc.repuesto_id is not distinct from p_repuesto
        and doc.tipo_documento_id = r.tipo_documento_id and doc.estado = 'aprobado' and doc.eliminado_en is null
        and (doc.vence_el is null or doc.vence_el >= current_date)
        and (r.formatos is null or doc.mime is null or doc.mime = any (r.formatos));
      ok := n >= coalesce(r.min_archivos, 1) and (r.max_archivos is null or n <= r.max_archivos);
      d := jsonb_build_object('aprobados', n, 'min', coalesce(r.min_archivos, 1), 'max', r.max_archivos, 'tipo_documento_id', r.tipo_documento_id);
      requisito_id := r.id; tipo := r.tipo; bloqueante := r.bloqueante; descripcion := 'Documento: ' || r.tipo_doc_nombre; cumplido := ok; detalle := d;
      return next;
    elsif r.tipo = 'dato' then
      ok := public._requisito_dato_cumplido(p_vehiculo, p_repuesto, r.clave_dato, r.config);
      requisito_id := r.id; tipo := r.tipo; bloqueante := r.bloqueante; descripcion := 'Dato: ' || r.clave_dato; cumplido := ok; detalle := coalesce(r.config, '{}'::jsonb) || jsonb_build_object('clave_dato', r.clave_dato);
      return next;
    elsif r.tipo = 'espera' then
      if r.espera_ambito = 'hijos' then
        -- vehículo espera a sus repuestos (los en stock no cuentan). Sin hijos = no aplica = cumple. Un ítem que terminó sin llegar (en una fase
        -- final que no es la esperada: «Perdido») no frena (8.08-1, C10): cuenta en `sin_llegar`. La regla vive en `_repuesto_ante_espera`.
        select count(*), count(*) filter (where e.estado = 'llego'), count(*) filter (where e.estado = 'sin_llegar')
          into v_hijos, v_hijos_ok, v_sin_llegar
        from public.repuestos_items i join public.repuestos_proyectos pr on pr.id = i.proyecto_id
        cross join lateral (select public._repuesto_ante_espera(i.id, r.espera_fase_id) as estado) e
        where pr.vehiculo_id = p_vehiculo and i.eliminado_en is null and i.en_stock_desde is null and pr.eliminado_en is null;
        ok := v_hijos = v_hijos_ok + v_sin_llegar;
        d := jsonb_build_object('hijos', v_hijos, 'llegaron', v_hijos_ok, 'sin_llegar', v_sin_llegar);
      else
        select pr.vehiculo_id into v_padre from public.repuestos_items i join public.repuestos_proyectos pr on pr.id = i.proyecto_id where i.id = p_repuesto;
        ok := v_padre is null or public.unidad_llego_a_fase(v_padre, null, r.espera_fase_id);
        d := jsonb_build_object('padre', v_padre);
      end if;
      requisito_id := r.id; tipo := r.tipo; bloqueante := r.bloqueante; descripcion := 'Espera: ' || r.espera_nombre; cumplido := ok; detalle := d;
      return next;
    end if;
  end loop;
end;
$$;

revoke all on function public.evaluar_requisitos(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.evaluar_requisitos(uuid, uuid, uuid) to service_role;
