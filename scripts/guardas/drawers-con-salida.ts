// Todo `<Drawer>` de `src/`, con lo que hace si la acción de un aviso que sale de la pantalla («Abrir ficha», `sale: true`) se pulsa
// con algo escrito en él (`.claude/rules/ui.md`, cierre 3). El `<Drawer>` sabe preguntar en su pie, pero cada formulario tiene que decirle
// que tiene algo escrito: `useCambiosSinGuardar()` o `<CambiosSinGuardar>` (los dos de `shared/ui`), o, en los dos paneles que
// preguntan por su cuenta, `useCierreConCambios()` con su `salida`. `scripts/guardas/drawers-con-salida.test.ts` falla si aparece un
// `<Drawer>` que no está acá, si uno registrado ya no lo es, o si un formulario no dice que tiene cambios.
//
// `formulario`: el archivo donde el panel dice que tiene algo escrito (a veces no es el del `<Drawer>`).
// `sinFormulario`: por qué ese panel no guarda nada tipeado.
export type RegistroDeDrawer =
  { formulario: string; mecanismo: 'contexto' | 'propio' } | { sinFormulario: string }

export const DRAWERS: Record<string, RegistroDeDrawer> = {
  // --- leads
  // El único `<Drawer>` de «Nuevo lead»: monta el marco (siempre cerrado hasta que se abre) y el formulario, que tiene su estado afuera
  // para no perderlo al cerrar, dibuja adentro; la pregunta de descartar la hace él mismo (`useCierreConCambios`).
  'src/modules/leads/features/alta/components/marco-del-alta.tsx': {
    formulario: 'src/modules/leads/features/alta/components/alta-cargada.tsx',
    mecanismo: 'propio',
  },
  'src/modules/leads/features/ficha/components/panel-de-edicion.tsx': {
    formulario: 'src/modules/leads/features/ficha/components/panel-de-edicion.tsx',
    mecanismo: 'contexto',
  },
  'src/modules/leads/features/ficha/components/panel-de-telefono.tsx': {
    formulario: 'src/modules/leads/features/ficha/components/panel-de-telefono.tsx',
    mecanismo: 'contexto',
  },
  'src/modules/leads/features/embudo/components/panel-de-etapas.tsx': {
    formulario: 'src/modules/leads/features/embudo/components/panel-de-etapas.tsx',
    mecanismo: 'contexto',
  },
  'src/modules/leads/features/oportunidades/components/panel-de-oportunidad.tsx': {
    formulario: 'src/modules/leads/features/oportunidades/components/panel-de-oportunidad.tsx',
    mecanismo: 'contexto',
  },
  'src/modules/leads/features/cartera/components/panel-de-cartera.tsx': {
    formulario: 'src/modules/leads/features/cartera/components/panel-de-cartera.tsx',
    mecanismo: 'contexto',
  },
  'src/modules/leads/features/rapido/components/drawer-de-lead.tsx': {
    sinFormulario:
      'el drawer rápido sólo muestra; sus formularios (anotar, agendar) son modales que preguntan por sí solos (ModalDeFormulario)',
  },
  // El panel de edición del resumen de un lead (9i) es `PanelDeEdicion`, ya registrado; éste sólo es el panel que dice que los catálogos o la
  // ficha llegan, no llegaron o ya no se ven, sin formulario (lo comparten la ficha y el resumen).
  'src/modules/leads/features/ficha/components/panel-sin-formulario.tsx': {
    sinFormulario:
      'sólo dice que la ficha está llegando, que no se pudo leer o que el lead ya no se ve; el formulario es PanelDeEdicion, que pregunta por su cuenta',
  },
  // --- vehiculos
  'src/modules/vehiculos/features/alta/components/panel-de-vehiculo.tsx': {
    formulario: 'src/modules/vehiculos/features/alta/components/panel-de-vehiculo.tsx',
    mecanismo: 'propio',
  },
  'src/modules/vehiculos/features/vitrina/components/panel-de-vitrina.tsx': {
    formulario: 'src/modules/vehiculos/features/vitrina/components/formulario-de-vitrina.tsx',
    mecanismo: 'contexto',
  },
  // La nota de un interés que se tipea y no se manda no tiene borrador: el panel pide `preguntaAlCerrar` (cierre 4) y pregunta
  // también al cerrar, con la pregunta en el pie del `<Drawer>`.
  'src/modules/vehiculos/features/vinculo/components/panel-agregar-vehiculo.tsx': {
    formulario: 'src/modules/vehiculos/features/vinculo/components/panel-agregar-vehiculo.tsx',
    mecanismo: 'contexto',
  },
  // El resumen de un vehículo sólo muestra: su edición es el panel de arriba (`panel-de-vehiculo.tsx`), que pregunta por su cuenta.
  'src/modules/vehiculos/features/resumen/components/resumen-de-vehiculo.tsx': {
    sinFormulario:
      'el resumen sólo muestra; editar abre el panel de edición encima, que pregunta por su cuenta (useCierreConCambios)',
  },
  // --- origenes
  'src/modules/origenes/features/categorias/components/panel-de-categoria.tsx': {
    formulario: 'src/modules/origenes/features/categorias/components/panel-de-categoria.tsx',
    mecanismo: 'contexto',
  },
  'src/modules/origenes/features/origenes/components/panel-nuevo-origen.tsx': {
    formulario: 'src/modules/origenes/features/origenes/components/panel-nuevo-origen.tsx',
    mecanismo: 'contexto',
  },
  // --- empresa
  'src/modules/empresa/features/tipos-cambio/components/panel-tipo-cambio.tsx': {
    formulario: 'src/modules/empresa/features/tipos-cambio/components/panel-tipo-cambio.tsx',
    mecanismo: 'contexto',
  },
  'src/modules/empresa/features/tipos-cambio/components/panel-nuevo-tipo-cambio.tsx': {
    formulario: 'src/modules/empresa/features/tipos-cambio/components/panel-nuevo-tipo-cambio.tsx',
    mecanismo: 'contexto',
  },
  'src/modules/empresa/features/tipos-cambio/components/panel-moneda.tsx': {
    formulario: 'src/modules/empresa/features/tipos-cambio/components/panel-moneda.tsx',
    mecanismo: 'contexto',
  },
  // --- equipo
  'src/modules/equipo/features/equipo/components/panel-roles-persona.tsx': {
    sinFormulario: 'cada interruptor guarda al instante; no hay nada escrito que perder',
  },
  // --- shared
  'src/shared/ui/campos/panel-de-campo.tsx': {
    formulario: 'src/shared/ui/campos/formulario-de-campo.tsx',
    mecanismo: 'contexto',
  },
  'src/shared/ui/filtros/filter-shell.tsx': {
    sinFormulario: 'los filtros viven en la URL y se aplican al elegirlos; no hay un borrador',
  },
  'src/app/(app)/_shell/menu-movil.tsx': {
    sinFormulario: 'la navegación del celular',
  },
}
