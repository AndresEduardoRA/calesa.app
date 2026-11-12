## 2026-11-11 — Paso 6.11-1: los huecos «Gastos» y «Margen» (parte 1 de 4 del 6.11)

- **D1 · El 6.11 se parte en cuatro** (la fila lo estimaba): 6.11-1 (esta: entities, lecturas, hueco «Gastos», hueco «Margen», e2e tramo 1), 6.11-2 (hueco «Pagos» con confirmar, sello visible y
  anular un confirmado), 6.11-3 (`/logistica/gastos`, `?ver=gastos|pagos`, `ENLACE_DE_DINERO` y el registro de `gastos_listar`/`pagos_listar` en las guardas) y 6.11-4 (prorratear a un grupo y las
  categorías de gasto).
- **D2 · Permisos en el cliente por `mis_permisos`** (`infra/dinero/permisos.client.ts`, 30 s de memoria): un hueco sólo recibe `{ unidad }` y no hay hook de permisos en el cliente. Los botones de
  escribir salen de `puede(permisos, 'logistica.gastos.editar', unidad.origenId)`; mientras llegan o si falla la lectura no hay ninguno. No se tocó el núcleo.
- **D3 · El comprobante tiene su propia subida** (`infra/dinero/comprobante.client.ts`): `subirPorHash` de `shared` sólo admite buckets públicos y un documento no se comprime. Valida tipo
  (pdf, jpeg, png, webp) y peso (≤ 10 MB) antes de subir, no usa `upsert` y «ya existe» cuenta como éxito. Un objeto subido y no guardado lo limpia `storage-gc` (D2 de 6.10-2).
- **D4 · El margen no depende de la regla `gastos` ni `pagos`** (`regla: null`): existe aunque el flujo apague una de las dos. Se dibuja con `logistica.margen.ver` del origen.
- **D5 · La lista de gastos de una unidad es una lectura directa** (`gastos_vehiculo_idx`, tope 50 + 1, más recientes primero), no `gastos_listar`, que no filtra por vehículo (es de 6.11-3).
- **D6 · Eliminar un gasto no ofrece «Deshacer»**: `<Confirmar>` que nombra la categoría y la fecha en el título y muestra el monto con `<Monto>` adentro (el título es texto y con el Modo Live
  encendido un monto escrito ahí se vería). Un `PT409` al eliminar («ya no existe») es éxito suave.
- **D7 · Preselección del tipo de cambio:** uno solo, o el predeterminado si es el primero; si no, lo elige quien carga (D1 de 6.10-1). Con la moneda base no hay campo.
- **D8 · `gasto_registrar` se llama con todos sus parámetros** (`nuloParaLaBase`): no declara valores por omisión y sus tipos generados no admiten nulo. Un cambio de firma sería una migración
  (fuera de este paso).
- **D9 · El e2e va sólo en escritorio** (la fila lo pide); el archivo lo marca con `@sin-celular-archivo`.
