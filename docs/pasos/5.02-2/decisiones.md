## 2026-11-11 — Paso 5.02-2: la pantalla de flujos (D9 a D20; D1 a D8 siguen en `docs/pasos/5.02-1/decisiones.md`)

- **D9 · Cuatro commits de código** con el árbol verde cada uno (entidades puras, pantalla del módulo, ruta de `src/app`, e2e), más un `fix` y un commit de docs de la pantalla.
- **D10 · `<PantallaDelFlujo>` es un Server Component async** (como `SeccionDeLaFormula`): `src/app` le pasa permisos, la promesa de `getOrigenes(true)`, la de `leerRolesParaElegir()` y los parámetros de la URL; una lectura que falla sube al `error.tsx` de `(app)`.
- **D11 · Cada pestaña es un flujo que quien mira puede configurar:** el de un origen lleva el nombre de la fila del origen (« (inactivo)» si no está activo); el de repuestos, `flujos.nombre`. `PestanasConDesborde` sólo recibe texto: el color del origen queda en la entrada del selector, sin dibujar.
- **D12 · `?ambito=repuestos` gana sobre `?origen=`;** una URL inválida o ajena abre la primera pestaña, nunca un error.
- **D13 · El inspector se registra con `sinFormulario`** (sólo muestra). El paso que le suma un formulario (5.04) lo pasa a `formulario`/`contexto` en `scripts/guardas/drawers-con-salida.ts`.
- **D14 · Los huecos son componentes de cliente opcionales** (`HuecosDelFlujo`); los junta `src/app/(app)/configuracion/flujos/huecos.ts` (`HUECOS_DE_FLUJOS = {}`), una línea por área. Supuesto sin ejercitar: nada llena un hueco todavía; uno de servidor no cruzaría a la lista.
- **D15 · Sin `error.tsx` propio:** sirve el de `(app)`, que ofrece «Reintentar».
- **D16 · El inspector no dice nombres técnicos:** de los requisitos sólo cuántos hay por tipo y si bloquean; de los roles, su nombre («otro rol» si no estaba en los 100 leídos). Roles de la fase = quienes pueden mover **hasta** ella; los de una transición mandan sobre ellos (`_puede_mover`).
- **D17 · Con sólo `logistica.catalogos.gestionar` se entra** y se lee «Por ahora no hay nada que configurar aquí con tus permisos.»; «Fases» pide `flujos.configurar` o `repuestos.configurar`.
- **D18 · El enlace del paso «Flujo» de Orígenes mira el permiso en ese origen** (`puede(permisos, 'flujos.configurar', origenId)`) y arma `?origen=<id>`; `conDestino()` recibe el id y `DESTINOS_DE_PASO` marca `porOrigen`.
- **D19 · `pestanas-de-flujos.tsx` se escribió pero no se dibuja** mientras haya una sola pestaña visible; no tiene prueba propia hasta que un paso sume una segunda.
- **D20 · `useVersionDelFlujo()` y su proveedor no salen por `client.ts`:** nadie fuera del módulo los necesita.
- **Del e2e:** la asesora de la semilla hace de «persona sin permiso» (una persona sin rol no entra a Configuración por otras razones); el spec cuenta lo que dice la base, no números de la semilla.
- **Estructura de `src/app`:** cada área con carpeta (`fases`, `requisitos`, `documentos`, `reglas`) trae `pestanas.ts` y `seccion.tsx` vacíos, y `secciones.ts` ya trae siete secciones: los carriles B y C no vuelven a editar `pestanas.ts` ni `seccion-abierta.tsx`.
