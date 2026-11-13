## 2026-11-12 · Decisiones del paso 9.01-1 (la base de lectura de la actividad)

- **D1 · Sin línea de tiempo en la ficha** (duda 1, la recomendada): un «Ver actividad» en el «⋯» de la ficha de lead y de vehículo a
  `/actividad?entidad=<tabla>&registro=<id>`, sólo con `actividad.ver` (parte 4).
- **D2 · Del diff de un lead ajeno, sólo lo público** (duda 2, la recomendada): lo que da `leads_vista` fuera de la cartera; y nada si quien mira
  no ve el lead (`puede_lead` con `leads.ver`). Nadie ve teléfonos ni números.
- **D3 · Se parte en base (partes 1 y 2) y pantalla (3 y 4)** (duda 3, la recomendada).
- **D4 · La lista cerrada vive en `_actividad_recorte(tabla)`** (`lead`, `entidad`, `configuracion` o null). `tipos_lead` y `tipos_seguimiento`, que la
  fila no nombraba, van a configuración. `formulas` va a entidad, no a configuración: su policy pide `cotizaciones.configurar` del origen (auditoría
  del informe).
- **D5 · «Entera» = las columnas que authenticated puede leer** (`has_column_privilege`): `cotizaciones` nunca da más que su grant por columnas y
  una columna nueva sin grant no sale.
- **D6 · Nunca salen** `actualizado_en` (ruido), `clave_hash`, `apibara_raw`; de un lead, además, `numero`, `numero_propio`, `telefono_principal`,
  `cartera` y `cliente_desde`.
- **D7 · El permiso de una entidad es el espejo de su policy «leer»** sobre la foto del cambio o, sin foto, sobre la fila vigente por su PK; sin la
  condición `eliminado_en` (las `puede_*` exigen el padre vivo: conservador).
- **D8 · `actividad_diff` no distingue «no existe» de «no lo ves»:** los dos dan `{id, visible: false}`.
- **D9 · La página no lleva valores:** cabecera, `visible`, hasta 5 nombres de campos y `mas_campos`, sólo en los `*.update` visibles.
- **D10 · Filtros combinados van por la ruta más selectiva** (registro > persona > acción > tabla) y el resto filtra sobre ella; el descarte lo
  acota la retención.
- **D11 · `?accion=` entra ya en la base** (`p_accion` e índice `(accion, id desc)`; auditoría del plan): la parte 3 no cambia la firma.
- **D12 · Índices sin `concurrently`** (la migración va en transacción): abierto 9-01b para la guía del 9.13.
- **D13 · La purga borra sólo actividad y `eventos_web`,** de a 10.000 y hasta 10 lotes por tabla y corrida; notificaciones y visitados quedan para
  `notificaciones_purgar()`. Job a las 03:25 UTC.
- **D14 · La prueba de la purga va en `areas/actividad/purgar.sql`,** no en `supabase/tests/jobs.sql` (de la lista fija del `a`).
- **D15 · Tablas sin declarar a propósito:** `lotes_papelera`, `cotizaciones_niveles`, `tonos`, `perfiles`, `roles`, `importaciones`,
  `accesos_portal`, `oportunidades`, `tablas_referencia`, `limpieza_corridas`, `comprobantes_ajustes`. Sólo reciben `registrar_actividad()` sin
  fotos, así que no hay diff que mostrar: salen `visible: false` hasta que la 9.01-2, al revisar `detalle`, decida si alguna se declara.
- **D16 · El registro de páginas de `actividad_listar` pasa a la 9.01-3:** la guarda `paginas.test.ts` saca una entrada sin quién la llame.
