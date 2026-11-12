## 2026-11-12 · Paso 8.11-2: la pestaña «Compras», la lista y el margen (parte 2 de 3)

### Hecho

- `entities/compras/compra.ts` (la fila de la lista, `monto_base` leído y nulo en filas de antes de 8.11-1) con su test; `infra/compras/{listar,margen}.ts`
  (`leerComprasDelProyecto`, tope 200 más uno sobre `repuestos_compras_proyecto_id_idx`; `leerMargenDelProyecto` por `repuestos_proyecto_margen`).
- `<ListaDeCompras>` y `<MargenDelProyecto>` por `pantallas/compras.ts`: un margen nulo dice «Sin precio en N ítems» y un margen 0 es un monto.
- La pestaña «Compras» de `/repuestos/[id]` (`?pestana=compras`) sólo con `repuestos.costos.ver` (`pestanasLlenas(permisos)` con `puede()`); sin él la URL abre
  «Ítems» y no se lee nada de compras. `seccion-compras.tsx` lee la lista y el margen sólo con la pestaña abierta.
- `e2e/repuestos-compras.spec.ts` (con costos: lista, margen 100/60/40 y «Sin precio en 1 ítem»; sin costos: no hay pestaña). Ficha, `docs/UX.md` y `docs/RENDIMIENTO.md`.

### Verificación

- `vitest related` (`pestanas.test.ts`, `compra.test.ts`): 7 en verde (`.piloto/salidas/8.11-2/vitest-related-1.log`); `scripts/guardas`: 1.122 en verde
  (`vitest-guardas.log`); `typecheck` y `eslint` de lo tocado limpios.
- e2e dirigidos `repuestos-compras`, `repuestos-proyecto` y `repuestos-stock` en escritorio y móvil: 20 de 20 (`.piloto/salidas/8.11-2/e2e-dirigidos.log`).
- Sin `db:*`: esta parte no toca `supabase/`.

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- 8.11-2 hecha: la pestaña «Compras» de `/repuestos/[id]` sólo con `repuestos.costos.ver` (sin él `?pestana=compras` abre «Ítems»), la lista (proveedor, ítem,
  monto y equivalente, fecha; tope 200) y el margen por moneda con «Sin precio en N ítems». **8.11 sigue:** 8.11-3 (Drawer, eliminar con «Deshacer»,
  comprobante y el e2e del registro).

e2e completo: no (8.11-2, Nivel 1 con interfaz: lo corre el CI del PR; dirigidos repuestos-compras, repuestos-proyecto, repuestos-stock en escritorio y movil)
