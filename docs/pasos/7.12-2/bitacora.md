## 2026-11-11 — Paso 7.12-2: el buscador, lo del navegador y la medición (parte 2 de 2, y última, del 7.12)

- **Hecho:**
  - `entities/ranking.ts` con su test: `seccionesQueBuscan(interpretacion)` y `agruparResultados()`. Ordena primero el número exacto, después lo que
    empieza con el texto y al final el resto, y corta cada sección en `POR_SECCION` = 5. También `ordenarComoLosIds()` y `ultimosAbiertos()`.
  - `entities/resultados.ts`: los Zod y las columnas, nunca teléfono, campos ni montos.
  - Las lecturas del navegador, cancelables (`infra/buscar.client.ts`) y los últimos abiertos, hidratados bajo la RLS de cada entidad
    (`infra/visitados.client.ts`). Salen por `buscador/client.ts`.
  - `leads/client.ts` expone `interpretarBusqueda` y `MINIMO_DE_BUSQUEDA`. Las llama la feature que compone (7.13, 7.10).
  - El registro de la guarda de páginas del carril b.
  - `supabase/tests/medir-buscador.sql` en `db:medir:volumen`, con `MEDIR_SOLO` para correrla sola. Su contingencia entró:
    `20261111183642_buscador_cotizaciones_rutas.sql`, donde la ruta de las propias corre sólo donde se tiene «propios» sin «todos» (D22).
- **Commits:**
  - `6387cd75` (leads/client), `6c1bae8e` (ranking), `912a9a35` (buscar por sección), `117e38fe` (últimos abiertos).
  - `442d333c` (la migración), `e992fdfd` (la medición).
  - Más el `fix` de la auditoría del informe: el caso mixto en `buscador.sql` y el comentario de la migración.
- **Verificación** (`.piloto/salidas/7.12-2/`):
  - `ranking.test.ts`: 8 pruebas en verde (`ranking.txt`).
  - `scripts/guardas` y el módulo: 34 archivos y 1.055 pruebas (`guardas-final.txt`).
  - `db:probar` entero en verde (`probar-entero.txt`, y `probar-entero-2.txt` tras el fix).
  - La medición en verde sobre el árbol final (`medir-buscador-3.txt`): el número 6–8 bloques; lo raro 41–61 bloques y ≈ 1 ms; lo común 5–18 ms, con el heap
    sin crecer. La guarda sin el GIN da 3 recorridos y 7.723 bloques.
  - `db:lint` sin avisos en lo nuevo.
  - La mutación `v_solo_propios := v_t` cae en B4 (`mutacion-solo-propios-v-t.txt`).
- **Para el carril A:**
  - En `docs/PLAN.md`, fila 7.12: «**7.12 hecho** (7.12-1, la base: `buscador_leads`, `buscador_vehiculos`, `buscador_cotizaciones`, `visita_registrar` y
    el índice de `visitados`; 7.12-2: `ranking.ts` con su test, las lecturas del navegador por sección (`buscador/client.ts`), los últimos abiertos
    hidratados, el registro de la guarda y `medir-buscador.sql`, con la ruta de las propias acotada (`20261111183642_buscador_cotizaciones_rutas.sql`);
    `docs/pasos/7.12-1/`, `docs/pasos/7.12-2/`)».
  - El arrastrado «el buscador de leads, sin los privados» (`docs/PLAN.md:1512`) queda cerrado.
  - 7.10 importa `@/modules/buscador/client` y suma `chat --> buscador` a `docs/ARQUITECTURA.md` (sin ciclo).
  - 7.13 llama a `interpretarBusqueda()` de `@/modules/leads/client` antes de pedir, y registra la visita por Server Action.
- **7.12 terminado:** este PR cierra el paso (`parcial: false`).
- e2e completo: no (7.12-2, Nivel 1 por lo tocado; el PR es Nivel 2 por el índice de visitados del 7.12-1: lo corre el CI del PR; sin pantalla)
