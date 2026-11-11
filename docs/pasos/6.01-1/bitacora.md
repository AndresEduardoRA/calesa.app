## 2026-11-11 — Paso 6.01-1: la base del módulo `logistica` (parte 1 de 3 del 6.01)

- **Hecho:** `logistica` partido en un núcleo y siete áreas vacías (`cadena`, `mover`, `documentos`, `transporte`, `aduana`, `dinero`, `alertas`) con sus tres entradas, sus
  lugares y su `pantallas/<área>.ts`; la raíz sólo hace `export *` y `scripts/guardas/areas-de-logistica.test.ts` lo vigila. El núcleo define `Unidad` (con `refDeUnidad`),
  `HuecoDeLaUnidad` y `huecosVisibles` (orden fijo `ORDEN_DE_HUECOS`, permiso en el origen de la unidad, regla del flujo activa) y los tipos de los huecos de grupo, enlaces y
  catálogos; trece archivos de hueco de `pantallas/` creados vacíos. `flujos/areas/mover` lee el flujo de un origen (`leerFlujoDeOrigen`, `reglaActiva`).
- **Commits:** `8e59f7b4` (áreas y guarda), `8f2d50c4` (la unidad y los huecos), `b245f953` (archivos de hueco), `9fc8215c` (flujo de un origen para mover).
- **Verificación** (`.piloto/salidas/6.01/`): guardas, `logistica` y `flujos`, 42 archivos y 1.107 pruebas en verde; `tsc` y `eslint` sin avisos; `mapa.sh --check` limpio.
- **6.01 sigue:** falta la parte 2 (C7 a C12: `RUTAS`, `leerUnidad`, `<PanelDeLaUnidad>`, layout, `/logistica/vehiculo/[id]`, `e2e/soporte/logistica.ts` y
  `e2e/logistica-unidad.spec.ts`) y la 3 (C13 a C15 y C17). Este PR no marca integrado el paso (`parcial: true`).
- e2e completo: no (6.01-1, Nivel 1: sin pantalla nueva)
