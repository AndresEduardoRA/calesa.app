-- Leer requisitos ya no es de `authenticated` (paso 6.02-1, C7 y C8). `evaluar_requisitos` y `unidad_llego_a_fase` son `security definer` y no miraban
-- quién preguntaba: cualquiera con sesión leía los requisitos (y sus documentos aprobados) de una unidad que no ve. Las llaman sólo funciones `definer`
-- que ya miran el acceso (`previsualizar_cambio_fase`, `_vehiculo_fase_de_entrada`, `flujo_fuera_de_regla`, `requisito_impacto` y la propia
-- `evaluar_requisitos`): pierden el `execute` de `authenticated`. Además el `detalle` suma lo que la interfaz necesita para la etiqueta y el atajo: el
-- `tipo_documento_id` en los de documento y la `clave_dato` en los de dato (hasta aquí sólo venía «Dato: transporte.contenedor» en la descripción).

create or replace function public.evaluar_requisitos(p_vehiculo uuid, p_repuesto uuid, p_fase uuid)
returns table (requisito_id uuid, tipo public.tipo_requisito, bloqueante boolean, descripcion text, cumplido boolean, detalle jsonb)
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare r record; n int; ok boolean; d jsonb; v_padre uuid; v_hijos int; v_hijos_ok int;
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
        -- vehículo espera a sus repuestos (los en stock no cuentan). Sin hijos = no aplica = cumple.
        select count(*), count(*) filter (where public.unidad_llego_a_fase(null, i.id, r.espera_fase_id)) into v_hijos, v_hijos_ok
        from public.repuestos_items i join public.repuestos_proyectos pr on pr.id = i.proyecto_id
        where pr.vehiculo_id = p_vehiculo and i.eliminado_en is null and i.en_stock_desde is null and pr.eliminado_en is null;
        ok := v_hijos = 0 or v_hijos = v_hijos_ok;
        d := jsonb_build_object('hijos', v_hijos, 'llegaron', v_hijos_ok);
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

revoke all on function public.unidad_llego_a_fase(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.unidad_llego_a_fase(uuid, uuid, uuid) to service_role;
