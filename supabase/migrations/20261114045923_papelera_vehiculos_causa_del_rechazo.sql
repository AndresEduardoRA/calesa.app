-- Lo que frena a un vehículo (enviarlo a la papelera, purgarlo, la limpieza) ahora dice también *cuál* regla lo frenó, con una clave:
-- `_vehiculo_bloqueo()` devuelve `{causa, motivo}` y `_vehiculo_motivo_de_bloqueo()` queda como su texto. Así el orden de las reglas
-- vive en un solo lugar y la pantalla traduce la causa a acciones sin casar texto (`entities/avisos-de-vehiculo.ts`).
-- `_vehiculo_a_papelera()` levanta el 23514 con la causa en el `hint` y `vehiculos_papelera_enviar()` la suma a cada rechazado.
-- Su prueba: supabase/tests/areas/papelera/vehiculos-causa-del-rechazo.sql.
--
-- Causas: vinculado, fase, comprobante, final, cotizacion_papelera (sólo al purgar), documentos, pagos, aduana, repuestos.

create or replace function public._vehiculo_bloqueo(v public.vehiculos, p_al_enviar boolean) returns jsonb
  language plpgsql stable security definer set search_path = ''
as $$
declare v_fase public.fases;
begin
  if v.lead_id is not null then
    return jsonb_build_object('causa', 'vinculado', 'motivo', 'Está vinculado a un lead. Quita el vínculo antes.');
  end if;
  if p_al_enviar and v.fase_id is not null then
    select * into v_fase from public.fases f where f.id = v.fase_id;
    if not v_fase.es_inicial then
      return jsonb_build_object('causa', 'fase',
        'motivo', format('Está en «%s». Sólo va a la papelera lo que sigue en su fase inicial.', v_fase.nombre));
    end if;
  end if;
  if exists (select 1 from public.comprobantes cp join public.cotizaciones c on c.id = cp.cotizacion_id where c.vehiculo_id = v.id) then
    return jsonb_build_object('causa', 'comprobante', 'motivo', 'Tiene un comprobante emitido.');
  end if;
  -- Una final activa y viva (cotizaciones_final_por_vehiculo), también sin lead; después del comprobante, que no deja mandarla a la papelera.
  -- En la papelera ninguna está viva: se fueron con el vehículo.
  if exists (select 1 from public.cotizaciones c
              where c.vehiculo_id = v.id and c.clase = 'final' and c.estado = 'activa' and c.eliminado_en is null) then
    return jsonb_build_object('causa', 'final', 'motivo', 'Tiene una cotización final. Mándala a la papelera antes.');
  end if;
  -- Purgar frena con una cotización de otro lote de la papelera que lo nombra (cotizaciones_vehiculo_papelera_idx): las de su lote se purgan con él.
  if not p_al_enviar and exists (select 1 from public.cotizaciones c
                                  where c.vehiculo_id = v.id and c.eliminado_en is not null
                                    and c.lote_papelera_id is distinct from v.lote_papelera_id) then
    return jsonb_build_object('causa', 'cotizacion_papelera', 'motivo', 'Tiene una cotización en la papelera. Púrgala antes.');
  end if;
  -- Enviar a la papelera (y la limpieza, que pregunta con p_al_enviar) frena con documentos vivos: los cargó alguien y son de la logística. La purga
  -- de lo que ya está en la papelera no frena: junta sus rutas y las encola para limpiar (`_papelera_purgar_vehiculos`), como siempre.
  if p_al_enviar and exists (select 1 from public.documentos d where d.vehiculo_id = v.id and d.eliminado_en is null) then
    return jsonb_build_object('causa', 'documentos', 'motivo', 'Tiene documentos cargados.');
  end if;
  if exists (select 1 from public.pagos p where p.vehiculo_id = v.id) or exists (select 1 from public.gastos g where g.vehiculo_id = v.id) then
    return jsonb_build_object('causa', 'pagos', 'motivo', 'Tiene pagos o gastos registrados.');
  end if;
  if exists (select 1 from public.declaraciones_vehiculos d where d.vehiculo_id = v.id and d.removido_en is null) then
    return jsonb_build_object('causa', 'aduana', 'motivo', 'Está en una declaración aduanera.');
  end if;
  if exists (select 1 from public.repuestos_proyectos r where r.vehiculo_id = v.id and r.eliminado_en is null) then
    return jsonb_build_object('causa', 'repuestos', 'motivo', 'Tiene un proyecto de repuestos.');
  end if;
  return null;
end;
$$;

revoke all on function public._vehiculo_bloqueo(public.vehiculos, boolean) from public, anon, authenticated;
grant execute on function public._vehiculo_bloqueo(public.vehiculos, boolean) to service_role;

-- El texto de siempre, ahora como la mitad de `_vehiculo_bloqueo()`: sus tres llamadores (limpieza, purga y lote de la papelera) no cambian.
create or replace function public._vehiculo_motivo_de_bloqueo(v public.vehiculos, p_al_enviar boolean) returns text
  language plpgsql stable security definer set search_path = ''
as $$
begin
  return (public._vehiculo_bloqueo(v, p_al_enviar)) ->> 'motivo';
end;
$$;

create or replace function public._vehiculo_a_papelera(p_vehiculo uuid, p_esperado timestamptz, p_lote uuid) returns jsonb
  language plpgsql security definer set search_path = ''
as $$
declare v public.vehiculos; v_bloqueo jsonb;
begin
  select * into v from public.vehiculos x where x.id = p_vehiculo and x.eliminado_en is null for update;
  if not found then
    raise exception 'Ya no existe o ya está en la papelera.' using errcode = 'PT409';
  end if;
  if not public.puede_vehiculo(v.id, 'vehiculos.eliminar') then
    raise exception 'No tienes permiso para enviarlo a la papelera.' using errcode = '42501';
  end if;
  if p_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if v.actualizado_en is distinct from p_esperado then
    perform public._conflicto_de_edicion('vehiculos', v.id, v.actualizado_en, 'este vehículo');
  end if;
  v_bloqueo := public._vehiculo_bloqueo(v, true);
  if v_bloqueo is not null then
    raise exception '%', v_bloqueo ->> 'motivo' using errcode = '23514', hint = v_bloqueo ->> 'causa';
  end if;
  return public._vehiculo_a_lote(v, p_lote);
end;
$$;

create or replace function public.vehiculos_papelera_enviar(p_vehiculos jsonb) returns jsonb
  language plpgsql security definer set search_path = ''
as $_$
declare
  e record; v_lote uuid; v_version timestamptz; v_mensaje text; v_codigo text; v_pista text; v_titulo text;
  v_enviados jsonb := '[]'::jsonb; v_rechazados jsonb := '[]'::jsonb;
begin
  perform public.assert_activo();
  if jsonb_typeof(p_vehiculos) is distinct from 'array' or jsonb_array_length(p_vehiculos) = 0 then
    raise exception 'No llegó ningún vehículo.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_vehiculos) > 200 then
    raise exception 'Se envían hasta 200 por vez.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_vehiculos) x
    where jsonb_typeof(x) <> 'object'
       or coalesce(x ->> 'id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(x ->> 'actualizado_en', '2000-01-01') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}') then
    raise exception 'Uno de los vehículos llegó incompleto. Recarga e intenta de nuevo.' using errcode = '22023';
  end if;

  insert into public.lotes_papelera (tipo, creado_por) values ('vehiculos', (select auth.uid())) returning id into v_lote;
  for e in
    select distinct on (x ->> 'id') (x ->> 'id')::uuid as id, x ->> 'actualizado_en' as version
    from jsonb_array_elements(p_vehiculos) x order by x ->> 'id'
  loop
    begin
      v_enviados := v_enviados || public._vehiculo_a_papelera(e.id, e.version::timestamptz, v_lote);
    exception when others then
      get stacked diagnostics v_mensaje = message_text, v_codigo = returned_sqlstate, v_pista = pg_exception_hint;
      -- Sólo lo que escribimos nosotros llega a la pantalla.
      if v_codigo not in ('PT409', '42501', '23514', 'P0001') then
        v_mensaje := 'No se pudo enviar. Vuelve a intentarlo.';
      end if;
      -- El título, sólo de lo que quien llama ve.
      select x.titulo into v_titulo from public.vehiculos x where x.id = e.id and public.puede_vehiculo(x.id, 'vehiculos.ver');
      -- La causa, sólo de un bloqueo (23514): en un conflicto o sin permiso no hay regla que nombrar.
      v_rechazados := v_rechazados || jsonb_build_object('id', e.id, 'titulo', v_titulo, 'codigo', v_codigo, 'motivo', v_mensaje,
        'causa', case when v_codigo = '23514' then nullif(v_pista, '') end);
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
    jsonb_build_object('tipo', 'vehiculos', 'cantidad', jsonb_array_length(v_enviados)));
  return jsonb_build_object('lote', v_lote, 'actualizado_en', v_version, 'enviados', v_enviados, 'rechazados', v_rechazados);
end;
$_$;
