## 2026-11-06 — Paso 4.24-2

- **Lo que contestó la persona** (compuerta `producto`, la recomendada en las tres; después la `datos`, «aprobar»). El 4.24-2b y el 4.24-3 las leen de acá.
  - P2 · La papelera de cotizaciones, y el enlace de «Papelera» en `/cotizaciones`, los ve quien puede enviar cotizaciones a la papelera en algún origen
    (`cotizaciones.editar`, `.moderar` o `.final.gestionar`) o vaciarla (`cotizaciones.papelera.purgar`), como en vehículos y leads. Los lotes que ve los decide la base.
  - P3 · Por qué una cotización no volvió lo dice el aviso del resultado de restaurar (hasta tres motivos y «Y N más.»); la fila no lo dibuja.
  - P4 · La fila no muestra el cliente ni el vehículo: sólo número, título, clase, origen y fecha.
- **Partición** (decisión del orquestador, tras la 1.ª auditoría del plan): purgar necesita una fila en el registro de `<Confirmar>` (`scripts/guardas/confirmar-con-url.ts`),
  que es del A; el C no puede crearla (la guarda de carriles hace caer el PR). El 4.24-2 queda sin purgar y **purgar es el 4.24-2b** (borrador:
  `.piloto/planes/4.24-2b.borrador.md`).
- **Lo no obvio:**
  - Textos: la cabecera con la clave dice «Se purga solo cuando vence.» (el 2b suma «, o antes si lo purgas»); la línea de las que se fueron con su vehículo va siempre
    (P8 a) y el enlace a la papelera de vehículos sólo a quien puede abrirla (`puedeAbrirLaPapelera` de vehículos, compuesto en `src/app`: `cotizaciones` no importa
    `vehiculos`). «Envío de una» / «Lote de N · quedan M», «Restaurar el lote» sólo si quedan más de una. Restaurar no pregunta ni ofrece «Deshacer»: enviar de nuevo lo deshace.
  - La fila del lote se parte en `cotizacion-en-papelera.tsx` (el lote pasa de 100 líneas con ella).
  - El presupuesto de JS de la ruta (440 KB; medido 417,9) y los topes de la página (3.000 nodos; 360.000 B, medido 342.808) viven en el spec, porque `presupuestos.ts` es del A. Los
    previos del plan no alcanzaron en bytes: 150.000 B era una suposición (≈ 600 B por fila) y cada fila pesa ≈ 2,5 KB en el documento (HTML con sus clases y payload de RSC;
    el reparto exacto no se midió), contra 91.005 B del marco con la papelera vacía. Lo que protege la lista es que no crezca con el lote: con 21 o con 200 por lote, los mismos
    1.119 nodos y los bytes a ±0,1 %. Se fijó lo medido más un 5 %. Los 380 KB previos de JS tampoco: casi todo es el marco (`/perfil` 417,2).
  - La limpieza del spec va en un orden: cotizaciones del origen, lotes, leads, personas y roles. Un lote no se borra mientras una cotización lo nombra
    (`cotizaciones_lote_papelera_id_fkey`) ni una persona mientras un lote la nombra; el primer intento falló en el `afterAll` y dejó la base sucia para el siguiente.
  - Cambiar de persona en la misma página pide `page.context().clearCookies()` antes de `entrar`: `{ fresco: true }` no descarta la sesión y `/ingreso` rebota.
  - El lote en `/cotizaciones/papelera` se reconoce en los e2e por una cotización que no se restaura primero (el filtro de un `getByRole` se vuelve a evaluar).
- **Necesita del carril A:** 0. **Bloqueante.** `scripts/guardas/paginas-en-la-base.test.ts` › «sin nada de la papelera, es el núcleo» da `RPC_PAGINADAS` igual a `RPC_PAGINADAS_DEL_NUCLEO` con el registro
  de la papelera real: falla desde que el registro de cotizaciones (4.24-2, commit 1: `p_tope` y `p_primeros`) dejó de estar vacío. Hay que mockear
  `./paginas-en-la-base-papelera` con `RPC_PAGINADAS_DE_LA_PAPELERA: []` en ese caso (el C no puede editarlo: es del A). Hasta entonces, `pnpm test` cae en ese caso (y el CI del PR).
  1. Para el **4.24-2b**: el registro `scripts/guardas/confirmar-con-url-papelera.ts` (vacío, sumado en `confirmar-con-url.ts` tras el núcleo y la fórmula, su caso en
     `confirmar-con-url-areas.test.ts` con el área simulada —la lección del 4.20-2c, `c3ec9a11`—, y el archivo en `c.dueno_de` y en los `modulos` del 4.24-2b). Si no está cuando le
     toque al 2b, el 2b para en compuerta `afuera`.
  2. La ficha `src/modules/cotizaciones/CLAUDE.md` › «Entra y sale» suma `/cotizaciones/papelera` y nombra `areas/papelera/CLAUDE.md` (con lo pedido en el 1a, 5, y el 1b, 6).
  3. Mudar el presupuesto de JS de la ruta (`PRESUPUESTO_DE_JS_DE_LA_PAPELERA_EN_KB`, 440) y los topes de la página a `e2e/soporte/presupuestos.ts`.
  4. `diasParaLaPurga`, `textoDePurga` y el resumen del resultado de restaurar quedan en tres módulos (leads, vehículos, cotizaciones): a `src/shared/lib` cuando el A lo decida.
  5. `RUTAS.papeleraDeCotizaciones` en `src/shared/lib/rutas.ts` (hoy `RUTA_DE_LA_PAPELERA_DE_COTIZACIONES` en `entities/papelera/ruta.ts`), si quiere todas juntas.
- **Para un paso de base del C, si la persona lo pide:** P3 (`motivo_de_restaurar` y `motivo_de_bloqueo` en el JSON del lote) y P4 (`lead_id` y `vehiculo_id` en cada cotización del lote).
- **Para el coordinador (o el A):** en `docs/PLAN.md`, fila del 4.24: «el 4.24-2 se parte en 4.24-2 (la pantalla con restaurar y el enlace, sin purgar) y 4.24-2b (purgar con
  `<Confirmar>` por URL: necesita del A el registro `confirmar-con-url-papelera.ts`)». En `docs/plan.yaml` (hoy sólo tiene `'4.24'`): el `4.24-2` como lo pidió el 1a
  (`docs/pasos/4.24-1a/decisiones.md`) y un `4.24-2b` con `depende_de: ['4.24-2']` (`ambar`; `modulos`: `features/papelera/`, `entities/papelera/`, `infra/papelera/`,
  `areas/papelera/`, `scripts/guardas/confirmar-con-url-papelera.ts`, `docs/`); el `4.24-3` sigue en `['4.24-2']` y el `4.25` pasa a `['4.24-3', '4.24-2b']`. **Este PR no
  marca `integrado 4.24`:** integra sólo el 4.24-2 (`parcial: true`).
- **En 4-64:** ninguno de los archivos nuevos pasa de 300 líneas (el más largo, el spec, 250).
