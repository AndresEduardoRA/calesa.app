// Los campos configurables: el editor (la lista agrupada, la fila, el panel de un campo y el aviso
// de impacto; el módulo le pasa su configuración y sus operaciones, `tipos.ts`) y, para llenarlos, el
// control de cada tipo y el bloque que los agrupa.
export { BloqueDeCampos } from './bloque-de-campos'
export { CampoDeFormulario } from './campo-de-formulario'
export { cerrarConAviso } from './cerrar-con-aviso'
export { Dato, DatosPorGrupo, RejillaDeDatos } from './datos-por-grupo'
export { EditorDeCampos } from './editor-de-campos'
export { edicionesDeCampos } from './ediciones'
export { ValorMostrado } from './valor-mostrado'
export {
  banderaDe,
  type BanderaDeCampo,
  type ConfiguracionDeCampos,
  type ContextoDelHueco,
  type DeLaFila,
  type EdicionesDeCampos,
  type TextosDelEditor,
  type ValoresDeCampo,
} from './tipos'
