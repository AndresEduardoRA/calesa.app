## 2026-11-11 — Paso 5.07-2

- **Cierra el 5.07** (parte 2 de 2, la lectura). Plan: `.piloto/planes/5.07-2.md`; D1–D10 en `docs/pasos/5.07-1/decisiones.md`.
- **D11 · El `for share` vuelve a `fase_requisito_validar()`.** El 5.03 la recreó leyendo los formatos del tipo `for share`; la parte 1 la recreó desde la base en
  una migración posterior y lo perdió al unirse con `main`. Una migración nueva (`requisitos_validar_con_candado`) la recrea desde la vigente con ese único
  cambio, y una prueba de definición (R16) lo fija, porque el 5.03 no dejó carrera.
- **D12 · R11–R15 van en `supabase/tests/areas/flujos/requisitos-lectura.sql`**, no en `requisitos.sql` (que pasaría de 300 líneas).
- **D13 · `flujo_fuera_de_regla` mira también las fases jubiladas** con requisitos bloqueantes: quien sigue ahí sigue fuera de regla (mostrar de más es
  reversible; esconder, no).
- **D14 · A lo sumo 1.000 unidades por fase, sin orden**, tomadas una vez en un arreglo: ordenar leería la fase entera. Con más, es una muestra; `revisadas` lo dice.
- **D15 · GLOSARIO y RENDIMIENTO se editan en el PR del carril:** el paso 8 del piloto sólo veda ESTADO, PLAN, BITACORA y DECISIONES.
- **D16 · Las filas de `docs/PLAN.md` que nombran `fuera_de_regla` (751, 757, 1063) no se tocan** (carril con coordinador): van «Para el coordinador».
- **D17 · Un requisito o un flujo que no existe da `PT409` antes que el permiso**, como `requisito_guardar`: el id no dice nada que la lectura de
  `fases_requisitos` no diga ya.
