// Todo `<Modal>` de `src/` que no es `ModalDeFormulario`, con lo que hace si se cierra con algo escrito (`.claude/rules/ui.md`,
// cierre 4). Un `ModalDeFormulario` pregunta («Tienes cambios sin guardar.»), no se cierra mientras guarda y dice sin conexión por
// construcción; un `<Modal>` suelto no hace nada de eso. Así que un `<Modal>` con un campo que se teclea o es `propio` (pregunta él:
// `useCierreConCambios()`, `<ConfirmarDescarte>` en su pie y `bloqueado` mientras actúa) o pasa a `ModalDeFormulario`; el que no
// guarda nada tipeado se registra con su motivo. `scripts/guardas/modales-con-salida.test.ts` falla si aparece un `<Modal>` que no
// está acá, si uno registrado ya no lo es, si un `propio` no hace las tres cosas, o si uno `sinFormulario` dibuja un `<form>`.
//
// `propio`: el modal pregunta por su cuenta.
// `sinFormulario`: por qué ese modal no guarda nada tipeado; `tambien` lista los componentes locales que dibuja (un `<form>` ahí
// también cuenta).
export type RegistroDeModal =
  { propio: true } | { sinFormulario: string; tambien?: readonly string[] }

export const MODALES: Record<string, RegistroDeModal> = {
  // --- leads
  'src/modules/leads/features/etiquetas/components/dialogo-de-etiquetas.tsx': { propio: true },
  'src/modules/leads/features/portal/components/dialogo-de-otorgar.tsx': { propio: true },
  'src/modules/leads/features/exportar/components/dialogo-de-exportar.tsx': {
    sinFormulario:
      'elige el separador del archivo y descarga: un selector, nada tipeado que se pierda al cerrar',
  },
  'src/modules/leads/features/listado/components/modal-de-accion-de-fila.tsx': {
    sinFormulario:
      'sólo dibuja los estados de carga, error y sin tipos; los formularios de anotar y agendar son ModalDeFormulario',
  },
  // --- equipo
  'src/modules/equipo/features/equipo/components/invitar-persona.tsx': {
    sinFormulario:
      'dice qué pasó con la invitación y ofrece copiar el enlace; el formulario es un ModalDeFormulario aparte',
    tambien: [
      'src/modules/equipo/features/equipo/components/resultado-invitacion.tsx',
      'src/modules/equipo/features/equipo/components/enlace-invitacion.tsx',
    ],
  },
  'src/modules/equipo/features/equipo/components/enlace-de-persona.tsx': {
    sinFormulario: 'muestra un enlace generado para pasarlo a mano: de sólo lectura',
    tambien: ['src/modules/equipo/features/equipo/components/enlace-invitacion.tsx'],
  },
}
