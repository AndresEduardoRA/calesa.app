# 9.06-2 · Datos: el motor de la importación total (2026-11-12)

- **D12 · El pase es de la importación** (`importaciones_pases.importacion_id`), no de la cola de storage: la función edge sabe qué procesar y la base,
  cuántas veces se la pidió. Lo emite quien la creó (`importacion_pase_emitir`) o el job; ver una importación ajena con `datos.importar.todo` no
  da poder para emitirle un pase (sólo `usuario_id`).
- **D13 · Un pase vivo por importación:** si ya tiene uno sin usar de los últimos 5 min, `importacion_pase_emitir` devuelve ése (auditoría del
  plan: llamarla en bucle no llena la tabla). El job no vuelve a llamar una importación que tiene un pase de los últimos 5 min.
- **D14 · Detenida = `pendiente` o `procesando` sin avance hace más de 2 min** (`coalesce(avance_en, creado_en)`); el job corre cada 2 min y toma
  hasta 5. Sin avance en 24 h pasa a `fallida` con `sin_avance` (hasta 50 por corrida) y sin constancia: el job no tiene identidad para
  `registrar_actividad` (igual que la fallida por permiso, D10).
- **D15 · Purga diaria aparte** (`importaciones-filas-purgar`): el informe por fila a los 30 días de terminada o fallida y los pases a los 7, por lotes.
  El job de cada 2 min no borra.
- **D16 · `/leads` no toma una total:** sus tres RPC la tratan como inexistente (42501 «No encontramos esta importación.»).
- **D17 · Deshacer una total:** sólo quien la hizo, sólo terminada o fallida (nunca corta el proceso), con `datos.importar.todo` vigente si tuvo
  destino (mueve leads de otra persona a la papelera, que queda a nombre de quien deshace). «Intacto» se mide contra el destino; destino borrado →
  nulo → todo `otra_persona`, nada se mueve.
- **D18 · Tope de deshacer: 2.000 leads** (`filas_ok`), sin medir: 4 veces las 500 de `/leads`. Subirlo es una línea.
- **D19 · El CSV no se borra en esta parte:** el bucket `importaciones` no está en `storage_refcount()`; borrarlo al terminar es de la función edge (9.06-3).
- **D20 · `importacion_procesar_lote` no se toca:** el ayudante del bucle de D11 queda para cuando haya que cambiarla.
- **D21 · Sin `importaciones_continuar_programar`** (auditoría del plan): la URL sale de Vault y sería la única vía de escribirla en `cron.job`.
