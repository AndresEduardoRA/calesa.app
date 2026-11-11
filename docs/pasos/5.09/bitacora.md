## 2026-11-11 — Paso 5.09-1: «Documentos», lo que no se ve (parte 1 de 2)

- **Hecho:** la capa sin pantalla de los tipos de documento, en el área `documentos` de `flujos`.
  - `entities/documentos/`: el tipo, las constantes (tope 100 por grupo, formatos, modos de vencimiento, `PANEL_*`), el uso acotado (`textoDelUso`),
    el orden (`destinoDeTipo`), el formulario con su validación espejo de la base y el armado de `p_datos` y `p_cambios`; y las lecturas de la
    respuesta de la base con Zod.
  - `infra/documentos/`: la lectura por grupo (`tope + 1`), el uso por `tipos_documento_con_uso` y las cuatro RPC, con el campo del `hint`.
  - `features/documentos/`: los esquemas (lista cerrada de claves) y las cuatro actions, con el permiso del grupo antes de escribir.
  - `areas/documentos/`: `leerTiposDeDocumento(flujoId | null)` y `leerUsoDeTiposDeDocumento(flujoId | null)` por `index.ts`; tipos, constantes, reglas
    puras y las cuatro actions por `client.ts`.
- **Cambió respecto del plan:** las dos lecturas se llaman `leerTiposDeDocumento` y `leerUsoDeTiposDeDocumento` (no `leerTiposDelGrupo`), para que el
  nombre no choque con otra área; `Direccion` pasó a `DireccionDeTipo`. La validación vive en `entities/documentos/formulario-de-tipo.ts`
  (el archivo único pasaba de 300 líneas y de la complejidad permitida). Cada action recibe también el `flujoId` del grupo: sin él no sabe qué
  permiso exigir antes de la RPC.
- **Para la parte 2 (5.09-2):** `FilaDeCatalogo.motivoSinOrden` (D6), hooks, lista, modal, eliminar, la pestaña y el e2e, como dice `.piloto/planes/5.09.md`
  › «Parte 2 servida». El `client.ts` del área ya trae las constantes `PANEL_*`, `CLAVE_DEL_TIPO` y `CLAVE_DEL_GRUPO`, `validarTipo`, `borradorConModo`,
  `cambiosParaGuardar`, `textoDelUso`, `destinoDeTipo` y las actions.
- **Verificación** (`.piloto/salidas/5.09/`):
  - `entities/documentos`: 42 pruebas. Dos corren contra la base real en PGlite: `FORMATOS_DE_DOCUMENTO` y el tope contra `_tipos_documento_formatos()` y
    `_tipos_documento_tope()`; y 20 casos de `validarTipo` contra `_tipo_documento_validar()` (mismo campo en el `hint`, mismo texto).
  - Esquemas y permisos del grupo: `features/documentos`, 8 pruebas.
  - `pnpm exec vitest run src/modules/flujos scripts/guardas`: 45 archivos, 1.152 ✓, 0 ✗. `pnpm typecheck` y `eslint src/modules/flujos`: 0 avisos.
    e2e completo: no (5.09-1, Nivel 1, sin interfaz: lo corre el CI del PR)
