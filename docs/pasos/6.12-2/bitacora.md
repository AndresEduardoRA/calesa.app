## 2026-11-12 — Paso 6.12-2: la bandeja de logística en Inicio (parte 2 de 2)

- **6.12 hecho:** 6.12-1 la base, 6.12-2 la bandeja de logística en Inicio.
- **Hecho:**
  - `logistica` área `alertas`: `entities/alertas/bandeja.ts` (Zod de la respuesta de `logistica_bandeja`, `detalleDeDemorada`, `detalleDeTrabado`, con su
    test), `infra/alertas/bandeja.ts` (memorizada con `cache()`: una llamada por pantalla) y `bandejaLogistica(tope)` por la entrada del área.
    `logistica_bandeja` registrada en la guarda de páginas (`scripts/guardas/areas-c/paginas-en-la-base.ts`, con `TOPE_DE_BLOQUE`).
  - `tablero`: los bloques «Alertas por demora» (con «Ver todas» a la cadena del origen filtrada por demoradas), «Vehículos trabados» (sin «Ver todas») y
    «Documentos por aprobar» (con «Ver todas» a `?por_aprobar=si`); cada fila abre el panel de su unidad.
  - `notificaciones`: el tipo `documento_por_vencer` en el catálogo (`FileClock`, «Vencimientos», acciona al abrir).
  - `e2e/inicio-bandeja-logistica.spec.ts` (nuevo) y `e2e/inicio-bandeja.spec.ts` (mira «Esperas que destraban vehículos», que sigue hueco).
  - Fichas de `logistica`, `tablero` y `notificaciones`; una línea en RENDIMIENTO › «Alertas y bandeja de logística (6.12)».
- **Verificación** (`.piloto/salidas/6.12-2/`): `vitest related` y `scripts/guardas` (1113 ✓), `typecheck`, e2e dirigidos en los dos proyectos (23 ✓).
- e2e completo: no (6.12-2, Nivel 1; dirigidos: inicio-bandeja-logistica, inicio-bandeja, acceso, perfil-notificaciones, en escritorio y movil)
