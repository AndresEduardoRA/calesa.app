## 2026-11-12 · Paso 8.12-2: Configuración › Repuestos › «Cotizador» (parte 2 de 4)

### Hecho

- Migración `repuestos_cotizador_configuracion`: `repuestos_tramos_logistica_signo_check` (`costo_min >= 0 and monto >= 0`) y la validación de ese `check` y de
  `repuestos_cotizador_config_redondeo_check` si ninguna fila los rompe (D18); `aplicado_en` de `repuestos.configurar` nombra las tres policies (y `seed.sql`).
  Prueba `supabase/tests/areas/repuestos/cotizador-configuracion.sql` (Q1 RLS de lo que escribe la pantalla, Q2 los `check`, Q3 `aplicado_en`).
- `entities/cotizador/configuracion.ts`: el número tipeado con el lector único de `shared` y el locale, el texto exacto con enteros a escala fija, el recargo en %
  ↔ fracción con el mismo entero, los topes por campo. `numero-tipeado.ts` exporta `separadoresDelLocale` (sin cambiar su conducta).
- Lectura (`leerConfiguracionDelCotizador`, tope + 1 en las tres tablas) y tres actions (`publicarConfiguracion` con chequeo de la vigente, `guardarTramo`,
  `guardarCaja`) bajo la RLS que ya existía.
- La pestaña «Cotizador» con su barra (`?seccion=cotizador`): «Fórmula» con «Publicar cambios» y el historial, «Tramos de logística» y «Cajas» por moneda con
  sus modales en la URL. `e2e/configuracion-repuestos-cotizador.spec.ts` (nuevo) y `configuracion-repuestos-catalogos.spec.ts` (ahora hay dos pestañas);
  `borrarPersonasDePrueba()` borra la configuración que publicó una cuenta de prueba.

### Verificación

- Nivel 2. `pnpm db:reset`, `db:types` (sin cambios), `db:probar` completo en verde (`.piloto/salidas/8.12-2/db-probar.log`), `db:lint` sin errores.
- `configuracion.test.ts` 26 en verde (con la prueba de los topes del `fix` de la auditoría); M1–M3 caen (`.piloto/salidas/8.12-2/mutaciones.log`). `vitest related` 1425 y `scripts/guardas` 1128 en verde.
- e2e dirigido en escritorio: 4 en verde (`.piloto/salidas/8.12-2/e2e.log`).
- e2e completo: no (8.12-2, Nivel 2: lo corre el CI del PR; dirigidos configuracion-repuestos-catalogos y configuracion-repuestos-cotizador en escritorio)

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- 8.12-2 hecha: Configuración › Repuestos › «Cotizador» (publicar la fórmula con su historial, tramos de logística y cajas por moneda), el signo de los tramos y
  los dos `check` validados. **8.12 sigue:** 8.12-3 (pestaña «Cotizaciones» y la cotización en sólo lectura) y 8.12-4 (la hoja editable, aceptar, anular y
  `e2e/repuestos-cotizar.spec.ts`). La pantalla es `pantallas/cotizador-configuracion.ts` y no `configuracion-cotizador.ts` como nombra la fila: sigue la regla
  de áreas `<área>-<pantalla>`.
- Pendiente de 8.12-4 (sin cambios): la carrera en `scripts/carreras/` (dos `aceptar` a la vez; dos tramos cruzados a la vez).
- «Quitar escrituras directas» (Riesgos de la Fase 8): cerrado para el cotizador (D28: configuración, tramos y cajas siguen bajo RLS a propósito).
