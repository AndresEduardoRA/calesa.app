## 2026-11-11 — Paso 5.10-2: la oferta de transporte

- **Hecho:** cierra el 5.10 (el 5.10-1 hizo las reglas).
  - `flujos_transporte_oferta` admite filas: sin la PK de las cuatro columnas (ninguna fila cumplía los checks), `puerto_id` y `naviera_id` nulables, dos únicos
    parciales y un btree `(flujo_id)`.
  - `flujo_oferta_guardar()` (`security definer`): reemplazo todo o nada con la versión del flujo. Forma `22023` (nulo o más de 200, hint el arreglo) → contrato de
    versión → regla «transporte» apagada `23514` → id inexistente `23503` (hint el arreglo). Repetidos se colapsan, inactivos se aceptan; vacío = se ofrece todo.
  - `flujo_oferta()` (`security invoker`): `{transporte, puertos_origen, puertos_destino, navieras}` con `{id, nombre, activo}`; inexistente `PT409`.
  - `authenticated` ya no escribe la oferta (fuera las policies de crear y borrar y sus grants).
- **Verificación** (`.piloto/salidas/5.10-2/`):
  - `db:reset`, `db:types` y `db:probar` completo: exit 0, 0 ✗. La prueba nueva `supabase/tests/flujos-oferta.sql` (O1-O7, en la lista fija) en verde.
  - `db:lint`: ningún aviso en las funciones nuevas.
  - `scripts/guardas`: 1.058 en verde.
  - `nivel.mjs` con los archivos escritos: `{"nivel":2,"disparadores":[{"id":"rls","archivos":["supabase/migrations/20261111210635_flujo_oferta_sin_escritura_directa.sql"]},{"id":"estructura","archivos":["supabase/migrations/20261111210632_flujo_oferta_tabla.sql"]}],"toca_interfaz":false,"database_types":true}`.
  - e2e completo: no (5.10-2, Nivel 2: el completo lo corre el CI del PR por los disparadores rls y estructura; cuenta 0 de 3)
- **Abiertos:** ninguno nuevo. El catálogo de puertos y navieras sigue para la Fase 6 (D1 del 5.10-1); la pantalla, el 5.11.
- **Commits:**
  - `bc7589d4` feat(db): guardar y leer la oferta de transporte de un flujo por rpc
  - `92401691` feat(db): quitar la escritura directa de la oferta de transporte
  - y el de docs.
