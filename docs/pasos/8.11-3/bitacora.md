## 2026-11-12 · Paso 8.11-3: registrar, editar y eliminar compras, con el comprobante (parte 3 de 3)

- **Hecho:** en la pestaña «Compras» de `/repuestos/[id]`, un solo «Registrar compra» arriba de la lista (apagado con su motivo sin `repuestos.costos.editar` o con
  el proyecto cerrado), el Drawer `?panel=compra&compra=<id|nueva>` (con `diferido()`, borrador en `sessionStorage`, `PT409` con «Recargar»), «Editar» y «Eliminar»
  en la fila (eliminar sin confirmación, con «Deshacer» que llama a `repuesto_compra_restaurar`), y el comprobante (bucket `comprobantes`, `<proyecto>/<sha-256>.<ext>`,
  sin comprimir, «Ver comprobante» con URL de 60 s, también desde la fila). Las actions `guardarCompra`, `eliminarCompra` y `restaurarCompra` piden
  `repuestos.costos.editar` con `puede()` antes de la base y revalidan la página; `z.strictObject` deja afuera `monto_base`, la tasa y `proyecto_id`. Sin migración:
  la base de 8.11-1 ya lo traía todo.
- **Verificación** (salidas en `.piloto/salidas/8.11-3/`): `vitest related` 6 archivos, 28 ✓ (`formulario`, `errores`, `acciones`, el esquema, `compra`, `margen`);
  `scripts/guardas` 1125 ✓ (el Drawer registrado en `drawers-con-salida.ts`); `pnpm lint` y `pnpm typecheck` salida 0; `mapa.sh --check` salida 0; e2e dirigidos
  `repuestos-compras` (caso 3 nuevo: registrar 15 lleva el margen de 40 a 25 con `monto_base` de la base, eliminar lo vuelve a 40 y «Deshacer» a 25),
  `repuestos-proyecto` y `repuestos-stock`, escritorio y movil: 22 de 22.
- **Para copiar a `docs/PLAN.md`:** «8.11 hecha (3 partes): la base (8.11-1), la pestaña «Compras» con la lista y el margen (8.11-2) y, en 8.11-3, registrar y editar
  en `<Drawer>` (`?panel=compra&compra=<id|nueva>`, `repuestos.costos.editar`; sin él o con el proyecto cerrado, «Registrar compra» se apaga con su motivo), el
  comprobante (bucket `comprobantes`, `<proyecto>/<sha-256>.<ext>`, sin comprimir, «Ver comprobante» con una URL de 60 s) y eliminar con «Deshacer»».
- **Abierto:** el e2e no sube un comprobante (D8). «Ver comprobante» queda en dos copias (`ver-comprobante.ts` y `useComprobante.ver`), como en logística.
- e2e completo: no (8.11-3, Nivel 1 con interfaz: lo corre el CI del PR; dirigidos repuestos-compras, repuestos-proyecto, repuestos-stock en escritorio y movil)
