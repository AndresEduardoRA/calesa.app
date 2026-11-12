## 2026-11-12 — Paso 6.06-1: documentos de la unidad, lectura

- **D1 · Una foto de la cámara es un documento y no se comprime** (duda 1, la recomendada). Se avisará el tamaño antes de subir si pasa de 10 MB (6.06-2).
- **D2 · La pestaña «Documentos» y el panel son un solo componente** (duda 2, la recomendada): `HuecoDeDocumentos` con `{ unidad }`; el permiso lo decide la base.
- **D3 · El hueco declara `permisos: ['logistica.ver']` y `regla: null`.** No hay regla «documentos» en `CLAVES_DE_REGLAS`. Reversible: se agrega cuando exista.
- **D4 · Lectura con tope.** Los documentos vivos de la unidad por `documentos_vehiculo_id_idx`, más recientes primero, tope 50 con `limit 51` y `<AvisoDeTope>`. Los tipos
  activos con `limit 101` (el tope de la base es 100); los de un flujo aparecen sólo en las unidades de ese flujo.
- **D5 · «Lo que pide la fase siguiente»** = los requisitos de documento de las fases a las que esa unidad puede ir (`fases_transiciones` desde su fase), porque
  `evaluar_requisitos` mira `fases_requisitos` por la fase de destino. Sin fase no hay ninguno.
- **D6 · «Hoy» es el día de la empresa** (`diaEnZona` con su zona horaria, calculado al leer). La base compara con su `current_date`: en el borde de la medianoche
  «Vencido» puede diferir unas horas de «Qué falta»; manda la base.
- **D7 · «pendiente» se muestra «Sin subir»**; los otros, «Subido», «Aprobado», «Rechazado». Siempre texto, el color es refuerzo.
- **D8 · Quién subió y quién revisó:** nombres de `perfiles` en una consulta por todos; si falla, «otra persona». Nunca un uuid.
- **D9 · Ver y Descargar, dos botones por fila.** La URL firmada de 60 s se pide al tocar. «Descargar» sigue la URL con `download` y el nombre del archivo.
- **D10 · La pestaña lee `leerUnidad` en el servidor** (tras `<Suspense>`) y, si la unidad es nula, dice «Esta unidad ya no está disponible.».
- **D11 · El hueco se arma por tipo:** los pedidos por una fase primero, luego los que tienen documentos, cada bloque por `orden`; un tipo pedido sin documentos
  dice «Aún no hay ninguno»; un documento de un tipo desactivado va a «Otro tipo».
- **D12 · Sin `medir-*.sql`:** una unidad por índice con tope 51; sin tabla ni índice nuevos.
- **D13 · La fecha de vencimiento se escribe con `formatearFecha`** («Vence el 10 ene 2027»), no «10 de enero de 2027» como decía el plan: el formato de toda la app.
