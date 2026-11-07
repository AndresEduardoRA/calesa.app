## 2026-11-07 — Paso 4.24-3: «Enviar a la papelera» con «Deshacer» en la cabecera de una guardada

- **Hecho:** pantalla pura, dos commits de código, sin migración ni RPC nuevas (usa `cotizaciones_papelera_enviar` del 1a y `_restaurar` del 1b). La cabecera de
  `/cotizaciones/[id]` suma «Enviar a la papelera» (`outline`, después de «Revisiones»). Lo ve quien puede guardarla o, en una preventa, quien modera
  (`puedeEnviarLaCotizacion`). Manda la versión de la página tal cual; al entrar lleva a `/cotizaciones` con ««T» se envió a la papelera.» y «Deshacer» 10 s, que
  restaura ese lote con la versión que devolvió el envío. Una versión vieja avisa el PT409 con «Recargar» y se queda. La action pide editar, moderar o gestionar
  finales antes de llamar a la base. Esperó dos chores del A: `ef8f4dd7` (la prueba de huecos vacíos) y `9bf2d6cd` + `5b1154ef` (`loading.tsx` sin el barril y
  `server-only` simulado).
- **Verificación** (`.piloto/salidas/4.24-3/`):
  - Rojos contra HEAD: `rojo-head-entities.txt` (16 de 23: no exportan), `rojo-head-pantalla.txt` (la action no existe; el hueco es `{}`), `rojo-head-e2e.txt`
    (N1, con lo nuevo de `src/` apartado: no hay «Enviar a la papelera»).
  - Verde: `verde-commit1.txt` (3.015 pruebas de `src/modules/cotizaciones`, `scripts/guardas` y `src/app/(app)/cotizaciones` con el árbol del commit 1) y
    `verde-commit2-vitest.txt` (211 archivos, 3.143 pruebas, con el botón).
  - e2e dirigidos en `escritorio` y `movil` (`verde-e2e-2.txt`): 77 en verde, 7 omitidos (los de `presupuesto-js` en movil, por diseño):
    `cotizaciones-papelera-enviar.spec.ts` (N1–N4, nuevo), `cotizaciones-papelera.spec.ts`, `cotizaciones-papelera-purgar.spec.ts`, `cotizar-guardada.spec.ts`,
    `cotizar-guardada-revisiones.spec.ts`, `cotizar-guardada-guardar.spec.ts` y `presupuesto-js.spec.ts`.
  - Medido: JS en frío de `/cotizaciones/[id]` 439,2 KB de 448 (438,4 en el HEAD de arranque; 450,7 antes del arreglo del A, `js.txt`, `js-head.txt`, `js-exp.txt`).
    `lint` y `typecheck` los corrió el hook de cada commit.
    e2e completo: no (4.24-3, pantalla, Nivel 1: lo dirigido en escritorio y movil)
- **Abiertos:** los de `decisiones.md` › «Para el coordinador» (lo tipeado sin guardar y el guardado pendiente tras «Deshacer», del núcleo; el título nulo de
  `enviados` en la base).
- **Commits:** `8830012a` feat(cotizaciones): enviar una cotización a la papelera por su action · `fa9fbf9c` feat(cotizaciones): enviar a la papelera desde la guardada con deshacer · y el de docs.
