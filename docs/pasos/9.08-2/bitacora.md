## 2026-11-12 · Paso 9.08-2: las gráficas del tablero y «Ver como tabla» (parte 2 de 3)

### Hecho

- `entities/graficas.ts` (puro, con su vitest): techo redondo de la escala (1, 2, 5 por una potencia de diez), fracción acotada, marcas de días bajo el eje,
  textos de barras y filas con singular y plural, «Sin origen» / «Sin nombre» y la nota de tope («Se muestran los 10 primeros orígenes.» / «las 20 primeras personas.»).
- `features/metricas/graficas/`: `barras-por-dia` (HTML y SVG de servidor, dos series, leyenda en texto, alto fijo), `ranking` (barras finas con el nombre y los números
  escritos), `tabla-equivalente` («Ver como tabla» con un `<details>` nativo, todos los números), `vacio-de-grafica`, `leyenda` y `tipos`. El esqueleto del widget gana el
  alto de una gráfica (`alto="grafica"` para los anchos).
- Cinco widgets anchos: `leads-por-dia`, `cotizaciones-por-dia`, `leads-por-origen`, `leads-por-persona` y `cotizaciones-por-origen`, en el catálogo (después de las cifras
  y antes de los huecos del 9.11) y en el registro. Vacío «Todavía no hay leads / cotizaciones en este período» (con «Nuevo lead» sólo en leads y sólo con `leads.crear`) y error
  con «Reintentar» por widget (el de las cifras).
- `scripts/guardas/listas-con-patron.ts`: la tabla equivalente figura con su motivo (no es una lista de registros).
- `e2e/tablero.spec.ts` T5: las cinco gráficas con su encabezado, la imagen visible, la tabla cerrada y, tras «Ver como tabla», las cabeceras «Día» y «Creados».

### Verificación

- `vitest run src/modules/tablero/entities/graficas.test.ts`: 21 en verde; `vitest related` de `widgets.ts` y `registro.ts`: 9 en verde; `scripts/guardas`: 36 archivos, 1.128 en verde.
- `E2E_SIN_FUNCIONES=1 pnpm test:e2e e2e/tablero.spec.ts`: 10 de 10 (T1 a T5 en escritorio y móvil) en `.piloto/salidas/9.08-2/e2e-tablero.txt`.
- `lint` y `typecheck` los corrió el hook de cada commit. Sin `db:*`: esta parte no toca `supabase/`.

### Lo que sigue (9.08 queda abierto)

- **9.08-3:** «Personalizar» (`?panel=personalizar`), la preferencia `tablero.widgets` en `equipo` y su e2e. El catálogo ya tiene **diez** widgets disponibles: sus pruebas no deben contar «cinco».

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- 9.08-2 hecha: cinco gráficas (por día, por origen y por persona) con «Ver como tabla», vacío y error por widget. **9.08 sigue:** 9.08-3 (Personalizar).

e2e completo: no (9.08-2, Nivel 1: lo prueba el CI del PR; dirigidos: tablero en escritorio y movil)
