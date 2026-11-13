# 9.06-1 · Datos: la base de la importación total (2026-11-12)

- **D1 · Deshacer una importación total de leads, con lo que ya existe** (duda 1 de la fila, la recomendada): `importaciones_leads` +
  `leads_importacion_deshacer`, 24 h, sólo lo intacto y sólo quien la hizo. Esta parte deja escritos los vínculos; medir «intacto» contra
  `coalesce(asignar_a, usuario_id)` es del 9.06-2.
- **D2 · Hasta 20.000 filas por archivo** (duda 2), aunque el bucket admita 50 MB: `importacion_empezar` lo exige; la pantalla lo dirá antes de subir (9.06-4).
- **D3 · Un destino por archivo** (`asignar_a`, duda 3), no una columna «Asesor» por fila.
- **D4 · El lead lo crea el destino:** `_lead_crear` corre con la identidad de `coalesce(asignar_a, usuario_id)`; así nace en su cartera con la misma regla
  de duplicados y limbo que si lo cargara a mano, y la constancia `lead.creado` es suya. Quién importó queda en `importaciones.usuario_id` y en la
  constancia `datos.importado`. Un vehículo lo crea quien importa (no tiene destino).
- **D5 · El informe por fila va a `importaciones_filas`, no a `importaciones.errores`.** La fila dice «todo o nada por fila y con el informe en
  `importaciones.errores`» (`docs/PLAN.md`, 9.06); sumar a un `jsonb` en cada lote reescribe el informe entero unas 400 veces en un archivo de 20.000
  filas. `errores` queda para el fallo del archivo entero (`importacion_terminar(…, p_error)` o el permiso perdido).
- **D6 · Idempotencia por (importación, fila):** la marca de agua `procesadas` bajo el `for update` de la fila de `importaciones`, y el id de cada lead o
  vehículo es `md5(importación:fila)::uuid`, así un reintento cae en el «repetido» de `_lead_crear`/`vehiculo_crear`.
- **D7 · El total lo fija `importacion_empezar(p_importacion, p_total)`** cuando la función edge ya leyó el archivo (la vista previa ve sólo 500 filas).
  `importacion_crear` suma `p_id` (idempotente por id) y `p_origen` (vehículos: un archivo por origen) a la firma de la fila.
- **D8 · Perder el permiso a mitad no es un error del lote:** la importación pasa a `fallida` con su motivo y el lote devuelve `rechazado` sin crear nada,
  así el job del 9.06-2 no la reintenta para siempre. Lo mismo si el perfil del destino se borra (`con_destino` y `asignar_a` nulo): nunca cambia de dueño.
- **D9 · `importacion_crear` no comprueba que el archivo exista** en `storage.objects`, sólo que la ruta esté en la carpeta de quien llama (la regla de la
  policy del bucket); si falta, la función edge la termina con `p_error` (9.06-3).
- **D10 · La identidad se captura una vez y se repone en cada salida** (auditoría del plan): `_importacion_previo()` al entrar, `_importacion_fijar()`
  para cambiar (sin devolver previo) y `_importacion_volver()` antes de cada `return`. Los ayudantes `_importacion_*` no los ejecuta nadie más que su dueño
  (revocados también a `service_role`). La fallida por permiso perdido no deja constancia: la deja sólo `importacion_terminar`.
- **D11 · Desvíos de tamaño respecto del plan** (auditoría del informe): `importacion_procesar_lote` quedó con 104 líneas (el plan corregido prometía
  ≤ 80) y la migración `importaciones_procesar` con 424 (pedía partirla pasadas las ≈ 300). Ya estaba commiteada con sus pruebas en verde; no se
  reescribe una migración. `_importacion_fila_lead`/`_vehiculo` devuelven `jsonb` (no `text`) porque llevan el id para repartir los números propios.
  Para 23502 y 23514 el motivo guardado es el texto de Postgres (técnico, sin datos de la fila: el DETAIL no se captura).
