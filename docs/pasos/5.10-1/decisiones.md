## 2026-11-11 — Paso 5.10-1

- **El 5.10 se parte en dos:** 5.10-1 (las reglas: uso, impacto, cambiar, sin escritura directa) y 5.10-2 (la oferta de transporte: tabla, `flujo_oferta_guardar`,
  `flujo_oferta`, sin escritura directa, fichas de `logistica` y `flujos`, glosario «Oferta de transporte»). Entero eran 7-8 commits de código y dos disparadores del
  Nivel 2 distintos (4 y 6). Plan: `.piloto/planes/5.10.md` (trae el 5.10-2 servido). `docs/plan.yaml` conserva un solo `5.10`: **este PR no marca `integrado 5.10`**; el
  5.11 espera al 5.10-2.
- **Lo que pidió la auditoría del plan (observaciones), aplicado:** apagar una regla ya apagada no mira el uso (puede haber flujos con «esperas» apagada y requisitos de
  espera vivos, de cuando la base no lo miraba); el `42501` antes que el `22023` del catálogo, con su caso en R1; el trigger trata cambiar `regla` o `flujo_id` de una fila
  encendida como apagarla; la prueba va antes de `vehiculos-visibilidad.sql` en la lista fija.

- D1 · Puertos y navieras no tienen pantalla ni RPC y `navieras` nace vacía: su catálogo queda para la **Fase 6** (es de `logistica`, con `logistica.catalogos.gestionar`), y
  el 5.11 lo dice en su vacío («Todavía no hay navieras cargadas. Se cargan en Logística.»). Es la recomendada de la fila: no mete tablas de otro módulo en la Fase 5.
- D2 · El paso se parte (arriba).
- D3 · Las fases jubiladas también cuentan como uso (como el trigger de antes y D23 del 5.01-2): reactivarlas exigiría la regla.
- D4 · Cada requisito del impacto lleva también `fase_nombre`, además del `{id, fase}` de la fila: la pantalla del 5.11 nombra la fase y enlaza `?fase=` sin otra lectura.
  «Vivos» = todos los de `tipo = 'espera'` de fases del flujo, activas o jubiladas (los requisitos no tienen borrado lógico).
- D5 · El trigger deja pasar el borrado en cascada de un flujo (el flujo ya no está). Es defensa: hoy la FK de `fases` corre antes que la de `flujos_reglas` y borra fases y
  requisitos primero; R8 es la guarda de que la cascada (`origen_eliminar`) sigue pasando, no una prueba de D5 sola.
- D6 · `flujo_regla_impacto` no devuelve versión ni toma candado (como `fase_impacto`). Con la regla ya apagada da `bloquea: false` (apagarla no hace nada) y las listas
  igual, informativas. Listas con tope 50 leyendo 51: la app las corta con `cortarAlTope()`.
- D7 · Encender una regla fuera del catálogo del ámbito → `22023`; apagarla se permite siempre (limpia una fila heredada, p. ej. un `aduana` en repuestos escrito a mano).
- D8 · `flujo_regla_cambiar` mueve la versión siempre, también si la regla ya estaba así (como `fase_mover`, D22 del 5.01-2).
- D9 · El mensaje del `23514` es genérico en la base («la usan fases o requisitos de este flujo», hint `regla`): los nombres humanos de las reglas viven en TS (5.11,
  `entities/reglas/catalogo.ts`) y la pantalla nombra fases y requisitos desde el impacto. El `22023` del catálogo tampoco nombra el ámbito («no está disponible en este flujo»).
- D10 · La prueba va en la lista fija (`supabase/tests/flujos-reglas.sql`), como pide la fila, y no en `areas/flujos/` (el carril a es base y edita la lista). Sus ayudantes usan
  el prefijo `flr_`: `fr_` ya lo usa `areas/flujos/fases-reactivar.sql` y la corrida es una sola sesión de PGlite.
- D11 · Queda una carrera hasta el 5.07, que no es regresión: `fases_requisitos` todavía se escribe directo, y su trigger lee la regla «esperas» sin tomar el flujo. Así,
  apagar «esperas» con `flujo_regla_cambiar`, que toma `flujos` `for no key update`, a la vez que otra persona crea un requisito de espera puede dejar la regla apagada con un
  requisito vivo. Ese estado ya se admite (una regla ya apagada no bloquea, R4). Se cierra cuando el 5.07 pase los requisitos por RPC con `_flujo_para_editar`.
