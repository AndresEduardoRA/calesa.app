## 2026-11-12 — Paso 6.06-2: subir documentos con una bandeja (parte 2 de 3)

- **Hecho:** el hueco «Documentos» (panel y pestaña de la ficha) sube archivos con commit diferido:
  - `entities/documentos/admision.ts`: qué entra a la bandeja (formato **del tipo**, vacío, 25 MB, repetido por hash), el aviso desde 10 MB, qué fechas pide cada modo de vencimiento
    (`ninguno` no pregunta, `renovar` opcional, `solicitar` obligatoria), los errores antes de subir, el nombre sin barras y el orden de los tipos (los que pide una fase, primero).
    Test: `admision.test.ts` (18 ✓).
  - `infra/documentos/subir.client.ts` (objeto por hash, sin comprimir, «ya existe» no es error), `registrar.ts` (RPC `documento_registrar`) y la action `registrarDocumentos`.
  - `features/documentos/`: `useBandeja` (elegir deja los archivos sin subir), `useSubirLaBandeja` (primero el objeto, recién entonces el registro; id del intento por archivo atado a lo
    escrito; avance «2 de 3»; «Reintentar los N que faltan»), la zona, la bandeja, los campos y la pregunta al cerrar con archivos.
  - e2e propio: `e2e/logistica-documentos.spec.ts` (sube un PDF como BL y queda «Subido»; sin la clave la zona queda apagada con su motivo) y `e2e/soporte/documentos.ts`.
- **Falta (parte 3):** aprobar, rechazar, editar fechas, «Visible en el portal», eliminar con `<Confirmar>`, el hueco del grupo y el caso de aprobar del e2e.
- **Verificación** (`.piloto/salidas/6.06-2/`): vitest de `entities/documentos` y `features/documentos` (`vitest.txt`, 34 ✓, con la prueba de la bandeja) y `scripts/guardas` + módulo `logistica` (1.325 ✓), `pnpm typecheck` y
  `eslint src/modules/logistica` sin avisos, e2e propio `e2e.txt` (2 ✓) y dirigidos `e2e2.txt` (31 ✓: logistica-unidad, logistica-mover, logistica-gastos-y-pagos y el propio, escritorio y móvil).
- e2e completo: no (6.06-2, Nivel 1, e2e dirigidos del panel y el propio: lo corre además el CI del PR)
- **Commits:** ver `git log` de la rama (4 de código y el de docs).
