## 2026-11-12 · Paso 8.04-3: las escrituras de la cola web (parte 3 de 3; cierra 8-1)

### Hecho

- **T6** en `supabase/tests/areas/cola/tablero.sql`: `cola_web_configurar` pide `web.cola.gestionar` (42501 y nada cambia), no toca `disponible`, y quitar y
  «Deshacer» conservan cupo, prioridad y orden.
- «Agregar a la rueda» en `/configuracion/cola-web`: drawer en `?panel=agregar-a-la-rueda&q=` que busca en el equipo (lo lee `src/app` sólo con el panel
  abierto y si quien mira ve el equipo), precarga a quien ya está habilitada y, si su rol no recibe turnos, avisa «Quedó habilitada, pero su rol no recibe
  turnos de la web.» con «Abrir Roles» (8-1).
- «Quitar» en cada fila del tablero, con «Deshacer».
- La política de la cola en un bloque plegado, por `web_ajustes_guardar` con sus cinco claves (`cambiosDePolitica`, con test); conflicto con «Recargar».
- E3 en `e2e/cola-web-tablero.spec.ts`. Sin migración (D22). El 8.04 queda completo (3 de 3).

Commits: `c2ca75a7`, `5a8defb9`, `c9ba2ff9`, `1fe330e3`, `55d6e00f`, `20e90bca`, los de la auditoría del informe (`978f01d2`: quitar y «Deshacer» aceptan
todo `smallint`; `221d4352`: T6 siembra `disponible = true`) y el de docs.

### Verificación

- `SOLO=areas/cola/tablero.sql pnpm db:probar`: T1–T6 ✓.
- Vitest `rueda.test.ts` 4 de 4, `politica.test.ts` 2 de 2; guardas y `entities/cola`: 40 archivos, 1141 pruebas.
- Typecheck sin errores; lint en el hook de cada commit; `mapa.sh --check` exit 0.
- e2e dirigidos en escritorio: `cola-web-tablero` (3 de 3) y `configuracion-200`: 29 de 29.
- e2e completo: no (8.04-3, Nivel 1: lo prueba el CI del PR; dirigidos: cola-web-tablero, configuracion-200)
