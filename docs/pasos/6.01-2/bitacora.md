## 2026-11-11 — Paso 6.01-2: el panel de la unidad y su ruta (parte 2 de 3 del 6.01)

- **Hecho:** `RUTAS` suma `logistica`, `embarques`, `aduana`, `gastosDeLogistica` y `configuracionDeLogistica` y la función `unidadDeLogistica(id)`. `logistica` lee la unidad (`leerUnidad`: entities con Zod,
  `infra/nucleo/unidad.ts` bajo la RLS de quien mira) y dibuja `<PanelDeLaUnidad>` (cabecera con título, origen, fase y «Desde hace N días en esta fase»; un `BloqueDelHueco` plegado por hueco que monta su
  contenido al abrirse). `src/app/(app)/logistica/` tiene `huecos-de-la-unidad.tsx` (junta los cinco arreglos y filtra con `huecosVisibles`), `unidad-abierta.tsx` (los estados y el panel, para la
  página y el drawer de la parte 3), `layout.tsx` con la sub-navegación (sólo se dibuja con más de un enlace) y `vehiculo/[id]/page.tsx` con su `loading.tsx`. `<Bloque>` gana `onAbrir`.
- **e2e** (`.piloto/salidas/6.01/e2e-unidad.txt`): `e2e/logistica-unidad.spec.ts`, 8 en verde (escritorio y celular); es la primera vez que `leerFlujoDeOrigen` corre contra la base (sin aviso de flujo).
- **6.01 sigue:** falta la parte 3 (C13 a C15 y C17: `/logistica` con el drawer, `/configuracion/logistica`, `docs/UX.md`). Hasta entonces `/logistica` no tiene página: el enlace «Ir a Logística» del estado
  «no disponible» da 404. Este PR no marca integrado el paso (`parcial: true`).
- e2e completo: no (6.01-2, Nivel 2: lo corre el CI del PR; el dirigido `e2e/logistica-unidad.spec.ts` en verde)
