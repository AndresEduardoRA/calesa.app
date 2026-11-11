## 2026-11-11 — Paso 7.06-2: lecturas de la agenda y visibilidad

- **D20 · Las lecturas de la agenda son de invocador:** `agenda_rango` y `agenda_tareas_sin_fecha` dejan que la RLS de cada tabla decida y «mi agenda»
  es un filtro encima. Así las subastas quedan bajo la RLS de vehículos y ningún error de la función filtra una fila. `agenda_quienes_reciben` es
  definer porque usa ayudantes revocados (`_agenda_puede_recibir`, `_equipo_lista_indexable`, `_equipo_busqueda_patron`).
- **D21 · `eventos: leer` en línea,** con `_agenda_soy_destinatario(id)` definer y de authenticated (la evalúa la policy). `puede_evento` queda para
  `eventos_destinatarios: leer` y `evento_guardar`. E10 y T8 la exceptúan por firma.
- **D22 · «Mi agenda»:** eventos que creé, públicos o donde soy destinatario; tareas de las que soy responsable; mis recordatorios pendientes; las
  subastas que la RLS me deja ver. Con `p_de_todos` (exige `agenda.ver_todo`): todos los eventos y todas las tareas con fecha. Las tareas que di a
  otros no están: si 7.07 las pide, es una ruta más por `(creado_por, vence_en)`.
- **D23 · Cada cosa entra por su fecha** en `[p_desde, p_hasta)`: el evento por su inicio (uno que empezó antes y sigue no aparece), la tarea por su
  vencimiento, el recordatorio por su hora y la subasta por su cierre.
- **D24 · Tope fijo de 200 por clase,** sin parámetro de tamaño; la respuesta trae `tope` y `hay_mas`. El rango es obligatorio, en orden y de hasta 45 días.
- **D25 · `agenda_rango` devuelve sólo lo que dibuja un chip.** El recordatorio va sin lead; ninguna lectura toca `cotizaciones`.
- **D26 · «Sin fecha»:** mis tareas (responsable) vivas, sin fecha y no canceladas (pendientes y completadas), la más nueva primero, cursor
  `(creado_en, id)`, 20 por defecto y 50 como mucho.
- **D27 · `agenda_quienes_reciben` suma `p_conversacion`** a la firma de la fila, para que reasignar una tarea del chat no ofrezca a quien D3
  rechazaría. Pide `agenda.tareas.asignar`, busca como Equipo (nombre o email, ≥ 3 letras o dígitos) y corta en 20.
- **D28 · 7.06-3 entra en esta parte:** `entities/visibilidad.ts` es espejo de la base, nunca la autoridad; D3 y quién puede recibir siguen en la base.
- **D29 · Sin `medir-*.sql`:** `eventos` y `tareas` no son tablas que crecen y el rango acota a 45 días. Las subastas usan el mismo índice por origen y
  tienen el mismo límite con «propios» que ya anotó 4-23 para el panel del vehículo (`medir-panel-cierre-subasta.sql`).
- **D30 · Docs en `docs/pasos/7.06-2/`** (carril con coordinador); la sección «Agenda» de `docs/RENDIMIENTO.md` sí se toca.
