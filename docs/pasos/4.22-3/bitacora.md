## 2026-11-08 — Paso 4.22-3: ítems, cabecera y tarjeta del diseño (tercera parte del 4.22)

- **Hecho:** nivel 1, pantalla de configuración sin migración, RLS ni permiso nuevo (ámbar, sin auditor). Seis commits de código.
  - Lo puro (`entities/diseno/`): `edicion-de-items.ts` (atajos: columna y filas de 1 a 12; efecto del interruptor; ayuda de una celda, tabla o texto, nunca las dos),
    `edicion-de-la-cabecera.ts` (`ponerVerTotalBs`, `sumarModo` que copia el mapa de la fórmula y valida de entrada, `ponerModo`, `quitarModo`, `claveDeModo`) y
    `edicion-de-la-tarjeta.ts` (el total y los secundarios «aparte»).
  - Los componentes: `ItemDeAtajos`, `ItemDeInterruptor`, `ItemDeLectura` (variante y subtotal), `CamposDeLaAyuda`, `ItemDeLaSeccion` (despacho por tipo),
    `CabeceraDelDiseno` con `ModoEditable` y `SumarUnModo`, y `TarjetaDelDiseno`. El hook gana `aplicar` y `useEdicionesDelDiseno` ata las operaciones puras.
- **Verificación:** `vitest run` de lo nuevo, `scripts/guardas` y `scripts/mapa.test.ts`: 44 archivos, 1073 pruebas en verde (T1–T4); e2e `configuracion-cotizacion-diseno-items`
  (D2) y `configuracion-cotizacion-diseno` (D1), escritorio, 2 en verde; `tsc` y `mapa.sh --check` limpios. Sin mutaciones (no es fórmula ni dinero).
  e2e completo: no (4.22-3, pantalla de configuración, Nivel 1: lo dirigido en escritorio)
- **Commits:** `feat(cotizaciones)` ×5 (ítems en lo puro, modos y tarjeta en lo puro, ítems, cabecera, tarjeta) y `test(cotizaciones)` (el e2e).
