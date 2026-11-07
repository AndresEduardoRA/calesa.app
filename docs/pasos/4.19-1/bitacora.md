## 2026-11-07 — Paso 4.19-1: la versión esperada de la plantilla de la tarjeta, en la base

- **Hecho:** el 4.19 se partió en cuatro (4.19-1 la base; 4.19-2 `validarPlantilla()` de TS; 4.19-3 el editor; 4.19-4 la vista previa en vivo). Este 4.19-1, sólo base.
  `plantilla_guardar_borrador(p_origen, p_actualizado_en_esperado, p_def, p_nota)` devuelve la versión nueva: con la esperada nula **crea** (si ya hay borrador, PT409 «Ya hay
  un borrador de esta plantilla, guardado hace 2 min.»; nunca pisa); con la esperada, un borrador de otra versión da PT409 «El borrador de esta plantilla cambió hace 2 min,
  mientras lo editabas.» (sin nombre: P1). `plantilla_publicar(p_origen, p_actualizado_en_esperado, p_nota)` pide la versión (la nula, la excepción de `_exigir_version`, sin
  PT409) y una nota (22023 «Publicar pide una nota.», hint `nota`; P4) y sigue devolviendo `uuid` (con `jsonb` el inventario de `cotizaciones-visibilidad.sql` la daría por
  «sin registrar»). `plantilla_descartar_borrador(p_origen, p_actualizado_en_esperado)` nace con su versión (P2). Las tres, tras el permiso (`cotizaciones.configurar` del origen,
  P3) y lo que se rechaza sin mirar el estado, toman `pg_advisory_xact_lock(hashtextextended('plantillas:' || origen, 0))` y leen el borrador `for update`; sin borrador
  y con esperada, `_plantilla_borrador_ausente()` da PT409 «El borrador ya no está: la versión N se publicó …» o «…: se descartó.». La regla de `.claude/rules/migraciones.md`
  pierde la excepción de la plantilla, escribe el caso «esperada nula = crear» y suma lo que dejó el B (4.20-1: `p_publicada_esperada` de la fórmula; `formula_guardar_borrador`
  «hasta el 4.21»); `docs/COTIZADOR.md` › «Versiones de la plantilla (4.19-1)». P1–P6 con las recomendadas (compuerta `producto`/`datos`).
- **Lo que midió HEAD, y no es lo que decía la fila de PLAN:** dos publicaciones a la vez **no** daban el 23505 de `plantillas_publicada_unica`. Publicar no hace ningún
  `insert`, sólo dos `update … where id =`: la segunda esperaba la fila de la primera, la volvía a mirar por id y publicaba también, pisando su nota (K1 en HEAD: las dos
  `ok`, la publicada v2 con la nota «Pierde B»). Dos crear y dos guardar con la misma versión: B pisaba el borrador de A (K2, K4); guardar mientras se publicaba creaba un borrador
  nuevo (K3).
- **Verificación** (`.piloto/salidas/4.19-1/`): rojos contra HEAD (`rojo-head-probar.txt`: T1, T2, T3 y T5 con 42883; `rojo-head-probar-descartar.txt`: T4 y T5;
  `rojo-head-carreras.txt`: K1–K4); `db:reset`, `db:types` y `db:probar` en cada commit (623 ✓, sin ✗); `db:lint` sin avisos en las funciones nuevas; `db:carreras` con las cinco
  nuevas en verde (`verde-carreras.txt`; en cada una B espera el candado de A); 12 mutaciones, cada una cae donde dice el plan (`mut-*.txt`: M1 K2 con 23505; M2 K1; M3 T2 y K4;
  M4 T1 y K2; M5 T3; M6 T2, T3 y T4; M7 T3; M8 T5 y `privilegios-de-anon.sql`; M9 «sin registrar: plantilla_publicar»; M10 T4; M11 K5; M12, de la auditoría del informe: abrir la
  ayudante a `authenticated` cae en T5); `pnpm lint`, `pnpm typecheck` y `scripts/guardas` (996) en verde; los e2e `cotizar-vista-previa` y `cotizar-pdf` en escritorio (16 en
  verde) son humo: ningún spec llama a las RPC. Informe auditado: observaciones, atendidas en un `fix`.
  e2e completo: no (4.19-1, base, Nivel 1 + cadena db + db:carreras: lo dirigido en escritorio es humo; el completo lo corre el CI del PR por la migración)
- **Abiertos:** ninguno nuevo. 4-64: `scripts/carreras.mjs` 357 → 359. Lo que el B dejó para el A (4.20-1): la ficha y la regla, hechas aquí.
- **Commits:** `203c56ec` feat(db): pedir la versión esperada al guardar y publicar la plantilla · `f7d2868b` feat(db): descartar el borrador de la plantilla con su versión ·
  `2d271102` test(db): sumar las carreras de la plantilla de la tarjeta · `7a7c3ddb` test(db): vigilar los privilegios de la ayudante de la plantilla (el `fix` de la auditoría
  del informe) · y el de docs.
