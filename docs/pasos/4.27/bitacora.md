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
