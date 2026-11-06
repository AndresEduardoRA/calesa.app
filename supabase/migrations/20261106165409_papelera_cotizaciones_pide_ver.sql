-- Mandar una cotización a la papelera pide lo que pide guardarla (4.24-1a, cierra 4-68).
--
-- `papelera_enviar('cotizaciones', …)` pedía `cotizaciones.editar` (o `moderar`) y nunca `ver`: quien edita sin ver la mandaba, y con `moderar` un id
-- inexistente o ya en la papelera se salteaba en silencio. Ahora un ayudante decide, por cotización y en el orden de guardar (4-34):
--   1. sin candado, si quien llama la ve; si no la ve, no existe o ya está en la papelera, 42501 «No tienes acceso a esta cotización.» (lo mismo y en el
--      mismo momento: quien no la ve nunca toma ni espera su candado);
--   2. toma la fila viva; 3. sobre la fila tomada, otra vez ver, y el permiso: una preventa, `editar` por su alcance o `moderar`; una final,
--      `cotizaciones.final.gestionar` del origen (como `_cotizacion_puede_guardar()`, P3 a);
--   4. si se lo piden, la versión (la RPC propia de 4.24-1a; la genérica no la pasa).
-- La genérica conserva firma, retorno, orden y textos hasta el lote (los esperan `matriz-leads.sql`, `humo.sql` y las carreras del A); cambia el texto del permiso
-- y es todo o nada: el primer rechazo aborta. `cotizacion_marcar_final()` la llama con los derechos de quien marca: si no ve una preventa viva del vehículo,
-- no marca (P9 a; el 4.25 la reescribe). El lote queda con su resumen completo y su versión, como el de vehículos.
-- Pruebas: `supabase/tests/areas/papelera/pide-ver.sql`.

create function public._cotizacion_a_papelera(p_id uuid, p_lote uuid, p_con_version boolean, p_esperado timestamptz) returns jsonb
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

comment on function public._cotizacion_a_papelera(uuid, uuid, boolean, timestamptz) is 'Manda una cotización viva al lote p_lote si quien llama puede: la ve (antes de tomar la fila y otra vez después; si no, el 42501 de lo inexistente) y, una preventa, editar por su alcance o moderar; una final, cotizaciones.final.gestionar del origen. Con p_con_version compara p_esperado (nula: 22023; distinta: PT409). Devuelve {id, numero, titulo}. De nadie: la llaman papelera_enviar y cotizaciones_papelera_enviar.';
revoke all on function public._cotizacion_a_papelera(uuid, uuid, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public._cotizacion_a_papelera(uuid, uuid, boolean, timestamptz) to service_role;

create or replace function public.papelera_enviar(p_tipo public.tipo_lote_papelera, p_ids uuid[]) returns uuid
  language plpgsql security definer
  set search_path = ''
as $$
declare v_lote uuid; v_id uuid; n int := 0;
begin
  perform public.assert_activo();
  perform public._papelera_solo_cotizaciones(p_tipo);
  if coalesce(array_length(p_ids, 1), 0) = 0 then raise exception 'Nada que enviar.' using errcode = '22023'; end if;
  if array_length(p_ids, 1) > 200 then raise exception 'Máximo 200 por lote.' using errcode = '22023'; end if;
  insert into public.lotes_papelera (tipo, creado_por) values (p_tipo, (select auth.uid())) returning id into v_lote;
  -- Una a una, en orden de id (como la papelera de vehículos), todo o nada: el primer rechazo aborta con su código y su texto. Un id nulo es uno inexistente.
  for v_id in select distinct x from unnest(p_ids) x order by 1 loop
    perform public._cotizacion_a_papelera(v_id, v_lote, false, null);
    n := n + 1;
  end loop;
  update public.lotes_papelera l set resumen = jsonb_build_object('cantidad', n, 'restaurados', 0, 'purgados', 0) where l.id = v_lote;
  perform public._lote_papelera_tocar(v_lote);
  perform public.registrar_actividad('papelera.enviado', 'lotes_papelera', v_lote::text, null, jsonb_build_object('tipo', p_tipo, 'cantidad', n));
  return v_lote;
end;
$$;

-- `create or replace` conserva los privilegios de la base; se repiten explícitos (redundante a propósito).
revoke all on function public.papelera_enviar(public.tipo_lote_papelera, uuid[]) from public, anon;
grant execute on function public.papelera_enviar(public.tipo_lote_papelera, uuid[]) to authenticated, service_role;
