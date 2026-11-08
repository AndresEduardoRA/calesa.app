## 2026-11-08 — Paso 4.23-1: las tablas de referencia tienen versión y se publican con la N+1 de sus fórmulas; cierra 5b-7

- **Hecho:** un paso de datos y dinero, sólo la base. Son cuatro commits de código y uno de pruebas que pidió la auditoría del informe.
  - El plan se auditó una vez y bloqueó: las 11 objeciones se atendieron en el plan y no hubo que achicar el paso.
  - La compuerta `datos` se aprobó, y P1–P5 van con su recomendada (`decisiones.md`).
  - El 4.23 se parte: siguen el **4.23-2** (entidades, lectura por cursor y la action) y el **4.23-3** (la pestaña «Tablas» y 4-47).
- **Lo que quedó:**
  - **5b-7.** La carrera «Dos personas reordenan sin tocar la misma tarjeta» (`scripts/carreras/configuracion-de-leads.mjs`): A mueve S después de P
    sin tocar P y B mueve P después de R.
    - Sin el `lock table` de `tipo_seguimiento_mover` cae: R y S quedan las dos en 150. La carrera vieja (x/w/y) seguía verde sin él.
    - Con el candado queda S, Q, R, P. La función no cambia.
  - **`20261108084608_tablas_referencia_version`.** Suma `version`, `nota`, `publicado_por` y `publicado_en`, y quita las seis policies y el
    `insert, update, delete` de `authenticated` en las dos tablas.
  - **`20261108084712_tablas_referencia_publicar`.** Crea `tabla_referencia_publicar()` y tres internas (`_tabla_referencia_filas_validas`,
    `_tabla_referencia_usada_en`, `_tabla_referencia_publicada_por`), y cambia `aplicado_en` de `cotizaciones.configurar`. Detalle:
    `docs/COTIZADOR.md` › «Las tablas congeladas (D5)».
  - **Pruebas.** `supabase/tests/areas/tablas/{escritura,publicar,publicar-formulas}.sql`, un caso en `humo.sql`, el registro `no_devuelve` en
    `cotizaciones-visibilidad.sql`, y `scripts/carreras/tablas.mjs` (R1–R3) más `tablas-compartida.mjs` (R4–R5).
- **Verificación** (`.piloto/salidas/4.23/`):
  - `db:probar` entero: 704 ✓ y 0 ✗ (`probar-todo.txt`). Después lo corrió el hook en cada commit con SQL.
  - `db:carreras` en verde, también tras traer main (`carreras-tras-merge.txt`, `carreras-compartida.txt`). `db:lint`: 0 (`db-lint-final.txt`).
  - e2e dirigidos en `escritorio` (`cotizar-guardada`, `cotizar-hoja-ayuda-tabla`, `configuracion-cotizacion-formula-editor-previa`): 22 en verde.
  - Guardas: 1.019 en verde; `carriles` dice «12 archivos cumplen».
  - Mutaciones, cada una con lo que cayó:
    - M1 (pisar las otras copias): R3 y `db:probar`.
    - M2 (leer la publicada antes del candado del origen): R2 y R3.
    - M3 (sin `for update` de la tabla): R1.
    - M4 (sin el permiso tras releer): R4.
  - `nivel.mjs`: Nivel 2 (rls, estructura).
- e2e completo: no (4.23-1, base: Nivel 2, el completo lo corre el CI del PR; en local, lo dirigido en escritorio + db:carreras)
