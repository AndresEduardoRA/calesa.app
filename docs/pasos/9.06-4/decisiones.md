# 9.06-4 · Datos: convertir en el navegador y lanzar la importación total (2026-11-12)

- **D30 · Partición por capa de verificación.** La parte 4 que dejó la 3 («conversión + asistente») no cabía en 6 commits de código. Esta parte
  lleva lo puro, la acción y la subida (Vitest y `typecheck`); la 9.06-4b, la pantalla; el e2e del camino feliz sigue en 9.06-5
  (`e2e/datos-importar.spec.ts`), que puede mirar el resultado. El paso queda en 6 partes aunque `docs/PLAN.md` dice 5 como máximo.
- **D31 · Se reusan las reglas de los dueños, no se copian.** Leads se convierte con `prepararFilas` de `leads` (`validarAlta()`); vehículos se valida
  con `validarVehiculo()` de `vehiculos`. Salen por su `client.ts` porque la conversión corre en el navegador (D22). Los conversores viven en
  `datos/features/importar/` porque `entities` no importa otros módulos. **Desvío de lo planeado:** los números y el sí o no de vehículos se leen
  con los lectores de la importación de `/leads` (`convertirNumero`, `convertirSiONo`), no con el lector del formulario: la exportación escribe
  `12500.5` con punto cuando el separador es la coma, y así el archivo de «exportar todo» vuelve a entrar (probado en es-BO). Límite conocido, el
  de `/leads`: «2.125» se lee como 2125, así que un campo `numero` con 3 decimales y parte entera de hasta 3 dígitos escrito con punto no vuelve
  igual (el precio, con 2 decimales, y el kilometraje, entero, sí).
- **D32 · Una fila normalizada por cada fila de datos de la persona**, también la rechazada (con `rechazo_motivo`). La fila `n` del archivo
  normalizado y de `importaciones_filas` es la `n + 1` del archivo de la persona: 9.06-5 baja las rechazadas con sus celdas. Una fila sin ningún
  dato sale rechazada («La fila no tiene datos.»): una línea vacía la saltaría `leerCsv` y correría la numeración.
- **D33 · Texto del rechazo:** todos los motivos de la fila unidos con «; » (500 caracteres); `campo`, la etiqueta de lo que la persona emparejó en
  el primero (120), o nada si el motivo es de la fila. La guarda D34 también escribe la etiqueta (`armarArchivo` recibe `etiquetaDe`). Los motivos
  pueden repetir la celda, como la vista previa de `/leads`: quedan en `importaciones_filas`, bajo su RLS, 30 días, y nunca en un log.
- **D34 · Guarda de forma antes de escribir.** Cada fila convertida pasa por los validadores de `plantillas.ts` (`normalizarFila`); la que la función
  rechazaría (un precio con 3 decimales que el alta admite) sale ya rechazada en la vista previa.
- **D35 · Topes de lectura del archivo de la persona** (`LIMITES_DE_LECTURA_TOTAL`): 10 MB, 20.000 filas, 200 columnas, celdas de 5.000 caracteres.
  Después de armar, el tope de 10 MB del archivo normalizado en bytes UTF-8: «El archivo convertido pasa de 10 MB: pártelo en dos.».
- **D36 · Ruta e id.** El id lo genera el navegador y nace con cada `armarArchivo`: sólo se reintenta con el mismo id si el texto es idéntico. La
  ruta es `<usuarioId>/<id>.csv` en minúsculas; la acción la vuelve a armar con `ctx.usuarioId` y no la recibe. `importacion_crear` es
  idempotente por id y una subida repetida («exists») cuenta como subida.
- **D37 · Subir → crear → despertar.** Si la subida falla no se crea nada («Sin conexión: el archivo no se subió.» sin red; «No se pudo subir el
  archivo. Prueba de nuevo.» con red). Si crear falla con un rechazo seguro (`sin_permiso`, `regla`, `validacion`) el navegador borra su objeto;
  con un fallo dudoso (sin red, la acción cortada, `inesperado`) no, porque la importación pudo quedar creada. El borrado es de intento único: si
  falla, el objeto queda (el hueco de D26, para 9.13).
- **D38 · Mapeo de constancia:** encabezado → id del dato o `null`; claves de 120; un encabezado vacío o `__proto__` (Zod 4 lo descarta en
  `z.record`) pasa a «Columna N»; uno repetido lleva « (2)», « (3)».
- **D39 · El permiso en la acción es el de la base, dicho antes** (`motivoParaNoImportar`): leads para sí con `leads.crear`, para otra persona con
  `datos.importar.todo`, vehículos con `vehiculos.crear` del origen. Un destino igual a quien importa va como `null`.
- **D40 · El despertar no hace esperar.** El pase se pide en la acción con la sesión del pedido; la llamada a `importar-csv` va en `after()`, que
  no lee cookies. Si falla, el job `importaciones-continuar` la despierta en ≤ 2 min. `dispararImportacion` se reemplazó.
- **D41 · Convertir todo una sola vez,** al apretar «Importar»; la vista previa convierte 500. Medido: 20.000 leads en 1,6–1,76 s en Node (pasa el
  presupuesto de 1 s), así que la 4b convierte por tramos con «Preparando el archivo…» (`docs/RENDIMIENTO.md`).
