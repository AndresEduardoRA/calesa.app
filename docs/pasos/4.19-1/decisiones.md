## 2026-11-07 — Paso 4.19-1

- **El 4.19 se parte en cuatro, en cadena:** 4.19-1 (la base: la versión esperada y el candado por origen, descartar, la nota), 4.19-2 (`validarPlantilla()` de TS y el aviso del
  tono), 4.19-3 (el editor) y 4.19-4 (la vista previa en vivo). Con un commit por intención eran 9 o más de código. Plan: `.piloto/planes/4.19.md`. `docs/plan.yaml` conserva un solo
  `4.19` (como el 4.18): **este PR no marca `integrado 4.19`**; a sus `modulos` se suman `supabase/`, `scripts/carreras/`, `scripts/carreras.mjs`, `scripts/probar-schema.mjs`,
  `src/shared/types/database.types.ts`, la ficha de `cotizaciones` y `.claude/rules/`.
- **P1 a P6 contestadas el 2026-11-07, todas las recomendadas:** P1 el conflicto no dice quién guardó o publicó (la tabla no guarda quién; con nombre eran dos columnas y Nivel 2);
  P2 se puede descartar el borrador; P3 quien tiene `cotizaciones.configurar` del origen, sin clave nueva; P4 publicar pide una nota; **P5 (4.19-3)** el editor es una pestaña
  «Tarjeta» de Configuración › Cotización, tras «Fórmula» (esa carpeta es del `dueno_de` del B; el 4.19-3 toca `page.tsx` y `pestanas.ts` mientras el B hace el 4.21: integrar con
  cuidado); **P6 (4.19-4)** la vista previa muestra cifras de ejemplo, dichas («Cifras de ejemplo.»).
- **Esperada nula = crear** (`plantilla_guardar_borrador`): sólo hay una fila de su clase por origen (el borrador), así que la RPC que crea y edita toma la nula como crear y, si la
  fila ya existe, PT409; nunca `on conflict … do update`. Se aparta de «las de crear no pasan por `_exigir_version()`», y la regla lo dice ahora.
- **`plantilla_publicar` sigue en `uuid`:** una función que devuelve `jsonb` y lee `public.formulas` entra en el inventario de lo oculto de `cotizaciones-visibilidad.sql` y cae
  «sin registrar» (M9).
- **El rojo de K1 no era el 23505 de la fila de PLAN:** publicar son dos `update … where id =` sin `insert`; en READ COMMITTED la segunda espera, relee por id y publica también,
  pisando la nota de la primera (`rojo-head-carreras.txt`). PLAN y la fila del 4.19 dicen ahora lo medido.
- **La ayudante `_plantilla_borrador_ausente()` sólo es de `service_role`** (y la llaman las RPC, definer): su PT409 dice la versión y la hora de la publicada de un origen, y abierta
  a `authenticated` se saltaría la RLS de `plantillas_tarjeta`. T5 lo vigila.
- **Una `esperada` vieja en `db:probar` es la de la fila menos 1 µs:** dentro de una transacción `now()` no se mueve (trigger genérico); que guardar mueve la versión lo prueban
  K3 y K4 entre transacciones.
- **Terreno de las carreras:** un origen propio por carrera (prefijo «Carreras»), la fórmula `mini` del juego de la plantilla publicada por `insert` y la plantilla del caso «mínima»
  (sin tonos); lo que deja lo borra `limpiar()` con el origen (cascada de `plantillas_tarjeta_origen_id_fkey`).
- **`SOLO=` en `db:probar`** necesita `humo.sql` (crea las cuentas): `SOLO=humo.sql,plantilla-version.sql` corre en 7 s.
