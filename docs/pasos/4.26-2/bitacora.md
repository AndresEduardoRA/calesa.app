## 2026-11-08 — Paso 4.26-2: los comprobantes en la cotización guardada (emitir, la sección y anular)

- **Hecho:** tres commits de código sobre las RPC del 4.26-1, sin tocar `supabase/`. El plan pasó por una auditoría (observaciones: la limpieza de los e2e, emitir
  sólo de una final **activa**, la excepción de los textos de la base; atendidas en el plan).
  - `entities/comprobantes/`: quién emite (final activa sin vigente, con `cotizaciones.comprobantes.emitir`) y quién anula (la misma clave, P5 a), «S-N», el
    vigente, el motivo.
  - Las actions `emitirComprobante` y `anularComprobante` no llaman a la base sin la clave; la respuesta de cada RPC pasa por Zod.
  - En `/cotizaciones/[id]`: «Emitir comprobante» en la cabecera (`?panel=emitir-comprobante`, `<Confirmar>` diferido); la sección «Comprobantes» bajo la hoja
    (en una final o con alguno; tope de 20 con su aviso; sin `datos`, P4 a); «Anular» en el vigente con un modal de motivo (`?panel=anular-comprobante`).
  - La lectura (`infra/comprobantes/leer.ts`) trae el `estado` de la cotización por su clave primaria y los comprobantes con `limit 21`, una vez por pedido.
- **Verificación** (`.piloto/salidas/4.26-2/`):
  - `entities/comprobantes`: 11 ✓ (`vitest-entities.txt`); actions: 7 ✓ (`vitest-actions.txt`); guardas y lo de Configuración: 1.112 ✓ (`vitest-empresa.txt`).
    T11 de áreas cayó una vez (el tipo de estado venía de `comentarios`) y se arregló antes del commit.
  - e2e dirigido en `escritorio` (build de producción): 53 ✓, con `cotizaciones-comprobantes` (nuevo), final, papelera, comentarios y `presupuesto-js`
    (`e2e-escritorio.txt`); en `movil`: 10 ✓, con el nuevo, final y papelera (`e2e-movil.txt`). El spec nuevo corre también en celular (no lleva marca: no hacía
    falta sacarlo).
  - JS en frío de `/cotizaciones/[id]`: 442,8 KB (tope 448; antes 441,9).
  - `typecheck` 0, `mapa.sh --check` 0, guarda de carriles 38 archivos (`62051fde` → `b/4.26`), saltadas nuevas 0, `nivel.mjs` Nivel 1.
  - La auditoría del informe pidió que un spec de comprobantes cortado a la mitad no frene la limpieza de los demás: `borrarOrigenesDeCotizar()` borra antes los
    comprobantes de sus cotizaciones y `borrarPersonasDePrueba()` suelta la serie de prueba (`e2e-fix-limpieza.txt`: con una serie colgada, 9 ✓ y vuelve a «A»).
    e2e completo: no (4.26-2, pantalla: Nivel 1; el completo lo corre el CI del PR por las migraciones del 4.26-1; en local, lo dirigido en escritorio y celular)
- **Commits:** `4f453464` las reglas · `236e64ee` las actions de emitir y anular · `4bae1191` la guardada · `4029413e` fix de la limpieza de los e2e · y el de docs.
