## Paso 9.11-1 · Tablero: el margen del mes y la cola web en la base (2026-11-12)

- **`tablero_margen(p_desde, p_hasta)`** (`tablero_margen`) → `{desde, hasta, zona, moneda, vehiculos, venta, real, cotizado, margen, sin_venta,
por_origen, por_origen_hay_mas}` en moneda base: definer, `search_path` vacío, `assert_permiso('logistica.margen.ver')` y sólo sus orígenes, ventana
  ≤ 366 días en la zona de la empresa. Cohorte por el último pago confirmado (D3), el mismo margen que `margen_vehiculo`; nulos sin vehículos, nunca 0;
  `sin_venta` aparte (D4). Índice nuevo `pagos_tablero_confirmado_idx` (parcial).
- **`tablero_cola_web(p_desde, p_hasta)`** (`tablero_cola_web`) → `{desde, hasta, zona, total, por_estado, directas, asignadas, contactadas, tasa,
mediana_minutos, por_persona, por_persona_hay_mas}`: `assert_permiso('web.cola.gestionar')`, por `asignada_en` (índice nuevo
  `solicitudes_contacto_web_asignada_idx`); la tasa y la mediana sin las directas.
- `aplicado_en` de `logistica.margen.ver` y `web.cola.gestionar` en las migraciones y en `seed.sql`; las dos en el registro de `escala.sql` con su motivo;
  fila en `docs/RENDIMIENTO.md` › «Tablero: métricas».
- **Pruebas:** `supabase/tests/areas/tablero/margen-y-cola.sql` (R1–R5: dinero al centavo con XTS a 6,96 y cruce con `margen_vehiculo`, el período del
  último pago, nulos sin ventas, un solo origen, 42501 en cada una, privilegios y ventana) y `cola-web.sql` (R6–R7: cifras exactas de marzo de 2020, la
  directa fuera de la tasa, el período vacío; partido de `margen-y-cola.sql` por las 300 líneas). Mutaciones M1–M6 sobre `tablero_margen`, cada una cae en
  su prueba (`.piloto/salidas/9.11-1/mutaciones.txt`). `pnpm db:probar` entero y `db:lint` (sin errores ni avisos en las funciones nuevas) en
  `.piloto/salidas/9.11-1/`.
- **Abierto:** un pago confirmado con `confirmado_en` nulo (de antes del 6.10-2) no entra al margen (D11); un `check` con su relleno, si los datos lo piden.
- **Cómo se anota en `docs/PLAN.md`:** la fila 9.11 se parte; la 9.11-1 queda hecha con «`tablero_margen` y `tablero_cola_web` en la base».
- **Lo que sigue: 9.11-2** — los widgets de margen y cola web (alcance, archivos y precondiciones en `.piloto/planes/9.11.md` › «Partición»). El
  «Terminado cuando» de la fase (el tablero del dueño muestra conversión, cola web y margen del mes) se cierra con la 9.11-2, no con ésta.
- e2e completo: no (9.11-1, Nivel 2: sin e2e completo, lo prueba el CI del PR; dirigidos: ninguno, sólo base y tipos)
