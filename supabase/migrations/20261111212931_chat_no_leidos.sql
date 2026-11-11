-- El total de mis no leídos (paso 7.08-3, C5): para la burbuja del chat y la barra (7.11).
--
-- Reglas:
--   - `security definer` como `chat_conversaciones` (D1): repite la regla de `es_miembro` entera, calculada una vez (fila propia y, en el global,
--     `chat.global` vigente; `areas/chat/lista.sql` L4).
--   - No suma las conversaciones silenciadas («silenciar apaga los no leídos», D9) ni los mensajes propios.
--   - Por conversación, las 100 entradas más nuevas posteriores a mi lectura (`mensajes_hilo_idx`); en total se detiene a los 100. Devuelve 0 a 100:
--     100 se muestra «99+» (`conteoAcotado(n, 99)`, D4).

create function public.chat_no_leidos()
  returns integer
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_global boolean;
  v int;
begin
  perform public.assert_activo();
  v_global := public.tiene_permiso('chat.global');
  -- conversaciones_miembros_usuario_idx (usuario_id) y conversaciones_pkey; por conversación, mensajes_hilo_idx; se corta a las 100.
  select count(*) into v
    from (select 1
            from public.conversaciones_miembros m
            join public.conversaciones c on c.id = m.conversacion_id
            cross join lateral (select x.autor_id from public.mensajes x
                                 where x.conversacion_id = c.id and x.creado_en > coalesce(m.ultimo_leido_en, '-infinity'::timestamptz)
                                 order by x.creado_en desc, x.id desc limit 100) s
           where m.usuario_id = v_yo and not m.silenciada and (not c.es_global or v_global) and s.autor_id <> v_yo
           limit 100) t;
  return v;
end;
$$;

comment on function public.chat_no_leidos() is 'Mis mensajes sin leer (de otras personas, tras mi última lectura) en las conversaciones donde soy miembro y no silencié; el global, sólo con chat.global. De 0 a 100: 100 es «99+». 7.08-3.';
revoke all on function public.chat_no_leidos() from public, anon;
grant execute on function public.chat_no_leidos() to authenticated;
