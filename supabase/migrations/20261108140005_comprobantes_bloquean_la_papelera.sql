-- Una cotización con comprobante no va a la papelera (paso 4.26-1, P3 a de la persona, 2026-11-08; resuelve el P4 del 4.24).
--
-- `_cotizacion_a_papelera` (la de `…_papelera_cotizaciones_pide_ver.sql`) no miraba los comprobantes: una final con comprobante entraba a la papelera y la
-- purga la dejaba «bloqueada» para siempre (la FK es `restrict` y un comprobante no se borra). Ahora, sobre la fila tomada y después del permiso, si la
-- cotización tiene algún comprobante (anulado o no), 23514 «Tiene un comprobante emitido.», como un vehículo (`_vehiculo_motivo_de_bloqueo`). La genérica
-- `papelera_enviar` aborta con eso; `cotizaciones_papelera_enviar` lo deja en `rechazados`. El otro camino a la papelera, `_final_aplicar`, lo cierra
-- `…_final_con_comprobante.sql`. Pruebas: PU8 de `supabase/tests/areas/papelera/purgar.sql` y K6 de `areas/comprobantes/carreras-papelera.mjs`.

create or replace function public._cotizacion_a_papelera(p_id uuid, p_lote uuid, p_con_version boolean, p_esperado timestamptz) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare c public.cotizaciones; v_puede boolean;
begin
  -- 1. Sin candado: quien no la ve recibe lo mismo que si no existiera, antes de tomar nada.
  perform 1 from public.cotizaciones x where x.id = p_id and x.eliminado_en is null;
  if not found or not public.puede_cotizacion(p_id, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;

  -- 2. La fila viva, tomada (como `cotizacion_marcar_final`: no choca con las hijas que la referencian).
  select * into c from public.cotizaciones x where x.id = p_id and x.eliminado_en is null for no key update;
  if not found then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;

  -- 3. Sobre la fila tomada (la clase pudo cambiar mientras se esperaba): ver, y el permiso de su clase.
  if not public.puede_cotizacion(c.id, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  if c.clase = 'final' then
    v_puede := public.tiene_permiso('cotizaciones.final.gestionar', c.origen_id);
  else
    v_puede := public.puede_cotizacion(c.id, 'cotizaciones.editar') or public.tiene_permiso('cotizaciones.moderar');
  end if;
  if not v_puede then
    raise exception 'No tienes permiso para enviarla a la papelera.' using errcode = '42501';
  end if;

  -- 3 bis. Con un comprobante (anulado o no) no entra (P3 a del 4.26): un comprobante no se borra y la FK `restrict` nunca dejaría purgarla. Sobre la fila
  -- tomada: emitir toma la misma fila, así que no se cuela uno entre esta mirada y el `update`.
  if exists (select 1 from public.comprobantes cp where cp.cotizacion_id = c.id) then
    raise exception 'Tiene un comprobante emitido.' using errcode = '23514';
  end if;

  -- 4. La versión que quien llama tenía en pantalla, si se la piden.
  if p_con_version then
    if p_esperado is null then
      raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.' using errcode = '22023';
    end if;
    if c.actualizado_en is distinct from p_esperado then
      perform public._conflicto_de_edicion('cotizaciones', c.id, c.actualizado_en, 'esta cotización');
    end if;
  end if;

  update public.cotizaciones x set eliminado_en = now(), eliminado_por = (select auth.uid()), lote_papelera_id = p_lote where x.id = c.id;
  return jsonb_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo);
end;
$$;

comment on function public._cotizacion_a_papelera(uuid, uuid, boolean, timestamptz) is 'Manda una cotización viva al lote p_lote si quien llama puede: la ve (antes de tomar la fila y otra vez después; si no, el 42501 de lo inexistente) y, una preventa, editar por su alcance o moderar; una final, cotizaciones.final.gestionar del origen; con un comprobante (anulado o no), 23514 (4.26-1). Con p_con_version compara p_esperado (nula: 22023; distinta: PT409). Devuelve {id, numero, titulo}. De nadie: la llaman papelera_enviar y cotizaciones_papelera_enviar.';
revoke all on function public._cotizacion_a_papelera(uuid, uuid, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public._cotizacion_a_papelera(uuid, uuid, boolean, timestamptz) to service_role;
