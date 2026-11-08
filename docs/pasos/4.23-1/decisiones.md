## 2026-11-08 — Paso 4.23-1

- **Lo que contestó la persona:** la compuerta `datos` («aprobar»), con P1–P5 en su recomendada:
  - **P1:** la pantalla edita y reordena en su memoria y publica la tabla entera con nota y versión. No hay borrador en la base ni RPC por fila, así que
    reordenar no es una escritura propia y la carrera de 5b-7 no puede darse en las tablas.
  - **P2:** una compartida pide `cotizaciones.configurar` en **cada** origen que la usa.
  - **P3:** se revoca la escritura directa.
  - **P4:** el tope es de 2.000 filas.
  - **P5:** columnas, alta y baja de tablas quedan fuera del 4.23 (por ahora, sólo por SQL).
- **Lo no obvio:**
  - **Un origen está afectado si su publicada usa la tabla en un nodo o en su copia** (`params.tablas ? clave`). Si sólo contara el nodo, una copia sin nodo
    se quedaría vieja y un borrador que vuelva a sumar el nodo la publicaría sin PT409.
    - La lista se arma tras el `for update` de la tabla y la publicada se relee dentro del candado de cada origen: si dejó de usarla, se salta; si empezó,
      se pide su permiso (R4 y R5).
    - Un origen inactivo cuenta igual: su fórmula existe y la usa, así que recibe la N+1 y su permiso se pide.
  - **«La tabla no cambió.» mira también las publicadas.** Tras `formula_revertir`, la publicada vuelve a la copia vieja y la viva sigue en la versión
    nueva: publicar las mismas filas tiene que devolverle la tabla.
    - **Para el 4.23-3:** el editor muestra la viva, no la copia de la publicada.
  - **Una compartida deja ver que otro origen la usa.** Quien configura un solo origen recibe 42501 si otro la usa, aunque no pueda leer la fórmula de ese
    otro (se acepta con P2).
  - **`p_version_esperada integer`,** no `p_actualizado_en_esperado`: la versión entera es la que el PT409 nombra («… la versión 3 de esta tabla …»), como
    la publicada esperada de la fórmula es una versión y no una hora (`.claude/rules/migraciones.md` › «Forma»).
  - **`aplicado_en`** queda `policy tablas_referencia (leer), tabla_referencia_publicar`: la lectura sigue siendo la policy con ese permiso.
  - **El `hint` de una fila va desde 0** (`filas.1.monto`, como un camino de Zod) y el mensaje dice la fila desde 1 («La fila 2: …»). Un `anio` es entero.
    `_tabla_referencia_filas_validas` es `stable` (con `immutable`, `db:lint` daba un aviso nuevo por el `raise`).
  - **Las filas inactivas se borran al publicar:** el cálculo y la copia sólo leen las activas, y la historia queda en las copias de cada versión de la
    fórmula. Una celda nula se guarda ausente (`jsonb_strip_nulls`) y así se compara.
  - **La base no congela al publicar una fórmula** (`_formula_forma` sólo valida). Una versión anterior que leía la viva recalcula con las filas nuevas;
    lo guardado de una cotización no cambia (la prueba de dinero guarda una y lo comprueba).
- **Para el coordinador:**
  - **La partición.** En `docs/PLAN.md`, la fila del 4.23 se parte en tres:
    - 4.23-1: la base (5b-7, versión de la tabla, `tabla_referencia_publicar` con la N+1 de sus fórmulas). Nivel 2 + `db:carreras`. Hecho.
    - 4.23-2: entidades, lectura por cursor y la action. Nivel 1.
    - 4.23-3: la pestaña «Tablas» de Configuración › Cotización y 4-47. Nivel 1.
  - **`plan.yaml`.** El id `4.23` se reemplaza por tres:
    - `4.23-1`: `depende_de: ['4.20']`, terminado «Las tablas de referencia tienen versión y se publican con la N+1 de sus fórmulas; cierra 5b-7».
    - `4.23-2`: `['4.23-1']`.
    - `4.23-3`: `['4.23-2']`, terminado «Se editan, reordenan y publican desde Configuración › Cotización; cierra 4-47».
    - El `4.28` pasa a depender de `4.23-3`.
  - **Línea de ESTADO:** «B/C, 4.23-1: las tablas de referencia tienen versión y se publican con la N+1 de sus fórmulas (5b-7 cerrado)».
  - **5b-7, cerrado.** El candado de `tipo_seguimiento_mover` se queda: la carrera nueva cae sin él.
  - **4-47** sigue para el 4.23-3. Su segunda mitad (una congelada sin viva se rotula con la clave): ninguna RPC deja hoy una congelada sin viva (no hay baja
    de tablas, P5), y el 4.23-3 decide si la cierra con ese argumento o rotula.
  - **RENDIMIENTO:** «Tablas de referencia: hasta 2.000 filas por tabla (`tabla_referencia_publicar`). La copia congelada viaja entera en cada
    `cotizacion_evaluar`, y el tope la acota.»
  - **`scripts/carreras.mjs` ya pasa de 300 líneas** (361). No se partió en este paso: R4 y R5 van en `scripts/carreras/tablas-compartida.mjs`, que llama
    `tablas.mjs`, y sólo se sumaron una importación y una llamada.
