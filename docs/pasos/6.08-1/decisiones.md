## 6.08-1 — Catálogos de puertos y navieras (2026-11-12)

- **D1** (duda 1 de la fila) Sacar una unidad de un contenedor **no** es «editar el grupo»: se hace en el hueco de esa unidad (6.08-2); el grupo sólo aplica el mismo cambio a todas.
- **D2** (duda 2 de la fila) Los catálogos de puertos y navieras son de esta fase: la Fase 5 sólo los lee (`flujos`: «Se cargan en Logística»). La semilla trae 5 puertos y ninguna naviera.
- **D3** Sin «Eliminar»: borrar un puerto o una naviera deja nulos los transportes y vacía la oferta de los flujos (`ON DELETE SET NULL` / `CASCADE`); se desactiva.
- **D4** Escritura directa bajo la RLS (`logistica.catalogos.gestionar`), sin RPC ni migración: no otorgan permisos (como las categorías de gasto). Una escritura que deja 0 filas es «sin permiso».
- **D5** Un puerto sin país puede repetirse: la unicidad `(nombre, pais)` no cubre `NULL`. La action lo mira antes y rechaza igual que la base; una alta simultánea de dos personas puede duplicarlo y se tolera
  (se arregla desactivando uno) en lugar de agregar un índice por expresión (migración).
- **D6** El orden de los puertos es un número en «Editar» (como las categorías): intercambiar dos serían dos escrituras sin transacción. Las navieras no tienen `orden` y se listan por nombre.
- **D7** «Puertos» es la pestaña por omisión de Configuración › Logística (el primer catálogo de `CATALOGOS_DE_TRANSPORTE`, que `catalogos.ts` antepone).
- **D8** Desactivar no cambia lo guardado ni la oferta del flujo: `_transporte_validar` sólo frena lo nuevo y `flujo_oferta` devuelve `activo`. La ayuda del formulario lo dice.
- **D9** Sin versión en el catálogo (la tabla no tiene `actualizado_en`): gana el último, igual que las categorías de gasto; sin `<AvisoDeConflicto>`.
- **D10** (microdecisión) Un solo `CatalogoDeTransporte` (encabezado, cinco estados, lista) sirve a los dos catálogos; los formularios son dos hooks y dos modales porque los campos difieren. Un nombre se normaliza
  (recorta y colapsa espacios) antes de validar y guardar; el código se guarda en mayúsculas y sin espacios.
