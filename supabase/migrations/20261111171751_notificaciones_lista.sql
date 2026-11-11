-- La lista de notificaciones (paso 7.01-1): la campana y `/notificaciones` (7.02) leen por cursor `(creado_en, id)` de una persona, y
-- «primero las que piden acción» corre el mismo cursor sobre el parcial. `notificaciones_usuario_abiertas_idx` se queda: es el contador
-- de no leídas.

create index if not exists notificaciones_usuario_fecha_idx
  on public.notificaciones (usuario_id, creado_en desc, id desc);

create index if not exists notificaciones_por_accionar_idx
  on public.notificaciones (usuario_id, creado_en desc, id desc)
  where requiere_accion and accionada_en is null;
