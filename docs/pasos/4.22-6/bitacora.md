## 2026-11-08 — Paso 4.22-6: el tope de tamaño del diseño (sexta y última parte del 4.22)

- **Hecho:** nivel 1, paso de datos (una migración que cambia `validar_diseno()`; sin policy, RLS, tabla, permiso ni `security definer`). Plan auditado una vez
  (observaciones, atendidas). Cierra 4-30 y el 4.22.
  - La base (`supabase/migrations/20261108161200_diseno_tope_de_items.sql`): `_diseno_maximo_de_items()` (40) y `validar_diseno()` con §0b, el tamaño tras la
    forma: la regla `demasiados_items` con la sección en `hint`.
  - El espejo TS: `MAXIMO_DE_ITEMS_DEL_DISENO` (`entities/diseno.ts`), el código y su mensaje (`motivos-de-diseno.ts`, 30 reglas) y `revisarTamano()` en
    `validarDiseno()` (el 4.º parámetro pasa a `opciones: { medidor?, maximoDeItems? }`).
  - Las pruebas: 4 casos del juego compartido (248), el mutador `demasiados_items` y el corpus regenerado (820), y
    `supabase/tests/areas/formula/publicar-tope-de-items.sql` (el borrador de 41 se guarda, publicarlo da `22023:demasiados_items@<última sección>`, sin
    los dos de más se publica). Las pruebas de escala y las dos mediciones sintéticas apagan el tope.
- **Verificación:** vitest de lo tocado (6 archivos, 286 en verde), `db:reset`, `db:types` y `db:probar` entero, `scripts/guardas` y el e2e dirigido
  `configuracion-cotizacion-formula-publicar` en escritorio (`.piloto/salidas/4.22-6/`). `medir-validar-diseno.sql` y `medir-publicar.sql` no se corrieron
  (no están en el CI). Sin mutaciones (no es el motor ni dinero).
  e2e completo: no (4.22-6, validación del diseño, Nivel 1: lo dirigido en escritorio)
- **Commits:** `feat(cotizaciones)` (la regla en la base y en TS, con su juego y su corpus), `test(db)` ×2 (publicar 41 ítems; las mediciones sin tope) y el
  de docs.

- **CI en rojo (job Carriles, corrida 42481247619):** la migración del tope (`…075329`) quedó anterior a la última de `main` (`…084712`, el 4.23). Pasa a `20261108161200` sin cambiar su contenido. `main` no vuelve a definir `validar_diseno()` después de la base. Ojo: el PR del 4.21 (`b/4.21`, migración `20261108124129_diseno_auxiliar_sin_celda`) también la reescribe entera; el que se integre segundo se rehace sobre la otra.
