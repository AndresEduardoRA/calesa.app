<!-- Ancla: en docs/RENDIMIENTO.md, después de la línea «- Importar: «Tus importaciones recientes» …». -->

- Actividad (9.01-1): `/actividad` «Ver más» de a `TAMANO_DE_VER_MAS` (20; `actividad_listar` admite hasta 100) hasta `TOPE_DE_LO_CARGADO`, por cursor
  sobre `id` con una ruta por filtro: registro `actividad_registro_id_idx (tabla, registro_id, id desc)`, persona `actividad_actor_id_idx`, acción
  `actividad_accion_id_idx`, entidad `actividad_tabla_id_idx`, sin filtro la PK; «Ir a una fecha» por `actividad_fecha_idx`. El recorte por fila
  (una `puede_*` o `_lead_vivo_en_mi_cartera` y un vistazo a `pg_attribute`) va sobre lo ya leído, acotado por el tamaño. Purga diaria de a 10.000
  y hasta 10 lotes por tabla (actividad y `eventos_web`). Sin medición con volumen: `actividad` no está en la lista de tablas que se miden.
