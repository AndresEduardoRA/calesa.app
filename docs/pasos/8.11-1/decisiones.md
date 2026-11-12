## 2026-11-12 · Decisiones del paso 8.11-1 (la base de compras y margen de repuestos)

- **D1 · El tipo de cambio es el por defecto vigente al guardar,** congelado en la fila (`tipo_cambio_id` y `tipo_cambio_aplicado`), como `pagos`: la recomendada de la fila.
  Primero `moneda → base` y, si no hay, `base → moneda`. Editar sin cambiar la moneda conserva la tasa; cambiar la moneda toma la vigente. Sin un tipo por defecto activo,
  23502 hint `moneda` con el texto que dice dónde marcarlo. La compra no deja elegir el tipo (a diferencia de `pagos`): se puede ampliar con una clave más en la lista.
- **D2 · `monto_base`, `tipo_cambio_aplicado` y `tipo_cambio_id` en `p_datos` dan 22023,** no se ignoran en silencio (como `_pago_de_cambios`). El assert («`monto_base`
  lo pone la base aunque el cliente mande otro») se cumple porque el valor del cliente nunca queda guardado: al crear no queda la fila y al editar las tres columnas
  no cambian (B1).
- **D3 · Una sola RPC crea y edita:** con la esperada nula crea, idempotente por id (un reintento devuelve lo guardado con `ya_existia: true`) y nunca pisa, como
  `gasto_registrar`; el mismo id en otro proyecto da 23505. Sin cambios devuelve `sin_cambios: true` sin mirar la versión, como `pago_guardar`.
  El reintento idempotente no mira si el proyecto sigue abierto: no escribe nada y devuelve la compra que ya existe (auditoría del informe, 4).
- **D4 · Un proyecto cerrado no recibe ni cambia compras** (23514 hint `proyecto`), igual que la hoja: se reabre, se registra y se cierra.
- **D5 · `repuesto_compra_restaurar` entra aunque la fila no la nombra:** borrar es reversible y `ui.md` pide «Deshacer». Restaurar una compra cuyo ítem se eliminó da
  23514 hint `item_id`: la regla de 8.08 («un ítem con compras vivas no se borra») no se rompe por la puerta de atrás (auditoría del plan, 3).
- **D6 · El precio de un ítem es `cantidad × precio_cliente`** (`precio_cliente` es unitario: 8.12 copia allí el precio unitario de la línea). Con un ítem vivo sin precio
  **o con precio y sin moneda** (la hoja escribe las dos celdas por separado), el margen es nulo en **todas** las monedas: no se sabe en qué moneda iría ese precio
  (auditoría del plan, 1). El margen usa la cantidad pedida: lo que pasó a stock o se reasignó (8.10) no la descuenta; si eso cambia, es de 8.13.
- **D7 · El margen y las tres RPC de escritura piden además `repuestos.ver`:** el margen revela la suma de los precios de los ítems y la respuesta de escribir devuelve
  `monto_base` y la tasa (auditoría del plan, 6).
- **D8 · Sin carrera nueva:** no hay saldo ni numeración; la versión bajo `for update` es el patrón de `pagos`, probado por K1 de `supabase/tests/areas/dinero/carreras.mjs`.
- **D9 · La prueba de las policies va en `areas/repuestos/compras.sql`** (B3, B4) y no en `humo.sql`: es la regla de un carril (`migraciones.md`), como en 8.10-1.
- **D10 · Sin índice nuevo para la lista:** es por proyecto, con `repuestos_compras_proyecto_id_idx`, y llevará un tope de 200 (8.11-2). Compras no es una tabla que crece.
- **D11 · El monto es ≥ 0,** como el `check` de la tabla y los gastos. El proveedor es opcional, de hasta 200 caracteres; las notas, de hasta 2000.
- **D12 · Un conflicto de versión da PT409 sin hint** (lo lanza `_exigir_version`, como en `pagos` y `gastos`); «ya no existe» lleva hint `conflicto`.
- **D13 · `aplicado_en` también en `seed.sql`:** el seed hace `on conflict (clave) do update set … aplicado_en` y con `db:reset` pisaría la migración (auditoría del plan, 2).
  `repuestos.costos.ver` nombra además las policies de `pagos`, `gastos` y `repuestos_cotizaciones`, que ya lo usaban.
- **D14 · La migración `repuestos_compras_guardar` tiene 345 líneas y `_repuesto_compra_de_datos` 136** (el plan estimaba ≈ 230): es la lista cerrada con un hint
  por campo, como `_pago_de_cambios`, y la tasa. No se parte después de verificada con las mutaciones de dinero. Si un paso la recrea, la parte en
  `_repuesto_compra_validar` y `_repuesto_compra_tasa`. La prueba sí se partió (`compras.sql` B1–B4 y `compras-version.sql` B5–B8, auditoría del informe, 1–3).
- **Escrituras directas quitadas** (abierto «Quitar escrituras directas» de `docs/PLAN.md`, que cita 8.11): las policies «repuestos_compras: crear» y «editar» y los
  privilegios de INSERT, UPDATE y DELETE de `authenticated`. Ninguna pantalla las usaba; las tres pruebas SQL que insertan compras corren como `postgres`.
- **Queda abierto** para «Pulido para la Fase 9» › seguridad: los pagos de un proyecto de repuestos todavía se escriben sólo por `pago_*` de vehículo
  (`pago_registrar` exige `p_vehiculo`). Es de 8.13.
