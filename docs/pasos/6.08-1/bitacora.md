## 2026-11-12 — Paso 6.08-1: catálogos de puertos y navieras (parte 1 de 4)

- **Hecho:** las pestañas «Puertos» y «Navieras» de `/configuracion/logistica` (`pantallas/transporte-catalogos.ts`, sin tocar `src/app`):
  - `entities/transporte/catalogo.ts`: tipos, lectura con Zod, validación y normalización (nombre 1–80, país ≤ 60, código ≤ 12 en mayúsculas, orden 0–32.767), cambios mínimos, uso del puerto («Chile · CLSAI», «Sin país») y
    el texto de los repetidos. Test `catalogo.test.ts` (13 ✓).
  - `infra/transporte/catalogos.ts` (directo bajo la RLS, 0 filas = sin permiso, `23505` junto a «Nombre», pre-chequeo del puerto sin país) y `catalogos.client.ts` (`.limit(201)` + `cortarAlTope`); cuatro Server Actions.
  - `features/transporte/`: `CatalogoDeTransporte` (cinco estados, `<AvisoDeTope>`), filas con «⋯» (Editar, Activar o Desactivar; sin Eliminar), dos modales, hooks de lectura, de panel por URL y de formulario, carga con `diferido()`.
  - `catalogos.test.ts` de Configuración y `e2e/configuracion-logistica.spec.ts` (tres pestañas, crear una naviera y verla en la oferta de transporte de Flujos, repetida, desactivar; crear un puerto con país y código y su repetido).
  - Docs: ficha de `logistica` (sección «Área `transporte`»; se quitó la tabla de áreas repetida), `docs/UX.md` (Configuración › Logística) y `docs/GLOSARIO.md` («Puerto», «Naviera»).
- **Falta (partes 2 a 4):** el hueco «Transporte» de la unidad (6.08-2), `/logistica/embarques` con lista, filtros, resumen y huecos de grupo (6.08-3) y «Editar grupo» (6.08-4). El plan está servido en `.piloto/planes/6.08.md` › «Partición».
- **Verificación** (`.piloto/salidas/6.08/`): `vitest` de `entities/transporte`, de `catalogos.test.ts` y `scripts/guardas` (1112 ✓), `typecheck` y `eslint` sin avisos (el hook del commit); e2e dirigidos en `e2e-1.txt`
  (`configuracion-logistica` y `configuracion-flujos-reglas`, escritorio: 6 ✓).
- e2e completo: no (6.08-1, Nivel 1: lo prueba el CI del PR; dirigidos: configuracion-logistica, configuracion-flujos-reglas)
- **Commits:** ver `git log` de la rama (4 de código y el de docs).
