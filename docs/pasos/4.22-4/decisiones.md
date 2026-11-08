## 2026-11-08 — Paso 4.22-4

- **Preguntas** (contestadas con la recomendada): **P1**, una pestaña propia «Tonos» después de «Diseño» (`?seccion=tonos`): el catálogo es de la empresa, se guarda al instante y no depende del selector de origen ni de «Guardar el borrador». **P2**, selector nativo más `#rrggbb`, muestra «Aa» y contraste en vivo, con «Guardar» siempre habilitado: al enviar, el motivo queda junto al campo.
- **Lo no obvio:**
  - **La lectura de tonos del 4.21 (`bcf1e208`) no se reusó:** no está en esta rama y sirve a otro uso (allá el navegador lee `clave` y `nombre` para elegir el tono de un grupo; aquí el servidor lee todo para editar). Al integrar no chocan; unificarlas sería un paso de pulido.
  - **«En uso» sólo lo dice el rechazo de la base:** `_tonos_lista()` no trae cuáles usa una fórmula, así que «Eliminar» siempre se ofrece y un 23503 sale como aviso con la frase de la base (nombra la fórmula). Una columna `en_uso` sería una migración de `datos`; no se abrió.
  - **La clave de un tono no cambia** (la nombran los grupos de una fórmula): editar manda sólo `nombre` y/o `colores`, y sólo lo que cambió, porque la base no vuelve a pedir AA a unos colores que no se tocaron.
  - **El AA se mira con los tres colores del tema bien escritos** y el motivo del AA reemplaza a la línea en vivo; un color a medio escribir no da contraste ni motivo de AA.
  - **El `<Confirmar>` de eliminar** se registró en `confirmar-con-url-formula.ts` (del B), no con el `REGISTRO` por carril (`areas-b/`): `confirmar-con-url-areas.test.ts` mockea ese archivo y habría caído con un registro más.
  - Las lecturas y escrituras del área `diseno` importan `features/niveles/actions/resultado.ts` (`comoResultado`), que es núcleo: es genérico y `FalloDeTono` tiene la misma forma que `FalloDeNivel`.
- **Para el coordinador:**
  - `docs/plan.yaml`: ya se sumó `pantallas/diseno-tonos.ts` al `dueno_de` del B en este PR (la guarda `areas-de-cotizaciones-plan` lo pide por cada segunda pantalla).
  - `docs/ESTADO.md`: «4.22-4: el catálogo de tonos (pestaña «Tonos»); siguen 4.22-5 (vista previa) y 4.22-6 (4-30, datos); mover/sumar/quitar secciones o ítems sigue sin dueño». `docs/PLAN.md`: en la fila del 4.22, «4.22-4 hecho: la pestaña «Tonos»».
  - El hub dice «La fórmula y el diseño de la hoja de cada origen y los niveles de acceso.» (`seccion.ts`); si quiere nombrar los tonos, es el mismo texto que edita el 4.20-4b: no se tocó.
