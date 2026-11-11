-- Mensajes y menciones sólo por RPC (paso 7.08-2, C13). Cierra el des-borrar (PLAN:1510 ítem 5, PLAN:1753): con el `update` de
-- `eliminado_en` abierto a `authenticated`, el autor podía volver a nulo un borrado de quien modera.
--
-- Se van las policies de escritura y los grants de insert, update y delete (el revoke de tabla también quita los de columna). Quedan el
-- `select` y las policies `leer` (`es_miembro`). Escriben `mensaje_enviar`, `mensaje_editar`, `mensaje_eliminar`, `mensaje_tarea_crear` y
-- `mensaje_evento_crear`.

drop policy if exists "mensajes: crear" on public.mensajes;
drop policy if exists "mensajes: editar" on public.mensajes;
drop policy if exists "mensajes_menciones: crear" on public.mensajes_menciones;

revoke insert, update, delete on public.mensajes from authenticated;
revoke insert, update, delete on public.mensajes_menciones from authenticated;
