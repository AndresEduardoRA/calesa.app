## 2026-11-11 — Paso 6.01-3: `/logistica` con el drawer y Configuración › Logística (parte 3 de 3, cierra el 6.01)

- **Hecho:** `/logistica` exige `logistica.ver` en algún origen y, hasta el 6.03, dibuja sólo el panel de `?vehiculo=<id>` en un `<Drawer>` por URL (`drawer-de-la-unidad.tsx`, registrado en
  `drawers-con-salida.ts` como `sinFormulario`); sin parámetro dice «La cadena llega con el próximo paso.». `/configuracion/logistica` (`logistica.catalogos.gestionar`) dibuja como pestañas
  `?seccion=` los `CATALOGOS_DE_TRANSPORTE` y `CATALOGOS_DE_DINERO` (vacíos hoy: «Por ahora no hay nada que configurar aquí.»); su tarjeta del hub (`SECCIONES_DE_LOGISTICA`) sólo existe cuando
  algún catálogo está lleno, así que el hub no cambia. `docs/UX.md` gana «Logística: estados propios» y las filas de Logística y Logística (config).
- **Commits:** `948ebfd4` (drawer de `/logistica`), `0797f87a` (configuración con sus catálogos), `f44f011e` (e2e de Configuración).
- **Verificación** (`.piloto/salidas/6.01/`): `vitest run scripts/guardas` + Configuración + Logística de `src/app`, 48 archivos y 1.122 pruebas en verde (`vitest-3.txt`); `tsc` y `eslint` sin avisos;
  `E2E_SIN_FUNCIONES=1 pnpm test:e2e e2e/logistica-unidad.spec.ts e2e/configuracion-logistica.spec.ts`: 18 en verde (`e2e-3.txt`; el de Configuración sólo en escritorio). Un primer intento cayó
  porque la clave de la URL se importaba desde un archivo `'use client'` (llegaba al servidor como referencia): ver decisión D17.
- **6.01 queda completo:** las tres partes (C1 a C17) están hechas; el kanban y los huecos llenos son de 6.03 y de cada área.
- e2e completo: no (6.01-3, Nivel 1: lo corre el CI del PR; los dirigidos `e2e/logistica-unidad.spec.ts` y `e2e/configuracion-logistica.spec.ts` en verde)
