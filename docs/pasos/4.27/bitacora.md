## 2026-11-08 — Paso 4.27-1: comentarios, adjuntos, reportes, moderar y favorita en la base

- **Hecho:** paso rojo, base sola, seis commits de código, cada uno con su migración `comentarios_*` y su prueba en `supabase/tests/areas/comentarios/`, más un
  `fix` que pidió la auditoría del informe. El plan se auditó una vez (bloquea; las 10 objeciones se corrigieron en el plan). La compuerta `datos`, con P1–P11
  recomendadas: «aprobar».
  - **4-69** (`09c029a0`): storage «cotizaciones: subir» y la tabla de adjuntos piden lo que pide guardarla (`cotizacion_puede_adjuntar`); leer un objeto pide ver
    sin castear el primer tramo (`_cotizacion_de_objeto`, nulo fuera de una carpeta).
  - Leer por cursor (`1a992d03`): `cotizacion_comentarios` (raíces de la más nueva a la más vieja, de a 20, cada una con sus primeras 20 respuestas) y
    `cotizacion_comentario_respuestas`; dos índices; sin filtro en el recorrido.
  - Escribir (`9bce0d30`): comentar (pide ver; un nivel), editar (el autor, con la versión), borrar (el autor o quien modera y ve; quita la fila o vacía una raíz
    con respuestas). Normaliza lo de antes y agrega dos `check`. El catálogo: comentar es de `ver`.
  - Adjuntos (`be382212`): `cotizacion_adjuntar` (carpeta, objeto, tipo y tamaño de storage, hasta 20, sin repetir) y `cotizacion_adjunto_quitar` (encola la ruta).
  - Reportar y moderar (`27638782`): reportar y retirar no mueven el estado ni la versión; `cotizacion_moderar` con firma nueva (ver, fila tomada, versión, y en
    una final `final.gestionar`); leer reportes ajenos pide moderar y ver.
  - Favorita (`6195b86f`): `cotizacion_favorito_poner`.
  - `fix` (`18dc4f8f`): retirar un reporte toma la cotización antes del reporte (con moderar se cruzaban: 40P01) y moderar mira su permiso global antes de tomar
    la fila; las RPC del paso quedan registradas en `auditoria-leads.sql`.
  - Se revocan las escrituras directas de las cuatro tablas: todo pasa por RPC (P9 a).
- **Verificación** (`.piloto/salidas/4.27/`):
  - `db:probar` entero en el hook de cada commit: 0 ✗; en el commit 6, 694 ✓ (28 de `areas/comentarios/`: 22 pruebas y 6 cabeceras) (`db-probar-entero.txt`,
    `commit-fix.txt`). Por commit, `SOLO=` de su archivo (`c1-solo.txt` … `c6-solo.txt`, `fix-solo.txt`) y `db:reset` + `db:types` + `db:lint` (`c*-reset.txt`).
  - `scripts/guardas`: 32 archivos, 1.007 ✓ (`guardas.txt`); `carriles.mjs origin/main c/4.27`: 15 archivos cumplen; `mapa.sh --check` 0; saltadas 0.
  - `nivel.mjs` con los archivos reales: Nivel 2 (`rls` y `estructura`), sin interfaz. Sin e2e dirigidos: ningún spec nombra estas tablas ni RPC.
  - `lint` lo corrió el hook; `typecheck` lo saltó el hook (`PILOTO=1`; sólo cambió `database.types.ts` regenerado): lo corren el hook de Stop y el CI.
    e2e completo: no (4.27-1, base, Nivel 2: el completo lo corre el CI del PR; 1 de 3)
- **Desvíos:** el `aplicado_en` de `ver` y `moderar` se completa en el commit de cada RPC (con su línea del seed), no todo en el 3 y el 5. El `aplicado_en` de `ver` no
  nombra todas las RPC que piden ver (sólo las que lee o escribe quien sólo ve): es texto del catálogo. El cinturón de `auditoria-leads.sql` no exige las RPC que
  nombran `public.cotizaciones_<tabla>` (su `\M`); se registraron igual en el `fix`.
- **Sin hacer:** las pantallas (4.27-2 comentarios, con `scripts/guardas/areas-c/paginas-en-la-base.ts` y la `infra/`; 4.27-3 adjuntos; 4.27-4 favorita, reportar y
  moderar en la cabecera). Sin `db:carreras` de los candados nuevos (pruebas de una sesión). Sin medición con volumen.

### Al A

1. **`docs/PLAN.md`, fila del 4.27:** «**Se parte en cuatro** (el 2026-11-08, en su plan): **4.27-1** la base (rojo, Nivel 2), **4.27-2** los comentarios,
   **4.27-3** los adjuntos, **4.27-4** favorita, reportar y moderar (pantalla, Nivel 1)». En `docs/plan.yaml`, los cuatro ids: 4.27-2 y 4.27-4 dependen del 4.27-1;
   4.27-3, del 4.27-2.
2. **Abiertos:** cerrar **4-69** (hecho en `09c029a0`) y **4-91** (el registro por carril ya existe, `registros-de-carriles.ts`; el C crea
   `scripts/guardas/areas-c/paginas-en-la-base.ts` en el 4.27-2, con la `infra/` que llama a las RPC).
3. **Abierto nuevo (para el 4.28):** una medición en `scripts/mediciones.mjs` con una cotización de 1.000 comentarios raíz y 500 respuestas: `cotizacion_comentarios`
   y `cotizacion_comentario_respuestas` por sus índices (`cotizaciones_comentarios_raices_idx`, `…_respuestas_idx`), sin `Sort`, sin crecer entre 100 y 1.000
   (`pg_stat_get_xact_blocks_fetched` por relación). El presupuesto va a la fila de `docs/RENDIMIENTO.md` («Comentarios de una cotización»).
4. **ESTADO:** «4.27-1 (C): la base de comentarios, adjuntos, reportes, moderar y favorita, por RPC y con 4-69 cerrado; siguen 4.27-2 a 4.27-4 (pantallas)».

## 2026-11-08 — Paso 4.27-2: los comentarios en pantalla

- **Hecho:** paso de pantalla (sin migración, policy, RLS ni `security definer`: usa las RPC del 4.27-1 tal cual), sin auditor. La compuerta `producto` (P1, P2) se
  contestó con las recomendadas: la sección bajo la hoja y «Ir a una fecha» al tope.
  - La sección «Comentarios» llena el hueco `Debajo` de `/cotizaciones/[id]`: lee desde el navegador la primera vez que está a la vista (`diferido()`), comenta,
    responde (un nivel), edita lo propio y borra con `<Confirmar>` por `?panel=borrar-comentario&comentario=<id>`. De a 20 raíces con sus primeras 20 respuestas hasta 500
    entre todos, con «Ir a una fecha».
  - `entities/comentarios/` (parseo con Zod, permisos puros, la lista cargada que borra como la base, con tests), `infra/comentarios/` (lectura en el navegador, escritura en el
    servidor), tres actions sin `revalidatePath`.
  - Registros del C: `scripts/guardas/areas-c/paginas-en-la-base.ts` (las tres llamadas con tamaño; cierra **4-91**) y `scripts/guardas/areas-c/confirmar-con-url.ts`. Las pruebas del
    núcleo que fijaban el registro sin áreas (`paginas-en-la-base.test.ts`, `confirmar-con-url-areas.test.ts`) suman ahora lo de `areas-*/`.
- **Verificación** (`.piloto/salidas/4.27-2/`):
  - `vitest` de `entities/comentarios/`: 2 archivos, 14 ✓ (`vitest-entities.txt`); `vitest related` de lo tocado: 3 archivos, 18 ✓ (`vitest-related.txt`).
  - `scripts/guardas`: 32 archivos, 1.010 ✓ (`guardas.txt`). `typecheck` 0 errores (`typecheck.txt`); `eslint --max-warnings 0` de lo tocado, limpio; `mapa.sh --check` 0.
  - `nivel.mjs` con los archivos reales: Nivel 1, sin disparadores, con interfaz (`nivel.txt`).
  - e2e dirigidos en escritorio y móvil, contra el build (`e2e-dirigidos.txt`): `cotizaciones-comentarios` (nuevo), `cotizar-guardada`, `cotizar-guardada-revisiones`,
    `cotizaciones-papelera-enviar` y `presupuesto-js`: 41 ✓, 7 saltadas por su marca de celular. JS en frío de `/cotizaciones/[id]`: 440 KB (tope 448, sin cambio).
    e2e completo: no (4.27-2, pantalla, Nivel 1: lo dirigido en escritorio y movil; 2 de 3)
- **Desvíos del plan:** `puedeModerar` sale de la lectura (`puede_moderar` de `cotizacion_comentarios`), no de `puede()` en el servidor: es el mismo `tiene_permiso` que mira
  borrar, y el hueco sólo pasa el id. «Borrar» con su diálogo entró en el mismo commit que la sección (los componentes ya lo nombraban): cinco commits de código, no seis.
  Las funciones de más de 80 líneas se partieron (`raiz-de-comentario.tsx`, `pie-de-comentarios.tsx`, `use-envio-del-campo.ts`, `estado-de-comentarios.ts`,
  `use-acciones-de-comentario.ts`).
- **Sin hacer:** adjuntos (4.27-3), favorita, reportar y moderar (4.27-4); tiempo real; la medición con volumen (sigue pedida para el 4.28).

### Al A (4.27-2)

1. **ESTADO:** «4.27-2 (C): los comentarios bajo la guardada (comentar, responder, editar y borrar, por cursor hasta 500 con «Ir a una fecha»); siguen 4.27-3 y 4.27-4».
2. **Abiertos:** cerrar **4-91** (`scripts/guardas/areas-c/paginas-en-la-base.ts`).
3. **BITACORA:** la línea con el marcador de arriba (2 de 3).

## 2026-11-08 — Paso 4.27-3: los adjuntos en pantalla

- **Hecho:** paso rojo sin migración, policy, RLS ni `security definer` (usa las RPC y las policies de storage del 4.27-1 tal cual). Plan auditado una vez
  (observaciones, atendidas); el informe no se audita. La compuerta `datos` del plan se contestó «aprobar» (P1–P4 con las recomendadas).
  - El bloque «Adjuntos» arriba del campo de la sección «Comentarios» de `/cotizaciones/[id]`: quien puede guardarla sube PDF, imágenes (WebP ≤ 1600 px) o Word al bucket
    privado por hash, de a uno y con su fila; todos los que la ven bajan por URL firmada (60 s, al tocar «Descargar»); quitar, quien lo subió (si todavía puede adjuntar) o
    quien modera, con `<Confirmar>` por `?panel=quitar-adjunto&adjunto=<id>`.
  - `entities/comentarios/adjunto.ts` (tipos, tope, nombre, `puedeQuitarAdjunto`, con tests) y `quitado.ts`; `infra/comentarios/adjuntos.client.ts` (leer, subir, firmar) y
    `adjuntos.ts` (las dos RPC); dos actions sin `revalidatePath`; el registro del `<Confirmar>` nuevo en `scripts/guardas/areas-c/confirmar-con-url.ts`.
- **Verificación** (`.piloto/salidas/4.27-3/`):
  - `vitest` de `entities/comentarios/adjunto.test.ts`: 13 ✓ (`vitest-adjunto.txt`); `vitest related` de lo tocado: 4 archivos, 22 ✓, y `scripts/guardas`: 32 archivos,
    1.010 ✓ (`vitest-related-y-guardas.txt`). `tsc --noEmit` 0 errores; lint y formato por el hook de cada commit.
  - `nivel.mjs` con los archivos reales: Nivel 1, sin disparadores, con interfaz (`nivel.txt`).
  - e2e dirigidos en escritorio y móvil, contra el build (`e2e-dirigidos.txt`): `cotizaciones-adjuntos` (nuevo), `cotizaciones-comentarios`, `cotizar-guardada`,
    `cotizaciones-papelera-enviar` y `presupuesto-js`: 35 ✓, 7 saltadas por su marca de celular. JS en frío de `/cotizaciones/[id]`: 440,1 KB (tope 448, sin cambio).
    e2e completo: no (4.27-3, pantalla, Nivel 1: lo dirigido en escritorio y movil; 3 de 3 tras consolidar el 4.27-2)
- **Desvíos del plan:** «Quitar» y su diálogo entraron en el mismo commit que el bloque (el `<Confirmar>` sin su registro hace caer la guarda): cinco commits de código, no
  seis. El `mime` de lo que se sube quedó tipado con los del bucket (`MIMES_DE_ADJUNTO`, `MIME_DE_IMAGEN`) en ese mismo commit, porque la action lo pide como enum.
- **Sin hacer:** favorita, reportar y moderar (4.27-4); miniaturas; tiempo real; barrer un objeto subido cuyo registro falló.

### Al A (4.27-3)

1. **ESTADO:** «4.27-3 (C): los adjuntos en la sección de comentarios —subir por hash al bucket privado, descargar por URL firmada, quitar con su diálogo—; sigue 4.27-4».
2. **BITACORA:** la línea con el marcador de arriba.
3. **Abiertos nuevos:** (a) ensanchar `subirPorHash` (`src/shared/lib/supabase/almacen.client.ts`) a los buckets privados y llevar ahí la subida de
   `infra/comentarios/adjuntos.client.ts`; (b) barrer los objetos del bucket `cotizaciones` que se subieron y nunca se registraron (hoy quedan, como en vehículos).
