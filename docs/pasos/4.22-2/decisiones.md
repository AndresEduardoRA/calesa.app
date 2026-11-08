## 2026-11-08 — Paso 4.22-2

- **Preguntas sin respuesta → la recomendada** (la decisión vigente era de otras preguntas, las del 4.21): **P1 (a)** pestaña nueva «Diseño» en Configuración › Cotización
  (hecha aquí). **P2** (1.280 px: caja con scroll al ancho real), **P3** (armador puro con cifras de prueba) y **P4** (4-30: regla nueva en `validar_diseno()`, datos) siguen
  para las partes 5 y 6; P4 es compuerta `datos`.
- **Lo no obvio:**
  - El área `diseno` replica la lectura y la escritura de `formula` (su repositorio, su esquema de guardado, la comparación en profundidad): la guarda de áreas impide
    importar otra. Compartirlas subiéndolas al núcleo lo decide el carril A.
  - Los niveles se leen de `cotizaciones_niveles` (`select` para `authenticated`), no de `niveles_con_uso()` (pide `equipo.roles.ver|gestionar`).
  - Lo que `validarDiseno()` rechaza tras un cambio **queda aplicado y se dice**; «Guardar» no se apaga (un borrador puede quedar sin publicar; la base valida al publicar).
    Se pasan como `tonos` los de los grupos de la propia definición, así `tono_inexistente` no se dispara aquí (es del catálogo, 4.22-4).
  - Sólo «Quién la ve» se apaga donde la base daría `nivel_no_admitido` (total, lo aparte, la variante, el pct aparte; una sección que lo contiene). «Quién la edita»
    queda abierto: ver abierto con editar restringido vale.
  - `guardarDiseno` manda `definicion` y `params` como se leyeron, nunca los reconstruye; el e2e lo comprueba contra la publicada (jsonb a jsonb).
  - Se quitó del e2e el 200 % (es pulido, `e2e.md`): `min-w-0`, `grid-cols-[minmax(0,1fr)]` y `@container` ya van en los componentes.
- **Para el coordinador:**
  - **Mover, sumar y quitar secciones o ítems** (la estructura) no lo nombra ninguna parte de 4.22-2 a 4.22-6: asignarlo al 4.22-3 o a una 4.22-2b.
  - `docs/ESTADO.md`: «4.22-2: pestaña «Diseño» con secciones y celdas, aviso y guardar el borrador; siguen 4.22-3 a -6; mover/sumar/quitar sin dueño». `docs/PLAN.md`: nada
    nuevo si la fila ya lleva la partición del 4.22-1. `docs/COTIZADOR.md`: la pestaña «Diseño».
  - El hub dice «La fórmula y el diseño de la hoja de cada origen y los niveles de acceso.» (`seccion.ts`): el 4.20-4b (carril A) edita la misma línea; al integrar, unir ambos textos.
