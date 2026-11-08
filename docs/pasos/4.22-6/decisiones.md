## 2026-11-08 — Paso 4.22-6

- **Preguntas:** ninguna nueva. P4 del 4.22-1 (4-30) con la recomendada, aprobada: **(a)** `validar_diseno()` rechaza publicar un diseño de más de N ítems.
- **Lo no obvio:**
  - **N = 40 es una cota estimada con lo ya medido, no una medición nueva** (no se hizo sonda: `.claude/rules/e2e.md`). Es el menor que deja válido todo lo
    de hoy (`subasta_usa` tiene 39 ítems; el juego ya traía un diseño válido de 40) y el mayor que entra en el techo de nodos: 491 nodos medidos para 39 ítems
    son 12,6 por ítem, una cota que **sobreestima** (le carga a los ítems también la parte fija de la hoja); con ella, 40 ítems ≈ 504 nodos contra el techo de
    500 (+0,8 %, dentro de la regla del 5 %); como quien configura (⚙), 557 / 39 = 14,3 por ítem, ≈ 571 contra 585 (`docs/RENDIMIENTO.md:168-171`).
  - **Qué cuenta:** todo ítem de toda sección, de cualquier tipo (`celda`, `atajos`, `variante`, `interruptor`, `subtotal`), principal o avanzado (los 491
    nodos se midieron con «Avanzado» abierto). La cabecera (modos, «Ver total Bs») y la tarjeta del total no cuentan. `donde` = la sección en la que la suma
    pasa de 40.
  - **Va tras la forma y antes de los modos** (sólo cuenta y acota todo lo demás): la forma le gana; el tope gana a todo lo cruzado. En TS es el 2.º código de
    `REGLAS_DE_DISENO`.
  - **El borrador lo admite** (`formula_guardar_borrador` sólo mira la forma); **publicar, el ⚙ y revertir** lo rechazan (pasan por `_preparar_publicacion()`).
    El editor del diseño lo dice con su aviso de siempre sin apagar «Guardar»; como no agrega ni quita ítems, la pantalla no cambió.
  - **El número vive en `_diseno_maximo_de_items()`** (invocadora, STABLE, `search_path ''`, sólo `authenticated` y `service_role`) para que
    `medir-validar-diseno.sql` y `medir-publicar.sql` lo apaguen dentro de su transacción revertida (devuelve `2147483647`) y sigan midiendo las sintéticas
    de 200 y 2.000 ítems; en TS, `validarDiseno()` cambia su 4.º parámetro (el medidor) por `opciones: { medidor?, maximoDeItems? }` (por omisión, `MAXIMO_DE_ITEMS_DEL_DISENO`; `max-params` no admite un 5.º) y las pruebas de
    escala pasan `Number.POSITIVE_INFINITY`. Esas dos mediciones no se corrieron (no están en el CI ni en este paso).
  - **Consecuencia para la persona:** la cobertura obliga a dibujar todo input, constante, la variante y cada bandera que condiciona algo
    (`validar-diseno-cobertura.ts`), así que **una fórmula con más de 40 de ésos tampoco se puede publicar**; `subasta_usa` sólo puede crecer un ítem. Si
    hace falta más, se sube el tope (una migración que reemplaza `_diseno_maximo_de_items()` y la constante) midiendo la hoja, o la hoja divide (la otra
    rama de 4-30, descartada hoy).
  - El corpus diferencial (`supabase/tests/corpus-de-diseno.json`) se rehízo entero con `ACTUALIZAR_CORPUS=1`: el mutador nuevo cambia las tiradas de la
    semilla fija. 820 casos; `demasiados_items` es primer rechazo en 21 y ninguna regla baja de 6.
- **Para el coordinador:**
  - `docs/ESTADO.md` (por sustitución, ≤ 60 líneas con `wc -l`): «**4.22 cerrado:** el editor del diseño (secciones, celdas, ítems, tonos y vista previa);
    4.22-6, un diseño de más de 40 ítems no se publica (`demasiados_items`, cierra 4-30)».
  - `docs/PLAN.md`: en la fila del 4.22, tras «4.22-5 hecho: la vista previa (412, 1.280 y 200 %)», sumar «4.22-6 hecho: el tope de 40 ítems
    (`demasiados_items`); 4.22 cerrado». **Cerrar 4-30** (`docs/PLAN.md:420-422`): «cerrado en el 4.22-6: `validar_diseno()` rechaza publicar un diseño de
    más de 40 ítems con `demasiados_items` y la sección en `hint`; el borrador lo admite».
  - `docs/BITACORA.md`: la entrada de `docs/pasos/4.22-6/bitacora.md`, con su marcador.
  - Este PR cierra el 4.22 (`parcial: false`). Sigue sin dueño «mover, sumar y quitar secciones o ítems» del editor (lo dijo el 4.22-2).
