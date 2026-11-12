## 7.14-1 · El cierre de la Fase 7: el recorrido del «Terminado cuando», el push de verdad, 7-2 y el JS del marco (2026-11-12)

Parte 1 de 2 (`parcial: true`): queda el **7.14-2**, el Nivel 3 (`pnpm test:e2e:completo` con los dos proyectos) y los docs de cierre (tabla de criterios,
«Cierre de la Fase 7», «Partición» marcada, abiertos 7-x, «Riesgos y huecos», ESTADO, las fichas de `agenda`, `chat`, `notificaciones` y `buscador`, UX y
GLOSARIO). Su plan está servido en `.piloto/planes/7.14-1.md` › «Partición» (borrador de la tabla en V40, abiertos en V42).

- **7-2 cerrado:** la campana vuelve a pedir su suscripción diferida con cada evento `online` (`useVueltaDeLaRed()` como `key` en `campana.tsx`): pedida sin
  red ya no queda en «Sin conexión» hasta tocar «Reintentar». `campana.test.tsx` usa el `diferido()` de verdad sobre un cargador que falla dos veces (la
  carga y su reintento) y después resuelve: al llegar `online`, el botón pasa a «Notificaciones, 1 sin leer» y el aviso se va.
- **`supabase/tests/push-de-verdad.sh`:** un aviso `tarea_asignada` por `notificar()` a una persona de prueba con rol `asesor` y una suscripción sembrada
  dispara `trg_notificaciones_push`, crea un pase, pg_net llega por el gateway a la función `push` servida, que canjea el pase y responde 200 `sin_claves`.
  Dos corridas en verde (`.piloto/salidas/7.14/push-de-verdad-{1,2}.txt`: notificaciones 68 y 69, un pase cada una, usado); al final no queda ninguna cuenta
  `push-de-verdad-%` y `push_web` vuelve a apagada. Con la base recién reseteada (sin cuentas) el script crea antes una dueña de prueba en su propia
  transacción: una invitada sin aceptar no puede ser la única que gestiona el equipo (`rbac_guardian`) y el permiso de registro se mira al confirmar.
  El runtime local alcanza la función por el gateway (`url_proyecto` del seed); el endpoint simulado no hace falta (D2). La última milla (firma, cifrado,
  envío) sigue en `push-contrato.test.ts`.
- **`e2e/fase-7-recorrido.spec.ts`**, tres pruebas en serie, `escritorio` y `movil`: R1, Ana da la tarea con `/tarea` en su directa con Luis y la campana de
  Luis, abierta en otra sesión en `/perfil`, pasa a «1 sin leer» sin recargar y su popover trae la tarea (en la base, una `tarea_asignada` con ese título en el
  `cuerpo`); R2, Luis lee «No tienes acceso a este lead», el nombre no está en el DOM ni en un `href` y el drawer no tiene enlaces; R3, Ana encuentra su lead por
  el nombre, no el de la dueña («Sin resultados para…») y con el teléfono de su propio lead la paleta dice «No se busca por teléfono.»; Luis, sin `leads.ver`,
  no encuentra el de Ana.
- **Corridas:** la primera de escritorio cayó en R1 por el assert de SQL (miraba el título del aviso; el título de la tarea va en el `cuerpo`: es del spec,
  no del producto). Después, `fase-7-recorrido` + `notificaciones-campana` 10/10 dos veces en cada proyecto (`.piloto/salidas/7.14/dirigidos-{escritorio,movil}-{1,2}.log`).
  `vitest related` de la campana 1/1; `scripts/guardas` 36 archivos, 1.128 en verde; `typecheck` limpio.
- **JS del marco** (`e2e/presupuesto-js.spec.ts`, escritorio, 9/9): todas las rutas bajo su tope, ninguno cambia (`docs/RENDIMIENTO.md` › «JS en frío»,
  «Cierre de la Fase 7»). Documento de `/perfil` 103.360 B de 103 KB.
- **Sin arreglos de producto** fuera de 7-2 ni inestables.
- e2e completo: no (7.14-1, Nivel 1: el recorrido en escritorio y movil y los dirigidos; el completo con los dos proyectos lo corre el 7.14-2)
