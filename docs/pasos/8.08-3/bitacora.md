## 2026-11-12 · Paso 8.08-3: /configuracion/repuestos y los catálogos en pantalla (parte 3 de 3 del 8.08)

### Hecho

- `/configuracion/repuestos` (`repuestos.configurar` con `puede()`; sin la clave, «No tienes permiso»), con `loading.tsx`, `pestanas.ts` (sólo «Catálogos»:
  sin barra) y su tarjeta «Repuestos» en el hub, tras Logística.
- La pestaña «Catálogos» (`pantallas/catalogos.ts`): los cuatro catálogos con `<ListaDeCatalogo>`, la columna «Orden», vacío por catálogo y `<AvisoDeTope>`
  con más de 200. Un solo modal por URL para agregar o editar (nombre, orden, activo; lo nuevo nace al final) y un solo diálogo para eliminar, que muestra
  el motivo de la base si el valor está en uso. Activar o desactivar desde el «⋯», una escritura a la vez.
- La lectura va en el servidor (`seccion-catalogos.tsx`) y cada action renueva la ruta con `revalidatePath`: el e2e prueba que alcanza (no hizo falta
  `router.refresh()`).
- El `.refine` de `cambios` dice «No hay cambios que guardar.» (observación de la auditoría del 8.08-2).
- `scripts/guardas/areas-c/confirmar-con-url.ts` registra el diálogo nuevo.

### Commits

- `fix(repuestos): decir por qué se rechaza guardar sin cambios`
- `feat(repuestos): dibujar los catálogos con su formulario de valor`
- `feat(repuestos): eliminar un valor de catálogo con confirmación`
- `feat(app): abrir configuración de repuestos desde el hub`
- `test(repuestos): recorrer los catálogos de repuestos en configuración`

### Verificación

- `e2e/configuracion-repuestos-catalogos.spec.ts` (escritorio): 3 de 3 (`.piloto/salidas/8.08-3/e2e-nuevo.txt`).
- Los specs que miran el hub (logística, flujos, cotización ajustes y niveles, empresa, equipo): 25 en verde y 1 rojo ajeno, `equipo.spec.ts:174` («la dueña
  bloquea a alguien»). Cae también solo (`e2e-equipo.txt`): la pestaña de la dueña queda con la sesión de la invitada que abre `otraPersona`. Esta parte no
  toca `equipo`, permisos ni la base. Lo vuelve a correr el CI del PR.
- `vitest related` (secciones: 5 de 5) y `scripts/guardas` (1.090 de 1.090) en `.piloto/salidas/8.08-3/`.
- e2e completo: no (8.08-3, Nivel 2 del paso: lo corre el CI del PR)

### Queda

- H1 (el `UPDATE` de toda la tabla deja cambiar `catalogo`) → 8.10.
- La pestaña «Cotizador» → 8.12.
- Para el coordinador, bajo la fila 8.08 de `docs/PLAN.md`: «8.08-1, 8.08-2 y 8.08-3 hechas (base, esqueleto, catálogos y `/configuracion/repuestos`, que
  sale por `pantallas/catalogos.ts`); H1 pasa a la 8.10».
