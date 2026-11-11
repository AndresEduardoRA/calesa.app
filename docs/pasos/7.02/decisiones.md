# 7.02 (2026-11-11)

- **D1** · Abrir un aviso lo marca accionado sólo en `tarea_asignada`, `recordatorio` y `demora_fase`, y sólo si la fila pedía acción. `turno_web` se acciona por `web_confirmar_contacto` (Fase 8) y `limpieza_pronto` por «Conservar»: abrirlos sólo los marca leídos.
- **D2** · Realtime por `postgres_changes`, `INSERT` y `UPDATE` con `usuario_id=eq.<yo>`, nunca `DELETE` (no pasa por RLS). Plan B si en local no entrega: releer cada 30 s con la pestaña visible. Se confirma en la parte 2.
- **D3** · Sin migración: la lectura va por PostgREST bajo la RLS, con cursor `or(creado_en.lt.X, and(creado_en.eq.X, id.lt.Y))` con la fecha entre comillas, sobre los índices del 7.01.
- **D4** · «Marcar todas como leídas» sólo pone `leida_en`, por lotes de 200 y hasta 5 por clic; si el último vino lleno, `quedanMas`.
- **D5** · Se escribe por Server Actions con `update` bajo la RLS y los grants de columna; el cliente de navegador sólo lee.
- **D6** · La acción propia de cada tipo vive en un registro de `src/app/(app)/_shell/huecos/` (las funciones no cruzan de servidor a cliente); la Fase 8 suma «Contacté» editando sólo ese registro (parte 2).
- **D7** · El contador y la lista de la campana se leen en el cliente al montar, no en el layout; el contador lee 10 y muestra «9+».
- La consulta de lo de la campana y la de cada página están escritas una vez (`infra/consultas.ts`) y las usan el servidor y el navegador.
- **D2 (resultado)** · `postgres_changes` bajo RLS anda en el stack local (la campana de una sesión abierta se actualiza sin recargar): no hace falta el plan B ni policies en `realtime.messages`.
- **D8** · El canal de Realtime se une **después** de `realtime.setAuth()`. Unido antes entra como `anon`, que no puede leer `notificaciones`, y Realtime rechaza el filtro `usuario_id=eq.<yo>` con «invalid column for filter» (`realtime.subscription_check_filters` pide `SELECT` de columna al rol del token). Lo reusa 7.09 y 7.11 vía `canal.client.ts`.
- **D9** · El contador y Realtime van en un componente `diferido()` (`SuscripcionDeLaCampana`): el cliente de Supabase del navegador en el shell subía el JS en frío de `/cotizaciones` de 358 a 424 KB; diferido, 355 KB. El popover también va diferido. El documento de `/perfil` pasó de 80,3 a 82,7 KB (botón, rutas con pantalla y usuario por props): presupuesto de 82 a 85 KB (+3 %).
- **D10** · `destinoDe` trata `/` como sólo ella misma: como prefijo (`/` + `/`) toda ruta habría contado como disponible.
