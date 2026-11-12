# 9.05-3 · Datos: la pantalla `/datos` (2026-11-12)

- **D44 · Sin `datos.exportar.todo` no se dibuja «Todo».** La fila pide a la vez «una asesora ve sólo Mis leads» y «sin permiso: la tarjeta
  deshabilitada con su motivo»: lo primero manda para el bloque entero; lo segundo es la tarjeta que, con el permiso, el rol no puede usar (no ve leads,
  vehículos o cotizaciones en ningún origen) y «Mis leads» sin `leads.exportar`. Reversible: mostrar el bloque apagado es un cambio de `tarjetas.ts`.
- **D45 · «Importar» es un hueco declarado** (`SECCIONES_DE_DATOS`, `disponible: false`): mientras haya una sola sección no hay barra de pestañas y
  `?seccion=importar` abre «Exportar» (ninguna pestaña se dibuja vacía). El 9.06 la prende y escribe la barra.
- **D46 · Delimitador fijo `;`** (Excel en español, como dice la ficha); sin selector.
- **D47 · «Descargado» no dice cuántas filas**, sólo el nombre del archivo (un número que se muestra nunca es un total exacto).
- **D48 · Orígenes del selector:** `getOrigenes(true)` (también inactivos, D26) filtrados por `vehiculos.ver` o `cotizaciones.ver` en ese origen;
  vehículos arranca en el primero, cotizaciones en «Todos los orígenes».
- **D49 · El rango y el origen de cada tarjeta viven en el formulario**, no en la URL: no son filtros de una lista; recargar los limpia.
- **D50 · «Mis leads» enlaza a `/leads?panel=exportar`** con `PANEL_EXPORTAR`, que `leads` exporta ahora por su `index.ts` (aditivo, una línea).
- **D51 · El e2e borra antes las constancias `datos.exportado` de su dueña** (por `sql()`) para que un reintento no choque con el cupo, y corre sólo
  en escritorio (pantalla nueva: un camino feliz). Identifica lo suyo por un lead propio con nombre del proyecto: «Propio Dalia» de otro proyecto
  sería ajeno para esta dueña.
- **D52 · El límite no apaga «Descargar»:** dice la hora en que se libera; decide la base.
- **D53 · El rango se valida en el navegador con el mismo `esquemaDelPedido`** (`pedidoDelFormulario`) antes de pedir: no gasta un viaje ni cupo.
- **D54 · Los orígenes se leen sólo con `datos.exportar.todo`:** quien ve sólo «Mis leads» no paga esa lectura.
- **D55 · La entrada «Datos» la ve todo el mundo** (`permisos: null`): «Mis leads» es de todos. `navegacion.test.ts` pasa a esperar Perfil y Datos sin
  ningún permiso.
