# 8.08-3: decisiones (2026-11-12)

- **D28 · «Cotizador» no se dibuja hasta el 8.12.** Una pestaña sin contenido es una pestaña muerta. `pestanas.ts` lleva sólo «Catálogos» y, con una, no hay
  barra. El 8.12 suma su línea y la barra.
- **D29 · La columna de uso dice el «Orden».** `columnaDeUso` es obligatoria y el uso real no se puede leer (D25: la RLS de ítems pide `repuestos.ver`).
  Mostrar el número explica el orden, que se cambia en «Editar» (D21). Cambia la presentación de D25 («—»), no su regla.
- **D30 · «Agregar <valor>»** en vez de «Nuevo/Nueva»: los cuatro valores tienen género distinto, y «Agregar» no lo pide.
- **D31 · El e2e no prueba «en uso».** K1 de `supabase/tests/areas/repuestos/catalogos.sql` lo prueba con el texto exacto y el diálogo lo muestra tal cual.
  Sembrar un ítem en uso desde el e2e pide proyecto y fase.
- **D32 · «Eliminar», no «Borrar»,** como Categorías de gasto y Tipos de lead: una misma palabra en toda Configuración.
- **D33 · Lo nuevo sale al final:** el «Orden» inicial es `ordenSiguiente` del catálogo, no 0.
- **D34 · La lectura va en el servidor** (como Leads › Tipos) y no en el cliente como Categorías de gasto: `leerCatalogosDeRepuestos` ya es de servidor y el
  `revalidatePath` de cada action renueva la página. El e2e lo prueba.
- **D35 · La entrada es `pantallas/catalogos.ts`, no `pantallas/configuracion.ts`** como nombra el «Lugar» de la fila 8.08 de `docs/PLAN.md`: la guarda de
  áreas del 8.08-2 exige una entrada por área.
