## 2026-11-12 — Paso 6.08-3: `/logistica/embarques` (parte 3 de 4)

- **Hecho:** la pantalla de embarques y contenedores, sin migración:
  - `entities/transporte/`: `grupos.ts` (la página y el grupo validados con Zod, `valorDelGrupo`, `textosDelGrupo`, `textoDeUnidades`), `filtros.ts` (el esquema por vista y `pedidoDeGrupos`), `paneles.ts` (claves de URL y vistas) y `repositorio-de-grupos.ts`; tests (`grupos.test.ts`, `filtros.test.ts`).
  - `infra/transporte/grupos.ts` (`transporte_grupos` y `transporte_grupo` por RPC con la sesión de quien mira) y `lectura-de-catalogos.ts` (navieras y puertos, una lectura por pedido); la RPC entra a `scripts/guardas/areas-b/paginas-en-la-base.ts`.
  - `features/transporte/`: lista (`ListadoDeEmbarques`, tabla, tarjetas, estados y «Seguir buscando»), `DrawerDelGrupo` (registrado sin formulario), `ResumenDelGrupo`, `UnidadesDelGrupo` y `HuecoDelGrupo` (bloque plegado que monta al abrir).
  - `src/app/(app)/logistica/embarques/` (página, `loading`, `grupo-abierto` y `huecos-del-grupo` con su test), `pantallas/transporte.ts` y `transporte-enlace.ts` (el enlace «Embarques» entre Cadena y Aduana; `enlaces.test.ts` corregido).
  - `e2e/logistica-transporte.spec.ts` (escritorio) suma «verla en su contenedor» y el sin permiso; `e2e/soporte/transporte.ts`, `ponerEnElContenedorDe`.
  - Docs: ficha de `logistica`, `docs/UX.md`, `docs/GLOSARIO.md` («Grupo (de transporte)») y `docs/RENDIMIENTO.md`.
- **Falta (parte 4):** «Editar grupo» (`?panel=editar-grupo`, `transporte_grupo_aplicar`) y el cierre de la fila 6.08; sus precondiciones están servidas en `.piloto/planes/6.08-3.md`.
- **Verificación** (`.piloto/salidas/6.08/`): `vitest` de `entities/transporte`, `src/app/(app)/logistica` y `scripts/guardas` (1187 ✓), `typecheck` y `eslint` sin avisos; e2e dirigidos en escritorio: `e2e-5.txt` (`logistica-transporte`, 6 ✓) y `e2e-6.txt` (`logistica-cadena`, `logistica-aduana` y `logistica-gastos-y-pagos`, escritorio y celular: 12 ✓, 5 saltadas por sus marcas).
- e2e completo: no (6.08-3, Nivel 1: lo prueba el CI del PR; dirigidos: logistica-transporte, logistica-cadena, logistica-aduana, logistica-gastos-y-pagos)
- **Commits:** ver `git log` de la rama (5 de código y el de docs).
