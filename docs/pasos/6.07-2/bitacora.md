## 2026-11-12 — Paso 6.07-2: la escritura de aduana en la base (parte 2 de 3 del 6.07)

- **Hecho:** `declaraciones_aduana` y `declaraciones_vehiculos` se escriben sólo por RPC `security definer`, con versión y `logistica.aduana.gestionar`.
  - `declaracion_guardar(id, versión, datos)`: crear y editar la cabecera. Número sin espacios alrededor y único (23505 con `hint`); fechas sólo
    `AAAA-MM-DD`. La versión propia (`declaracion_version`) se mueve dos veces en una transacción.
  - `declaracion_vehiculos_poner(id, versión, agregar, quitar)`: hasta 200 vehículos que quien pone tiene que ver. Quitar deja la fila con
    `removido_en`; volver a agregar la revive. Un vehículo vivo en otra declaración: 23514 con el número de la otra. Agregar pide la regla `aduana` y una
    fase con `permite_aduana`. Un solo recorrido de agregar ∪ quitar en orden de id: el intercambio entre dos declaraciones da 23514, nunca 40P01.
  - `declaracion_canal(id, versión, canal)`: nunca a nulo, no a una declaración sin vehículos. Con canal la composición queda congelada.
  - Trigger `trg_declaracion_vehiculo_proteger`, por cualquier camino: congela la composición con canal y no deja quitar un vehículo cuya fase exige
    `aduana.declaracion` o `aduana.canal` como bloqueante. La purga en cascada de un vehículo pasa.
  - Sin policies de crear ni editar y sin insert, update ni delete para `authenticated`. Las de leer no cambian (D30).
- **Commits:**
  - `dee81b43`: guardar una declaración.
  - `f23f757b`: poner y quitar vehículos.
  - `b6645d5f`: el canal de aforo, y los tipos de las tres RPC.
  - `6c2bae98`: el trigger de la tabla.
  - `628d49f6`: sin escritura directa.
  - `d3876624`: las carreras K5, K6 y K6b.
- **Verificación** (`.piloto/salidas/6.07-2/`):
  - `db:probar` entero en PGlite: 1.186 ✓ y 0 ✗ (9 de aduana: A1–A2, P1–P4, X1–X2, E1).
  - Carreras de aduana contra el Postgres local: 4 ✓. Con el recorrido «primero quitar, después agregar» (a mano, sin versionar), K6b da 40P01.
  - `db:lint` sin avisos nuevos; guardas 1.077 ✓; `typecheck` en verde.
- **Desvíos del plan:**
  - Los tipos (`database.types.ts`) entran recién en `b6645d5f`, con las tres RPC juntas: los commits `dee81b43` y `f23f757b` crean funciones sin sus
    tipos, contra la regla de `db:types` en el mismo commit. Ningún código las usa todavía; no se reescribió el historial.
  - Las validaciones de poner quedaron en dos ayudantes (`_declaracion_vehiculos_listas` antes de los candados y `_declaracion_vehiculos_validar`
    después), no en una.
  - K6b reconoce el rechazo por el texto «ya está en la declaración» (el arnés de carreras no expone el `hint`).
- **Pendiente:** `scripts/carreras.mjs` pasa de 300 líneas (395, ya pasaba antes de este paso): partirlo.
- **Para 6.09:** «canal de aforo» y «composición congelada» no tienen entrada propia en el GLOSARIO (sólo dentro de «Declaración aduanera»).
- e2e completo: no (6.07-2, Nivel 2: lo corre el CI del PR; sin interfaz, sin dirigidos)
- parcial: sigue 6.07-3 (`pagada`, `declaraciones_listar` con su índice, `declaracion_leer`, `transporte_grupos`).
