## 2026-11-12 · Decisiones del paso 8.12-4 (la hoja editable, aceptar y anular)

- **D41 · La hoja es editable sólo en borrador, con el proyecto abierto y el snapshot válido;** si no, la de lectura. La base rechaza lo mismo (V4): mostrar una hoja
  que no se puede guardar sería mentir.
- **D42 · El total de la línea es `<Monto>` (o «Sin total · motivo»), no una `XCell`:** no se edita, y una celda con candado en cada fila es ruido; la caja es un `<select>`
  de las del snapshot (D1).
- **D43 · Sin `emptyLabel`:** `XCell` no lo tiene (V12) y agregarlo toca `src/shared` (Nivel 2). La celda vacía y «Sin total · Falta la logística» dicen lo mismo; la
  ficha se corrige.
- **D44 · Una línea nueva nace sin caja elegida** («Elige una caja»), no con «Sin caja»: olvidarla no cotiza por debajo; la línea queda sin total hasta elegir.
- **D45 · El total en vivo sólo informa;** lo que vale es lo que guarda la base y la hoja nace de nuevo de lo guardado (`key` con la versión).
- **D46 · Guardar manda todas las líneas** (la RPC reemplaza) y ↺ de la logística manda `logistica: null`.
- **D47 · Aceptar sólo con lo guardado:** con cambios sin guardar, con total nulo o sin `repuestos.editar`, apagado con el motivo escrito.
- **D48 · Anular pasa por `<Confirmar>`** (no hay restaurar) y vale en borrador y en aceptada; una anulada no muestra acciones.
- **D49 · Los ítems para «Agregar desde un ítem» los lee la página** con `leerItemsDelProyecto` y los pasa como datos (`{id, descripcion, cantidad}`): el área
  `cotizador` no importa `items`. Se ofrecen sólo los que no están en otra línea.
- **D50 · Una línea no cambia de bloque:** se quita y se agrega en el otro.
- **D51 · Las cajas del `<select>` se llaman «Caja 1», «Caja 2»…** (un `<option>` no admite `<Monto>`) y la elegida se dibuja al lado con `<Monto>`: así ninguna
  cifra se ve antes de hidratar con el Modo Live encendido (auditoría del plan, obs. 2).
- **D52 · Sin tests de `errores.ts` ni de las actions** (como en 8.12-3): sin dinero ni fórmula; la autoridad es la RPC con sus pruebas SQL y el e2e recorre guardar y
  aceptar.
- **D53 · El spec de 8.12-3 siembra su cotización como aceptada** para seguir probando la hoja en sólo lectura (la borrador ahora es editable).
- **D54 · El e2e de cotizar corre sólo en escritorio** («un e2e del camino feliz por pantalla nueva, en escritorio», `e2e.md`); el celular sigue recorriendo la hoja de
  lectura en `repuestos-cotizaciones.spec.ts`.
- **D55 · Las notas se editan en la hoja** (la RPC las guarda con las líneas; ≤ 2000).
- **D56 · Quitar una línea no se confirma:** es local hasta «Guardar» y «Recargar» la trae de vuelta.
