## 2026-11-12 · Paso 9.08-1: `/tablero` con las cinco cifras y el período en la URL (parte 1 de 3)

### Hecho

- `entities/widgets.ts` (catálogo `WIDGETS_TABLERO`: clave, título, permisos, grupo de RPC, tamaño y `disponible`; `widgetsVisibles(permisos)` y `aplicarPreferencia`
  ya probada, que usará la parte 3), `entities/periodo.ts` (`mes`, `mes-anterior`, `90d` con la zona de la empresa), `entities/cifras.ts` («Sin datos», nunca «0 %»)
  y `entities/metricas.ts` (los payloads de las RPC con Zod), cada uno con su test.
- `infra/queries/metricas.ts` (`tablero_leads` y `tablero_cotizaciones`, validadas con Zod; una forma inesperada es `{ ok: false }`), `composicion.ts` y
  `features/metricas/lectura.ts` (`cache()`: una llamada por grupo y request).
- `/tablero` (`pantallas/tablero.ts`, `page.tsx`, `loading.tsx`): selector de período con tres `<Link>`, y cinco cifras («Leads creados», «Convertidos», «Tasa
  de conversión», «Cotizaciones», «Finales»), cada una tras su `<Suspense>` con `await connection()`; error por widget con «Reintentar» (sin permiso, sólo el motivo).
- El menú enciende «Tablero» y la cabecera de Inicio gana «Ver el tablero» para quien tiene `tablero.metricas.ver`.
- `e2e/tablero.spec.ts` (T1 «Convertidos» sube en uno al marcar final, T2 período en la URL, T3 sin permiso, T4 enlace desde Inicio).

### Verificación

- `vitest run src/modules/tablero/entities`: 4 archivos, 26 pruebas en verde (`.piloto/salidas/9.08/vitest-c1.txt`); `vitest related` de `navegacion.ts` y el registro
  de widgets: 37 en verde. `eslint` y `tsc` de lo tocado limpios.
- e2e dirigidos `tablero`, `inicio-bandeja` e `inicio-bandeja-logistica` en escritorio y móvil: 16 de 16 (`.piloto/salidas/9.08/e2e-tablero.txt`), con `E2E_SIN_FUNCIONES=1`.
- Sin `db:*`: esta parte no toca `supabase/`.

### Lo que sigue (9.08 queda abierto)

- **9.08-2:** las gráficas SVG (barras por día, rankings por origen y persona) con «Ver como tabla». **9.08-3:** «Personalizar» (`?panel=personalizar`), la preferencia
  `tablero.widgets` en `equipo` y su e2e; ahí se cierra el arrastrado «tablero de equipo (`tablero.metricas.ver`)».

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- 9.08-1 hecha: `/tablero` con el período en la URL y las cinco cifras, «Tablero» en el menú y «Ver el tablero» en Inicio. **9.08 sigue:** 9.08-2 (gráficas) y 9.08-3 (Personalizar).

e2e completo: no (9.08-1, Nivel 2: lo prueba el CI del PR; dirigidos: tablero, inicio-bandeja, inicio-bandeja-logistica en escritorio y movil)
