## 2026-11-12 — Paso 7.13-2: la lógica de la paleta (parte 2 de 3 del 7.13)

- **Hecho** (sin UI, sin `src/app`, sin `supabase/`):
  - Reglas puras en `src/modules/buscador/entities/`: `acciones-de-la-paleta.ts` (`filtrarAcciones`, `TOPE_DE_ACCIONES` = 8, el tipo `AccionDeLaPaleta`),
    `telefono-en-la-busqueda.ts` (`pareceTelefono`) y `estado-de-la-paleta.ts` (`EstadoDeLaBusqueda`, `EstadoDeLosUltimos`, `estadoDeError`), cada una con su test.
  - `composicion.client.ts` (las lecturas del navegador, porque `features` no importa `infra`) y los hooks de `features/paleta/hooks/`:
    `useBusquedaDeLaPaleta` (250 ms, mínimo 3, una lectura por sección en paralelo, `AbortController`, estado derivado, `reintentar`) y
    `useUltimosAbiertos` (se relee en cada apertura, sin la lista vieja mientras carga).
- **Commits:** `feat(buscador)` ×3 (reglas puras; búsqueda con espera y cancelación; últimos abiertos) y el de docs.
- **Verificación** (`.piloto/salidas/7.13-2/`): vitest de `src/modules/buscador` 6 archivos, 49 ✓ (la carrera, el mínimo, qué se pide, los estados y la relectura);
  `scripts/guardas` 36 archivos, 1.116 ✓; eslint limpio; `tsc` sin errores en `buscador` (los 8 de `src/app/(app)/{logistica,repuestos}` son de los tipos de rutas de `.next`, no de esta parte).
- e2e completo: no (7.13-2, Nivel 1: lógica sin interfaz; lo prueba el CI del PR)
- **Para el carril A:**
  - En `docs/PLAN.md`, fila 7.13: «**7.13-2 hecha** (la lógica de la paleta: `entities/{acciones-de-la-paleta,telefono-en-la-busqueda,estado-de-la-paleta}`, `useBusquedaDeLaPaleta`, `useUltimosAbiertos`; `docs/pasos/7.13-2/`)». Sigue 7.13-3 (`<Buscador>`).
