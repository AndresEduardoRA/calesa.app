## 2026-11-07 — Paso 4.24-3

- **Lo que contestó la persona:** compuerta `datos` del plan: «aprobar» (P1 a: esperar el chore del A; P2 a: se envía aunque haya cambios sin guardar). Compuerta
  `afuera` (P1), en tres vueltas: «seguir» hasta que el chore del A llegó a `main` (`ef8f4dd7`, PR #46: el caso de huecos vacíos usa huecos de prueba). Segunda
  compuerta `afuera`, «seguir» (dos vueltas): el A arregló lo que el botón destapaba en `src/app` (`9bf2d6cd`: `loading.tsx` importa sólo
  `pantallas/esqueleto-de-hoja.ts`; `5b1154ef`: la prueba de los huecos simula `server-only`).
- **Lo que se aprobó en permisos:** una puerta en la app, ninguna en la base. La action mira `cotizaciones.editar`, `.moderar` o `.final.gestionar` en algún origen
  antes de llamar a `cotizaciones_papelera_enviar` (`puedeEnviarCotizacionesALaPapelera`, que ahora usa también `puedeAbrirLaPapeleraDeCotizaciones`). El botón lo ve
  quien puede guardarla o, en una preventa, quien modera (`puedeEnviarLaCotizacion`), el espejo de `_cotizacion_a_papelera()`; la base lo vuelve a decidir.
- **Lo no obvio:**
  - El botón es `outline`, a la vista en la cabecera después de «Revisiones», y no una opción de un «⋯» como en vehículos y leads: la guardada no tiene menú y el hueco
    `Acciones` del 4.15-6b es la barra. No es `destructive`: es reversible (el tono queda para purgar).
  - Enviar lleva a `/cotizaciones` (la guardada ya no existe para nadie) y «Deshacer» no la vuelve a abrir: el listado ya la muestra, como en leads y vehículos.
    `Debajo` queda vacío: «Papelera» ya está junto a «Nueva».
  - La base devuelve el `titulo` de `enviados` sin `coalesce` (nulo en una sin título; restaurar, purgar y el lote lo completan con «Cotización #n»). Lo completa
    `envioDesde()`; igualarlo en la base es un paso de base del C si la persona lo pide.
  - Un error de enviar dice el motivo de la base tal cual (el PT409 dice quién la cambió y cuándo): la persona está en esa cotización y no hace falta nombrarla.
    «Deshacer» que no la pudo restaurar es un error de regla con su motivo, como en la papelera.
  - El hueco es un Server Component (`<EnviarLaGuardadaALaPapelera>`) que decide quién lo ve y dibuja `<BotonEnviarALaPapelera>` con el id y la versión: al navegador
    no viajan los permisos ni `permisos.ts`. El botón es un `<button>` con `buttonVariants` (sin el primitivo de Base UI) y el envío
    (`hooks/envio-a-papelera.ts`) llama a las actions sin `useAction`, con su propio «en curso»: el JS en frío de la guardada está al tope (439,2 de 448 KB).
  - El primer intento midió 451,7 KB. No era el botón: `loading.tsx` importaba el barril `pantallas/cotizacion`, y al sumar un Client Component a la página el HTML
    bajaba dos chunks casi iguales (el de `loading` y el de `page`). Con `loading.tsx` sin el barril (prueba temporal) medía 438,5. Pedir el envío al primer clic con
    `import()` no lo arreglaba y además lo rechaza `scripts/guardas/diferidos.test.ts`. Lo arregló el A (arriba); queda en `docs/RENDIMIENTO.md`.
  - `resultados.test.ts` ya tenía 178 líneas: lo de enviar va en `resultados-envio.test.ts`.
- **Para el coordinador (o el A):**
  - El `4.24-3` (`depende_de: ['4.24-2']` y el chore `ef8f4dd7`; `ambar`; `modulos`: `features/papelera/`, `entities/papelera/`, `infra/papelera/`, `areas/papelera/`,
    `pantallas/papelera-cotizacion.ts`, `docs/`) envía desde la guardada. El `4.25` depende de `4.24-3` y de `4.24-2b`.
  - **Este PR marca `integrado 4.24`** si su CI va en verde: el `terminado` («`cotizaciones.papelera.purgar` gobierna su papelera; cierra 4-68 y 4-70») lo cumplen el
    1a y el 1b en la base y el 2 y el 2b en la pantalla; del título faltaba «Deshacer», este paso. 4-68 y 4-70 se quitan de `docs/PLAN.md`.
  - Abiertos para el A, en el núcleo (P2 a): enviar desde la guardada no mira lo tipeado sin guardar, que no vuelve con «Deshacer» (el borrador es por versión); y un
    guardado pendiente (por persona y cotización, sin versión) sobrevive al envío y, tras «Deshacer», el núcleo lo reintenta con la versión vieja y da un PT409 contra
    uno mismo.
  - Para el 4.25–4.27: con `9bf2d6cd` y `5b1154ef`, un área ya puede poner un Client Component con Server Actions en un hueco de la guardada sin duplicar el chunk
    ni romper la prueba de los huecos.
  - Siguen los pendientes del 4.24 que no son del `terminado` (el `aplicado_en` de la clave, la deuda de `docs/ESTADO.md:51`, la ficha del módulo, las carreras).
