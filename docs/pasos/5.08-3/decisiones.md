## 2026-11-11 — Paso 5.08 (decisiones de la parte 3)

- **D11 · «Bloqueante» vive sólo en la fila**, no también en «Editar»: dos lugares harían dos caminos de impacto.
- **D12 · La confirmación de impacto es en línea**, no `<Confirmar>`: no destruye nada (se revierte con el mismo interruptor) y no entra en `confirmar-con-url`. Estado local: recargar la descarta.
- **D13 · El impacto se lee por una Server Action de lectura** (`leerImpactoDeRequisito`), como las opciones: el hueco es de cliente y la RPC necesita la sesión.
- **D14 · El aviso de fuera de regla no lleva esqueleto** (`<Suspense fallback={null}>`): lo normal es que no haya nada y un esqueleto saltaría.
- **D15 · Sin caché del conteo:** debe reflejar el último cambio; la RPC ya acota y la pestaña es de configuración.
- **D16 · Repuestos:** el título es «Ítem de repuestos» (no hay lector de títulos de ítems) y no hay «Verlas en el inventario».
- **D17 · El camino al inventario es por fase** (`/vehiculos?origen=&fase=`), porque el filtro del inventario es por fase; `FILTRO_FASE` sale por `vehiculos/index.ts` (una línea aditiva).
- **D18 · `revisadas ≥ 1.000` se avisa en el impacto:** el conteo sale de una muestra y callarlo daría un número que parece exacto.
- **D19 · Si no se pudieron leer los títulos,** el panel lo dice con un aviso y rotula «Vehículo» (no «Un vehículo que no puedes ver»: sería mentir sobre el permiso).
- **D20 · Una fase jubilada se rotula « (jubilada)»** en el panel: la RPC también mira las jubiladas.
- **D21 · `guardarRequisito` acepta `bloqueante`** (la RPC ya lo admitía) y el formulario de edición sigue sin escribirlo.
