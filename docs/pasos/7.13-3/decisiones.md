## 2026-11-12 — 7.13-3

- **D1 · «Ver atajos» cierra la paleta y abre la lista de `?`** en el mismo estado del hueco (`HuecoBuscador`).
- **D2 · `Ctrl+K` con la paleta abierta no alterna:** es idempotente como `?`; se cierra con Esc.
- **D6 · «Ver todos en Leads» sólo sale si la sección de leads trae filas;** lleva el texto interpretado (`#12` queda `#12`).
- **D7 · Las acciones «ir a» incluyen las secciones de Configuración visibles** (≈ 30 acciones para la dueña). Costo medido: +7 KB en el documento de cada pantalla (tope de `/perfil` 96 → 103 KB). Reversible quitando `configuracion` de `accionesDeLaPaleta`.
- **D8 · Enter navega con `router.push`,** no con `<Link>`: una fila de cmdk no es un enlace; Ctrl+clic no abre pestaña nueva.
- **Corrección de V32:** `useAbrirNuevoLead` no envuelve a `usePanelDeAlta` (registraría dos veces la vuelta del foco); lee sólo `panel` y llama `abrirConVuelta`. Vive en el mismo archivo que `usePanelDeAlta` porque
  `scripts/guardas/paneles-con-vuelta.test.ts` exige las dos funciones de la vuelta en todo archivo con `history: 'push'`.
- **Grupos de la paleta:** «Crear», «Navegar» y «Ayuda» (el plan decía «Ir a»; las acciones se llaman «Ir a …» y el grupo repetía el texto). Sin token `--color-ink-muted` en el diseño: la segunda línea de las filas usa `--color-ink-soft`.
- **El foco del alta tras la paleta:** la acción se ejecuta en el siguiente macrotask tras cerrar; el e2e confirma que el foco queda dentro del panel.
