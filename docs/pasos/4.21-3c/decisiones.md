## Paso 4.21-3c (2026-11-08)

- **La compuerta `producto`, como la contestó la persona** (todas las recomendadas):
  - **P1:** del tipo de cambio sólo se edita el de cada grupo, eligiendo su bucket. `buckets` y `total_en` no se editan: con modos en el diseño, la hoja usa
    los del modo, y los modos son del 4.22.
  - **P2:** no se suman ni quitan grupos en el 4.21. La plantilla de la tarjeta tiene que nombrar exactamente los grupos de la fórmula (`validar-plantilla.ts`);
    con uno de más o de menos, esa versión se quedaría sin tarjeta ni PDF.
  - **P3:** una fila se puede sacar de su grupo, con el aviso «Sin grupo, una fila no entra en el total.».
  - **P4:** el grupo de una fila se cambia en el formulario del grupo («Filas del grupo», «Quitar», «Sumar una fila»). La lista sólo dice el grupo de cada fila
    y no suma un selector por fila.
- **Qué puede sumar a un grupo:** una fila raíz (nunca una auxiliar) que `validarFormula()` acepta como miembro: da un monto, tiene formato de monto y no tiene
  salida (`puedeSumarAlGrupo()`). T4 lo compara con `miembro_no_es_monto` y `miembro_con_salida` en cada tipo de nodo de la fórmula de prueba.
- **Mover una fila sólo cambia `grupo` de su raíz:** su texto, sus auxiliares y su lugar no se tocan. Una fila quitada queda **sin** la clave `grupo` (no con un
  valor vacío).
- **El tono de la tarjeta (obs. 6 de la auditoría):** la plantilla puede elegir el tono de un grupo (`forma-de-plantilla.ts`, `tono?`). En la tarjeta y el PDF, el
  tono del grupo manda sólo si la plantilla no elige otro. El formulario lo dice bajo «Tono».
- **El «Aplicar» de una fila, a su hook:** `use-aplicar-fila.ts` recibe los `set` de `useState`, para que `aplicar` siga estable para las `FilaDelEditor` con
  `memo` (con un callback nuevo en cada render se volverían a dibujar las 500 filas).
- **Un `feat` con una extracción (obs. 3 de la auditoría del informe):** `4ff55f8f` lleva también el paso del «Aplicar» de una fila a `use-aplicar-fila.ts`, sin cambio de conducta. Lo impuso el lint de 80 líneas al sumar los grupos al hook del editor: es una excepción consciente a «un commit, un cambio».
- **Una auxiliar nunca suma a un grupo:** lo prueba T4 con una auxiliar `usd` en una cadena de `filasDe()` (el `fix` de la auditoría del informe, `83a18e41`). Una auxiliar compilada lleva `raw` o `pct` y ya la rechaza `esMonto`.
- **Microdecisiones de texto (`ui.md`):**
  - El botón dice «Editar», con el nombre accesible «Editar el grupo <etiqueta>».
  - «Queda sin grupo» se dice antes de aplicar y «Quedó sin grupo» después.
  - «n fila(s)» es el número de miembros de la fórmula en memoria, no un conteo de la base.
  - Una fórmula sin grupos no monta la sección ni lee los tonos.
- **Para el coordinador:**
  - En la fila del 4.21 de `docs/PLAN.md`: «**4.21-3c** (editar los grupos: etiqueta, plazo, tono, tipo de cambio y sus filas) está hecho; **el 4.21 está
    hecho**». Marcar el 4.21 hecho en `plan.yaml`.
  - `ESTADO`: «4.21-3c: los grupos de la fórmula en el editor (plazo, tono, tipo de cambio y sus filas); cierra el 4.21».
  - **Un abierto nuevo** para los abiertos de la Fase 4: sumar y quitar grupos en el editor, y editar `buckets`, `total_en` y los modos, esperan a que la
    plantilla de la tarjeta se edite junto con la fórmula (P2.1, P1.1). Lugar: `entities/formula/grupos.ts` y `entities/plantilla/validar-plantilla.ts`.
  - 4-5, 4-6 y 4-8 ya los cerraron el 3a-1 y el 3b-1. Si siguen como abiertos en `docs/PLAN.md`, márcalos cerrados.
  - El 4.21 tiene `riesgo: rojo`, sale sin `parcial` y no se integra solo.
  - **Pulido para la Fase 9** (una línea en `docs/PLAN.md`): con más de 500 grupos, el `<AvisoDeTope>` de la sección «Grupos» ofrece «Busca una fila por su nombre o su etiqueta.», que no lleva a los grupos que quedan fuera (`grupos-de-la-formula.tsx`). No pasa en la práctica: la plantilla nombra cada grupo.
  - (obs. 5) `TOPE_DE_TONOS_DEL_EDITOR` (`entities/formula/grupos.ts`) repite `TOPE_DE_TONOS` del área `plantilla` (`entities/plantilla/lectura-de-la-plantilla.ts`),
    porque un área no importa otra. Moverlo al núcleo cuando el A pueda.
- **Para el A:** el texto de la ficha `src/modules/cotizaciones/CLAUDE.md` (núcleo; «Entra y sale», tras lo del 3a-2): «edita los grupos que hay (etiqueta, plazo,
  tono, tipo de cambio por su bucket y sus filas) en la sección «Grupos» del editor (4.21-3c): `entities/formula/grupos.ts`, con los tonos leídos desde el
  navegador (`infra/formula/tonos.client.ts`)».
