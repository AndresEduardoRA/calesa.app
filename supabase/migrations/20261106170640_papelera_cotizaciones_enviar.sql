-- La papelera propia de cotizaciones: enviar por lote con versión (4.24-1a), como `vehiculos_papelera_enviar`.
--
-- Recibe hasta 200 `{id, actualizado_en}` (la versión que quien envía tenía en pantalla). Cada cotización va en su bloque por `_cotizacion_a_papelera()`
-- (pide verla antes de tomar su fila, y el permiso de su clase: 4-68): lo que no se puede queda en `rechazados` con su código y su motivo, y el resto
-- se envía en un lote `cotizaciones` con su resumen y su versión. «Deshacer» es restaurar ese lote con esa versión (4.24-1b).
-- Una que quien llama no ve no deja leer su título. Sin ninguna enviada no queda lote.
-- Pruebas: `supabase/tests/areas/papelera/enviar.sql`.

create function public.cotizaciones_papelera_enviar(p_cotizaciones jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $_$
declare
  e record; v_lote uuid; v_version timestamptz; v_mensaje text; v_codigo text; v_titulo text;
  v_enviados jsonb := '[]'::jsonb; v_rechazados jsonb := '[]'::jsonb;
begin
  perform public.assert_activo();
  if jsonb_typeof(p_cotizaciones) is distinct from 'array' or jsonb_array_length(p_cotizaciones) = 0 then
    raise exception 'No llegó ninguna cotización.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_cotizaciones) > 200 then
    raise exception 'Se envían hasta 200 por vez.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_cotizaciones) x
    where jsonb_typeof(x) <> 'object'
       or coalesce(x ->> 'id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(x ->> 'actualizado_en', '2000-01-01') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}') then
    raise exception 'Una de las cotizaciones llegó incompleta. Recarga e intenta de nuevo.' using errcode = '22023';
  end if;

  insert into public.lotes_papelera (tipo, creado_por) values ('cotizaciones', (select auth.uid())) returning id into v_lote;
  for e in
    select distinct on (x ->> 'id') (x ->> 'id')::uuid as id, x ->> 'actualizado_en' as version
    from jsonb_array_elements(p_cotizaciones) x order by x ->> 'id'
  loop
    begin
      v_enviados := v_enviados || public._cotizacion_a_papelera(e.id, v_lote, true, e.version::timestamptz);
    exception when others then
      get stacked diagnostics v_mensaje = message_text, v_codigo = returned_sqlstate;
      -- Sólo lo que escribimos nosotros llega a la pantalla (22023: falta la versión).
      if v_codigo not in ('PT409', '42501', '23514', '22023', 'P0001') then
        v_mensaje := 'No se pudo enviar. Vuelve a intentarlo.';
      end if;
      -- El título, sólo de lo que quien llama ve.
      v_titulo := null;
      select coalesce(x.titulo, 'Cotización #' || x.numero) into v_titulo from public.cotizaciones x
       where x.id = e.id and public.puede_cotizacion(x.id, 'cotizaciones.ver');
      v_rechazados := v_rechazados || jsonb_build_object('id', e.id, 'titulo', v_titulo, 'codigo', v_codigo, 'motivo', v_mensaje);
    end;
  end loop;

  if jsonb_array_length(v_enviados) = 0 then
    delete from public.lotes_papelera l where l.id = v_lote;
    return jsonb_build_object('lote', null, 'actualizado_en', null, 'enviados', v_enviados, 'rechazados', v_rechazados);
  end if;
  update public.lotes_papelera l
  set resumen = jsonb_build_object('cantidad', jsonb_array_length(v_enviados), 'restaurados', 0, 'purgados', 0)
  where l.id = v_lote;
  v_version := public._lote_papelera_tocar(v_lote);
  perform public.registrar_actividad('papelera.enviado', 'lotes_papelera', v_lote::text, null, null,
    jsonb_build_object('tipo', 'cotizaciones', 'cantidad', jsonb_array_length(v_enviados)));
  return jsonb_build_object('lote', v_lote, 'actualizado_en', v_version, 'enviados', v_enviados, 'rechazados', v_rechazados);
end;
$_$;

comment on function public.cotizaciones_papelera_enviar(jsonb) is 'Manda a la papelera de cotizaciones hasta 200 {id, actualizado_en}, cada una por _cotizacion_a_papelera (ver antes del candado, el permiso de su clase y la versión). Devuelve {lote, actualizado_en, enviados: [{id, numero, titulo}], rechazados: [{id, titulo, codigo, motivo}]}; sin enviadas, lote nulo y ningún lote. El título de un rechazo, sólo si quien llama la ve.';
revoke all on function public.cotizaciones_papelera_enviar(jsonb) from public, anon;
grant execute on function public.cotizaciones_papelera_enviar(jsonb) to authenticated, service_role;
