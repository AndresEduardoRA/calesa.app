## 2026-11-11 — Paso 6.11-4: prorratear y categorías de gasto (parte 4 de 4, cierra el 6.11)

- **D1 · Partes iguales**, como la base en 6.10. Por valor del vehículo u otro criterio es el abierto **6-6** (base e interfaz).
- **D2 · El prorrateo no tiene e2e de pantalla:** ninguna página de grupo monta `HUECOS_DE_DINERO_EN_EL_GRUPO` (6.08 y 6.09 no están integradas). Se cubre con vitest de entidad (los números de la base), de esquema y de componente; el e2e de esta parte es el de las categorías. Quien monte la página de grupo añade su recorrido.
- **D3 · `id` de embarque = booking; de contenedor = número** (no hay otra definición hoy: `pantallas/transporte-*.ts` siguen vacíos). El hueco lee sus unidades con `.limit(201)`; con más de 200 avisa y no deja repartir (no se parte en lotes).
- **D4 · Sin comprobante en el prorrateo:** cargarlo una vez y repetirlo en N filas rompe «borrar por refcount» sin ganar nada; se adjunta desde cada unidad.
- **D5 · La vista previa nunca muestra un equivalente ni un total en base:** muestra cada parte en la moneda del gasto, la suma de las partes (el monto tipeado) y dice que el equivalente lo calcula la base al confirmar.
- **D6 · Categoría en uso:** la lista no cuenta usos por fila; «Eliminar» se ofrece siempre y, si la base responde 23503, el diálogo dice que se desactive. Una categoría con propósito `tributos` no cambia de propósito en la interfaz (Aduana la lee); la base no lo impide.
- **D7 · Orden = un número 0–32767 del modal**, no botones: intercambiar dos serían dos escrituras sin transacción. La lista usa `ListaDeCatalogo` con `icono: null` y los botones de orden apagados con el motivo.
- **D8 · Propósito = un select con los seis del `check` de la base** más «Sin propósito»; sus nombres salen de una tabla en `entities/dinero/categoria.ts` con un test que la ata a esa lista.
- **D9 · Escritura directa por Server Action** con el cliente de quien pide; el límite es la RLS (`logistica.catalogos.gestionar`). Una escritura que la RLS deja en cero filas se dice «No tienes permiso…», nunca éxito.
- **D10 · El `lote` del prorrateo** se conserva si la respuesta se perdió (`inesperado`) o no hubo red y se renueva al cambiar lo escrito, al rechazar la base (no escribió nada) y tras un éxito; un reintento devuelve `ya_existia` y se trata como éxito.
- **D11 · El catálogo llena la sección «Logística» del hub:** `secciones.test.ts` pasa a ocho y `catalogos.test.ts` y el e2e de Configuración › Logística dejan de afirmar «no hay nada que configurar».
