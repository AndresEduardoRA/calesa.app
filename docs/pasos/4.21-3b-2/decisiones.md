## Paso 4.21-3b-2 (2026-11-08)

- **P2 del 3b-1, hecho:** una `constante` auxiliar de un número escrito en el texto de su fila (`<fila>__<n>`, la que crea el compilador) **no pide celda** en el
  diseño. Se edita por el texto de su fila. Si tiene celda, vale como siempre. Una fila constante («Sumar fila», un cálculo que pasa a número) sí la pide.
- **P1 de este paso, compuerta `datos`, como la contestó la persona:** «aprobar: la regla del editor, entera». La base reconoce la auxiliar con la misma regla con
  la que el editor decide qué es una fila (`filasDe`), incluido que el texto de la fila **no la nombre**. Por eso una fila escrita a mano como `total__1`, que el
  texto de `total` nombra, sigue pidiendo celda.
- **La regla, una sola vez en TS:** `entities/compilador-auxiliares.ts` (núcleo, del carril b: se sumó a su `dueno_de` en `docs/plan.yaml` y T12 de
  `areas-de-cotizaciones-plan.test.ts` pasó de 37 a 39 archivos de las familias del compilador). `filasDe()`, `validarDiseno()` (§5) y el aviso del editor
  (`nodosSinCelda()`) la usan. Su espejo en la base es `_diseno_auxiliares(p_def)`: invocadora, STABLE, `search_path` vacío, sin leer tablas, con los grants de los
  demás `_diseno_*`.
- **(e), el texto, en SQL:** los nombres salen de un patrón de clases **enumeradas**, sin rangos (no dependen de la colación) y sin grupos de captura
  (`regexp_matches(…, 'g')` devolvería el grupo). T1b compara, en 5.000 textos al azar con semilla fija, los nombres del patrón con los del léxico del compilador.
  T1c exige que la migración copie el patrón letra por letra. Antes del patrón, `strpos`: si ningún id de la cadena aparece como subcadena, no aparece como nombre.
- **(f), la posición tomada por otra cadena, no se alcanza:** una cadena anterior de raíz q no pasa por q, que tiene texto, así que (c) la corta antes. Se espeja
  literal y no lleva caso ni mutación.
- **La excepción es sólo de `constante`:** el compilador sólo crea `constante` y `calculo`, y el `calculo` nunca pidió celda. Un `input` con id de auxiliar dentro de
  una cadena sigue pidiéndola (su caso en el juego).
- **Cómo se le dice a §5, sin copiar `_diseno_secciones()` (cambio sobre el plan):** el plan cambiaba la firma de `_diseno_secciones()` (14 argumentos) y copiaba
  sus ≈ 217 líneas en una migración aparte. En cambio, `validar_diseno()` le pasa los tipos con cada constante auxiliar marcada como `constante_auxiliar`. Ese
  arreglo sólo decide §5: en §2 a §4, `_diseno_secciones()` compara el tipo con `opcion`, `bandera`, `tabla` y `calculo`, nunca con `constante`. Así una auxiliar
  con celda, con atajos o con subtotal se revisa como antes (`atajos_no_es_tabla`, `subtotal_no_es_calculo`). Con eso queda una sola migración de ≈ 210 líneas,
  la firma no cambia y no queda un cuerpo copiado que pueda desviarse de la base. `_diseno_modos()` sigue recibiendo los tipos de verdad.
- **Sin los mutadores nuevos del corpus (cambio sobre el plan):** el plan sumaba `auxiliar_sin_celda` y `fila_parecida_sin_celda` a los mutadores del corpus. No se
  sumaron (la persona, 2026-11-08: pruebas sólo en lo clave). Lo cubren los 14 casos nuevos del juego, que corren en TS y en la base. El corpus se regeneró
  porque se generan desde los casos válidos.
- **Seguridad, como la vio la compuerta:** publicar acepta ahora una auxiliar `constante` sin celda (antes, `nodo_sin_seccion`). No entra a la `visibilidad`
  (`_compilar_visibilidad` sólo nombra lo dibujado), `_nodos_visibles` la da sólo a `cotizaciones.configurar`, sin editar, y el recorte la deja fuera de la hoja y
  del recálculo de quien cotiza. Lo prueba `supabase/tests/areas/formula/auxiliar-sin-celda.sql` (S1–S4, S6), y dos mutaciones de la visibilidad lo hacen caer.
  Ninguna policy, RLS, `security definer`, permiso ni Vault nuevo.
- **Medido:** `db:medir` dentro de sus topes: `validar_diseno` 6,5 / 58,8 ms (topes 15 / 136; razón 9,0), 290 / 1.860 buffers de columna externa;
  `formula_publicar` 20,1 / 191,3 ms (topes 55 / 550). El ayudante solo, con una auxiliar por fila: 1,9 / 18 / 72 ms con 100 / 1.000 / 4.000 filas de texto
  corto, y 31 / 307 / 1.243 ms con textos de ≈ 2.000 caracteres que obligan al patrón en cada fila. Es lineal. El sintético de `db:medir` no lleva texto (no
  recorre el camino nuevo), y ese peor caso con texto pasa el tope de `validar_diseno` con 2.018 ítems desde unas 450 filas: queda informativo, sin guarda. La primera versión era cuadrática (40 → 308 ms de
  1.000 a 4.000 filas): una consulta dentro del bucle nombraba `v_refs[i]` y recibía el arreglo entero como parámetro. Ahora el elemento va antes a una
  variable, y el objeto final se arma con `jsonb_object_agg`, no concatenando.
- **Para el coordinador:**
  - En la fila del 4.21 de `docs/PLAN.md`: «4.21-3b-2 (la auxiliar de un número escrito en un texto ya no pide celda en el diseño: P2; compuerta `datos`)».
  - `ESTADO`: «4.21-3b-2: la auxiliar de un número no pide celda en el diseño (P2)».
  - El abierto de la constante sin celda queda sólo para la fila constante, hasta el 4.22.
  - `asignado.modulos` del 4.21 no lista `validar-diseno-*.ts` ni `casos-de-diseno.json` (el `dueno_de` sí). `compilador-auxiliares.ts` se sumó al `dueno_de`.
- **Para el A:** en `src/modules/cotizaciones/CLAUDE.md` › «Archivos clave», en la viñeta de la validación, tras «`validar-diseno*.ts` a `validar_diseno()` (28)»: «una
  `constante` auxiliar de un número escrito en el texto de su fila (`compilador-auxiliares.ts`, `_diseno_auxiliares()`) no pide celda (4.21-3b-2)».
