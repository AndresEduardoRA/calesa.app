# Paso 5.13-2 — El cierre de la Fase 5 (parte 2 de 2): los docs de cierre

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas ni preguntas abiertas. El plan: `.piloto/planes/5.13-2.md`.

- **D1** La configuración del flujo se escribe por RPC con la versión del flujo: `flujos.actualizado_en` (texto ISO, microsegundos), `_flujo_para_editar()` y
  `_flujo_tocar()`, `PT409` «Otra persona cambió este flujo mientras lo editabas.»; `authenticated` no escribe directo `fases`, `flujos`, transiciones, roles,
  requisitos, reglas ni oferta (las pruebas de `42501` en `supabase/tests/areas/flujos/`); los tipos de documento, con versión por fila. Por qué: `datos.md` y
  `migraciones.md`; antes se escribía bajo policies sin versión (`docs/PLAN.md` › «Fase 5» › «Lo que ya existe»). Detalle: `docs/pasos/5.01-1/`, `5.01-2/`,
  `5.03/`, `5.05/`, `5.07-1/`, `5.10-1/`.
- **D2** La oferta de transporte es de `flujos`: la escribe `flujo_oferta_guardar()` (Configuración › Flujos › Reglas, 5.11) y la lee `flujo_oferta()`;
  `logistica` sólo la lee (el hueco «Transporte», 6.08). Puertos y navieras son catálogos de `logistica` (6.08). Detalle: `docs/pasos/5.10-1/`, `5.10-2/`, `5.11/`.
- **D3** Lo decidido en las dudas de la fase, todas con la recomendada (sin compuertas), con su detalle en `docs/DECISIONES.md` › `<!-- paso:5.xx -->`: 5.01
  (versión por flujo; se puede jubilar la única inicial; el flujo de repuestos por migración), 5.02 (sólo la lista, sin «camino» ni «historial»; `?origen=` y
  `?ambito=repuestos`), 5.03 (qué significa cada modo de vencimiento; `proposito` no se edita), 5.04 (en repuestos, web, portal y aduana deshabilitados con
  motivo), 5.05 (se puede limitar a un rol que no se domina), 5.07 (nace informativo; se borra `fuera_de_regla()`), 5.08 (una clave con su regla apagada se
  ofrece con nota → 6-4), 5.10 (puertos y navieras a la Fase 6), 5.12 («Revisar» avisa y no frena). Sin dudas: 5.06, 5.09, 5.11, 5.13.
- **D4** Los abiertos numerados que la fase deja a la 6 van en «Abiertos que caen aquí» de la Fase 6, donde vive el 6-1 y donde los busca el 6.14; «Riesgos y
  huecos» sólo se corrige donde quedó viejo (sin borrar). Afina el D6 del 5.13-1, que decía «Riesgos y huecos».
- **D5** De lo que la fase dejó a la 6, sólo el requisito de dato con su regla apagada no tiene paso (mover → 6.04, puertos y navieras → 6.08, vencimiento →
  6.05/6.06/6.12, triggers del dato exigido → 6.07, rama de repuestos → 8.13): un abierto, **6-4** (6-2 y 6-3 están reservados). La campana sin red es
  **7-2**; `rbac_eliminar_rol` con el `23503` crudo es **9-13** (ninguna fila de las fases 6 a 8 toca roles).
- **D6** `flujos.activo` no se edita ni se quita: nadie lo lee ni lo escribe (comprobado con grep en `src/` y las migraciones nuevas); se anota en «Riesgos y
  huecos» de la Fase 5 y en la ficha. Es lo más reversible.
- **D7** La inestable de `configuracion-flujos-requisitos` no es abierto (`.claude/rules/e2e.md` › «Inestables»): se nombra en la tabla y en el cierre.
- **D8** La fase se da por cerrada con el Nivel 3 del 5.13-1 y el CI del PR; si el CI sale rojo, se arregla en su `fix` aparte antes de integrar.
- **D9** La «Partición» de la Fase 5 se queda en `docs/PLAN.md`, como la de la Fase 4 (esta sesión no lee `docs/archivo/`); ESTADO lo dice en la misma línea.
- **D10** GLOSARIO no se toca: «Versión del flujo», «Fase jubilada», «Oferta de transporte», «Jubilar» y «Revisar» ya están. «Siguientes pasos» de Orígenes ya
  enlaza al flujo desde el 5.02 (`e2e/origenes.spec.ts`): se anota, sin código.
