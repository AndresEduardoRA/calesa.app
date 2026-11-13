# Paso 9.14-3 — El cierre de la Fase 9 (parte 3 de 3): el Nivel 3 y los docs de cierre

Fecha: 2026-11-13 (`TZ=America/La_Paz date +%F`). Sin compuertas ni preguntas abiertas. El plan: `.piloto/planes/9.14-3.md`.

- **D1** (duda 1 de la fila) La fase cierra **lista para desplegar**: la evidencia es `pnpm despliegue:en-seco` en `listo` y la lista de la persona en
  `docs/DESPLIEGUE.md`. El piloto no toca producción y la puerta de una fase es el CI (`docs/PILOTO.md`).
- **D2** El Nivel 3 corre sobre la rama unida a `main` al empezar, antes de los docs; una unión que entre después no repite el completo aunque traiga
  código: lo prueba el CI del PR, y la bitácora da los dos SHA (como el 8.14-2).
- **D3** Lo que no corre en el completo (Vitest, `db:probar`, `db:lint`, el ensayo en seco) va en la tabla con el resultado de su corrida en esta sesión,
  no como «verde del Nivel 3». Se corre aquí, y no sólo en el CI como el 8.14-2, porque el assert de la fila lo nombra y es el cierre de la última fase.
- **D4** El hallazgo D11 del 9.14-2 nace como **9-14a** en «Los decide la persona»: decide qué puede una dueña sobre leads ajenos, y un cierre no cambia
  permisos. Recomendado dejarlo: compartir el lead lo resuelve, y «actuar exige tener el lead» es la regla de toda la app.
- **D5** **9-13** queda como abierto de la fase con su lugar, no en «Los decide la persona»: no es una decisión sino el arreglo de una RPC
  (`rbac_eliminar_rol`), un paso de datos con migración que esta parte no puede hacer.
- **D6** El inestable de `leads-alta.spec.ts` (de la parte 1) no se estabiliza: la última noche del completo en `main` fue verde y la regla pide dos
  noches seguidas.
- **D7** Lo de «Pulido para la Fase 9» que nadie cerró no abre paso: queda sin marca, como pulido para después de la Fase 9 (la regla del 2026-10-30).
- **D8** La fila 9.14 citaba «C y E» para la reconciliación de lo que no entra; esas secciones no existen en PLAN: se reconcilió contra el
  «**No entra:**» de cada fila y sus «(ver E)», en la sección nueva «Lo que la fase dejó fuera».
- **D9** La ficha de `datos` decía «RPC: `crear_lead` por fila» (la contradicción 7 de la fase): se corrigió a `importacion_crear()` con destino y
  `_lead_crear` vía `leads_importar_lote`, que es lo que hay desde el 9.06-1. Es una línea de doc, no un cambio de contrato.
- **D10** `pnpm test` dio 10.889 de 10.891: los dos rojos son pruebas del bucle (`scripts/coordinador/coordinador.node.test.ts` › «el ciclo completo»
  y `scripts/piloto/bucle-flujo.test.ts` › «la copia común que puso al día otro carril»), que caen 3 de 3 dentro de la sesión del piloto y pasan 15 de
  15 con `env -i` (`.piloto/salidas/9.14-3/triaje-scripts-*.log`). Leen el entorno `PILOTO_*` de la sesión que las corre (quitar sólo `PILOTO_AUTO`,
  o sólo `PILOTO_RELANZADO` y `PILOTO_CONFIG_LEIDA`, no alcanza). No es un rojo del producto ni de la fase y el CI del PR las corre en verde: no se
  arreglan aquí (no es de este paso tocar el bucle); queda anotado por si un carril lo quiere volver hermético.
