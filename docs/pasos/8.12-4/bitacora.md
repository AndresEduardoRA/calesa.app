## 2026-11-12 · Paso 8.12-4: la hoja editable, aceptar y anular (parte 4 de 4, cierra el 8.12)

### Hecho

- Lo puro de la hoja editable (`entities/cotizador/hoja-editable.ts`): lo que emite una `XCell` pasa a texto exacto antes de entrar al estado
  (`montoDeCelda`, `cantidadDeCelda`), el total en vivo es la fórmula de la base (`calcularHoja`, sólo informa) y `pedidoDeGuardar` nunca manda totales ni
  sugerencias (↺ de la logística = `null`); `motivoParaNoAceptar`. Los errores de guardar van a su celda por `details` + `hint` (`errores.ts`).
- Guardar, aceptar y anular por las RPC de 8.12-1, desde actions con `puede()` antes (aceptar pide además `repuestos.editar`).
- `/repuestos/[id]/cotizaciones/[cotizacion]`: una borrador con el proyecto abierto y el snapshot válido es la hoja editable (bloques «Importado» y «Local»,
  líneas desde un ítem o libres, `XCell` de cantidad, costo y logística, caja «Caja N» con la elegida en `<Monto>`, total en vivo, notas, «Guardar» con
  PT409 y «Recargar»); «Aceptar» y «Anular» con `<Confirmar>` en `?panel=aceptar-cotizacion|anular-cotizacion`. Aceptada o anulada, sólo lectura.
- `e2e/repuestos-cotizar.spec.ts` (nuevo, escritorio) y el ajuste de `e2e/repuestos-cotizaciones.spec.ts`; `scripts/carreras/repuestos-cotizador.mjs` (K1 dos
  `aceptar` a la vez, K2 dos tramos cruzados a la vez).

### Verificación

- Nivel 1 en esta parte (sin migración ni `src/shared`; el paso es Nivel 2 por 8.12-1). `hoja-editable.test.ts` 34 en verde; mutaciones M1–M3 caen;
  `scripts/guardas` 1129 en verde; `pnpm db:carreras` en verde con K1 y K2 (`.piloto/salidas/8.12-4/`).
- e2e dirigidos: 5 en verde (`repuestos-cotizar` en escritorio, `repuestos-cotizaciones` en escritorio y movil; `.piloto/salidas/8.12-4/e2e.log`).
- e2e completo: no (8.12-4, Nivel 1 en esta parte: lo corre el CI del PR; dirigidos repuestos-cotizar en escritorio y repuestos-cotizaciones en escritorio y movil)

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- **8.12 hecho:** fórmula y base (8.12-1), Configuración › Repuestos › «Cotizador» (8.12-2), la pestaña «Cotizaciones» y la hoja de lectura (8.12-3), la hoja
  editable, aceptar y anular, `e2e/repuestos-cotizar.spec.ts` y las carreras (8.12-4).
- La fila del 8.12 cambia en dos detalles (D42, D43): sin tramo, la celda de logística queda vacía y el total dice «Sin total · Falta la logística» (`XCell`
  no tiene `emptyLabel`); la caja es un `<select>` de las del snapshot y el total de la línea un `<Monto>`, no `XCell`.
- Pendiente de 8.12-1 **cerrado:** la carrera de dos `aceptar` y la de dos tramos cruzados (`scripts/carreras/repuestos-cotizador.mjs`).
