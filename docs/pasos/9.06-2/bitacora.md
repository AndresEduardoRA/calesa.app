## Paso 9.06 · Datos: importar todo, parte 2 de 5: el motor en la base (2026-11-12)

- **Pruebas partidas** (sin cambiar ninguna): `importar.sql` (crear, idempotencia, los cinco del Assert), `importar-crear.sql` (ruta, privilegios,
  RLS de `importaciones_filas`), `importar-lotes.sql` e `importar-terminar.sql`; todas por debajo de 300 líneas.
- **Migración `importaciones_pases`:** tabla `importaciones_pases` (RLS sin policies, sólo `service_role`); `importacion_pase_emitir` (authenticated:
  sólo la total propia y viva, nunca la ajena aunque se tenga `datos.importar.todo`; reusa el pase vivo de 5 min) e `importacion_abrir`
  (service_role, un uso, 10 min). Índices `importaciones_lista_propia_idx`, `importaciones_lista_idx` (la lista de 9.06-5) e
  `importaciones_en_curso_idx` (expresión `coalesce(avance_en, creado_en), id`, sólo las vivas).
- **Migración `importaciones_continuar`:** el job `importaciones-continuar` cada 2 min con la URL de Vault (`_url_del_proyecto()`): hasta 50 sin
  avance en 24 h → `fallida` (`sin_avance` en `_importacion_motivo`) y un pase a hasta 5 detenidas (2 min sin avance, sin pase de los últimos 5).
  El pedido lleva sólo `{pase}`. Sin `_programar`.
- **Migración `importaciones_purgar`:** el job diario `importaciones-filas-purgar`: informe por fila a los 30 días de terminada o fallida, pases a
  los 7, de a 10.000 y 10 lotes por corrida.
- **Migración `importaciones_convivir`:** `leads_importar_lote`, `leads_importacion_terminar` (42501) y `leads_importaciones_recientes` (no la
  lista) ignoran una total. Cierra el riesgo anotado en el 9.06-1.
- **Migración `importaciones_deshacer`:** `leads_importacion_deshacer` con una total: sólo terminada o fallida, `datos.importar.todo` si tuvo
  destino, ≤ 2.000 leads, «intacto» contra el destino (destino borrado: nada se mueve). `aplicado_en` del permiso, en la migración y en el seed.
- **Pruebas** (`supabase/tests/areas/datos/`): `importar-pases.sql` (3), `importar-job.sql` (5), `importar-convivencia.sql` (4). Las de
  convivencia y deshacer cayeron sin su migración; una mutación (el job sin el filtro de `archivo_ruta`) hizo caer la del job.
- **Lo que sigue** (partición del 9.06-1, sin cambios):
  - **9.06-3:** la función edge `importar-csv` (recibe `{pase}`, `importacion_abrir` → id o 401; `verify_jwt = false` en `config.toml`, como
    `storage-gc`), `plantillas.ts`, la carrera; **borrar el CSV del bucket al terminar** (D19: `storage_refcount()` no conoce ese bucket).
  - **9.06-4:** la acción llama `importacion_crear` y `importacion_pase_emitir` y manda el pase.
  - **9.06-5:** la lista por cursor sobre `importaciones_lista_*_idx`; si ofrece «Deshacer» de una total, con las reglas de D17–D18.
- **Para después:** `importacion_procesar_lote` sigue con 104 líneas (D20). `importaciones_filas_purgar` hereda el warning de `db:lint` de
  `importaciones_vinculos_purgar` (variable `i` declarada de más).
- **Desvíos:** 7 commits de código, uno más que el plan: `test(datos): acotar a la importación la prueba de jobs sin dirección` corrige una
  prueba del job que veía la URL que `humo.sql` deja en `storage-gc` en la corrida completa; entre el commit del job y ése, `db:probar` completo
  da ese rojo (no se reescribió la historia). La migración de convivencia se aplicó en Postgres junto con la de deshacer (un `db:reset`). Los
  rojos sin migración (convivencia, deshacer) y el primer `db:probar` completo en rojo no se guardaron.
- **Cómo se anota en `docs/PLAN.md`:** la fila 9.06 sigue abierta (`parcial: true`).
- e2e completo: no (9.06-2, Nivel 2: RLS y estructura sin interfaz; el completo lo corre el CI del PR; dirigidos: leads-importar, leads-importar-deshacer y leads-importar-deshecha-estilo en escritorio)
