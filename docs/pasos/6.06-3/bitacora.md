## 2026-11-12 — Paso 6.06-3: revisar, editar, eliminar y subir a un grupo (parte 3 de 3, cierra el 6.06)

- **Hecho:** el hueco «Documentos» completa el área:
  - `entities/documentos/revision.ts`: quién puede aprobar, rechazar, editar, eliminar y encender el portal (cada acción oculta, habilitada o apagada **con su motivo**), el motivo de rechazo de 1 a
    500 y `cambiosDeLaEdicion` (sólo lo que cambió; vacío = nulo). Test: `revision.test.ts` (11 ✓). `destino.ts` (una unidad o las de un grupo) y `paneles-de-documento.ts`.
  - `infra/documentos/modificar.ts` y las actions `revisarDocumento`, `editarDocumento` y `eliminarDocumento` sobre las RPC de 6.05 (`documento_revisar|editar|eliminar`); `rpc.ts` dice el `42501`
    según la acción. Sin `supabase/`.
  - Fila: «Aprobar» y «Rechazar» (motivo junto al botón; un `PT409` se dice en la fila y conserva lo escrito), «Editar» (formulario en la fila, sólo lo cambiado), el interruptor «Visible en el
    portal» (reemplaza al `<Badge>`) y «Eliminar» (`?panel=eliminar-documento&documento=<id>`, el rechazo de la fase se dice tal cual y el diálogo sigue abierto).
  - Hueco del grupo: `ZonaParaSubir` toma un destino; un archivo se sube **una vez** (carpeta de la primera unidad) y se registra para todas (`vehiculos[]`); con más de 100 unidades se apaga.
    `pantallas/documentos-grupo.ts` lo declara (aún no hay página de grupo que lo monte: 6.08 y 6.09).
- **Pruebas:** `acciones-del-documento.test.tsx` (apagado con motivo, aprobar con la versión, rechazar pide motivo, `PT409` conserva el motivo), `confirmar-eliminar-documento.test.tsx`,
  `hueco-de-documentos-del-grupo.test.tsx` (un objeto y dos filas; más de 100 apaga) y `destino.test.ts`. e2e `logistica-documentos.spec.ts` (escritorio, 4 ✓): sin la clave «Aprobar» está apagado y dice
  por qué; otra cuenta aprueba el BL, la fila queda «Aprobado» (`revisado_por` en la base) y el destino de «Qué falta» pasa a «Cumplido» con `Mover a «C»` habilitado.
- **Verificación** (`.piloto/salidas/6.06-3/`): `e2e.txt` (propio, 4 ✓) y `e2e2.txt` (logistica-documentos, -unidad, -mover y -gastos-y-pagos, 33 ✓); vitest de `src/modules/logistica` y `scripts/guardas`
  (1.348 y 1.093 ✓), `tsc` y `eslint src/modules/logistica` sin avisos.
- e2e completo: no (6.06-3, Nivel 1, e2e dirigidos del panel y el propio: lo corre además el CI del PR)
- **Commits:** ver `git log` de la rama (6 de código y el de docs).
