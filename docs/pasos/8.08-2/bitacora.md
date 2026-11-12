## 2026-11-12 · Paso 8.08-2: esqueleto, rutas y catálogos de repuestos (parte 2 de 3 del 8.08)

- **Hecho:**
  - **Áreas.** `src/modules/repuestos/` se parte como `logistica`: el núcleo y siete áreas (`proyectos`, `items`, `stock`, `compras`, `cotizador`,
    `catalogos`, `flujo`), con sus huecos para 8.09–8.13. La guarda `scripts/guardas/areas-c/areas-de-repuestos.test.ts` vigila que un área no importe otra.
  - **Rutas.** `RUTAS.repuestos` y `RUTAS.configuracionDeRepuestos` (sólo se agregan).
  - **Catálogos sin pantalla.** `CATALOGOS_DE_REPUESTOS` (atado al `check` de la base por un test), `ValorDeCatalogo` con su validación,
    `leerCatalogosDeRepuestos()` (cuatro consultas con tope 200) y las actions `crearValor`, `guardarValor` y `eliminarValor`, que escriben directo bajo la
    RLS de `repuestos.configurar` (23505 → «Ya hay uno con ese nombre.» junto al campo; 23514 `en_uso` con el texto de la base; cero filas → sin permiso o
    «ya no existe»).
  - **RLS de escritura probada.** K2 y K3 en `supabase/tests/areas/repuestos/catalogos.sql`.
  - Decisiones en `decisiones.md` (D19–D27). La auditoría del plan dejó observaciones, atendidas en el plan.
- **Commits:** `9c832b1a` (áreas), `6e2f566c` (rutas), `089821b9` (entities), `f34f42c9` (leer), `cc32661b` (escribir y actions), `4e31be6f` (K2, K3) y el
  de docs.
- **Falta (8.08-3):** `/configuracion/repuestos` con `seccion.ts`, `pestanas.ts` («Catálogos» y el hueco «Cotizador»), la pestaña «Catálogos» con cuatro
  `<ListaDeCatalogo>` y `e2e/configuracion-repuestos-catalogos.spec.ts`. Ajustes que deja esta parte: la pantalla es `pantallas/catalogos.ts` (no
  `pantallas/configuracion.ts`), las flechas de orden van apagadas con «El orden se cambia al editar» (D21) y la columna «Uso» muestra «—» (D25).
- **H1 · hallazgo para la 8.10 (con migración):** `repuestos_catalogos` tiene `UPDATE` de toda la tabla para `authenticated` (B:31835), así que quien tiene
  `repuestos.configurar` puede pasar un valor de un catálogo a otro (`catalogo`) por PostgREST y dejar ítems apuntando a un valor del catálogo equivocado.
  La app nunca lo manda (`guardar` no lleva `catalogo`; `strictObject` en el esquema). Arreglo: `revoke update on public.repuestos_catalogos from
authenticated; grant update (nombre, activo, orden, datos) on public.repuestos_catalogos to authenticated;` (o un `before update` que rechace el cambio
  de `catalogo`), con su prueba en `catalogos.sql`.
- **Para la 8.08-3:** el `.refine` de `cambios` en `features/catalogos/schemas/valor.ts` lleva `{ error }` (auditoría del informe, menor).
- **Pedido al coordinador:** la línea bajo la fila 8.08 de `docs/PLAN.md`: «8.08-1 y 8.08-2 hechas (base, esqueleto, rutas y catálogos sin pantalla);
  falta 8.08-3 (configuración y e2e)», y H1 en el 8.10.
- **Verificación** (`.piloto/salidas/8.08-2/`):
  - `db:probar` completo: exit 0, ningún ✗, K2 y K3 ✓ (`probar-completo.txt`); `SOLO=areas/repuestos/catalogos.sql` ✓ (`probar-catalogos.txt`).
  - `scripts/guardas` + `src/modules/repuestos`: 1.096 ✓ (`guardas-5.txt`); `vitest related`: 855 ✓ (`vitest-related.txt`). `typecheck` ✓. `mapa.sh --check` ✓.
- e2e completo: no (8.08-2, Nivel 2 por shared: lo corre el CI del PR)
