## 2026-11-11 — Paso 5.01-1

- **El 5.01 se parte en dos:** 5.01-1 (la versión del flujo y su contrato, `fase_crear`, `fase_guardar`, sin escritura directa, la carrera) y 5.01-2 (`fase_mover`,
  `fase_eliminar` con versión y el `drop` de la firma vieja, `fase_reactivar`, `fase_impacto`, el flujo de repuestos por migración, la línea de `fase_eliminar` en
  `escala.sql` y sus 42501: «las seis»). Entero eran 9 o 10 commits de código. Plan: `.piloto/planes/5.01.md`. `docs/plan.yaml` conserva un solo `5.01`: **este PR no marca
  `integrado 5.01`**; 5.04, 5.05, 5.07 y 5.10 esperan al 5.01-2, aunque las firmas del contrato ya quedan aquí.
- **Firmas congeladas** (las usan 5.05, 5.07 y 5.10): `public._flujo_para_editar(p_flujo uuid, p_actualizado_en_esperado timestamptz) returns public.flujos` y
  `public._flujo_tocar(p_flujo uuid) returns timestamptz`, sin EXECUTE para `authenticated`. Toda RPC de configuración las llama (antes y al final) y devuelve la versión.
- **Lo que pidió la auditoría del plan (observaciones), aplicado:** en crear, la forma antes del permiso y las validaciones tras el candado; `if not found` → PT409 tras cada
  `for update`; K2 (quien no tiene `flujos.configurar`, `supervision` en las carreras, no espera el candado); `drop trigger trg_actualizado_en on flujos`; los topes nuevos sólo sobre las claves que llegan; enteros dentro de `int4`.

- D1 · Versión **por flujo**, no por fila (recomendada de la fila, duda a): una fila bloqueada sirve a las tablas hijas sin `actualizado_en`; dos personas en el
  mismo flujo chocan con `PT409`, aceptable en una pantalla de dueño.
- D2 · Se puede jubilar la única inicial activa (duda b); entra con `fase_eliminar` en el 5.01-2, con `unica_inicial` en `fase_impacto`.
- D3 · El flujo de repuestos por migración (duda c), en el 5.01-2.
- D4 · La versión la mueve un trigger propio de `flujos` (`flujo_version`, C1) y no `_flujo_tocar` a mano: el trigger genérico la pisaría con `now()` (V1) y
  `migraciones.md` › «Forma» pide `greatest(clock_timestamp(), anterior + 1 µs)` para lo que se mueve dos veces en una transacción.
- D5 · Los dos ayudantes del contrato sin EXECUTE para `authenticated` (C4): llamados sueltos dejarían bloquear filas de `flujos` a cualquiera.
- D6 · El permiso se mira antes del candado (C2 b-c): quien no puede no espera ni hace esperar; el permiso no depende de nada que cambie en la fila (ámbito y
  origen no se editan).
- D7 · Un flujo o una fase que ya no existen dan `PT409` con «Recarga» (como `categoria_mover`, B:8667), no `42501`.
- D8 · El texto del `42501` es «No tienes permiso para configurar este flujo.» (de tú); `fase_eliminar` vieja dice «Sin permiso…» hasta el 5.01-2, que la
  unifica.
- D9 · Renombrar un origen mueve la versión de su flujo (V13): quien tenga la pantalla abierta recibe `PT409` al guardar. Raro y reversible; no se exceptúa.
- D10 · `fase_crear` sin `es_logistica` toma el valor de la regla `logistica` del flujo, para que crear en un flujo con la regla apagada no falle por un
  default de la tabla (V5, V7).
- D11 · Topes de texto (nombre 60, alias 60, descripciones 500) e ícono por formato `^[a-z0-9-]{1,40}$`: la tabla no los tiene y la pantalla del 5.04 los
  necesita; el catálogo de íconos vive en TS, la base sólo mira la forma. Se miran sólo sobre las claves que llegan (una fase vieja que los pase guarda otros campos).
- D12 · El caso con usuario simulado de C12 va en `areas/flujos/fases-guardar.sql` (V7; empezó en `fases.sql`, que pasó de 300 líneas), no en `humo.sql` (la fila; `migraciones.md` pide `humo.sql` en general).
- D13 · «Versión del flujo» en `docs/GLOSARIO.md` la escribe el 5.02 (carril a, su fila lo nombra): escribirla aquí también chocaría en el mismo archivo.
- D14 · La carrera se registra en `scripts/carreras.mjs` (import + llamada, como comprobantes) y no con un `correr-carreras.mjs` suelto como `areas/final/`: así
  la corre `db:carreras` en el CI.
- **El candado del contrato es `for no key update`** (de la auditoría del informe): `for update` sobre `flujos` y sobre la fase chocaba con el `key share` de las FK de
  `cambiar_fase` (`vehiculos.fase_id`, `historial_fases.flujo_id`) y podía terminar en 40P01. Dos guardados de configuración se siguen serializando (K1). `fase_guardar`
  asigna `nombre` sólo si cambia: asignar una columna de un único (`fases_flujo_id_nombre_key`), aun con el mismo valor, toma el candado de clave (medido); renombrar sí
  espera a quien mueve un vehículo a esa fase. 5.05, 5.07 y 5.10 heredan el candado por `_flujo_para_editar`; si escriben una columna de un único de su tabla, lo mismo.
