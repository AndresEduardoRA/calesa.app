## 2026-11-12 · Decisiones del paso 8.10-2 (el servidor del stock, «Pasar a stock» y el historial del ítem)

- **D1 · Reasignar del lado servidor va a 8.10-3**, donde está su botón: aquí nadie lo llamaría.
- **D2 · `moverStock` acepta `sobrante`, `vendido` y `devuelto`:** 8.10-3 la reusa sin tocarla. `ajuste` no tiene botón (D6 de 8.10-1) y `reasignado` tiene su RPC.
- **D3 · Tras mover, la fila toma la respuesta de la RPC** (`stock_cantidad`, `en_stock_desde`, `actualizado_en`) y no se relee con `leerItem`, como decía el plan
  del 8.10-1: `leerItem` es del área `items` y el área `stock` no la importa. El cambio se aplica sobre la fila **vigente** de la hoja (`cambiarFila(id, cambio)`), así
  no pisa una celda guardada entretanto, y la celda siguiente no choca con `PT409` (la respuesta trae el `actualizado_en` que puso el trigger).
- **D4 · El hueco de la hoja se llena en un Client Component de `src/app`** (`src/app/(app)/repuestos/[id]/hoja-con-stock.tsx`), no en `page.tsx`: una función no
  cruza de un Server Component a uno de cliente. El hueco tiene dos partes, `accionDeFila(fila)` y `panel(api)`; el área `stock` declara su propio tipo de `api`
  (`ApiDeLaHojaParaStock`) y no importa el de `items` (auditoría del plan, 3).
- **D5 · «Stock» está en toda fila, también para quien sólo ve:** el historial se lee con `repuestos.ver`, como «Imágenes». El formulario, sólo con `repuestos.editar`,
  y vale con el proyecto cerrado (D3 de 8.10-1: los sobrantes nacen al terminar).
- **D6 · «En stock: N» sólo con N > 0**, en un `<Badge>` de texto junto al botón. Con 0 no se dice nada.
- **D7 · El formulario no sabe cuánto entró ya por `sobrante`:** valida entero ≥ 1 y ≤ la cantidad del ítem; el tope exacto lo dice la base junto al campo.
- **D8 · Tras pasar, el panel queda abierto:** el formulario se vacía, el historial se relee y un toast lo confirma. **Sin `revalidatePath`**, como `guardarCelda`:
  la hoja ya tiene la fila. Efecto conocido: el estado derivado de la cabecera (pendientes) se ve al volver a entrar.
- **D9 · El historial va por la action `leerMovimientosDeItem`**, `id desc` con el `id` como cursor, de a `TAMANO_DE_VER_MAS` hasta `TOPE_DE_LO_CARGADO` con
  `<AvisoDeTope>`. **Sin «Ir a una fecha»:** un ítem tiene pocos movimientos (D13 de 8.10-1); la excepción quedó escrita en `docs/RENDIMIENTO.md`. La primera página se
  lee con `useLecturaAlMontar` (como las imágenes) y otra vez tras pasar a stock (un esqueleto breve); «Ver más» suma por evento.
- **D10 · Un motivo que no está en la lista** (filas viejas de la nube) se muestra con su texto tal cual.
- **D11 · Las actions no llevan test de Vitest** (no hay precedente de una action con sesión en Vitest): el permiso lo prueba la base (S3 de `stock.sql`, 8.10-1) y
  `moverStock` mira `puede()` antes de escribir. Lo clave con test: el esquema y la traducción de errores.
- **D12 · El e2e usa la etiqueta `Prueba stock e2e <proyecto>`**, que no empieza con «E2E»: la limpieza de `repuestos-proyecto.spec.ts` borra `like 'E2E%'`. Cada
  proyecto de Playwright limpia sólo la suya.
- **D13 · El e2e corre en `escritorio` y `movil`** (auditoría del plan, 1): el CI lo corre en los dos y el hueco se dibuja también en las tarjetas.
- **D14 · Un `porCampo` de una clave que no es un campo del formulario** (`motivo`, `proyecto`, `id`) va como aviso del formulario (auditoría del plan, 5).
