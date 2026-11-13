## Paso 9.14-1 · El cierre de la Fase 9, parte 1 de 3: las cuatro tareas de oro en escritorio y celular (2026-11-13)

- **La tabla de las cuatro tareas** está en `docs/PLAN.md` › «Fase 9» › «Las cuatro tareas de oro»: tarea, meta de `docs/UX.md`, spec y
  prueba con su título, proyectos, lo medido en cada uno y el «nunca» con la prueba que lo afirma. Ninguna celda vacía. Las cuatro cumplen
  su meta en `escritorio` **y** en `movil`, con teclas o toques contados y KLM (no un cronómetro: D2).
- **Lo que faltaba eran dos cosas, y son los dos commits de código.** (1) La prueba de la meta de la tarea 1 llevaba `@sin-celular` desde el
  5a-fix-3 y nunca se había medido en el celular: se le quitó la marca y pasa con **KLM 16,9 s** (meta ≤ 25 s). (2) El «nunca» de la tarea 4,
  «dejar vencer un turno sin aviso», no tenía ninguna prueba (ni e2e ni SQL): la nueva de `e2e/web-turno.spec.ts` adelanta el `vence_en`,
  corre `web_expirar_solicitudes()` —lo que hace el job de cron cada 5 min— y afirma el estado `vencida`, la fila de `notificaciones` de la
  asesora, el `Vencido` de la tarjeta en Inicio y el aviso en `/notificaciones`, en los dos proyectos. Las otras diez metas y «nunca» ya
  estaban cubiertos y corriendo donde corresponde; se verificó uno por uno, no se dio ninguno por bueno de memoria.
- **Lo medido** (`.piloto/salidas/9.14-1/cuatro-escritorio.log` y `cuatro-movil.log`), escritorio / movil: tarea 1, KLM 18,3 / 16,9 s (4
  teclas de control + 47 / 42 caracteres, 0 clics); tarea 2, la asesora con enlace 58,1 / 55,3 s y la dueña con el inventario 42,8 / 38,3 s
  (meta ≤ 90); tarea 3, mover 1 en 11,3 s y el contenedor de 8 en 14,6 s, iguales en los dos (metas ≤ 15 y ≤ 60); tarea 4, «Contacté» en
  **1 toque** (la meta son 2) y el portal en KLM 8,5 s con 16 teclas de control (meta ≤ 30). Ninguna meta se bajó y ningún spec se marcó
  para esquivar un rojo.
- **Un inestable, no un rojo del producto.** En la primera corrida de escritorio cayó `leads-alta.spec.ts` › «el de otra persona dice de
  quién es y nada más del lead» (el `toHaveURL('/')` del ingreso se quedó en `/ingreso`) y en la segunda, «lo que no es un teléfono se dice
  junto al campo, al salir de él» (el drawer no abrió en 30 s); las dos son del archivo `serial` y ninguna de las dos es la prueba que se
  tocó. Repetido el archivo solo, **3 de 3 en verde** (`leads-alta-escritorio-triaje-{1,2,3}.log`), y las dos pruebas tocadas dos veces
  seguidas en verde en cada proyecto. Se anota como inestable del ingreso bajo carga; no se arregló nada aquí.
- **Lo que queda del 9.14:** la parte 2 (el recorrido de la IA con dos cuentas, `e2e/fase-9-recorrido.spec.ts`) y la parte 3 (la tabla de
  criterios del «Terminado cuando», «lista para desplegar», el Nivel 3 con los dos proyectos, ESTADO y la reconciliación de los «No entra»).
  Esta parte no corre el completo a propósito: lo corre la 9.14-3 sobre el SHA que ya tenga todo.
- e2e completo: no (9.14-1, Nivel 1: las cuatro tareas de oro en escritorio y movil; el completo lo corre el 9.14-3; dirigidos: leads-alta, web-turno, cotizar-tarea-de-oro-recorrido, logistica-tarea-de-oro, leads-portal-acceso, leads-portal, fase-8-recorrido)
