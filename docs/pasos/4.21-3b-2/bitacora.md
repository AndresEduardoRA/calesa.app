## 2026-11-08 — Paso 4.21-3b-2: la auxiliar de un número no pide celda en el diseño

- **Hecho:** P2 del 3b-1. Una `constante` auxiliar de un número escrito en el texto de su fila ya no pide celda: publicar la acepta sin celda y el aviso del
  editor deja de nombrar su fila. La compuerta `datos` (P1) aprobó la regla del editor, entera.
  - **El núcleo** (commit 1, sin cambio de conducta): la regla de las auxiliares pasa de `formula/filas.ts` a `entities/compilador-auxiliares.ts`, y `filasDe()`
    la usa.
  - **La base** (commit 2): `_diseno_auxiliares(p_def)` y `validar_diseno()`, que le pasa a `_diseno_secciones()` los tipos con la constante auxiliar marcada
    (sólo §5 lo mira). Una migración, `20261108124129_diseno_auxiliar_sin_celda.sql`. La firma de `_diseno_secciones()` no cambia.
  - **El espejo y el aviso:** `Indice.auxiliares` y la excepción en `revisarCobertura`; `nodosSinCelda()` con la misma excepción.
  - **El juego:** 14 casos nuevos en `casos-de-diseno.json` (de 244 a 258) sobre 12 fórmulas nuevas, y el corpus regenerado.
- **Verificación:**
  - **Contra HEAD, en rojo:** T1a y T1b no resolvían (el módulo no existía). Con el código de antes, 13 caídas en Vitest (`rojo-head-vitest.txt`). En
    `db:probar` sin la migración, los casos, el corpus, los privilegios, las 7 funciones y S1–S6 caen (`rojo-head-db-probar.txt`); S1–S4 por
    «zz__1 no está en ninguna sección del diseño».
  - **En verde:** Vitest de lo tocado sobre el árbol final, 578 (`vitest-verde-final.txt`); `scripts/guardas`, 1.004 (`guardas.txt`); `db:probar` entero (`db-probar.txt`); `db:lint` sin
    avisos nuevos; `db:reset` y `db:types` (suma `_diseno_auxiliares`). Los 6 e2e dirigidos en escritorio, 36 pasaron, G8 nuevo incluido
    (`e2e-dirigidos.txt`). Sin interfaz: no corre en `movil`.
  - **Mutaciones** (`mutaciones-sql.txt`, `mutacion-*.txt`). Cada una cae:
    - en la base, MS1 sin la excepción, MS2 la excepción para cualquier tipo, MS3 sin (e), MS4 el patrón sin la rama del número (cayó al sumar el caso
      `=remate+.total__1`), MS5 sin (d), MS6 sin (c), MS7 sin el recorte a 41 y MS9 una raíz sin texto;
    - en la visibilidad, MS11 (`_nodos_visibles` da lo no nombrado a todos: caen S2 y S3/S4) y MS12 (`_compilar_visibilidad` da «todos» a lo no dibujado: caen
      S1–S4);
    - en TS, MT1 la cobertura sin la excepción, MT2 sin (e) en el núcleo, MT3 el aviso sin la excepción, y MT4 el patrón de la migración con un carácter menos
      (T1c).
    - **MS8 (aceptar ceros a la izquierda) es equivalente:** (b) exige que el último eslabón sea `aux(raíz, k)`, que nunca lleva cero. Se dice, no se prueba.
  - **Medido:** `db:medir` dentro de sus topes (`validar_diseno` 6,5 / 58,8 ms; `formula_publicar` 20,1 / 191,3 ms; `db-medir.txt`). El ayudante solo crece
    lineal hasta 4.000 filas (`medir-auxiliares-3-tamanos.txt`). La primera versión era cuadrática y se corrigió (`decisiones.md`).
  - **No se hizo:** G8 no se corrió contra HEAD (el rojo de la base y del aviso ya está en Vitest y en `db:probar`). Tampoco se sumaron los mutadores nuevos del
    corpus del plan.
- **Abiertos:** la fila constante sin celda («Sumar fila», un cálculo que pasa a número) sigue sin poder publicarse hasta el 4.22, con su aviso. Sigue el
  4.21-3c.
  e2e completo: no (4.21-3b-2, base y espejo de validar_diseno, Nivel 1: lo dirigido en escritorio)
