## 2026-11-08 — Paso 4.22-6: el tope de tamaño del diseño (sexta y última parte del 4.22)

- **Hecho:** nivel 1, paso de datos (una migración que cambia `validar_diseno()`; sin policy, RLS, tabla, permiso ni `security definer`). Plan auditado una vez
  (observaciones, atendidas). Cierra 4-30 y el 4.22.
  - La base (`supabase/migrations/20261108075329_diseno_tope_de_items.sql`): `_diseno_maximo_de_items()` (40) y `validar_diseno()` con §0b, el tamaño tras la
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
