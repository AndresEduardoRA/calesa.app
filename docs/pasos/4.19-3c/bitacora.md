## 2026-11-08 — Paso 4.19-3c: publicar la tarjeta con nota y descartar su borrador

- **Hecho:** la tercera y última parte del 4.19-3. **Puros** (`entities/plantilla/`, con su test): `publicar-la-plantilla.ts` (`PANEL_PUBLICAR_TARJETA`, `motivoParaNoPublicar()`,
  `motivoParaNoAbrirPublicar()`, `noDisponibleAlPublicar()` y los textos del modal) y `descartar-la-plantilla.ts` (`PANEL_DESCARTAR_PLANTILLA`, los motivos, los textos y el mensaje sin red).
  **Hooks** (`features/plantilla/hooks/`): `usePanelDeLaTarjeta` (un solo hook para los dos paneles: `useVueltaDelFoco` se llama una vez por clave), `useAperturaDeLaTarjeta`,
  `useFormularioDePublicacionDeLaTarjeta` (la nota con el esquema de la action, PT409 que conserva la nota y se va al llegar el borrador nuevo, sin conexión, una regla de la base
  arriba) y `useDescarteDeLaPlantilla` (PT409 con «Recargar», sin reintento al volver la red, `descartado` para no decir «ya no está» mientras el diálogo se va). **Pantalla:**
  «Publicar…» y «Descartar borrador…» en la fila de «Guardar» (`BotonesDeLaPlantilla`: «Publicar…» apagado con su motivo escrito a la vista), `ModalDePublicarLaTarjeta`
  (`?panel=publicar-tarjeta`, «Nota de la versión» obligatoria, con «n de 2.000» y sin `maxLength`), `DescartarLaPlantilla` (`<Confirmar>`, `?panel=descartar-plantilla`, registrado en
  `confirmar-con-url.ts`), `AccionesDeLaPlantilla` y `PestanaDeLaTarjeta`, que dibuja el editor con su `key` y, al lado, los modales **sin** `key` de versión (si no, «Recargar»
  los remontaría y perdería la nota: lo prueba `pestana-de-la-tarjeta.test.tsx`).
- **Lo que midió E7** (`e2e/configuracion-cotizacion-tarjeta-volumen.spec.ts`, escritorio, 500 miembros): **147.448 B** del primer HTML y **4.756 nodos** (topes 154.900 y 5.000; antes
  147.484 B y 4.754). Los topes no se tocaron.
- **Verificación** (`.piloto/salidas/4.19-3c/`): `rojo-head-puro.txt` (los seis archivos de pruebas de lo puro y los hooks caen contra HEAD: los módulos no existen) y
  `rojo-head-e2e.txt` (E1 de publicar contra HEAD: no hay botón «Publicar…»; sólo E1, no E7); `e2e-commit2.txt` (30 de 30) y `e2e-commit3.txt` (los cinco specs de la pestaña, 42 de 42 en escritorio y móvil);
  `e7-medido.txt`. Vitest de `features/plantilla`, `entities/plantilla` y `scripts/guardas`: 108 y 1.005 pruebas en verde.
  e2e completo: no (4.19-3c, pantalla, 3 de 3)
- **Desvíos:** (1) el E1 de `configuracion-cotizacion-tarjeta.spec.ts` pedía seis decimales de microsegundos y cayó tres veces seguidas (`.695`, `.43929`, `.62499`): la base los escribe
  sin los ceros del final y el reloj de esta máquina a veces da pocos; se quitó esa aserción (la precisión de la esperada la prueba el PT409 de `-conflicto.spec.ts`), de la familia de 4-90.
  (2) Los botones del pie de `<Confirmar>` miden 42 px en móvil (es de `shared/ui`, no de este paso): E9 no los exige táctiles. (3) E4 de 3b pulsa «Descartar» con `exact`.
- **Abiertos:** nuevo **4-102** (los botones del pie de `<Confirmar>` miden 42 px de alto en móvil, bajo los 44 de `ui.md`; es de `src/shared/ui`, Nivel 2). Sigue el **4.19-4** (la vista previa en
  vivo); la cuenta de e2e pasa a 3 de 3 y ese paso de pantalla correría el completo (confirmarlo con `cuenta-e2e.mjs`).
- **Commits:** `23a23417` feat(cotizaciones): preparar los paneles de la tarjeta sin pantalla · `c1cce295` feat(cotizaciones): publicar la tarjeta con nota · `319404d6` feat(cotizaciones):
  descartar el borrador de la tarjeta · y el de docs.
