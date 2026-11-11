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

## 2026-11-11 — Paso 5.09-2: «Documentos», la pantalla (parte 2 de 2)

- **Hecho:** la pestaña «Documentos» de Configuración › Flujos (`?seccion=documentos`), con los dos grupos («De toda la empresa» y «Sólo de este flujo»), la
  lista con orden por botones, el modal de alta y edición, la confirmación de eliminar y los estados de sólo lectura.
  - `shared/ui/lista-de-catalogo`: `FilaDeCatalogo.motivoSinOrden` (el botón apagado dice el motivo del permiso) con su prueba.
  - `flujos/entities/documentos/vista-de-grupo.ts`: lo que cada grupo muestra y por qué algo no abre o no se elimina (probado).
  - `flujos/features/documentos/`: 9 hooks (panel por URL, escritura de a una, activar con «Deshacer», ordenar, eliminar, formulario con borrador),
    la lista (`grupo-de-tipos`, filas, «⋯»), el modal (texto, formatos, vencimiento), `eliminar-tipo`, `diferidos` y la pantalla de servidor
    `pantalla-de-documentos`. Registro de `eliminar-tipo.tsx` en `scripts/guardas/areas-c/confirmar-con-url.ts`.
  - `src/app/(app)/configuracion/flujos/documentos/{pestanas,seccion}`; `docs/UX.md` gana «Flujos: tipos de documento (estados propios)».
- **Cambió respecto del plan:** ver D12 a D16 de `decisiones.md` (un solo cliente y un solo modal para los dos grupos, «Eliminar» apagado con motivo en un tipo
  en uso, el foco tras mover espera al orden nuevo). La barra de pestañas de Flujos aparece por primera vez: se ajustó `pestanas.test.ts` y
  `e2e/configuracion-flujos.spec.ts`.
- **Verificación** (`.piloto/salidas/5.09/`): e2e dirigido en escritorio, 6 ✓ (`e2e-dirigido.txt`): `configuracion-flujos-documentos.spec.ts` (3: crear con
  «renovar» 365/30, editar, subir con el foco; desactivar uno en uso y eliminar uno sin uso; quien sólo tiene `flujos.configurar`) y `configuracion-flujos.spec.ts`
  (3); los vecinos `origenes.spec.ts` y `configuracion-logistica.spec.ts`, 10 ✓ (`e2e-vecinos.txt`). `vitest scripts/guardas src/modules/flujos src/shared/ui/lista-de-catalogo`
  y la pestaña de `src/app`: 48 archivos, 1.162 ✓. `tsc` y `eslint` sin avisos; `mapa.sh --check` ok.
  e2e completo: no (5.09-2, Nivel 1, sin disparadores: lo corre el CI del PR; dirigidos en escritorio, sin celular por ser Configuración)
