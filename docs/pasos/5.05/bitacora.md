## 2026-11-11 — Paso 5.05: la base de «Transiciones» y de quién mueve

- **Hecho:** las transiciones y quién mueve se escriben sólo por RPC con la versión del flujo (`_flujo_para_editar`/`_flujo_tocar` del 5.01):
  `transicion_crear` (las dos fases del flujo, destino activo, `23505` humano por `(de, a)` y por id), `transicion_guardar` (sólo `accion` y
  `nota_obligatoria`), `transicion_eliminar`, `fase_roles_poner` y `transicion_roles_poner` (reemplazo todo o nada, `_roles_de_lista` con `for key share`,
  actividad `fase.roles_cambiados`/`transicion.roles_cambiados` sólo si cambia). Fuera las 7 policies de escritura y el insert/update/delete de `authenticated`
  en `fases_transiciones`, `fases_roles` y `fases_transiciones_roles`. No toca `_puede_mover`, `previsualizar_cambio_fase` ni `cambiar_fase` (los recrea el 6.02).
- **Verificación** (`.piloto/salidas/5.05/`): `db:reset`, `db:types` y `db:probar` completo con el árbol final (924 ✓, 0 ✗; las 11 pruebas nuevas:
  `supabase/tests/areas/flujos/transiciones.sql` T1–T5 y T7, `transiciones-datos.sql` D-1–D-5); también con `SOLO=` sin `humo.sql`; `db:lint` sin avisos en las
  funciones nuevas; `scripts/guardas` 1.058 ✓; e2e `configuracion-flujos` en escritorio 3 ✓. `nivel.mjs` con los archivos reales: Nivel 2 (disparador `rls`).
  Los tipos van repartidos en cada commit de migración; las pruebas, en el commit de la última, el primero donde pasan enteras (T1 y T2 recorren las cinco RPC).
  e2e completo: no (5.05, Nivel 2 por rls: lo corre el CI del PR; cuenta 0 de 3)
- **Abiertos:** `rbac_eliminar_rol` sobre un rol que figura en una lista de quién mueve da el `23503` crudo de la FK `restrict` de `fases_roles.rol_id` y
  `fases_transiciones_roles.rol_id` (deuda de antes; con el 5.06 poner roles pasa a ser lo normal): **para el coordinador, a una fila de equipo**: mensaje humano o
  quitar el rol de las listas. El `23503` de un cambio de fase hacia una fase que se borra va al 6.02 y, para `vehiculo_crear`, a la fila que lo recree (D8). La
  ficha `src/modules/flujos/CLAUDE.md` la actualiza el 5.06 (D13).
- **Commits:** `0d0d51f5` feat(db): crear una transición con la versión del flujo · `7c14a328` feat(db): guardar una transición con la versión del flujo ·
  `e95ed411` feat(db): eliminar una transición con la versión del flujo · `61001b53` feat(db): poner los roles que mueven a una fase o por una transición ·
  `f55a5acf` feat(db): quitar la escritura directa de transiciones y sus roles · y el de docs.
