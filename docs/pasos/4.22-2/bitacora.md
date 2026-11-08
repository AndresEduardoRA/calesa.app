## 2026-11-08 — Paso 4.22-2: la pestaña «Diseño» (segunda parte del 4.22)

- **Hecho:** nivel 1, pantalla de configuración sin migración, RLS ni permiso nuevo (ámbar, sin auditor). Seis commits de código.
  - Lo puro (`entities/diseno/`): `ponerSeccion`, `ponerAncho`, `pedidoDeGuardarDiseno`, `hayCambiosEnElDiseno`, `contextoDelEditor`; `admite-nivel.ts` (espejo de
    `nivel_no_admitido`) y la frase del aviso «se deduce restando» (`aviso-de-deduccion.ts`, 3 y «Y N más.»).
  - Lectura (`infra/diseno/`): el borrador o, sin él, la publicada de un origen, y los niveles de `cotizaciones_niveles`; por `areas/diseno/composicion.ts`.
  - Guardar: `guardarDiseno` (action, `cotizaciones.configurar` del origen, esperada de la publicada o hora del borrador) sobre `formula_guardar_borrador`; los hooks
    `useEditorDelDiseno` y `useGuardadoDelDiseno`.
  - La pestaña `?seccion=diseno&origen=`: selector de origen, secciones y celdas (título, «Dónde va», ancho, ver y editar juntos), aviso sin bloquear y «Guardar el borrador».
- **Verificación:** `vitest run` de lo nuevo, `scripts/guardas` y `scripts/mapa.test.ts`: 45 archivos, 1070 pruebas en verde (T1–T8); e2e `configuracion-cotizacion-diseno`
  (D1, escritorio) y los vecinos de Configuración › Cotización (12 en verde); `tsc` y `mapa.sh --check` limpios. Sin mutaciones (no es fórmula ni dinero).
  e2e completo: no (4.22-2, pantalla de configuración, Nivel 1: lo dirigido en escritorio)
- **Commits:** `feat(cotizaciones)` ×5 (lo puro, la lectura, guardar, los hooks, la pestaña) y `test(cotizaciones)` (el e2e).
