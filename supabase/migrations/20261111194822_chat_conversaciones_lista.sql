-- La lista de mis conversaciones (paso 7.08-3, C1–C4 y C6): por cursor `(ultimo_mensaje_en, id)`, con sus no leídos y la otra persona de una directa.
--
-- Reglas:
--   - `security definer` (D1): contar no leídos bajo la RLS pagaría `es_miembro` por cada mensaje contado. Por eso repite la regla de `es_miembro`
--     entera, calculada una vez: fila propia de miembro **y**, en el canal global, `chat.global` vigente (`areas/chat/lista.sql` L1 y L4).
--   - Parte de las filas de miembro de quien mira (`conversaciones_miembros_usuario_idx`) y ordena el top-N (D2): nadie está en todas las
--     conversaciones. Con cursor y sin cursor son dos consultas; lo derivado se calcula después, sólo sobre la página.
--   - `p_tamano` por `_acotar_pagina`: 20 por defecto (`TAMANO_DE_VER_MAS`), 50 como mucho (D6). Cursor a medias: 22023 `hint cursor`.
--   - `no_leidos` (0 a 100): de otras personas entre las 100 entradas más nuevas posteriores a mi lectura, por `mensajes_hilo_idx`; los eliminados
--     cuentan, los propios no (D3); 100 se muestra «99+» (D4). Se devuelve también en una silenciada (D9).
--   - `otro` (sólo en una directa): `{id, nombre}` de la otra persona, por `par_directo` o, en una directa vieja sin él, la otra fila de miembro.
--     Sale aunque esté de baja (D10). Sin cuerpo de ningún mensaje (D8).
--   - `{conversaciones, hay_mas}`; la de más no viaja.

-- El orden global de conversaciones no lo usa ninguna ruta por persona, y con él cada mensaje vuelve no-HOT el update de `ultimo_mensaje_en`
-- (`_chat_mover_ultimo_mensaje`). Reversible: recrearlo (D2).
drop index public.conversaciones_ultimo_mensaje_idx;

create function public.chat_conversaciones(p_tamano integer default null, p_antes_en timestamptz default null, p_antes_id uuid default null)
  returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_n int := public._acotar_pagina(p_tamano, 20, 50);
  v_global boolean;
  v_ids uuid[];
  v_hay boolean;
  v_filas jsonb;
begin
  perform public.assert_activo();
  if (p_antes_en is null) <> (p_antes_id is null) then
    raise exception 'El cursor de la página está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  v_global := public.tiene_permiso('chat.global');
  -- Las dos por conversaciones_miembros_usuario_idx (usuario_id) y conversaciones_pkey; ordenan sólo las conversaciones de quien mira.
  if p_antes_en is null then
    select coalesce(array_agg(t.id order by t.ultimo_mensaje_en desc, t.id desc), '{}') into v_ids
      from (select c.id, c.ultimo_mensaje_en
              from public.conversaciones_miembros m
              join public.conversaciones c on c.id = m.conversacion_id
             where m.usuario_id = v_yo and (not c.es_global or v_global)
             order by c.ultimo_mensaje_en desc, c.id desc limit v_n + 1) t;
  else
    select coalesce(array_agg(t.id order by t.ultimo_mensaje_en desc, t.id desc), '{}') into v_ids
      from (select c.id, c.ultimo_mensaje_en
              from public.conversaciones_miembros m
              join public.conversaciones c on c.id = m.conversacion_id
             where m.usuario_id = v_yo and (not c.es_global or v_global)
               and (c.ultimo_mensaje_en, c.id) < (p_antes_en, p_antes_id)
             order by c.ultimo_mensaje_en desc, c.id desc limit v_n + 1) t;
  end if;
  -- La de más no viaja: es sólo el aviso de que hay otra página.
  v_hay := cardinality(v_ids) > v_n;
  if v_hay then v_ids := v_ids[1:v_n]; end if;
  -- Lo derivado, sobre la página: conversaciones_pkey y conversaciones_miembros_pkey por fila; no leídos por mensajes_hilo_idx (≤ 100 entradas);
  -- la otra persona por perfiles_pkey.
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', c.id,
           'tipo', c.tipo,
           'nombre', c.nombre,
           'es_global', c.es_global,
           'ultimo_mensaje_en', c.ultimo_mensaje_en,
           'ultimo_leido_en', m.ultimo_leido_en,
           'silenciada', m.silenciada,
           'no_leidos', (select count(*) filter (where s.autor_id <> v_yo)
                           from (select x.autor_id from public.mensajes x
                                  where x.conversacion_id = c.id and x.creado_en > coalesce(m.ultimo_leido_en, '-infinity'::timestamptz)
                                  order by x.creado_en desc, x.id desc limit 100) s),
           'otro', case when c.tipo = 'directa' then
                     (select jsonb_build_object('id', pf.id, 'nombre', pf.nombre)
                        from public.perfiles pf
                       where pf.id = coalesce(
                               case when c.par_directo[1] = v_yo then c.par_directo[2] else c.par_directo[1] end,
                               (select o.usuario_id from public.conversaciones_miembros o
                                 where o.conversacion_id = c.id and o.usuario_id <> v_yo
                                 order by o.usuario_id limit 1)))
                   end
         ) order by u.o), '[]'::jsonb)
    into v_filas
    from unnest(v_ids) with ordinality u (id, o)
    join public.conversaciones c on c.id = u.id
    join public.conversaciones_miembros m on m.conversacion_id = c.id and m.usuario_id = v_yo;
  return jsonb_build_object('conversaciones', v_filas, 'hay_mas', v_hay);
end;
$$;

comment on function public.chat_conversaciones(integer, timestamptz, uuid) is 'Una página de mis conversaciones (fila de miembro propia y, en el global, chat.global), la del mensaje más reciente primero (p_tamano: 20 por defecto, 50 como mucho). El cursor es (ultimo_mensaje_en, id) de la última de la página anterior; a medias, 22023 hint cursor. Cada fila: id, tipo, nombre, es_global, ultimo_mensaje_en, ultimo_leido_en, silenciada, no_leidos (0 a 100: 100 es «99+»), otro ({id, nombre} en una directa). {conversaciones, hay_mas}. 7.08-3.';
revoke all on function public.chat_conversaciones(integer, timestamptz, uuid) from public, anon;
grant execute on function public.chat_conversaciones(integer, timestamptz, uuid) to authenticated;
