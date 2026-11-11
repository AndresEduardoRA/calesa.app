-- Las tareas sin fecha (paso 7.06-2, C7, D26): la lista «Sin fecha» de la agenda, con «Ver más».
--
-- De invocador, como `agenda_rango` (D20): la RLS de `tareas` decide y encima van sólo las mías (responsable), vivas, sin `vence_en` y no canceladas
-- (pendientes y completadas: reabrir sigue a mano). La más nueva primero, por cursor `(creado_en, id)`; `p_tamano` por `_acotar_pagina` (20 por
-- defecto, `TAMANO_DE_VER_MAS`; 50 como mucho). Con cursor y sin cursor son dos consultas, cada una por `tareas_sin_fecha_idx`.

create index tareas_sin_fecha_idx on public.tareas using btree (responsable_id, creado_en desc, id desc) where eliminado_en is null and vence_en is null;
comment on index public.tareas_sin_fecha_idx is 'Mis tareas sin fecha, la más nueva primero: agenda_tareas_sin_fecha (7.06-2).';

create function public.agenda_tareas_sin_fecha(p_tamano integer default null, p_antes_en timestamptz default null, p_antes_id uuid default null)
  returns jsonb
  language plpgsql stable security invoker
  set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_n int := public._acotar_pagina(p_tamano, 20, 50);
  v_filas jsonb; v_hay boolean;
begin
  perform public.assert_activo();
  if (p_antes_en is null) <> (p_antes_id is null) then
    raise exception 'El cursor de la página está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  -- Las dos por tareas_sin_fecha_idx (responsable_id, creado_en desc, id desc).
  if p_antes_en is null then
    select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'titulo', t.titulo, 'estado', t.estado, 'creado_en', t.creado_en, 'mia', t.creado_por = v_yo)
                              order by t.creado_en desc, t.id desc), '[]'::jsonb),
           coalesce(count(*) > v_n, false)
      into v_filas, v_hay
      from (select x.id, x.titulo, x.estado, x.creado_en, x.creado_por from public.tareas x
             where x.responsable_id = v_yo and x.eliminado_en is null and x.vence_en is null and x.estado <> 'cancelado'
             order by x.creado_en desc, x.id desc limit v_n + 1) t;
  else
    select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'titulo', t.titulo, 'estado', t.estado, 'creado_en', t.creado_en, 'mia', t.creado_por = v_yo)
                              order by t.creado_en desc, t.id desc), '[]'::jsonb),
           coalesce(count(*) > v_n, false)
      into v_filas, v_hay
      from (select x.id, x.titulo, x.estado, x.creado_en, x.creado_por from public.tareas x
             where x.responsable_id = v_yo and x.eliminado_en is null and x.vence_en is null and x.estado <> 'cancelado'
               and (x.creado_en, x.id) < (p_antes_en, p_antes_id)
             order by x.creado_en desc, x.id desc limit v_n + 1) t;
  end if;
  -- La de más no viaja: es sólo el aviso de que hay otra página.
  if v_hay then v_filas := v_filas - v_n; end if;
  return jsonb_build_object('tareas', v_filas, 'hay_mas', v_hay);
end $$;

comment on function public.agenda_tareas_sin_fecha(integer, timestamptz, uuid) is 'Una página de mis tareas (responsable) vivas, sin fecha y no canceladas, la más nueva primero (p_tamano: 20 por defecto, 50 como mucho). El cursor es (creado_en, id) de la última de la página anterior; a medias, 22023 hint cursor. De invocador. {tareas, hay_mas}. 7.06-2.';
revoke all on function public.agenda_tareas_sin_fecha(integer, timestamptz, uuid) from public, anon;
grant execute on function public.agenda_tareas_sin_fecha(integer, timestamptz, uuid) to authenticated, service_role;
