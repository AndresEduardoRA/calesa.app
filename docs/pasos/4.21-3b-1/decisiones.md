## Paso 4.21-3b-1 (2026-11-07)

- **La partición del 4.21-3b.** Junta dos capas con verificación distinta: guardar desde el editor (pantalla, sin base: la RPC `formula_guardar_borrador` ya
  existe desde el 4.21-2) y lo que la base cambie según P2–P4. Va primero la pantalla: **4.21-3b-1** (este) y **4.21-3b-2** (la migración de P2).
- **P1 a P4, como las contestó la persona** (todas las recomendadas):
  - P1 (una constante sin celda en el diseño, al guardar): **guardar y avisar**. El editor dice, cerca del botón y mientras haya, «Para publicar, el diseño de la
    hoja tiene que mostrar: «…». Puedes guardar igual.» (las cinco primeras filas y «y N más»); sin diseño, «Este borrador no tiene el diseño de la hoja: todavía
    no se puede publicar.». Guardar entra y publicar sigue rechazando con su texto de siempre (`nodo_sin_seccion`).
  - P2 (¿una auxiliar `<fila>__<n>` tiene que tener celda?): **que el diseño no la pida**. Es el 4.21-3b-2: una migración de `validar_diseno()`, su espejo
    `validar-diseno-cobertura.ts`, sus casos en `casos-de-diseno.json` y el aviso de C6 sin auxiliares; compuerta `datos`.
  - P3 (la hora nula en publicar y descartar): **la base sigue aceptándola**. Desde este paso la app la manda siempre; el residual R1 del 4.21-2 queda anotado.
  - P4 (la fórmula desde cero): **después del 4.22** (hoy daría un borrador que no se puede publicar: `diseno_faltante`).
- **Lo que el editor guarda.** Sobre la publicada, crea el borrador con su diseño y la nota nula (la de la publicada es de su publicación); sobre el borrador, lo
  pisa con su hora, su diseño y su nota (la RPC los escribe tal cual: mandarlos nulos los borraría). La lectura del editor suma `estado, diseno, nota` en el mismo
  pedido y la misma fila (una sola foto). Tras guardar, la base pasa a ser la fila que devolvió la RPC (`{id, actualizado_en}`), **sin releer**: releer dejaría
  entrar a otra persona entremedio. Una fila `reescrita` por el ⚙ guarda el texto que ya dice el valor nuevo (cierra lo que quedaba del 4-5).
- **El pedido se arma en `features`, no en `entities`** (`use-guardar-borrador.soporte.ts`): usa `FilaParaDibujar`, `TextoDeLaFila` y `paramsPlanos`, que viven en
  el soporte del editor, y `entities` sólo importa `entities` y `shared`. Lleva su test igual. Sus funciones: `formulaParaGuardar(trabajo, filas)` (la fórmula
  con los textos reescritos), `pedidoDeGuardar(base, guardable, origenId)` y `hayCambiosPorGuardar(guardada, guardable)`; el plan nombraba
  `definicionParaGuardar` y `pedidoDeGuardar(base, trabajo, filas, origenId)`: se juntó en una fórmula para que el editor la tome tal cual al entrar.
- **Las esperadas, exactamente una, por su forma:** `esperada: { sobre: 'publicada', publicadaId } | { sobre: 'borrador', actualizadoEn }`, cada rama estricta
  (Zod `discriminatedUnion`), en vez de dos campos opcionales: lo que no es una de las dos no pasa el esquema. La hora es un ISO con zona (`z.iso.datetime({ offset:
true })`), tal cual la da la base con sus microsegundos.
- **Microdecisiones** (`ui.md`):
  - «Guardar el borrador» va arriba de la lista, bajo la cabecera del editor y antes de la vista previa, con una línea `role="status"`.
  - El botón espera, en este orden: con una fila abierta o el formulario de «Sumar fila», «Aplica o cancela la fila abierta.»; con un rechazo de
    `validarFormula()`, «Corrige lo marcado para guardar.»; sin cambios, «No hay cambios por guardar.»; con un conflicto, apagado (el aviso lo dice).
  - Tras guardar y sin cambios, «Se guardó el borrador.» ocupa el lugar de «No hay cambios por guardar.».
  - Una fila `reescrita` cuenta como cambio: guardarla es lo que la arregla.
  - No se confirma antes de guardar, ni sobre el borrador de otra persona: la cabecera ya dice de quién es («Sobre el borrador de <persona>.») y la base no
    deja pisar uno que cambió. Sin atajo de teclado.
  - Mientras guarda, «Editar» y «Sumar fila» esperan (`ui.md`: un formulario que se reemplaza al llegar lo guardado apaga sus campos): nada cambia el trabajo
    durante el envío, así que reemplazarlo y limpiar el borrador local no pisa nada.
  - El 22023 de guardar dice un texto propio, nunca el de la base: «La base no aceptó la fórmula por una regla que el editor no revisó: no se guardó.». El 42501,
    «Ya no configuras <Origen>: no se puede guardar.»; sin respuesta, «No sabemos si se guardó: recarga para verlo.» (como al descartar); cualquier otro error, «No pudimos guardar el borrador. Vuelve a intentar en un
    momento.». Sólo el PT409 muestra el texto de la base. Al volver a guardar, lo que dijo el intento anterior se borra mientras corre el nuevo.
  - El conflicto muestra el texto de la base (nombra a una persona y cuándo), «Recargar trae el borrador como quedó; lo que aplicaste y no guardaste se
    pierde.» y «Recargar».
  - **La `key` del editor ya no lleva la versión:** es `<origen>:<vuelta>`, y `vuelta` sube sólo con «Recargar», que hace `router.refresh()` y la sube en la misma
    transición. El editor fija el `formulaId` con el que abrió: guardar sobre la publicada cambia la versión de la pestaña («Sobre el borrador de <yo>.») sin
    volver a montar el editor ni releer.
  - En publicar, la versión del formulario es la publicada y la hora del borrador juntas: el conflicto se va cuando «Recargar» trae cualquiera de las dos. En
    descartar, el PT409 va dentro del `<Confirmar>` con «Recargar», y el diálogo pasa a nombrar el borrador de ahora.
- **Medido:**
  - El pedido de guardar con 600 filas (sin diseño), en el navegador: **69.372 B**, 130 ms del clic a «Se guardó el borrador.» (informativo, escritorio).
  - Una fórmula sintética de 2.000 nodos con un diseño de unos 2.000 ítems: **400.650 B** de JSON, bajo el tope de 1 MB de una Server Action (Next no lo fija en
    `next.config.ts`: rige el de fábrica). Lo fija un test de Vitest; si un día pasa de 1 MB, es un hallazgo que decide la persona.
  - Abrir el editor con 600 filas sigue bajo los 80.900 B del spec base (lee además `estado, diseno, nota`, nulos en ese borrador).
- **Para el coordinador:**
  - En la fila del 4.21 de `docs/PLAN.md`: «El 4.21-3b se parte en **4.21-3b-1** (guardar el borrador desde el editor: crear sobre la publicada o pisar el
    borrador con su hora, el texto que reescribió el ⚙, el aviso de lo que el diseño no muestra, y publicar y descartar con la hora del borrador; cierra 4-8 de
    punta a punta) y **4.21-3b-2** (la auxiliar sin celda, P2: la migración de `validar_diseno()`)».
  - **4-8, cerrado de punta a punta:** la base lo cerró en el 4.21-2 y la app manda ahora las esperadas al guardar, publicar y descartar.
  - `ESTADO`: «4.21-3b-1: guardar el borrador desde el editor de la fórmula (cierra 4-8)».
- **Para el A:**
  - En `src/modules/cotizaciones/CLAUDE.md`, «Entra y sale», tras el texto del 3a-2: «guarda el borrador con `guardarBorrador` (`formula_guardar_borrador`): crea
    sobre la publicada con su diseño o pisa el borrador con su hora, sin releer, y escribe el texto que reescribió el ⚙; publicar y descartar mandan la hora del
    borrador (4.21-3b-1)». En «No se rompe», sumar a las excepciones de los textos de la base los PT409 de `formula_guardar_borrador()` y
    `formula_descartar_borrador()` (nombran a una persona y cuándo; el 22023 de guardar no se muestra).
  - En `.claude/rules/migraciones.md:59`, la excepción «`formula_guardar_borrador` hasta el 4.21» pasa a decir que la app manda siempre la hora (4.21-3b-1) y la
    base sigue aceptando la nula (P3).
- **Abierto (viene del 4.20-2c):** al descartar y al publicar, un error que no es PT409 ni falta de red sigue mostrando `error.mensaje`, que puede ser el texto
  de la base; guardar ya usa su texto propio. Se arregla en el paso que vuelva a tocar esos formularios.
- **Para el 3b-2:** P2 = a: `validar_diseno()` deja de pedir celda a una auxiliar `<fila>__<n>` (la que tiene celda sigue valiendo), con su espejo, sus casos y
  `nodosSinCelda()` (`entities/formula/sin-celda.ts`) sin auxiliares; compuerta `datos`, porque cambia qué acepta publicar sobre nodos ocultos. El soporte de los e2e
  que le pone celda a mano a `comision__1` (`e2e/soporte/formula-editor.ts:34-43`) puede quedar.
