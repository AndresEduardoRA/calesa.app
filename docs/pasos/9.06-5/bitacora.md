## Paso 9.06 · Datos: importar todo, parte 6 de 6: el avance, el resultado y la lista (2026-11-12)

- **Lo puro:** `entities/resumen-de-importacion.ts` (la fila de `importaciones` para la pantalla; estado visible con la pausa primero, D52; la
  frase del resultado, D53; cuándo hay rechazadas, D54; qué se sondea, con tope) e `informe-de-importacion.ts` (el CSV de las rechazadas, D54).
- **Las lecturas, del navegador y bajo la RLS de quien mira:** `infra/importaciones.client.ts` (la lista por cursor sobre los índices parciales y el
  avance por ids) e `infra/informe.client.ts` (el informe por la PK, de a 1.000). Sin migración: grants, policies e índices ya estaban (partes 1–2).
- **La pantalla:** los hooks `use-importaciones`, `use-sondeo-de-avance` (cada 5 s, D51) y `use-descarga-de-rechazadas`; el paso «Importando»
  muestra el avance y el resultado (región «Importación en curso») con «Descargar las rechazadas» con las celdas; la lista «Importaciones» al pie de
  la sección (propias, o todas con `datos.importar.todo`; «Ver más»; vacío; error con «Reintentar»; tope). Sin `revalidatePath` (D56).
- **Pruebas:** `resumen-de-importacion.test.ts` y `informe-de-importacion.test.ts`; `e2e/datos-importar.spec.ts` (escritorio, con la función): la
  dueña importa 3 leads para una asesora, uno con el teléfono de un lead ajeno → «2 creados, 1 ya existía y ninguno con errores.», la descarga trae
  la fila 3 con sus celdas y no nombra a la otra persona, la lista la muestra terminada y la asesora ve los dos leads en `/leads`.
- **Auditoría del plan:** observaciones (acotar el e2e a la región del resumen, la pausa antes que «esperando», tope de ids del sondeo, el porqué
  de la `<ul>`, anotar la excepción de D56, teléfonos sin `+`), atendidas.
- **El 9.06 queda completo en 6 partes.** Para el coordinador: cierra el arrastrado «`datos` (importar de todo para el dueño con `importar-csv`)» de
  `docs/PLAN.md`, y D56 va a `docs/DECISIONES.md` como excepción a la regla de `revalidatePath`. Sigue abierto D26 (el CSV de una `fallida` por
  24 h sin avance), para 9.13.
- e2e completo: no (9.06-5, Nivel 2 del paso: el completo lo corre el CI del PR; dirigidos: datos-importar en escritorio)
