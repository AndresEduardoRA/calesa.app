## 2026-11-12 · Paso 8.09-3: imágenes del ítem (parte 3 de 4 del 8.09)

### Hecho

- Base (`20261112111909_repuestos_imagenes.sql`): `repuestos_items_imagenes` sólo se escribe por insert y delete; índice único `(item_id, ruta)`; trigger `before insert` (`security definer`: ítem vivo, proyecto abierto, ruta de la carpeta del ítem,
  tope 8 bajo candado, rescate de la cola, el objeto existe, `orden`) y `after delete` (encola la ruta por refcount).
- Servidor: `entities/items/imagenes.ts` (tope, ruta, plan de agregado, avisos), `RepositorioDeImagenes`, `infra/items/imagenes.ts`, esquemas y tres actions (`leerImagenesDeItem`, `agregarImagenes`, `quitarImagen`).
- Interfaz: `?panel=imagenes&item=<id>` (drawer con «3 de 8 imágenes», zona para subir, galería con «Quitar» y «Deshacer», estados) y el botón «Imágenes» en cada fila de la tabla y de las tarjetas.

### Commits

- `feat(db): tope y limpieza de las imágenes de un ítem`
- `feat(repuestos): leer, agregar y quitar imágenes de un ítem`
- `feat(repuestos): subir las imágenes de un ítem desde el navegador`
- `feat(repuestos): panel de imágenes del ítem por la dirección`
- `feat(repuestos): botón imágenes en cada fila de la hoja`
- `test(repuestos): recorrido de las imágenes de un ítem`

### Verificación

- `SOLO=areas/repuestos/imagenes.sql pnpm db:probar`: 5 casos ✓; `pnpm db:probar` completo: exit 0, 0 ✗ (`.piloto/salidas/8.09-3/probar-completo.txt`).
- `vitest` de `scripts/guardas` y `src/modules/repuestos`: 56 archivos, 1.197 pruebas ✓. `eslint`, `tsc` y `mapa.sh --check` sin avisos.
- `e2e/repuestos-proyecto.spec.ts`: 12 de 12 (escritorio y celular, `e2e-proyecto.txt`); `e2e/repuestos-listado.spec.ts`: 6 de 6.

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- 8.09-3 hecha: imágenes del ítem (`?panel=imagenes&item=<id>`) con una migración `repuestos_imagenes`; sigue **8.09-4**: `<ResumenRepuestos>`, `proyectoDe(vehiculoId)` (`pantallas/vehiculo.ts`), el caso «desde la ficha del vehículo» en `repuestos-proyecto.spec.ts` y eliminar un proyecto vacío con «Deshacer» (D55).
- Hueco para 8.10: borrar una imagen de un proyecto cerrado o de un ítem eliminado no lo frena la base (ver `decisiones.md`).
- Pulido para la Fase 9: la subida desde `features/` sin `infra/*.client.ts` (D73), el barrido de huérfanos de `repuestos` (D66) y la miniatura (D65).

8.09 sigue: falta la parte 4 (`<ResumenRepuestos>` y eliminar proyecto).
e2e completo: no (8.09-3, Nivel 2: lo corre el CI del PR; los dirigidos en verde)
