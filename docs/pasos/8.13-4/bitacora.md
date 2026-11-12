## 2026-11-12 · Paso 8.13-4: los bloques de repuestos de Inicio y el enlace en Configuración (parte 4 de 5)

### Hecho

- **Rama unida con `main`** (8.12) antes de la parte: `src/app/(app)/repuestos/[id]/page.tsx` junta `seccionAbierta` (pestañas Compras y Cotizaciones de main) con el `PanelDelItem` de la hoja.
- **Lecturas de Inicio** en `repuestos`, área `flujo`: `leerRepuestosPorMover(tope)` y `leerEsperasDeInicio(tope)` (por `index.ts`): ítems vivos, sin stock, en una fase no final, de un proyecto vivo; el que más lleva en su fase, primero;
  la segunda sólo de proyectos con vehículo. Una consulta cada una, `limit tope + 1`, fase, proyecto y título del vehículo embebidos (bajo la RLS; sin ver el vehículo, la fila dice sólo el repuesto). Sin migración.
- **Bloques de `tablero`** `repuestos-por-mover` (`repuestos.mover`) y `esperas-repuestos` (`repuestos.ver`): fila = repuesto con su fase, proyecto y desde cuándo (o el vehículo), abre el panel `?item=`; conteo «N repuestos por mover» /
  «N repuestos en espera» (o «más de 5»); «Ver todas» a la Cadena.
- **Configuración › Repuestos** gana el botón «Configurar el flujo de repuestos» a `/configuracion/flujos?ambito=repuestos`.
- **Para `docs/PLAN.md` (lo anota el carril `a`):** la fila 8.13 queda «parte 5 pendiente»; el abierto **8-13c** se extiende a los bloques de Inicio (el orden `fase_desde` sin índice propio). **Para `docs/UX.md`:** Inicio (bloques «Repuestos por mover»
  y «Esperas que destraban vehículos») y Configuración › Repuestos (enlace al flujo).
- **Abiertos:** 8-13a (cruce exacto vehículo × fase con espera: el bloque dice qué ítem está en vuelo, no que el vehículo lo espere hoy) y 8-13b siguen.

### Verificación

- Nivel 1: vitest de `scripts/guardas` y `src/modules/repuestos` (1464 en verde; 10 pruebas nuevas de `entities/flujo/inicio`), `src/app/(app)/repuestos` (39 archivos) tras la unión; `lint` y `typecheck` limpios.
- e2e dirigidos (salidas en `.piloto/salidas/8.13-4/`): `inicio-repuestos` (nuevo, 2 pruebas) e `inicio-bandeja` en escritorio y movil: 10 en verde; `configuracion-repuestos-catalogos` (una prueba nueva) y `repuestos-espera-recorrido` en
  escritorio: 7 en verde.
- No se midió el JS de `/` (cuerpos de servidor, sin cliente nuevo) ni se sembró volumen (la tabla de repuestos no es de las que crecen, `escala.md`).
- e2e completo: no (8.13-4, Nivel 1: lo prueba el CI del PR; dirigidos: inicio-repuestos, inicio-bandeja, configuracion-repuestos-catalogos, repuestos-espera-recorrido)
