## 2026-11-08 — Paso 4.22-4: el catálogo de tonos (cuarta parte del 4.22)

- **Hecho:** nivel 1, pantalla de configuración sin migración, RLS ni permiso nuevo (ámbar, sin auditor). Seis commits de código.
  - Lo puro (`entities/diseno/tonos.ts`, `panel-de-tonos.ts`, `respuesta-de-tonos.ts`): validar un tono con los textos de la base (nombre, `#rrggbb`, AA con la razón truncada), el contraste en vivo, `cambiosDeUnTono()` (sólo lo que cambió), el panel de la URL y la forma de las respuestas.
  - Infra del área `diseno`: `leerTonosSobre()` (tabla `tonos`, por nombre, `limit(24)`) y `escrituraDeTonosSobre()` (`tono_crear|guardar|eliminar`, cada una con su lista entera); salen por `areas/diseno/composicion.ts`.
  - Tres Server Actions (`crear|guardar|eliminar-tono`) con `cotizaciones.configurar` sin origen y `revalidatePath` sólo si entró.
  - La pestaña «Tonos» (`?seccion=tonos`, `pantallas/diseno-tonos.ts`): lista con muestras en claro y oscuro, modal de crear y editar (selector nativo + `#rrggbb`, contraste en vivo, «Guardar» no se apaga por el AA) y `<Confirmar>` por URL para eliminar.
  - Registros: `docs/plan.yaml` (la segunda pantalla del área `diseno` en el `dueno_de` del B) y `scripts/guardas/confirmar-con-url-formula.ts` (el `<Confirmar>` de eliminar un tono).
- **Verificación:** vitest de lo nuevo (tonos 10, panel 3, lectura y escritura 12, actions 4 + las del diseño, pestañas) y `scripts/guardas` + `mapa.test.ts` en verde; e2e `configuracion-cotizacion-tonos` (T5) más diseño, diseño-ítems, niveles y fórmula, escritorio: 16 en verde; `tsc` y `mapa.sh --check` limpios. Sin mutaciones (no es fórmula ni dinero: el AA tiene el corpus de 360 pares).
  e2e completo: no (4.22-4, pantalla de configuración, Nivel 1: lo dirigido en escritorio)
- **Commits:** `feat(cotizaciones)` ×5 (lo puro, leer y escribir, las actions, la pestaña, el modal y eliminar) y `test(cotizaciones)` (el e2e).
