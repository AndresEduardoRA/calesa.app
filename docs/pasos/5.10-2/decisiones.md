## 2026-11-11 — Paso 5.10-2

- **Este PR marca `integrado 5.10`:** el 5.10-2 (la oferta de transporte) cierra el paso que el 5.10-1 dejó partido; el 5.11 queda libre. Plan:
  `.piloto/planes/5.10-2.md`. La auditoría del plan dio observaciones y quedaron aplicadas en el texto: O2 prueba que la validación no escribe (la atomicidad la da
  la transacción), la ficha de `logistica` dice que la leerá en la Fase 6, D1 nombra el aviso INFO y `flujo_oferta` dice de dónde sale su tope.

- D1 · La oferta queda sin PK, como pide la fila: la unicidad la dan los dos únicos parciales; sin `id` sustituto (nadie apunta a sus filas y el reemplazo es por
  flujo). El aviso INFO `no_primary_key` de `scripts/splinter.sql` sobre esta tabla es esperado: no se «arregla» con una PK sustituta.
- D2 · Un btree `(flujo_id)` además de los parciales: la FK `flujo_id` y el `delete` del reemplazo perdían el índice que les daba la PK.
- D3 · Tope de 200 ids por lista (`22023` con el nombre del arreglo en el hint): el selector nunca pasa de decenas; corta un pedido desmedido.
- D4 · Un id inexistente → `23503` con mensaje humano, comprobado antes de escribir; uno inactivo se acepta (la oferta «nunca invalida lo guardado»; la pantalla ofrece
  los activos y muestra el inactivo con su marca).
- D5 · Guardar exige «transporte» encendida (`23514`, hint `transporte`); apagarla después no borra la oferta (al volver a encenderla reaparece). `flujo_oferta` la lee
  siempre y dice `transporte`.
- D6 · `flujo_oferta` es `security invoker`, sin versión ni candado, y no exige permiso de configurar: todo lo que lee es «leer = true» y la usará Logística en la Fase 6.
- D7 · Orden de lectura: puertos por `(orden, nombre, id)`, navieras por `(nombre, id)`.
- D8 · `flujo_oferta_guardar` mueve la versión siempre, también sin cambio (como D8 del 5.10-1).
- D9 · La prueba va en su propio `supabase/tests/flujos-oferta.sql` (`flujos-reglas.sql` ya tiene 300 líneas; la fila decía ese archivo), en la lista fija justo detrás,
  con prefijo `flo_`. O7 es el caso con usuario simulado que pide `migraciones.md`, sin caso nuevo en `humo.sql` (como R7 del 5.10-1).
- D10 · La tabla, `flujo_oferta_guardar` y `flujo_oferta` van en un solo commit: los tipos regenerados traen las dos columnas nulables y las dos RPC juntas, y la regla
  pide migración y `db:types` en el mismo commit.
