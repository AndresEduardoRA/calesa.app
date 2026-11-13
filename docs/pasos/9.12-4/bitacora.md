## Paso 9.12-4 · Auditoría AA, parte 4 de 5: esqueletos y transiciones (2026-11-13)

- **Esqueletos propios** (`a8dd7a7e`): `(app)` tiene 41 páginas y 39 `loading.tsx` (el «21 y 20» de PLAN era viejo). Sólo dos heredaban:
  `leads/importar` (hereda el de `leads`) y `repuestos/[id]/cotizaciones/[cotizacion]` (heredaba la cabecera de un proyecto, que esa hoja no dibuja). Cada una tiene
  ahora su `loading.tsx` con la forma del `<Suspense>` de su página (título + formulario + tabla; listado 6×6), sin importar barriles de módulo.
- **La guarda** (`44efcca6`, `scripts/guardas/estados-de-ruta.test.ts`): pasa de «propio o heredado» a «propio». Casos nuevos: todo `loading.tsx` exporta su pantalla y
  dibuja un `Esqueleto…`/`Skeleton`, y ninguno queda sin su `page.tsx`. Se vio en rojo con las dos páginas de arriba antes de crear los archivos. Además fija el
  contrato de la transición: `template.tsx` usa `TransicionPagina`, `globals.css` apaga `::view-transition-old/new(*)` con `animation: none` bajo
  `prefers-reduced-motion: reduce` y `tokens.css` pone `--dur-pagina` y `--dur-rapida` en 0 ms.
- **La transición, en el navegador** (`534586c4`, `e2e/transicion-de-pagina.spec.ts`, escritorio y movil): con movimiento normal, una navegación de cliente
  (`window.next.router.push`, sin `goto`) corre animaciones `pagina-*` (**sí se dispara `startViewTransition`**: D3 del plan no hizo falta) y los tokens valen 280 y
  120 ms; con `reduce` valen 0 y no corre ninguna. La mitad «reduce» no es vacía porque la otra demuestra que sin reduce sí corren.
- **Los cinco estados**: tabla en `decisiones.md`; no hubo hueco mecánico, así que no hay commit `fix`.
- **Pruebas:** `scripts/guardas` 39 archivos, 1.159 ✓ (`.piloto/salidas/9.12-4/guardas.txt`); typecheck exit 0; `mapa.sh --check` 0; e2e `transicion-de-pagina` 4 ✓
  (`c3.txt`); e2e `accesibilidad`, `leads-importar`, `leads-importar-vista-previa`, `repuestos-cotizar`, `repuestos-cotizaciones` 32 ✓ y 1 saltada de antes
  (`@sin-celular`) en los dos proyectos (`dirigidos.txt`).
- **Partición (parte 4 de 5, `parcial: true`):** sigue 9.12-5 (hallazgos del barrido en las fases 5 a 9, el R7 de Configuración, 4-20 y el cierre).
- **Cómo se anota en `docs/PLAN.md`:** `9.12-4 ✓`. No se cierra ningún abierto: «transiciones y esqueletos revisados» se cierra con la 9.12-5.
- e2e completo: no (9.12-4, Nivel 1: lo prueba el CI del PR; dirigidos: transicion-de-pagina, accesibilidad, leads-importar, leads-importar-vista-previa,
  repuestos-cotizar y repuestos-cotizaciones, en escritorio y movil)
