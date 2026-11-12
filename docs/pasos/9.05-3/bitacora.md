## Paso 9.05 · Datos: exportar todo, parte 5 de 5: la pantalla (2026-11-12)

- **`/datos`** (`src/app/(app)/datos/{page,loading}.tsx`, `pantallas/datos.ts`): cualquiera con sesión entra; `?seccion=` con «Importar» declarada y
  apagada hasta el 9.06 (sin barra de pestañas mientras haya una sola sección). Los orígenes se leen sólo con `datos.exportar.todo`.
- **«Exportar»:** «Mis leads» para todos (con `leads.ver` y `leads.exportar`, «Ir a Leads» abre `/leads?panel=exportar`; si no, apagada con su motivo) y,
  con `datos.exportar.todo`, «Todo»: Leads, Vehículos (origen obligatorio, de los que ve) y Cotizaciones (todas o de un origen), cada una con «Desde»,
  «Hasta» y «Descargar». Estados: preparando con el botón apagado, vacía, tope con foco al rango, límite con la hora en que se libera, sin permiso,
  error (genérico, sin red, sesión vencida) con «Reintentar», y la tarjeta que el rol no puede usar con su motivo.
- **La lógica, pura y con test:** `entities/tarjetas.ts` (qué ve y puede usar cada quien, por `puede()` y los orígenes de la base),
  `entities/descarga.ts` (la respuesta del route como estado y la validación del formulario con `esquemaDelPedido`), `entities/secciones.ts`. El hook
  `use-descarga.ts` manda un pedido a la vez por tarjeta. La pantalla no decide nada: el permiso, el cupo y las filas los exige la base.
- **Navegación:** «Datos» prendida en el menú del usuario (y `Ctrl/Cmd+K`) para todos; `navegacion.test.ts` espera Perfil y Datos sin permisos.
- **Fuera de `modulos`, aditivo:** `src/modules/leads/index.ts` exporta `PANEL_EXPORTAR`.
- **Pruebas:** `tarjetas.test.ts` (6), `descarga.test.ts` (9), `secciones.test.ts` (2); `e2e/datos-exportar.spec.ts` (escritorio): la dueña llega por el
  menú, descarga `leads-todos-AAAA-MM-DD.csv` con BOM, las líneas de «Ajeno Carlos» traen la celda «Teléfono» enmascarada y el archivo no trae su número ni
  su cédula; lo suyo sale entero; Berta ve sólo «Mis leads», apagada con «Tu rol no exporta leads.».
- **Inestable visto:** `tablero.spec.ts` T6 en `movil` cayó una vez corriendo junto a su par de escritorio («Leads por origen» no volvió tras
  «Restablecer») y pasó 6/6 solo; no toca nada de este paso.
- **Cómo se anota en `docs/PLAN.md`:** la fila 9.05 queda hecha (partes 9.05-1, 2, 2b, 2c y 3; `docs/pasos/9.05-*/`). `parcial: false`.
- e2e completo: no (9.05-3, Nivel 2: lo corre el CI del PR; dirigidos: datos-exportar y leads-exportar en escritorio, tablero en escritorio y movil)
