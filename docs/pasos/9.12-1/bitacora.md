## Paso 9.12-1 · Auditoría AA, parte 1 de 5: el barrido, el contraste de los tokens y la guarda de esqueletos (2026-11-13)

- **Contraste de los tokens** (`design/tokens.test.ts`, 135 casos): texto ≥ 4,5:1 (tintas y `-ink` semánticos sobre las seis superficies, sobre su
  `-soft`, `sobre-primario` y la tinta sobre las celdas del cotizador) y ≥ 3:1 del borde de control (`line-strong` = `--input`) y del foco, en claro y
  oscuro, con el alfa compuesto sobre el fondo. Cayeron 19 y se corrigieron sólo en `design/tokens.css`: `ink-faint`, `line-strong` y `--shadow-focus`
  (antes → después en `decisiones.md`). `vitest.config.mts` suma `design/**/*.test.ts`. Siguen el valor nuevo de `line-strong` el espejo del PDF
  (`estilos-del-documento.ts`) y `e2e/xcell-geometria.spec.ts`.
- **Guarda de esqueletos** (`scripts/guardas/estados-de-ruta.test.ts`): toda página de `(app)` tiene `loading.tsx` propio o heredado. Hoy pasa; heredan
  `leads/importar` y `repuestos/[id]/cotizaciones/[cotizacion]`.
- **Barrido** (`e2e/accesibilidad.spec.ts`, `e2e/soporte/accesibilidad{,-rutas,-conocidos}.ts`): las rutas salen de cada `page.tsx` de `src/app` (45
  páginas: 42 se visitan y 3 dinámicas quedan pendientes con su parte); cada una en tema claro y su foco visible otra vez en oscuro, en `escritorio` y
  `movil`. Reglas duras, por CDP: **cero controles sin nombre y cero `aria-describedby`/`aria-labelledby` rotos** en los dos proyectos (la lista de
  conocidos quedó vacía). Las de informe (h1, título, orden de foco, foco visible, blancos de 44 px) van a la tabla de `decisiones.md`. Las reglas se
  comprobaron contra una página con un defecto de cada una (botón, campo y enlace sin nombre, `aria-describedby` roto, `tabindex` > 0, enfocable en
  `aria-hidden`, foco sin estilo, blancos chicos): las siete salieron.
- **Pruebas:** `design/tokens.test.ts` + `app.test.ts` + `etiqueta.test.ts` 160 ✓ (`.piloto/salidas/9.12/tokens.txt`); `scripts/guardas` + `design` 1.289 ✓
  (`guardas.txt`); `vitest related` 28 ✓ (`related.txt`); e2e `accesibilidad` y `xcell-geometria` en `escritorio` y `movil`, 28 ✓ en 1,3 min
  (`e2e-final.txt`).
- **Partición (parte 1 de 5, `parcial: true`):** 9.12-2, leads, vehículos y cotizaciones (4-61, 4-62, 4-63, 9-7, 4-50, «Copiar texto» de 4.18-3b, la
  pestaña «Cotizaciones» de 4.17-3 y la ruta pendiente `/cotizaciones/[id]`); 9.12-3, Configuración y `shared/ui` (5a-28, 5a-29, 5a-30, 5a-33, 4-19,
  4-20, 4-102, el anillo `ring-ring/50` y `--ring` en oscuro); 9.12-4, los `loading.tsx` propios de las dos páginas que heredan, la guarda a «propio»,
  los cinco estados y `prefers-reduced-motion`; 9.12-5, los hallazgos de las fases 5 a 9, las rutas pendientes y el cierre del paso.
- **Cómo se anota en `docs/PLAN.md`:** la 9.12-1 queda hecha (`9.12-1 ✓` en la «Partición» de la Fase 9); ningún abierto se cierra en esta parte. La
  tabla «Auditoría AA (9.12)» de `decisiones.md` va a DECISIONES bajo ese título.
- e2e completo: no (9.12-1, Nivel 1: lo prueba el CI del PR; dirigidos: accesibilidad, xcell-geometria en escritorio y movil)
