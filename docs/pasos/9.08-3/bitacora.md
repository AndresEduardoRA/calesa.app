## 2026-11-12 · Paso 9.08-3: «Personalizar» y la preferencia `tablero.widgets` (parte 3 de 3, cierra el 9.08)

### Hecho

- `equipo`: la preferencia `tablero.widgets` (`{orden, ocultos}`, `CLAVE_WIDGETS_DEL_TABLERO`) se lee con Zod (una forma mala queda «sin elegir» y no daña `densidad`, `tema` ni `porPagina`) y entra en `esquemaPreferencia`; `client.ts` exporta `guardarPreferencia`.
- `tablero`: `entities/personalizar.ts` (mover, alternar, qué se guarda y las filas del panel, con su vitest); `widgetsParaMontar(permisos, preferencia)` devuelve mostrados y ocultos; `/tablero` los aplica y dice «Ocultaste todos los widgets» si no queda ninguno.
- `features/metricas/personalizar/`: el botón «Personalizar» en la cabecera, el panel diferido (`?panel=personalizar`, conserva el período) con interruptor «Mostrar X» («Visible» / «Oculto» en texto), «Subir X» y «Bajar X», guarda al cambiar y «Restablecer». Sólo ofrece lo que los permisos dejan ver.
- `scripts/guardas/areas-b/drawers-con-salida.ts`: el panel figura como `sinFormulario`.
- `e2e/tablero.spec.ts` T6: ocultar «Leads por origen», recargar y seguir oculto, subir «Cotizaciones por día» sobre «Leads por día», recargar y «Restablecer».

### Verificación

- `vitest run src/modules/equipo/entities`: 142 en verde. `vitest run src/modules/tablero/entities`: 58 en verde. `vitest run scripts/guardas`: 36 archivos, 1.128 en verde.
- `E2E_SIN_FUNCIONES=1 pnpm test:e2e e2e/tablero.spec.ts`: 12 de 12 (T1 a T6, escritorio y móvil), `.piloto/salidas/9.08-3/e2e-tablero.txt`. `e2e/listas-por-pagina.spec.ts` (usa el parseo común de preferencias): 24 en verde, 1 saltada, `.piloto/salidas/9.08-3/e2e-por-pagina.txt`.
- `lint`, `typecheck` y `mapa.sh` los corrió el hook de cada commit. Sin `db:*`: no se tocó `supabase/`.

### Lo que sigue

- Nada del 9.08. Los huecos `margen-del-mes` y `cola-web` del catálogo son del 9.11 (no se ofrecen en «Personalizar» hasta entonces).

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- **9.08 hecho** (3 partes): `/tablero` con cinco cifras, cinco gráficas con «Ver como tabla» y «Personalizar» (ocultar y ordenar por widget, `tablero.widgets` en `preferencias_usuario`). Cierra el arrastrado «tablero de equipo (`tablero.metricas.ver`)»: lo de la persona vive en el ranking «Leads por persona» y no hay un tablero de equipo aparte.

e2e completo: no (9.08-3, Nivel 2: sin e2e completo, lo prueba el CI del PR; dirigidos: tablero en escritorio y movil, listas-por-pagina)
