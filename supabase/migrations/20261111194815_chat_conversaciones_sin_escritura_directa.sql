-- Conversaciones y miembros sólo por RPC (paso 7.08-1, C13): se van las policies y los grants de escritura de `authenticated`.
-- Escriben `chat_directa`, `chat_global_entrar`, `chat_grupo_crear`, `chat_grupo_miembros`, `chat_salir`, `chat_leer` y `chat_silenciar`
-- (`security definer`). Quedan el `select` y las policies `leer`. `mensajes` y `mensajes_menciones` siguen igual hasta 7.08-2.

drop policy "conversaciones: crear" on public.conversaciones;
drop policy "conversaciones: editar" on public.conversaciones;
drop policy "conversaciones_miembros: crear" on public.conversaciones_miembros;
drop policy "conversaciones_miembros: editar" on public.conversaciones_miembros;
drop policy "conversaciones_miembros: borrar" on public.conversaciones_miembros;

revoke insert, update, delete on public.conversaciones from authenticated;
revoke update (ultimo_leido_en, silenciada) on public.conversaciones_miembros from authenticated;
revoke insert, update, delete on public.conversaciones_miembros from authenticated;
