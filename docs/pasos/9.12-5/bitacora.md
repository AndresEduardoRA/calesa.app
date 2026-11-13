## Paso 9.12-5 · Auditoría AA, parte 5 de 5: los hallazgos de las fases 5 a 9 y el cierre (2026-11-13)

- **El barrido cubre las 45 rutas** (`7faec9b3`): la cotización de repuestos (aceptada, con una línea de cada bloque) y la guía de la web (borrador) se siembran por SQL
  y se quitan en `limpiarTerreno`; `pendientes` queda vacío en los dos proyectos. Lo nuevo que dio: `/configuracion/web/guias/[id]` no tenía `h1`.
- **`h1` y título propios** (`6cefce39`): `<h1 className="sr-only">` fuera del `Suspense` en `/actividad`, `/logistica`, `/logistica/{aduana,embarques,gastos}`,
  `/logistica/vehiculo/[id]`, `/repuestos` y la guía; `CONOCIDOS` queda vacío. Cinco títulos repetían el de otra página y ahora son únicos
  (`Unidad de logística`, `Configurar leads|logística|repuestos|cotizaciones`). Prueba nueva **A9**: un título por página, salvo `/auth/nueva-contrasena` y `/recuperar`.
- **Blancos de 44 px** (`92bb5e25`): 12 controles propios de repuestos, logística, datos, notificaciones y la cola web (`h-11 md:h-8` o `min-h-11 md:min-h-0`).
  R7 cae en el celular y sólo en las pantallas de las fases 5 a 9 (`RUTAS_DE_LAS_FASES_5_A_9`) si el descriptor no está en `BLANCOS_CONOCIDOS` (7 descriptores de
  `shared/ui`, cada uno con un `max` por ruta para que un segundo blanco chico no se esconda).
- **`role="status"` en los esqueletos** (`22bde8f4`, D4 de la 9.12-4): los cinco de `shared/ui/esqueletos/` y el de acceso; guarda en `estados-de-ruta.test.ts`
  (rojo antes). Los 21 specs que miran `role=status` (84 pruebas, escritorio) pasaron **sin tocar ninguno**: D2 del plan (escopar o revertir) no hizo falta.
- **Foco visible, dura** (`3c3dd597`): los seis campos de fecha de `/datos` «sin foco» eran un error de la medición (un `input type=date` conserva el foco en el campo del
  mes y un `blur()` no lo suelta: se comparaba consigo mismo). Corregida, R6 da 0 en los dos proyectos y los dos temas y pasa a regla dura.
- **Pruebas:** `scripts/guardas` 39 archivos, 1.161 ✓ (`.piloto/salidas/9.12-5/guardas.txt`); typecheck exit 0; `mapa.sh --check` 0; barrido final 18 ✓
  (`c5.txt`; antes del arreglo `c1-antes.txt`); dirigidos de C2 142 ✓ en escritorio (`c2d.txt`), de C3 76 ✓ en los dos proyectos (`c3.txt`), de C4 84 ✓ (`c4.txt`) y 56 ✓ (`c4b.txt`).
- **Se cierra:** R3, R4, R6, el barrido de las 45 rutas, y con las partes 1 a 4: **4-19, 4-50, 4-61, 4-62, 4-63, 4-102, 5a-28, 5a-29, 5a-30, 5a-33, 9-7**,
  «transiciones y esqueletos revisados» y «auditoría AA». **Queda con dueño** (el coordinador lo escribe en `docs/PLAN.md` › «Pulido para la Fase 9»; cuentas en
  `decisiones.md`): **4-20** (la persona), el R7 de `shared/ui` y del marco (la persona, con la lista del 9.13) y **9-12** (9.13, ya estaba).
- **Cómo se anota en `docs/PLAN.md`:** `9.12-5 ✓` y la fila del 9.12 entera (`parcial: false`).
- e2e completo: no (9.12-5, Nivel 2: lo prueba el CI del PR; dirigidos: accesibilidad, datos-exportar, notificaciones-campana, cola-web-tablero, configuracion-web-guias,
  configuracion-repuestos-cotizador, logistica-unidad, repuestos-cotizar, repuestos-cotizaciones, repuestos-item-panel, avisos-sobre-el-pie, leads-alta-contexto,
  leads-alta-un-drawer, transicion-de-pagina, los 21 de `role=status` y los 40 de actividad, logística, repuestos y Configuración)
