// API pública del módulo `origenes` para el servidor. Con `client.ts`, lo único que `app/` u otro
// módulo puede importar. Mezcla lecturas de servidor con componentes de cliente: lo importan los
// Server Components. Un Client Component de afuera importa `@/modules/origenes/client`.

// Los orígenes para nombrarlos y elegirlos (selectores, la matriz de roles)
export { getOrigenes } from './composicion'
export type { OrigenResumen } from './entities/origen'

// Configuración › Orígenes: lista, datos, layout de campos y categorías
export { leerLayout, leerOrigenes } from './composicion'
export type { OrigenConUso } from './entities/origen'
export { ListaDeOrigenes } from './features/origenes/components/lista-de-origenes'
export { DatosDelOrigen } from './features/origenes/components/datos-del-origen'
export { EditorDeCampos } from './features/campos/components/editor-de-campos'
export { ArbolDeCategorias } from './features/categorias/components/arbol-de-categorias'

// Qué le falta a un origen para funcionar
export {
  pasosDe,
  type ClaveDePaso,
  type PasoConDestino,
  type PasoSiguiente,
} from './entities/pasos'
export { SiguientesPasos } from './features/pasos/components/siguientes-pasos'
